import React from 'react';
import { Tenant, Profile } from '../../types';
import { Users, Globe2, CircleDot } from 'lucide-react';

interface OrganizationTableProps {
  organizations: Tenant[];
  profiles: Profile[];
  onView: (org: Tenant) => void;
}

export const OrganizationTable: React.FC<OrganizationTableProps> = ({
  organizations,
  profiles,
  onView
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <th className="p-4 pl-6">Organization</th>
              <th className="p-4">Country</th>
              <th className="p-4">Tier</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Users</th>
              <th className="p-4 text-right pr-6">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organizations.map((org) => {
              const usersCount = profiles.filter(p => (p.customer_id || p.tenant_id) === org.id).length;
              const status = (org as any).status || 'active';
              
              return (
                <tr 
                  key={org.id}
                  onClick={() => onView(org)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ backgroundColor: `${org.primary_color}15` }}
                      >
                        {org.logo_url}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-teal-600 transition-colors flex items-center gap-2">
                          {org.name}
                          {org.customer_code && (
                            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-1.5 py-0.5">
                              {org.customer_code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                          {org.domain}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {org.country ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <Globe2 size={14} className="text-slate-400" />
                        <span className="truncate max-w-[120px]">{org.country}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
                      ${org.support_tier === 'enterprise' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                        org.support_tier === 'premium' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'}`}
                    >
                      {org.support_tier.charAt(0).toUpperCase() + org.support_tier.slice(1)}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <CircleDot size={12} className={status === 'active' ? 'text-teal-500' : 'text-slate-400'} />
                      <span className="text-sm text-slate-600 capitalize">{status}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg w-fit mx-auto border border-slate-100">
                      <Users size={14} className="text-slate-400" />
                      {usersCount}
                    </div>
                  </td>
                  <td className="p-4 pr-6 text-right">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(org);
                      }}
                      className="px-4 py-1.5 text-sm font-bold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
