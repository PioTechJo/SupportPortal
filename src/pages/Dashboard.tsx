import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { 
  Plus, 
  HelpCircle, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Building,
  UserCheck
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { tenants } = useTenant();
  const { tickets, activeTicketsCount, isLoading } = useTickets();
  const navigate = useNavigate();

  // Metrics calculation
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const closedTickets = tickets.filter(t => t.status === 'closed').length;
  const urgentTickets = tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length;

  const priorityUrgentCount = tickets.filter(t => t.priority === 'urgent').length;
  const priorityHighCount = tickets.filter(t => t.priority === 'high').length;
  const priorityMedCount = tickets.filter(t => t.priority === 'medium').length;
  const priorityLowCount = tickets.filter(t => t.priority === 'low').length;

  const currentAndRecent = tickets.slice(0, 5);

  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusStyle = (statusCode: string) => {
    switch((statusCode || '').toUpperCase()) {
      case 'NEW': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVESTIGATION': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DEVELOPMENT_ACTION': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PENDING_CUSTOMER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      // Fallbacks if only status string is provided
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Welcome Banner */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('dashboard.greeting', { name: user?.full_name })}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role_code === 'client'
              ? t('dashboard.subtitleClient')
              : t('dashboard.subtitleAdmin')}
          </p>
        </div>
        <button
          onClick={() => navigate('/tickets?action=create')}
          className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
        >
          <Plus size={16} />
          {t('dashboard.fileSupportTicket')}
        </button>
      </div>

      {/* Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white h-28 rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('dashboard.activeTickets')}</span>
              <Activity size={18} className="text-teal-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {activeTicketsCount}
            </p>
            <div className="text-[10.5px] mt-2 text-slate-500 flex gap-2 font-mono">
              <span>{t('dashboard.openCount', { count: openTickets })}</span>
              <span>•</span>
              <span>{t('dashboard.inProgressCount', { count: inProgressTickets })}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('dashboard.urgentPending')}</span>
              <AlertTriangle size={18} className="text-red-600 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {urgentTickets}
            </p>
            <p className="text-[10.5px] text-red-600 font-semibold mt-2">
              {t('dashboard.actionRequired')}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('dashboard.successfullyResolved')}</span>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {resolvedTickets}
            </p>
            <p className="text-[10.5px] text-emerald-600 font-semibold mt-2">
              {t('dashboard.readyForReview')}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('dashboard.totalFiledHistory')}</span>
              <Clock size={18} className="text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mt-2 font-mono">
              {totalTickets}
            </p>
            <p className="text-[10.5px] text-slate-500 mt-2">
              {t('dashboard.allTicketsLogged')}
            </p>
          </div>
        </div>
      )}

      {/* Grid: Charts & Ticket Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left pane: Charts & Analytics details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm uppercase tracking-wider font-extrabold text-slate-600 mb-4 flex items-center justify-between">
              <span>{t('dashboard.supportTicketDistribution')}</span>
              <span className="text-[11px] font-mono font-medium lowercase text-slate-400">{t('dashboard.updatedRealTime')}</span>
            </h3>

            {/* SVG Visual Bars */}
            {isLoading ? (
              <div className="h-48 flex items-center justify-center text-slate-400">
                {t('dashboard.fetchingMetrics')}
              </div>
            ) : totalTickets === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                {t('dashboard.noMetrics')}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Horizontal Stat Bar: Status */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono mb-2">{t('dashboard.byTicketStatus')}</h4>
                  <div className="h-8 w-full rounded-lg bg-slate-100 overflow-hidden flex shadow-inner">
                    {openTickets > 0 && (
                      <div 
                        style={{ width: `${(openTickets / totalTickets) * 100}%` }} 
                        className="bg-indigo-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('dashboard.legendOpen')}: ${openTickets}`}
                      >
                        {openTickets > 1 && `${Math.round((openTickets / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {inProgressTickets > 0 && (
                      <div 
                        style={{ width: `${(inProgressTickets / totalTickets) * 100}%` }} 
                        className="bg-amber-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('dashboard.legendInProgress')}: ${inProgressTickets}`}
                      >
                        {inProgressTickets > 1 && `${Math.round((inProgressTickets / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {resolvedTickets > 0 && (
                      <div 
                        style={{ width: `${(resolvedTickets / totalTickets) * 100}%` }} 
                        className="bg-emerald-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('dashboard.legendResolved')}: ${resolvedTickets}`}
                      >
                        {resolvedTickets > 1 && `${Math.round((resolvedTickets / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {closedTickets > 0 && (
                      <div 
                        style={{ width: `${(closedTickets / totalTickets) * 100}%` }} 
                        className="bg-slate-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('dashboard.legendClosed')}: ${closedTickets}`}
                      >
                        {closedTickets > 1 && `${Math.round((closedTickets / totalTickets) * 100)}%`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-500 rounded" />{t('dashboard.legendOpen')} ({openTickets})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-500 rounded" />{t('dashboard.legendInProgress')} ({inProgressTickets})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded" />{t('dashboard.legendResolved')} ({resolvedTickets})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-500 rounded" />{t('dashboard.legendClosed')} ({closedTickets})</span>
                  </div>
                </div>

                {/* Horizontal Stat Bar: Priority */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono mb-2">{t('dashboard.byPrioritySeverity')}</h4>
                  <div className="h-8 w-full rounded-lg bg-slate-100 overflow-hidden flex shadow-inner">
                    {priorityUrgentCount > 0 && (
                      <div 
                        style={{ width: `${(priorityUrgentCount / totalTickets) * 100}%` }} 
                        className="bg-rose-600 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('tickets.urgent')}: ${priorityUrgentCount}`}
                      >
                        {priorityUrgentCount > 1 && `${Math.round((priorityUrgentCount / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {priorityHighCount > 0 && (
                      <div 
                        style={{ width: `${(priorityHighCount / totalTickets) * 100}%` }} 
                        className="bg-amber-600 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('tickets.high')}: ${priorityHighCount}`}
                      >
                        {priorityHighCount > 1 && `${Math.round((priorityHighCount / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {priorityMedCount > 0 && (
                      <div 
                        style={{ width: `${(priorityMedCount / totalTickets) * 100}%` }} 
                        className="bg-blue-600 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('tickets.medium')}: ${priorityMedCount}`}
                      >
                        {priorityMedCount > 1 && `${Math.round((priorityMedCount / totalTickets) * 100)}%`}
                      </div>
                    )}
                    {priorityLowCount > 0 && (
                      <div 
                        style={{ width: `${(priorityLowCount / totalTickets) * 100}%` }} 
                        className="bg-slate-400 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                        title={`${t('tickets.low')}: ${priorityLowCount}`}
                      >
                        {priorityLowCount > 1 && `${Math.round((priorityLowCount / totalTickets) * 100)}%`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-600 rounded" />{t('tickets.urgent')} ({priorityUrgentCount})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-amber-600 rounded" />{t('tickets.high')} ({priorityHighCount})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-600 rounded" />{t('tickets.medium')} ({priorityMedCount})</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-slate-400 rounded" />{t('tickets.low')} ({priorityLowCount})</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Active SLA Support Tiers info (for visual balance) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Building className="text-teal-600" size={16} />
                {t('dashboard.slaResponseWindows')}
              </h4>
              <ul className="mt-3.5 space-y-2 text-xs text-slate-500">
                <li className="flex justify-between border-b border-slate-100 pb-1.5"><span className="font-semibold text-slate-700">{t('dashboard.urgentSla')}:</span> <span className="bg-red-50 text-red-600 font-bold px-1.5 rounded font-mono">{t('dashboard.slaUrgentValue')}</span></li>
                <li className="flex justify-between border-b border-slate-100 pb-1.5"><span className="font-semibold text-slate-700">{t('dashboard.highSla')}:</span> <span className="bg-amber-50 text-amber-600 font-bold px-1.5 rounded font-mono font-medium">{t('dashboard.slaHighValue')}</span></li>
                <li className="flex justify-between"><span className="font-semibold text-slate-700">{t('dashboard.mediumGeneralSla')}:</span> <span className="bg-blue-50 text-blue-600 font-bold px-1.5 rounded font-mono">{t('dashboard.slaMediumValue')}</span></li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <UserCheck className="text-teal-600" size={16} />
                  {t('dashboard.activeAgentDuty')}
                </h4>
                <p className="text-xs text-slate-500 mt-2">
                  {t('dashboard.agentOnlineNote')}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-teal-600 font-semibold uppercase tracking-wider flex items-center justify-between">
                <span>{t('dashboard.shiftStatusActive')}</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Recent Activity / Recent tickets list */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider">
                  {t('dashboard.recentTicketIntake')}
                </h3>
                <button
                  onClick={() => navigate('/tickets')}
                  className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
                >
                  {t('dashboard.viewAll')}
                </button>
              </div>

              {isLoading ? (
                <div className="space-y-4 mt-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 bg-slate-100 rounded w-3/4" />
                        <div className="h-2 bg-slate-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentAndRecent.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {t('dashboard.noTicketsDocumented')}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 mt-2">
                  {currentAndRecent.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      onClick={() => navigate(`/tickets?id=${ticket.id}`)}
                      className="py-3.5 flex items-start gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition"
                    >
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-teal-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {ticket.title}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate uppercase">
                          {ticket.id} • {ticket.customer_name || t('dashboard.systemFallback')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 border rounded-full leading-none py-0.5 ${getPriorityStyle(ticket.priority)}`}>
                            {t(`priorityLabels.${(ticket.priority || '').toUpperCase()}`, { defaultValue: ticket.priority })}
                          </span>
                          <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 border rounded-full leading-none py-0.5 ${getStatusStyle(ticket.status_code || ticket.status)}`}>
                            {ticket.status_code
                              ? t(`statusLabels.${ticket.status_code}`, { defaultValue: ticket.status_code.replace('_', ' ') })
                              : ticket.status}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 self-center" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-center text-slate-400">
              {t('dashboard.footerNote')}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
