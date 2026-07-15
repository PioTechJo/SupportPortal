import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle2, User, PlayCircle, ArrowLeftRight, CheckCircle, ChevronRight, History, ArrowLeft, Search, Lock } from 'lucide-react';

function formatDistance(date1: Date, date2: Date): string {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ${diffHours % 24}h`;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'assigned' | 'status_changed' | 'escalated' | 'returned' | 'resolved' | 'closed' | 'approved';
  createdAt: Date;
  actorId: string | null;
  actorName?: string;
  details: string;
  color: string;
  icon: React.ReactNode;
}

const TicketListPicker: React.FC<{ onSelect: (id: string) => void, isRTL: boolean, t: any }> = ({ onSelect, isRTL, t }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tickets')
        .select(`
          id, ticket_no, subject, created_at,
          customers ( customer_name )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) {
        setTickets(data);
      }
      setLoading(false);
    };
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter(t => {
    const tNo = t.ticket_no || `TK-${t.id.substring(0,8).toUpperCase()}`;
    const subj = t.title || t.subject || '';
    const cust = t.customers?.customer_name || '';
    const s = search.toLowerCase();
    return tNo.toLowerCase().includes(s) || subj.toLowerCase().includes(s) || cust.toLowerCase().includes(s);
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-4">{t('ticketLifecycle.selectTicket', 'Select a Ticket')}</h2>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ticketLifecycle.searchPlaceholder', 'Search by ticket no, customer, or subject...')}
            className={`w-full py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
          />
          <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('ticketLifecycle.colTicketNo', 'Ticket No.')}</th>
              <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('ticketLifecycle.colCustomer', 'Customer')}</th>
              <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t('ticketLifecycle.colSubject', 'Subject')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">Loading tickets...</td>
              </tr>
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">No tickets found.</td>
              </tr>
            ) : (
              filteredTickets.map(ticket => {
                const ticketNo = ticket.ticket_no || `TK-${ticket.id.substring(0,8).toUpperCase()}`;
                const customer = ticket.customers?.customer_name || 'N/A';
                const subject = ticket.title || ticket.subject || 'No Subject';
                return (
                  <tr 
                    key={ticket.id} 
                    onDoubleClick={() => onSelect(ticket.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className={`px-6 py-4 text-sm font-semibold text-slate-900 group-hover:text-teal-600 transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>{ticketNo}</td>
                    <td className={`px-6 py-4 text-sm text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{customer}</td>
                    <td className={`px-6 py-4 text-sm text-slate-600 ${isRTL ? 'text-right' : 'text-left'}`}>{subject}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TicketLifecycle: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language.startsWith('ar');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<any>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!selectedTicketId) {
      setTicket(null);
      setEvents([]);
      setError('');
      return;
    }

    const loadTimeline = async () => {
      setLoading(true);
      setError('');
      setTicket(null);
      setEvents([]);

      try {
        // 1. Fetch Ticket
        const { data: ticketData, error: tErr } = await supabase
          .from('tickets')
          .select(`
            id, ticket_no, subject, created_at, created_by,
            status:ticket_statuses(status_code, status_name)
          `)
          .eq('id', selectedTicketId)
          .maybeSingle();

        if (tErr || !ticketData) {
          setError(t('ticketLifecycle.ticketNotFound'));
          setLoading(false);
          return;
        }

        setTicket(ticketData);

      // 2. Fetch Audits
      const { data: audits } = await supabase
        .from('audit_log')
        .select('*')
        .eq('table_name', 'tickets')
        .eq('record_id', ticketData.id);

      // 3. Fetch System Comments (Escalations/Returns)
      const { data: comments } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketData.id)
        .eq('is_system_generated', true);

      // 4. Fetch Statuses mapping
      const { data: statuses } = await supabase.from('ticket_statuses').select('*');
      const statusMap = Object.fromEntries((statuses || []).map(s => [s.id, s]));

      const rawEvents: any[] = [];
      const userIds = new Set<string>();
      if (ticketData.created_by) userIds.add(ticketData.created_by);

      // Add Created
      rawEvents.push({
        id: `created-${ticketData.id}`,
        type: 'created',
        createdAt: new Date(ticketData.created_at),
        actorId: ticketData.created_by,
        details: ticketData.subject,
        color: '#3B82F6', // blue
        icon: <PlayCircle size={16} />
      });

      // Parse Audits
      for (const a of audits || []) {
        if (a.changed_by) userIds.add(a.changed_by);
        const newVal = typeof a.new_value === 'string' ? JSON.parse(a.new_value) : a.new_value;
        
        if (a.action_type === 'ASSIGNMENT') {
          if (newVal?.assigned_to) userIds.add(newVal.assigned_to);
          rawEvents.push({
            id: a.id,
            type: 'assigned',
            createdAt: new Date(a.changed_at),
            actorId: a.changed_by,
            details: newVal?.assigned_to || 'Unknown',
            devId: newVal?.assigned_to,
            color: '#8B5CF6', // purple
            icon: <User size={16} />
          });
        } else if (a.action_type === 'STATUS_CHANGE' || a.action_type === 'RESOLUTION_SUBMITTED' || a.action_type === 'TICKET_CLOSED' || a.action_type === 'RESOLUTION_APPROVED') {
          const s = statusMap[newVal?.status_id];
          const code = (s?.status_code || '').toUpperCase();
          let type = 'status_changed';
          let color = '#F59E0B'; // yellow/orange
          let icon = <ChevronRight size={16} />;
          
          if (code === 'RESOLVED') { type = 'resolved'; color = '#10B981'; icon = <CheckCircle2 size={16} />; }
          if (code === 'CLOSED') { type = 'closed'; color = '#1F2937'; icon = <CheckCircle size={16} />; }
          if (code === 'APPROVED') { type = 'approved'; color = '#059669'; icon = <Lock size={16} />; }
          
          rawEvents.push({
            id: a.id,
            type,
            createdAt: new Date(a.changed_at),
            actorId: a.changed_by,
            details: s?.status_name || code,
            color,
            icon
          });
        }
      }

      // Parse Comments
      for (const c of comments || []) {
        if (c.author_id) userIds.add(c.author_id);
        const txt = c.comment_text || '';
        
        if (txt.includes('Escalation returned')) {
          rawEvents.push({
            id: c.id,
            type: 'returned',
            createdAt: new Date(c.created_at),
            actorId: c.author_id,
            details: '',
            color: '#F43F5E', // rose
            icon: <ArrowLeftRight size={16} />
          });
        } else if (txt.includes('Ticket escalated')) {
          const team = txt.split('team: ')[1] || txt.split('to: ')[1] || 'Unknown';
          rawEvents.push({
            id: c.id,
            type: 'escalated',
            createdAt: new Date(c.created_at),
            actorId: c.author_id,
            details: team,
            color: '#F97316', // orange
            icon: <ArrowLeftRight size={16} />
          });
        }
      }

      // 5. Fetch Users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', Array.from(userIds));
      const userMap = Object.fromEntries((usersData || []).map(u => [u.id, u.full_name]));

      // 6. Map and sort
      const finalEvents: TimelineEvent[] = rawEvents
        .map(re => ({
          ...re,
          actorName: userMap[re.actorId] || 'System',
          details: re.devId ? (userMap[re.devId] || re.details) : re.details
        }))
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      setEvents(finalEvents);

    } catch (err) {
      console.error(err);
      setError(t('ticketLifecycle.ticketNotFound'));
    } finally {
      setLoading(false);
    }
  };

  loadTimeline();
}, [selectedTicketId, t]);

  const totalDuration = events.length > 0 
    ? formatDistance(events[events.length - 1].createdAt, events[0].createdAt)
    : '-';

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {selectedTicketId && (
              <button 
                onClick={() => setSelectedTicketId(null)}
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 shadow-sm"
              >
                <ArrowLeft size={16} />
                Back to List
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{t('ticketLifecycle.title')}</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">Track the full journey of a support ticket.</p>
        </div>
      </div>

      {!selectedTicketId ? (
        <div className="mb-8">
          <TicketListPicker onSelect={setSelectedTicketId} isRTL={isRTL} t={t} />
        </div>
      ) : (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-8 text-sm">
              {error}
            </div>
          )}

      {ticket && events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">
                {ticket.ticket_no} - {ticket.subject}
              </h2>
              
              <div className="relative">
                {/* Vertical Line */}
                <div className={`absolute top-0 bottom-0 w-0.5 bg-slate-200 ${isRTL ? 'right-7' : 'left-7'}`}></div>

                <div className="space-y-8 relative">
                  {events.map((ev, idx) => {
                    let elapsed = '';
                    if (idx > 0) {
                      const prevTime = events[idx - 1].createdAt;
                      const currTime = ev.createdAt;
                      if (currTime.getTime() - prevTime.getTime() > 60000) {
                        elapsed = formatDistance(currTime, prevTime);
                      } else {
                        elapsed = t('ticketLifecycle.justNow');
                      }
                    }

                    return (
                      <div key={ev.id} className="relative flex items-start group">
                        
                        {/* Time connector label */}
                        {idx > 0 && (
                          <div className={`absolute -top-6 text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100 ${isRTL ? 'right-12' : 'left-12'}`}>
                            +{elapsed}
                          </div>
                        )}

                        <div className={`absolute top-0 ${isRTL ? 'right-4' : 'left-4'} w-6 h-6 rounded-full flex items-center justify-center text-white ring-4 ring-white shadow-sm z-10 transition-transform group-hover:scale-110`} style={{ backgroundColor: ev.color }}>
                          {ev.icon}
                        </div>
                        
                        <div className={`flex-1 ${isRTL ? 'mr-16' : 'ml-16'} bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all`}>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                            <span className="font-bold text-slate-800 text-sm flex items-center gap-2" style={{ color: ev.color }}>
                              {t(`ticketLifecycle.events.${ev.type}`)} 
                              {ev.details && <span className="text-slate-600 font-medium">— {ev.details}</span>}
                            </span>
                            <span className="text-xs text-slate-400 font-mono bg-white px-2 py-1 rounded border border-slate-100">
                              {ev.createdAt.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <User size={13} className="text-slate-400" />
                            <span>{t('ticketLifecycle.by')} <strong className="text-slate-700">{ev.actorName}</strong></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('ticketLifecycle.totalDuration')}</p>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold">
                    <Clock size={16} className="text-teal-500" />
                    {totalDuration}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">{t('ticketLifecycle.currentStatus')}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {ticket.status?.status_name || 'Unknown'}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

          {loading && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm border-dashed">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Loading timeline...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
