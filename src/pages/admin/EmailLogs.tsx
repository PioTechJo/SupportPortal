import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Mail, AlertCircle, CheckCircle2, Ticket as TicketIcon, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function EmailLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [retentionDays, setRetentionDays] = useState<number | ''>('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'email_log_retention_days')
        .single();
        
      if (!error && data) {
        setRetentionDays(parseInt(data.setting_value, 10) || 90);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    const days = typeof retentionDays === 'number' ? retentionDays : 7;
    const validDays = Math.max(7, days);
    if (retentionDays !== validDays) setRetentionDays(validDays);

    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'email_log_retention_days',
          setting_value: validDays.toString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });
        
      if (error) throw error;
      
      setSettingsMessage({ text: 'Retention period updated', type: 'success' });
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettingsMessage({ text: 'Failed to update retention period', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select(`
          id,
          recipient_email,
          subject,
          status,
          error_message,
          related_ticket_id,
          sent_at,
          tickets:related_ticket_id ( ticket_no )
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const filteredLogs = logs?.filter(log => 
    log.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Failed to load email logs. Only administrators have access to this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-7 h-7 text-indigo-500" />
            Email Logs
          </h1>
          <p className="text-slate-500 mt-1">View the history of system emails sent to users.</p>
        </div>
        
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Auto-delete logs older than:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="7"
              value={retentionDays}
              onChange={(e) => setRetentionDays(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-20 px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-[#6366f1] focus:border-[#6366f1] outline-none"
            />
            <span className="text-sm text-slate-500">days</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {settingsMessage && (
            <span className={`text-sm font-medium ${settingsMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
              {settingsMessage.text}
            </span>
          )}
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {savingSettings ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Date & Time</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(log.sent_at).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {log.recipient_email}
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md truncate" title={log.subject}>
                      {log.subject}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700" title={log.error_message || 'Unknown error'}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.related_ticket_id ? (
                      <Link 
                        to={`/tickets/${log.related_ticket_id}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline font-medium"
                      >
                        <TicketIcon className="w-4 h-4" />
                        {/* Type casting since the join brings an array or object depending on schema. We assume it's an object or we use the relation name. */}
                        {(log.tickets as any)?.ticket_no || 'View Ticket'}
                      </Link>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              
              {filteredLogs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No email logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
