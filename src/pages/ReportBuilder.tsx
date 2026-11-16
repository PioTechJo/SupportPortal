import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileSpreadsheet,
  Download,
  X,
  GripVertical,
  Search,
  Plus,
  Check,
  List,
  Layers,
  Sparkles,
  Ticket as TicketIcon,
  CircleDot,
  CheckCircle2,
  Timer,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
} from 'lucide-react';

type FieldDef = { id: string; label: string; category: string };
type ReportMode = 'group' | 'list';

const formatDuration = (ms: number) => {
  if (ms < 0) return '0h';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
};

const AVAILABLE_FIELDS: FieldDef[] = [
  // Ticket Info
  { id: 'subject', label: 'Ticket Title', category: 'Ticket Info' },
  { id: 'status_code', label: 'Status', category: 'Ticket Info' },
  { id: 'priority_name', label: 'Priority', category: 'Ticket Info' },
  { id: 'category_id', label: 'Category', category: 'Ticket Info' },
  { id: 'environment', label: 'Environment', category: 'Ticket Info' },
  { id: 'business_impact', label: 'Business Impact', category: 'Ticket Info' },

  // Relations
  { id: 'customer_name', label: 'Customer (Bank)', category: 'Relations' },
  { id: 'product_name', label: 'Product', category: 'Relations' },
  { id: 'assigned_to_name', label: 'Assigned To (Engineer)', category: 'Relations' },

  // Dates
  { id: 'created_at', label: 'Start Date', category: 'Dates' },
  { id: 'assigned_at', label: 'Assigned Date', category: 'Dates' },
  { id: 'resolution_approved_at', label: 'Approved Date', category: 'Dates' },
  { id: 'closed_at', label: 'End Date', category: 'Dates' },

  // Computed Metrics
  { id: 'duration_computed', label: 'Duration', category: 'Computed Metrics' },
  { id: 'time_open', label: 'Duration to Close (Legacy)', category: 'Computed Metrics' },
  { id: 'escalated', label: 'Escalated', category: 'Computed Metrics' },
];

const fieldById = (id: string) => AVAILABLE_FIELDS.find(f => f.id === id)!;

const DEFAULT_LIST_FIELDS = ['subject', 'created_at', 'customer_name', 'assigned_to_name', 'product_name', 'time_open', 'escalated'];

const TEMPLATES: { key: string; title: string; hint: string; mode: ReportMode; fields: string[] }[] = [
  { key: 'full', title: 'Full ticket list', hint: 'Every ticket with key details', mode: 'list', fields: DEFAULT_LIST_FIELDS },
  { key: 'by-bank', title: 'Tickets by bank', hint: 'Count per customer', mode: 'group', fields: ['customer_name'] },
  { key: 'by-engineer', title: 'Workload by engineer', hint: 'Count per assignee', mode: 'group', fields: ['assigned_to_name'] },
  { key: 'by-product-status', title: 'Product & status', hint: 'Count per product and status', mode: 'group', fields: ['product_name', 'status_code'] },
  { key: 'esc', title: 'Escalation review', hint: 'Which tickets were escalated', mode: 'list', fields: ['subject', 'customer_name', 'product_name', 'assigned_to_name', 'escalated', 'duration_computed'] },
];

const OPEN_CLOSED = ['RESOLVED', 'CLOSED', 'APPROVED'];

export const ReportBuilder: React.FC = () => {
  const [reportMode, setReportMode] = useState<ReportMode>('list');
  const [fields, setFields] = useState<FieldDef[]>(DEFAULT_LIST_FIELDS.map(fieldById));
  const [activeTemplate, setActiveTemplate] = useState<string>('full');
  const [fieldSearch, setFieldSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Filters
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [engineerFilter, setEngineerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [textSearch, setTextSearch] = useState<string>('');

  // List table state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const { data: allTickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
    refetchInterval: 15000,
  });

  const { data: escalations = [], isLoading: escLoading } = useQuery({
    queryKey: ['escalations'],
    queryFn: () => api.getAllInternalEscalations(),
    refetchInterval: 30000,
  });

  const isLoading = ticketsLoading || escLoading;

  const statusOf = (t: any) => String(t.status_code || t.status || '').toUpperCase();
  const priorityOf = (t: any) => String(t.priority_name || t.priority || '');

  // Dropdown options derived from the data
  const options = useMemo(() => {
    const banks = new Map<string, string>();
    const statuses = new Set<string>();
    const priorities = new Set<string>();
    const products = new Set<string>();
    const engineers = new Set<string>();
    allTickets.forEach((t: any) => {
      if (t.customer_id && t.customer_name) banks.set(t.customer_id, t.customer_name);
      if (statusOf(t)) statuses.add(statusOf(t));
      if (priorityOf(t)) priorities.add(priorityOf(t));
      if (t.product_name) products.add(t.product_name);
      if (t.assigned_to_name) engineers.add(t.assigned_to_name);
    });
    const sort = (a: string, b: string) => a.localeCompare(b);
    return {
      banks: Array.from(banks.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => sort(a.name, b.name)),
      statuses: Array.from(statuses).sort(sort),
      priorities: Array.from(priorities).sort(sort),
      products: Array.from(products).sort(sort),
      engineers: Array.from(engineers).sort(sort),
    };
  }, [allTickets]);

  const tickets = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    const q = textSearch.trim().toLowerCase();
    return allTickets.filter((t: any) => {
      if (selectedCustomerId !== 'all' && t.customer_id !== selectedCustomerId) return false;
      if (statusFilter !== 'all' && statusOf(t) !== statusFilter) return false;
      if (priorityFilter !== 'all' && priorityOf(t) !== priorityFilter) return false;
      if (productFilter !== 'all' && t.product_name !== productFilter) return false;
      if (engineerFilter !== 'all' && t.assigned_to_name !== engineerFilter) return false;
      if (from || to) {
        const created = t.created_at ? new Date(t.created_at).getTime() : null;
        if (created === null) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }
      if (q) {
        const hay = `${t.title || ''} ${t.subject || ''} ${t.ticket_no || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTickets, selectedCustomerId, statusFilter, priorityFilter, productFilter, engineerFilter, dateFrom, dateTo, textSearch]);

  const activeFilterCount = [
    selectedCustomerId !== 'all',
    statusFilter !== 'all',
    priorityFilter !== 'all',
    productFilter !== 'all',
    engineerFilter !== 'all',
    !!dateFrom,
    !!dateTo,
    !!textSearch.trim(),
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSelectedCustomerId('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setProductFilter('all');
    setEngineerFilter('all');
    setDateFrom('');
    setDateTo('');
    setTextSearch('');
    setPage(1);
  };

  const extractValue = (ticket: any, fieldId: string) => {
    if (fieldId === 'created_at') return ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '';
    if (fieldId === 'closed_at') return ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : 'Still Open';

    if (fieldId === 'duration_computed') {
      if (!ticket.created_at) return '';
      const created = new Date(ticket.created_at).getTime();
      if (ticket.closed_at) {
        const end = new Date(ticket.closed_at).getTime();
        return formatDuration(end - created);
      } else {
        const end = Date.now();
        return `Ongoing (${formatDuration(end - created)} so far)`;
      }
    }

    if (fieldId === 'time_open') {
      const code = (ticket.status_code || '').toUpperCase();
      const isResolved = OPEN_CLOSED.includes(code) || ['resolved', 'closed'].includes(ticket.status);
      const created = new Date(ticket.created_at).getTime();
      let end = Date.now();
      if (isResolved) {
        const resolvedAt = ticket.resolution_approved_at || ticket.resolved_at || ticket.updated_at;
        end = resolvedAt ? new Date(resolvedAt).getTime() : new Date(ticket.updated_at).getTime();
      }
      return formatDuration(end - created);
    }

    if (fieldId === 'escalated') {
      const ticketEscs = escalations.filter((e: any) => e.ticket_id === ticket.id && e.is_internal);
      if (ticketEscs.length > 0) {
        const teamDetails = ticketEscs.map((e: any) => {
          const escStart = new Date(e.created_at).getTime();
          let escDuration = '';
          if (e.escalation_returned_at) {
            escDuration = formatDuration(new Date(e.escalation_returned_at).getTime() - escStart);
          } else {
            escDuration = formatDuration(Date.now() - escStart) + ' (ongoing)';
          }
          return `${e.teams?.team_name || 'Unknown Team'} (${escDuration})`;
        }).join(', ');
        return `Yes - ${teamDetails}`;
      }
      return 'No';
    }

    if (fieldId === 'subject') return ticket.title || ticket.subject || '—';

    let val = ticket[fieldId];

    if (fieldId === 'status_code' && !val) val = ticket.status;
    if (fieldId === 'priority_name' && !val) val = ticket.priority;
    if (fieldId === 'customer_name' && !val) val = ticket.tenant_name || 'Global Core';

    if (fieldId.endsWith('_at') && val) {
      try {
        return new Date(val).toISOString().split('T')[0];
      } catch {
        return 'Invalid Date';
      }
    }

    return val ? String(val) : 'N/A';
  };

  // ---- KPIs ----
  const kpis = useMemo(() => {
    const total = tickets.length;
    const closed = tickets.filter((t: any) => OPEN_CLOSED.includes(statusOf(t))).length;
    const durations = tickets
      .filter((t: any) => t.closed_at && t.created_at)
      .map((t: any) => new Date(t.closed_at).getTime() - new Date(t.created_at).getTime())
      .filter((ms: number) => ms >= 0);
    const avg = durations.length ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : null;
    return { total, closed, open: total - closed, avg };
  }, [tickets]);

  // ---- Grouped data ----
  const groupData = useMemo(() => {
    if (reportMode !== 'group' || fields.length === 0 || tickets.length === 0) return [];
    const groups: Record<string, any> = {};
    tickets.forEach((ticket: any) => {
      const fieldValues = fields.map(f => extractValue(ticket, f.id));
      const compositeKey = fieldValues.join(' | ');
      if (!groups[compositeKey]) {
        groups[compositeKey] = { compositeKey, ticketCount: 0 };
        fields.forEach((f, idx) => { groups[compositeKey][f.id] = fieldValues[idx]; });
      }
      groups[compositeKey].ticketCount += 1;
    });
    return Object.values(groups).sort((a: any, b: any) => b.ticketCount - a.ticketCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, fields, reportMode, escalations]);

  const maxGroupCount = groupData.length ? (groupData[0] as any).ticketCount : 0;

  // ---- List data (sorted + paginated) ----
  const sortValue = (ticket: any, id: string): string | number => {
    if (id.endsWith('_at') && ticket[id]) return new Date(ticket[id]).getTime();
    return String(extractValue(ticket, id)).toLowerCase();
  };

  const sortedList = useMemo(() => {
    if (reportMode !== 'list') return [];
    if (!sortKey) return tickets;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...tickets].sort((a: any, b: any) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, sortKey, sortDir, reportMode, escalations]);

  const totalPages = Math.max(1, Math.ceil(sortedList.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (id: string) => {
    if (sortKey === id) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(id);
      setSortDir('asc');
    }
  };

  // ---- Field management ----
  const hasField = (id: string) => fields.some(f => f.id === id);
  const toggleField = (field: FieldDef) => {
    setActiveTemplate('');
    setPage(1);
    setFields(prev => (prev.some(f => f.id === field.id) ? prev.filter(f => f.id !== field.id) : [...prev, field]));
  };
  const removeField = (id: string) => {
    setActiveTemplate('');
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES.find(t => t.key === key);
    if (!tpl) return;
    setReportMode(tpl.mode);
    setFields(tpl.fields.map(fieldById));
    setActiveTemplate(key);
    setSortKey(null);
    setPage(1);
  };

  const switchMode = (mode: ReportMode) => {
    if (mode === reportMode) return;
    setReportMode(mode);
    setActiveTemplate('');
    setSortKey(null);
    setPage(1);
    setFields(mode === 'list' ? DEFAULT_LIST_FIELDS.map(fieldById) : []);
  };

  const handleFieldDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData('fieldId', fieldId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropOnBar = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldId = e.dataTransfer.getData('fieldId');
    if (!fieldId) return;
    const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
    if (field && !hasField(fieldId)) {
      setActiveTemplate('');
      setFields(prev => [...prev, field]);
    }
  };

  const reorderTo = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    setFields(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  // ---- Export ----
  const buildExportRows = () => {
    if (reportMode === 'group') {
      return (groupData as any[]).map(row => {
        const out: Record<string, string | number> = {};
        fields.forEach(f => { out[f.label] = row[f.id]; });
        out['Ticket Count'] = row.ticketCount;
        return out;
      });
    }
    return sortedList.map((ticket: any) => {
      const out: Record<string, string | number> = {};
      out['Ticket #'] = ticket.ticket_no || ticket.id.slice(0, 8).toUpperCase();
      fields.forEach(f => { out[f.label] = extractValue(ticket, f.id); });
      return out;
    });
  };

  const canExport = fields.length > 0 && (reportMode === 'group' ? groupData.length > 0 : tickets.length > 0);
  const stamp = () => new Date().toISOString().split('T')[0];

  const handleExportCSV = () => {
    if (!canExport) return;
    const csv = Papa.unparse(buildExportRows());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Custom_Report_${stamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!canExport) return;
    const ws = XLSX.utils.json_to_sheet(buildExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `Custom_Report_${stamp()}.xlsx`);
  };

  // ---- Field picker ----
  const fieldsByCategory = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    return AVAILABLE_FIELDS.filter(f => !q || f.label.toLowerCase().includes(q)).reduce((acc, field) => {
      (acc[field.category] ||= []).push(field);
      return acc;
    }, {} as Record<string, FieldDef[]>);
  }, [fieldSearch]);

  // ---- Small UI helpers ----
  const selectCls =
    'h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition max-w-[190px]';

  const kpiCards = [
    { label: 'Tickets in report', value: String(kpis.total), icon: TicketIcon, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Open', value: String(kpis.open), icon: CircleDot, tint: 'bg-amber-50 text-amber-600' },
    { label: 'Resolved / closed', value: String(kpis.closed), icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Avg. time to close', value: kpis.avg === null ? '—' : formatDuration(kpis.avg), icon: Timer, tint: 'bg-violet-50 text-violet-600' },
  ];

  const SortIcon = ({ id }: { id: string }) =>
    sortKey !== id ? (
      <ChevronsUpDown size={12} className="inline ml-1 text-slate-300" />
    ) : sortDir === 'asc' ? (
      <ChevronUp size={12} className="inline ml-1 text-blue-500" />
    ) : (
      <ChevronDown size={12} className="inline ml-1 text-blue-500" />
    );

  return (
    <div className="font-sans px-4 md:px-8 py-6 max-w-[1600px] mx-auto w-full space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-slate-900">Report Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Pick a template or choose your own fields, filter the data, then export.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!canExport}
            className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Download size={15} className="text-slate-400" /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={!canExport}
            className="flex items-center gap-2 h-10 px-4 bg-[#3B82F6] hover:bg-[#2563eb] text-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={textSearch}
              onChange={e => { setTextSearch(e.target.value); setPage(1); }}
              placeholder="Search title or ticket #"
              className="h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm w-56 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            />
          </div>
          <select value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All banks</option>
            {options.banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All products</option>
            {options.products.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All statuses</option>
            {options.statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All priorities</option>
            {options.priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={engineerFilter} onChange={e => { setEngineerFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All engineers</option>
            {options.engineers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className={selectCls} aria-label="From date" />
            <span>–</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className={selectCls} aria-label="To date" />
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw size={14} /> Reset ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.tint}`}>
              <card.icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-semibold text-slate-900 leading-tight">{isLoading ? '…' : card.value}</div>
              <div className="text-xs text-slate-500 mt-0.5 truncate">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Builder + results */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
        {/* Left: builder panel */}
        <aside className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-4">
          <div className="p-4 border-b border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Report type</div>
            <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => switchMode('list')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${reportMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List size={14} /> Detailed list
              </button>
              <button
                onClick={() => switchMode('group')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${reportMode === 'group' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Layers size={14} /> Group & count
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Sparkles size={12} /> Quick templates
            </div>
            <div className="flex flex-col gap-1.5">
              {TEMPLATES.map(tpl => (
                <button
                  key={tpl.key}
                  onClick={() => applyTemplate(tpl.key)}
                  className={`text-left px-3 py-2 rounded-xl border transition ${
                    activeTemplate === tpl.key ? 'border-blue-300 bg-blue-50' : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className={`text-sm font-medium ${activeTemplate === tpl.key ? 'text-blue-700' : 'text-slate-800'}`}>{tpl.title}</div>
                  <div className="text-xs text-slate-500">{tpl.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {reportMode === 'group' ? 'Group by' : 'Columns'}
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                value={fieldSearch}
                onChange={e => setFieldSearch(e.target.value)}
                placeholder="Search fields"
                className="h-9 w-full pl-9 pr-3 bg-slate-50 border border-transparent rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
              {Object.keys(fieldsByCategory).length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No matching fields</div>
              )}
              {(Object.entries(fieldsByCategory) as [string, FieldDef[]][]).map(([category, list]) => (
                <div key={category}>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">{category}</div>
                  <div className="flex flex-col gap-1">
                    {list.map(field => {
                      const selected = hasField(field.id);
                      return (
                        <button
                          key={field.id}
                          draggable
                          onDragStart={e => handleFieldDragStart(e, field.id)}
                          onClick={() => toggleField(field)}
                          className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition ${
                            selected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <GripVertical size={13} className="text-slate-300 group-hover:text-slate-400 shrink-0 cursor-grab" />
                          <span className="flex-1 truncate">{field.label}</span>
                          {selected ? <Check size={14} className="shrink-0" /> : <Plus size={14} className="shrink-0 text-slate-300 group-hover:text-slate-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right: results */}
        <div className="min-w-0 space-y-5">
          {/* Selected fields bar */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropOnBar}
            className="bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-slate-800">
                {reportMode === 'group' ? 'Grouped by' : 'Columns'}
                <span className="ml-2 text-xs font-medium text-slate-400">{fields.length} selected</span>
              </div>
              {fields.length > 0 && (
                <button onClick={() => { setFields([]); setActiveTemplate(''); }} className="text-xs font-medium text-slate-400 hover:text-slate-700">
                  Clear all
                </button>
              )}
            </div>
            {fields.length === 0 ? (
              <div className="text-sm text-slate-400 py-2">
                {reportMode === 'group'
                  ? 'Click or drag a field from the left to choose how to group the tickets.'
                  : 'Click or drag fields from the left to build your table.'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.stopPropagation(); reorderTo(index); }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 text-slate-700 pl-2 pr-1.5 py-1.5 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing transition"
                  >
                    <GripVertical size={12} className="text-slate-400" />
                    {field.label}
                    <button onClick={() => removeField(field.id)} className="p-0.5 rounded hover:bg-slate-300/60 text-slate-500" aria-label={`Remove ${field.label}`}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {fields.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 text-center">
              <Inbox size={30} className="mx-auto text-slate-300 mb-2" />
              <div className="text-sm font-medium text-slate-600">Your report is empty</div>
              <div className="text-sm text-slate-400 mt-1">Pick a quick template or add fields to see results.</div>
            </div>
          ) : (
            <>
              {/* Chart (group mode) */}
              {reportMode === 'group' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">Top groups</h3>
                    <span className="text-xs text-slate-400">{groupData.length} group{groupData.length === 1 ? '' : 's'}</span>
                  </div>
                  <div style={{ height: Math.max(180, Math.min(groupData.length, 10) * 34 + 30) }}>
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                      </div>
                    ) : groupData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data for the current filters.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={(groupData as any[]).slice(0, 10)} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                          <YAxis
                            type="category"
                            dataKey="compositeKey"
                            width={190}
                            tick={{ fontSize: 12 }}
                            stroke="#94a3b8"
                            tickFormatter={(v: string) => (v.length > 28 ? v.slice(0, 27) + '…' : v)}
                          />
                          <Tooltip wrapperStyle={{ fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="ticketCount" name="Tickets" fill="#3B82F6" radius={[0, 6, 6, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {reportMode === 'list' && <th className="py-3 pl-6 pr-4 w-32">Ticket #</th>}
                        {fields.map((f, i) => (
                          <th
                            key={f.id}
                            onClick={() => reportMode === 'list' && toggleSort(f.id)}
                            className={`py-3 px-4 ${reportMode === 'list' ? 'cursor-pointer hover:text-slate-700' : ''} ${reportMode === 'group' && i === 0 ? 'pl-6' : ''}`}
                          >
                            {f.label}
                            {reportMode === 'list' && <SortIcon id={f.id} />}
                          </th>
                        ))}
                        {reportMode === 'group' && <th className="py-3 px-4 pr-6 w-64">Tickets</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={fields.length + 1} className="py-14 text-center">
                            <div className="animate-spin inline-block rounded-full h-6 w-6 border-b-2 border-blue-500" />
                          </td>
                        </tr>
                      ) : reportMode === 'group' ? (
                        groupData.length === 0 ? (
                          <tr><td colSpan={fields.length + 1} className="py-14 text-center text-slate-400">No data for the current filters.</td></tr>
                        ) : (
                          (groupData as any[]).map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors">
                              {fields.map((f, i) => (
                                <td key={f.id} className={`py-3.5 px-4 font-medium text-slate-900 ${i === 0 ? 'pl-6' : ''}`}>{row[f.id]}</td>
                              ))}
                              <td className="py-3.5 px-4 pr-6">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${maxGroupCount ? (row.ticketCount / maxGroupCount) * 100 : 0}%` }} />
                                  </div>
                                  <span className="w-10 text-right font-semibold text-slate-900">{row.ticketCount}</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      ) : pageRows.length === 0 ? (
                        <tr><td colSpan={fields.length + 1} className="py-14 text-center text-slate-400">No tickets match the current filters.</td></tr>
                      ) : (
                        pageRows.map((ticket: any) => (
                          <tr key={ticket.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 pl-6 pr-4">
                              <Link to={`/tickets/${ticket.id}`} className="font-mono text-xs bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded px-1.5 py-0.5 transition-colors">
                                #{String(ticket.ticket_no || ticket.id.slice(0, 8).toUpperCase()).split(' - ')[0]}
                              </Link>
                            </td>
                            {fields.map(f => (
                              <td key={f.id} className="py-3.5 px-4 text-slate-800 max-w-[320px]">
                                <div className="truncate" title={String(extractValue(ticket, f.id))}>{extractValue(ticket, f.id)}</div>
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {reportMode === 'list' && sortedList.length > 0 && (
                  <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
                    <div>
                      Showing <span className="font-medium text-slate-700">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedList.length)}</span> of{' '}
                      <span className="font-medium text-slate-700">{sortedList.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs text-slate-500 tabular-nums">{currentPage} / {totalPages}</span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages}
                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
