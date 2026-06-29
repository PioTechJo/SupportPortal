import React, { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Tenant, Profile } from '../../types';
import { OrganizationUsersTable } from './OrganizationUsersTable';

interface OrganizationUsersTabProps {
  organization: Tenant;
  users: Profile[];
  onUserClick: (user: Profile) => void;
  onRefresh: () => void;
  onAddUserClick: () => void;
}

export const OrganizationUsersTab: React.FC<OrganizationUsersTabProps> = ({ 
  organization, 
  users, 
  onUserClick,
  onRefresh,
  onAddUserClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (u.name || u.full_name || '').toLowerCase().includes(term) || 
           (u.email || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Tab Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Users</h2>
          <p className="text-sm text-slate-500">Manage individuals with access to this organization.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <button 
            onClick={onAddUserClick}
            className="shrink-0 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Table Area */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Users size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium mb-1">No users found</p>
          <p className="text-sm text-slate-400">Add a user to grant them access to this organization.</p>
        </div>
      ) : (
        <OrganizationUsersTable 
          users={filteredUsers} 
          onUserClick={onUserClick} 
        />
      )}
    </div>
  );
};
