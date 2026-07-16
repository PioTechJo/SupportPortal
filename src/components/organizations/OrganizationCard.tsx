import React from 'react';
import { Tenant } from '../../types';
import { Building2, Users, Ticket, Calendar, MoreVertical, Edit2, Ban, Eye, MapPin } from 'lucide-react';

interface OrganizationCardProps {
  organization: Tenant;
  usersCount: number;
  openTicketsCount: number;
  onView: (org: Tenant) => void;
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  organization,
  usersCount,
  openTicketsCount,
  onView
}) => {
  const status = (organization as any).status || 'active';
  const isActive = status === 'active';

  return (
    <div 
      onClick={() => onView(organization)}
      className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Header Area with Color Banner */}
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: organization.primary_color || '#0f766e' }}
      />
      
      <div className="p-5 flex-grow flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-sm">
              {organization.logo_url && organization.logo_url.length <= 2 ? (
                <span>{organization.logo_url}</span>
              ) : (
                <Building2 className="text-slate-400" size={24} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">
                {organization.name}
              </h3>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <span>{organization.domain}</span>
                {organization.country && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      {organization.country}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
              isActive 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Support Tier Badge */}
        <div className="mb-5">
          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
            organization.support_tier === 'enterprise' ? 'bg-purple-100 text-purple-700' :
            organization.support_tier === 'premium' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}>
            {organization.support_tier ? organization.support_tier.charAt(0).toUpperCase() + organization.support_tier.slice(1) : 'Standard'}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mt-auto border-t border-slate-100 pt-4">
          <div 
            className="flex items-center gap-2 text-slate-600 p-1.5 -ml-1.5 rounded-lg"
          >
            <Users size={16} className="text-slate-400" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-800 leading-none">{usersCount}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider group-hover:text-teal-600 transition-colors">Users</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-slate-600">
            <Ticket size={16} className="text-amber-500" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-slate-800 leading-none">{openTicketsCount}</span>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Open Tickets</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Calendar size={12} />
          Registered {organization.created_at ? new Date(organization.created_at).toLocaleDateString() : 'N/A'}
        </div>
      </div>
    </div>
  );
};
