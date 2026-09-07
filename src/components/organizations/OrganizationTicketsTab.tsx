import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { Tenant } from '../../types';
import { api } from '../../lib/api';
import { Ticket as TicketIcon, Search, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrganizationTicketsTabProps {
  organization: Tenant;
}

const getPriorityStyle = (priority: string) => {
  switch ((priority || '').toLowerCase()) {
    case 'urgent': return 'bg-red-100 text-red-700 border border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border border-orange-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'low': return 'bg-blue-100 text-blue-700 border border-blue-200';
    default: return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

const getStatusStyle = (statusCode: string) => {
  switch ((statusCode || '').toUpperCase()) {
    case 'NEW': return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'ASSIGNED': return 'bg-purple-100 text-purple-700 border border-purple-200';
    case 'INVESTIGATION': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'DEVELOPMENT_ACTION': return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    case 'PENDING_CUSTOMER': return 'bg-orange-100 text-orange-700 border border-orange-200';
    case 'RESOLVED_PENDING_APPROVAL': return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'RESOLVED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'CLOSED': return 'bg-slate-200 text-slate-700 border border-slate-300';
    default: return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  INVESTIGATION: 'Support Action',
  DEVELOPMENT_ACTION: 'Development Action',
  PENDING_CUSTOMER: 'Pending Customer',
  RESOLVED_PENDING_APPROVAL: 'Resolved - Pending Approval',
  APPROVED: 'Approved',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};

export const OrganizationTicketsTab: React.FC<OrganizationTicketsTabProps> = ({ organization }) => {
  const { data: allTickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const orgTickets = useMemo(
    () => (allTickets as any[]).filter(t => t.customer_id === organization.id),
    [allTickets, organization.id]
  );

  const statusOptions = useMemo(() => {
    const codes = new Set<string>();
    orgTickets.forEach(t => { if (t.status_code) codes.add(t.status_code); });
    return Array.from(codes);
  }, [orgTickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgTickets.filter(t => {
      const matchesStatus = statusFilter === 'all' || t.status_code === statusFilter;
      const matchesPriority = priorityFilter === 'all' || (t.priority || '').toLowerCase() === priorityFilter;
      const matchesSearch = !q ||
        t.title?.toLowerCase().includes(q) ||
        t.ticket_no?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q);
      return matchesStatus && matchesPriority && matchesSearch;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orgTickets, search, statusFilter, priorityFilter]);

  const handleExportToExcel = () => {
    const exportData = filteredTickets.map((t: any) => ({
      'Ticket #': t.ticket_no || '',
      'Subject': t.title,
      'Type': t.ticket_type === 'DEVELOPMENT' ? 'Development' : 'Support',
      'Priority': t.priority || '',
      'Status': STATUS_LABELS[t.status_code] || t.status_code || t.status,
      'Assigned To': t.assigned_to_name || 'Unassigned',
      'Product': t.product_name || '',
      'Created': new Date(t.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
    const safeName = organization.name.replace(/[^a-z0-9]+/gi, '_');
    XLSX.writeFile(workbook, `${safeName}_Tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Loading tickets...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <TicketIcon size={24} className="text-teal-600" />
            All Tickets
          </h2>
          <p className="text-sm text-slate-500">Every ticket filed by this bank, across all statuses ({filteredTickets.length} of {orgTickets.length}).</p>
        </div>
        <button
          onClick={handleExportToExcel}
          disabled={filteredTickets.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <FileSpreadsheet size={14} className="text-slate-400" />
          Export to Excel
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject, ticket #, or description..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map(code => (
            <option key={code} value={code}>{STATUS_LABELS[code] || code}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-3">Ticket #</th>
              <th className="px-6 py-3">Subject</th>
              <th className="px-6 py-3">Priority</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Assigned To</th>
              <th className="px-6 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                  No tickets match your filters.
                </td>
              </tr>
            ) : (
              filteredTickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-mono text-slate-600">
                    <Link to={`/tickets/${t.id}`} className="text-teal-600 hover:underline">
                      {t.ticket_no || t.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-slate-800 font-medium max-w-xs truncate">{t.title}</td>
                  <td className="px-6 py-3">
                    {t.ticket_type === 'DEVELOPMENT' ? (
                      <span className="text-slate-300 italic text-xs">—</span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityStyle(t.priority)}`}>
                        {t.priority || 'Medium'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(t.status_code)}`}>
                      {STATUS_LABELS[t.status_code] || t.status_code || t.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{t.assigned_to_name || 'Unassigned'}</td>
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString()}
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
