import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Profile, Tenant } from '../types';
import { Building2, Search, Plus, SlidersHorizontal, PackageOpen } from 'lucide-react';
import { OrganizationCard } from '../components/organizations/OrganizationCard';
import { NewOrganizationModal } from '../components/organizations/NewOrganizationModal';
import { EditOrganizationModal } from '../components/organizations/EditOrganizationModal';
import { OrganizationTable } from '../components/organizations/OrganizationTable';
import { OrganizationDetails } from '../components/organizations/OrganizationDetails';
import { UserDetails } from '../components/users/UserDetails';
import { Globe, LayoutGrid, List } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export const Organizations: React.FC = () => {
  const navigate = useNavigate();
  const { tenants, createTenant, refreshTenants } = useTenant();
  const { user: loggedInUser } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedOrg, setSelectedOrg] = useState<Tenant | null>(null);
  const [selectedOrgTab, setSelectedOrgTab] = useState<'overview' | 'users'>('overview');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  // Modals
  const [isNewOrgOpen, setIsNewOrgOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Tenant | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    () => (localStorage.getItem('orgViewMode') as 'grid' | 'list') || 'grid'
  );

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('orgViewMode', mode);
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setSearchDebounced(searchQuery.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTier, setFilterTier] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');

  const [page, setPage] = useState(1);
  const limit = 50;
  useEffect(() => {
    setPage(1);
  }, [filterCountry, searchDebounced]);

  const { data: paginatedData, isLoading: isPaginatedLoading } = useQuery({
    queryKey: ['organizations', page, filterCountry, searchDebounced],
    queryFn: () => api.getTenantsPaginated(page, limit, filterCountry, searchDebounced)
  });

  const totalCount = paginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Guard redirection mechanism
  useEffect(() => {
    if (loggedInUser) {
      const roleUp = loggedInUser.role_code?.toUpperCase() || '';
      const isAuthorized = roleUp === 'ADMIN' || roleUp === 'ADMINISTRATOR' || roleUp === 'SYS_ADMIN' || roleUp === 'CEO' || roleUp === 'SUPPORT_MANAGER';
      if (!isAuthorized) {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [loggedInUser, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const profilesData = await api.getProfiles();
      setProfiles(profilesData);
      await refreshTenants();
    } catch (e) {
      console.error("Failed to fetch organization resources", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract unique countries
  const uniqueCountries = React.useMemo(() => {
    const countries = new Set<string>();
    tenants.forEach(t => {
      if (t.country) countries.add(t.country);
    });
    return Array.from(countries).sort();
  }, [tenants]);

  // Filter organizations based on UI state (search, status, tier still client-side)
  // Country is now server-side via paginated API
  const filteredOrganizations = (paginatedData?.data || []).filter(org => {
    const status = (org as any).status || 'active';
    
    // Status Filter
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    
    // Tier Filter
    if (filterTier !== 'all' && org.support_tier !== filterTier) return false;

    // Search is applied server-side (customer_name, customer_code) in getTenantsPaginated.

    return true;
  });

  const handleCreateOrganization = async (data: any) => {
    await createTenant(data);
    setIsNewOrgOpen(false);
    loadData(); // refresh data
  };

  const handleEditOrganization = async (id: string, data: any) => {
    await api.updateTenant(id, data);
    setEditingOrg(null);
    loadData(); // refresh data
  };

  if (selectedUser) {
    return (
      <UserDetails 
        user={selectedUser} 
        onBack={() => {
          setSelectedUser(null);
          loadData(); 
        }} 
        onRefresh={loadData} 
      />
    );
  }

  if (selectedOrg) {
    return (
      <>
        <OrganizationDetails 
          organization={selectedOrg}
          users={profiles}
          initialTab={selectedOrgTab}
          onBack={() => {
            setSelectedOrg(null);
            loadData(); // reload when going back to reflect changes
          }}
          onEdit={(org) => setEditingOrg(org)}
          onDeactivate={() => console.log('Deactivate org:', selectedOrg.id)}
          onRefresh={loadData}
          onUserClick={(user) => setSelectedUser(user)}
        />
        {editingOrg && (
          <EditOrganizationModal 
            isOpen={true}
            initialData={editingOrg}
            onClose={() => setEditingOrg(null)}
            onSubmit={handleEditOrganization}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Top Banner introducing Organizations */}
      <div className="bg-slate-900 border-b border-teal-500/20 text-white px-8 py-6 shadow-md">
        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          Organizations
        </h1>
        <p className="text-slate-400 font-medium">
          Manage customer organizations, users and support lifecycle.
        </p>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-6">
        
        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search organizations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            
            <div className="h-9 w-px bg-slate-200 mx-1 hidden md:block"></div>
            
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
              <SlidersHorizontal size={16} className="text-slate-400" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent font-medium focus:outline-none text-slate-700 w-24 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
              <Building2 size={16} className="text-slate-400" />
              <select 
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="bg-transparent font-medium focus:outline-none text-slate-700 w-24 cursor-pointer"
              >
                <option value="all">All Tiers</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
              <Globe size={16} className="text-slate-400" />
              <select 
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="bg-transparent font-medium focus:outline-none text-slate-700 w-28 cursor-pointer max-w-[120px] truncate"
              >
                <option value="all">All Countries</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                onClick={() => toggleViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => toggleViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-teal-600 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="List View"
              >
                <List size={18} />
              </button>
            </div>

            <button 
              onClick={() => setIsNewOrgOpen(true)}
              className="flex-1 md:flex-none px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={16} /> New Organization
            </button>
          </div>
        </div>

        {/* Organizations Content */}
        {isPaginatedLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mb-4" />
            Loading organizations...
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 py-16 bg-white rounded-2xl border border-slate-200 shadow-sm border-dashed">
            <PackageOpen size={48} className="text-slate-300" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-1">No organizations registered</h3>
              <p className="text-sm text-slate-500">Start by creating your first organization to manage users and tickets.</p>
            </div>
            <button 
              onClick={() => setIsNewOrgOpen(true)}
              className="mt-2 px-5 py-2 text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
            >
              Create Organization
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredOrganizations.map(org => {
              const orgUsers = profiles.filter(p => (p.customer_id || p.tenant_id) === org.id);
              return (
                <OrganizationCard 
                  key={org.id}
                  organization={org}
                  usersCount={orgUsers.length}
                  openTicketsCount={0}
                  onView={() => {
                    setSelectedOrg(org);
                    setSelectedOrgTab('overview');
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="pb-12">
            <OrganizationTable 
              organizations={filteredOrganizations}
              profiles={profiles}
              onView={(org) => {
                setSelectedOrg(org);
                setSelectedOrgTab('overview');
              }}
            />
          </div>
        )}
        
        {/* Pagination Bar */}
        {!isPaginatedLoading && filteredOrganizations.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-white rounded-xl shadow-sm flex items-center justify-between text-sm text-slate-500 mt-2">
            <div>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} organizations</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || totalPages === 0}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <NewOrganizationModal 
        isOpen={isNewOrgOpen}
        onClose={() => setIsNewOrgOpen(false)}
        onSubmit={handleCreateOrganization}
      />

      {editingOrg && (
        <EditOrganizationModal 
          isOpen={true}
          initialData={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSubmit={handleEditOrganization}
        />
      )}
    </div>
  );
};
