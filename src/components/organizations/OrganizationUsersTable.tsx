import React from 'react';
import { Profile } from '../../types';
import { Shield, MoreVertical } from 'lucide-react';

interface OrganizationUsersTableProps {
  users: Profile[];
  onUserClick: (user: Profile) => void;
}

export const OrganizationUsersTable: React.FC<OrganizationUsersTableProps> = ({ users, onUserClick }) => {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
          <tr>
            <th className="px-6 py-4">User</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Department</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Last Login</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map(user => (
            <tr 
              key={user.id} 
              onClick={() => onUserClick(user)}
              className="hover:bg-slate-50/50 transition-colors cursor-pointer"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold shadow-sm">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{user.name || user.full_name}</span>
                    <span className="text-xs text-slate-500">{user.email}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Shield size={14} className={
                    user.role_code === 'ADMIN' ? 'text-purple-500' :
                    user.role_code === 'SUPPORT_ENGINEER' ? 'text-blue-500' :
                    'text-slate-400'
                  } />
                  <span className="font-medium">
                    {user.role_name || user.role_code || 'Bank User'}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-slate-500 font-medium">
                {/* Department is a placeholder for now, pending DB schema extension */}
                <span className="text-slate-400 italic">Not set</span>
              </td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                  user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {user.status || 'Active'}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-500 font-medium">
                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={(e) => { e.stopPropagation(); /* Future action menu */ }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
