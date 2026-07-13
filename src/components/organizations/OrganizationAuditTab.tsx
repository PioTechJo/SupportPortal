import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Tenant } from '../../types';
import { Activity, Clock } from 'lucide-react';

interface OrganizationAuditTabProps {
  organization: Tenant;
}

export const OrganizationAuditTab: React.FC<OrganizationAuditTabProps> = ({ organization }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      try {
        // Fetch tickets and contracts IDs
        const [ticketsRes, contractsRes] = await Promise.all([
          supabase.from('tickets').select('id').eq('customer_id', organization.id),
          supabase.from('maintenance_contracts').select('id').eq('customer_id', organization.id)
        ]);

        const ticketIds = (ticketsRes.data || []).map(t => t.id);
        const contractIds = (contractsRes.data || []).map(c => c.id);
        const allIds = [...ticketIds, ...contractIds];

        console.log('--- AUDIT LOG DEBUG START ---');
        console.log('1. Organization ID:', organization.id);
        console.log('2. Ticket IDs count:', ticketIds.length);
        console.log('3. Contract IDs count:', contractIds.length);
        console.log('4. All IDs array to query in audit_log:', allIds);

        if (allIds.length === 0) {
          console.log('5. No IDs found. Returning empty array.');
          setLogs([]);
          return;
        }

        // Fetch audit logs for these records.
        const { data: logsData, error: logsError } = await supabase
          .from('audit_log')
          .select('*')
          .in('record_id', allIds)
          .order('changed_at', { ascending: false })
          .limit(100);

        console.log('6. Query Result - Error:', logsError);
        console.log('7. Query Result - Data length:', logsData?.length);
        console.log('8. Query Result - Raw Data:', logsData);
        console.log('--- AUDIT LOG DEBUG END ---');

        if (logsError) {
          throw logsError;
        }

        // 1. Extract all UUIDs from old_value, new_value, and changed_by
        const possibleUuids = new Set<string>();
        
        const extractUuids = (obj: any) => {
          if (!obj) return;
          if (typeof obj === 'string' && uuidRegex.test(obj)) {
            possibleUuids.add(obj);
          } else if (typeof obj === 'object') {
            Object.values(obj).forEach(val => extractUuids(val));
          }
        };

        logsData?.forEach(log => {
          extractUuids(log.old_value);
          extractUuids(log.new_value);
          if (log.changed_by) possibleUuids.add(log.changed_by);
        });

        const uuidArray = Array.from(possibleUuids);
        let translationsMap: Record<string, string> = {};
        
        if (uuidArray.length > 0) {
          const [usersData, statusesData] = await Promise.all([
            supabase.from('users').select('id, full_name').in('id', uuidArray),
            supabase.from('ticket_statuses').select('id, status_name').in('id', uuidArray)
          ]);
            
          if (usersData.data) {
            usersData.data.forEach(u => { translationsMap[u.id] = u.full_name; });
          }
          if (statusesData.data) {
            statusesData.data.forEach(s => { translationsMap[s.id] = s.status_name; });
          }
        }

        setTranslations(translationsMap);

        const enhancedLogs = (logsData || []).map(log => ({
          ...log,
          changed_by_name: translationsMap[log.changed_by] || log.changed_by || 'System'
        }));

        setLogs(enhancedLogs);

      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, [organization.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Loading audit logs...
      </div>
    );
  }

  const renderDetails = (log: any) => {
    if (!log.old_value && !log.new_value) {
      return <span className="text-slate-400 italic">No details</span>;
    }

    const keys = new Set([...Object.keys(log.old_value || {}), ...Object.keys(log.new_value || {})]);

    return (
      <div className="flex flex-col gap-1 max-w-xs">
        {Array.from(keys).map((key) => {
          const oldVal = log.old_value?.[key];
          const newVal = log.new_value?.[key];

          const translate = (val: any) => {
            if (val === null || val === undefined) return 'Unassigned';
            if (typeof val === 'string' && uuidRegex.test(val)) {
              return translations[val] || val.substring(0, 8);
            }
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val);
          };

          if (key === 'status_id') {
            return (
              <div key={key} className="truncate" title={`From: ${translate(oldVal)} → To: ${translate(newVal)}`}>
                <span className="text-slate-400 font-medium">From:</span> {translate(oldVal)} <span className="text-slate-400">→</span> <span className="text-teal-600/70 font-medium">To:</span> {translate(newVal)}
              </div>
            );
          } else if (key === 'assigned_to') {
            return (
              <div key={key} className="truncate text-teal-700" title={`Assigned to: ${translate(newVal)}`}>
                <span className="text-teal-600/70 font-medium">Assigned to:</span> {translate(newVal)}
              </div>
            );
          } else {
            return (
              <div key={key} className="truncate">
                <span className="text-slate-500 font-medium">{key}:</span>{' '}
                {oldVal !== undefined && (
                  <><span className="text-slate-400 line-through mr-1">{translate(oldVal)}</span>{' '}</>
                )}
                {newVal !== undefined && <span className="text-teal-700">{translate(newVal)}</span>}
              </div>
            );
          }
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Activity size={24} className="text-teal-600" />
            Audit Log
          </h2>
          <p className="text-sm text-slate-500">History of changes and events related to this organization's records.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-4 w-48">Date & Time</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Record Type</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">Performed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No audit logs found for this organization.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-600 font-medium flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    {new Date(log.changed_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200">
                      {log.action_type || log.action || 'UPDATE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {log.table_name || 'System'}
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {renderDetails(log)}
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">
                    {log.changed_by_name || log.performed_by_name || 'System'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
