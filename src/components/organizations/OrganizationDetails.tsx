import React, { useState } from 'react';
import { Tenant, Profile } from '../../types';
import { 
  Building2, Users, Ticket, BookOpen, Clock, 
  ArrowLeft, Edit2, Plus, Search, MoreVertical, Shield, Package, Ban
} from 'lucide-react';
import { OrganizationUsersTab } from './OrganizationUsersTab';
import { AddOrganizationUserModal } from './AddOrganizationUserModal';
import { OrganizationProductsTab } from './OrganizationProductsTab';
import { OrganizationContractsTab } from './OrganizationContractsTab';
import { OrganizationOverviewTab } from './OrganizationOverviewTab';
import { OrganizationAuditTab } from './OrganizationAuditTab';

interface OrganizationDetailsProps {
  organization: Tenant;
  users: Profile[];
  initialTab?: 'overview' | 'users' | 'products' | 'contracts' | 'audit';
  onBack: () => void;
  onEdit: (org: Tenant) => void;
  onDeactivate?: (org: Tenant) => void;
  onRefresh: () => void;
  onUserClick: (user: Profile) => void;
}

export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({
  organization,
  users,
  initialTab = 'overview',
  onBack,
  onEdit,
  onDeactivate,
  onRefresh,
  onUserClick
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'contracts' | 'audit'>(initialTab);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const status = (organization as any).status || 'active';
  const isActive = status === 'active';

  // Filter users for this organization to pass down to tabs
  const orgUsers = users.filter(u => (u.customer_id || u.tenant_id) === organization.id);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">Back to Organizations</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setActiveTab('users');
              setIsAddUserOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus size={14} /> Add User
          </button>
          <button 
            onClick={() => onEdit(organization)}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Package size={14} /> Manage Products
          </button>
          {onDeactivate && (
            <button 
              onClick={() => onDeactivate(organization)}
              className="px-3 py-1.5 text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Ban size={14} /> Deactivate
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden">
          <div 
            className="absolute top-0 left-0 bottom-0 w-2" 
            style={{ backgroundColor: organization.primary_color || '#0f766e' }}
          />
          <div className="flex items-center gap-5 pl-4">
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-3xl shadow-sm">
              {organization.logo_url && organization.logo_url.length <= 2 ? (
                <span>{organization.logo_url}</span>
              ) : (
                <Building2 className="text-slate-400" size={32} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 leading-tight">
                {organization.name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5 text-sm font-medium text-slate-500">
                <span>{organization.domain}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                  organization.support_tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                  organization.support_tier === 'premium' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {organization.support_tier || 'Standard'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className={`flex items-center gap-1.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right text-sm text-slate-500 font-medium bg-slate-50 px-4 py-3 rounded-lg border border-slate-100">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Registered</div>
            {organization.created_at ? new Date(organization.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'long', day: 'numeric'
            }) : 'N/A'}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div 
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col items-start gap-3 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors"
            onClick={() => setActiveTab('users')}
          >
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users size={18} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800 leading-none mb-1">{orgUsers.length}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Users</div>
            </div>
          </div>
          
          {[
            { label: 'Open Tickets', value: 0, icon: Ticket, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Closed Tickets', value: 0, icon: Ticket, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Pending', value: 0, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Articles', value: 0, icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Last Login', value: 'N/A', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col items-start gap-3">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={18} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800 leading-none mb-1">{stat.value}</div>
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex border-b border-slate-200 px-2 pt-2 bg-slate-50/50">
            {['overview', 'users', 'products', 'contracts', 'audit'].map((tab) => (
              <button
                key={tab}
                onClick={() => ['overview', 'users', 'products', 'contracts', 'audit'].includes(tab) && setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${
                  activeTab === tab 
                    ? 'border-teal-500 text-teal-700 bg-white' 
                    : ['overview', 'users', 'products', 'contracts', 'audit'].includes(tab)
                      ? 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                      : 'border-transparent text-slate-300 cursor-not-allowed'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 bg-white">
            {activeTab === 'overview' && (
              <OrganizationOverviewTab organization={organization} totalUsers={orgUsers.length} />
            )}

            {activeTab === 'users' && (
              <OrganizationUsersTab 
                organization={organization}
                users={orgUsers}
                onUserClick={onUserClick}
                onRefresh={onRefresh}
                onAddUserClick={() => setIsAddUserOpen(true)}
              />
            )}

            {activeTab === 'products' && (
              <OrganizationProductsTab organization={organization} />
            )}

            {activeTab === 'contracts' && (
              <OrganizationContractsTab organization={organization} />
            )}

            {activeTab === 'audit' && (
              <OrganizationAuditTab organization={organization} />
            )}
          </div>
        </div>
      </div>

      <AddOrganizationUserModal 
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        organization={organization}
        onSuccess={() => {
          onRefresh();
          setActiveTab('users');
        }}
      />
    </div>
  );
};
