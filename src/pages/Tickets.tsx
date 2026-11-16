import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTickets, useTicketsPaginated, useTicketDetails } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Ticket, Profile, CustomerProduct } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Inbox,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Package,
  Eye,
  Clock,
  User,
  ShieldAlert,
  MoreHorizontal,
  Columns,
  Check,
  Download
} from 'lucide-react';
import { TicketCreationWizard } from '../components/ticket-wizard/TicketCreationWizard';

const COLUMN_DEFS: { key: string; label: string; adminOnly?: boolean }[] = [
  { key: 'ticket_type', label: 'Type' },
  { key: 'priority', label: 'Priority' },
  { key: 'status_code', label: 'Status' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'assigned_to_name', label: 'Assigned To', adminOnly: true },
  { key: 'legacy_assigned_to', label: 'Legacy Assignee', adminOnly: true },
  { key: 'created_at', label: 'Created' },
  { key: 'sla_due_date', label: 'SLA Due' },
];

// col.label above is only an English fallback (used for CSV/debug); the dropdown renders
// via these i18n keys so the "Columns" menu follows the active language.
const COLUMN_LABEL_KEYS: Record<string, string> = {
  ticket_type: 'tickets.type',
  priority: 'tickets.priority',
  status_code: 'tickets.status',
  customer_name: 'tickets.customer',
  assigned_to_name: 'tickets.assignedTo',
  legacy_assigned_to: 'tickets.legacyAssignee',
  created_at: 'tickets.created',
  sla_due_date: 'tickets.slaDue',
};

interface TicketsProps {
  isEmbedded?: boolean;
  onTicketSelect?: (ticketId: string) => void;
}

export const Tickets: React.FC<TicketsProps> = ({ isEmbedded, onTicketSelect }) => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenants } = useTenant();
  const { createTicket, updateTicket, tickets: allTicketsForExport } = useTickets();
  const [page, setPage] = useState(1);
  const limit = 50;
  const [customerIdFilter, setCustomerIdFilter] = useState<string | null>(searchParams.get('customerId') || null);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  useEffect(() => {
    const handle = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(handle);
  }, [search]);
  const [engineerFilter, setEngineerFilter] = useState<string>(searchParams.get('engineer') || 'all');
  const { data: paginatedData, isLoading } = useTicketsPaginated(page, limit, customerIdFilter, searchDebounced, engineerFilter === 'all' ? null : engineerFilter);
  const tickets = paginatedData?.data || [];
  const totalCount = paginatedData?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  // Create Modal Action
  const isCreateAction = searchParams.get('action') === 'create';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<string>(
    searchParams.get('status') ||
    (['SUPPORT_ENGINEER', 'TEAM_LEAD'].includes(user?.role_name?.toUpperCase() || '') ? 'assigned' : 'all')
  );
  const [productFilter, setProductFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>(searchParams.get('customer') || 'all');
  
  // Collapsible state
  
  // TODO: Temporary debug logs as requested by user
  useEffect(() => {
    console.log('[DEBUG Tickets.tsx] Total tickets received from useTickets():', tickets.length);
    console.log('[DEBUG Tickets.tsx] Current viewFilter state:', viewFilter);
  }, [tickets.length, viewFilter]);

  const [isProductOpen, setIsProductOpen] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(user?.role_code?.toUpperCase() || '');

  const [engineers, setEngineers] = useState<any[]>([]);
  const [isEngineerFilterOpen, setIsEngineerFilterOpen] = useState(false);

  const [dateRange, setDateRange] = useState<string>('all');
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  type SortColumn = 'title' | 'priority' | 'status_code' | 'customer_name' | 'assigned_to_name' | 'created_at' | 'sla_due_date';
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const cellPadding = 'py-3';

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ticketsTableColumnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => {
    localStorage.setItem('ticketsTableColumnWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const hiddenByDefault = ['ticket_type', 'legacy_assigned_to', 'sla_due_date'];
    const defaults = COLUMN_DEFS.reduce((acc, c) => { acc[c.key] = !hiddenByDefault.includes(c.key); return acc; }, {} as Record<string, boolean>);
    const saved = localStorage.getItem('ticketsTableVisibleColumns_v2');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  useEffect(() => {
    localStorage.setItem('ticketsTableVisibleColumns_v2', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);
  const toggleColumn = (key: string) => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));

  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    const startX = e.pageX;
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    const startWidth = th.getBoundingClientRect().width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      setColWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    if (isAdmin) {
      const fetchEngineers = async () => {
        try {
          const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('role_code', 'SUPPORT_ENGINEER')
            .single();
            
          if (roleData) {
            const { data: usersData } = await supabase
              .from('users')
              .select('id, full_name, email')
              .eq('role_id', roleData.id)
              .eq('is_active', true);
            
            if (usersData) setEngineers(usersData);
          }
        } catch (err) {
          console.error('Error fetching engineers', err);
        }
      };
      fetchEngineers();
    }
  }, [isAdmin]);

  useEffect(() => {
    setSelectedTickets([]);
  }, [viewFilter, productFilter, searchDebounced, customerIdFilter, engineerFilter]);

  useEffect(() => {
    setPage(1);
  }, [customerIdFilter, searchDebounced, engineerFilter]);

  const handleBulkApprove = async () => {
    if (selectedTickets.length === 0) return;
    setBulkApproving(true);
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('ticket_statuses')
        .select('id')
        .eq('status_code', 'APPROVED')
        .single();
        
      if (statusError) throw statusError;

      for (const ticketId of selectedTickets) {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) continue;
        const oldStatusId = ticket.status_id;

        await supabase
          .from('tickets')
          .update({ status_id: statusData.id })
          .eq('id', ticketId);

        await supabase.from('audit_log').insert({
          table_name: 'tickets',
          record_id: ticketId,
          action_type: 'RESOLUTION_APPROVED',
          old_value: { status_id: oldStatusId },
          new_value: { status_id: statusData.id },
          changed_by: user?.id
        });

        await supabase.from('ticket_status_history').insert({
          ticket_id: ticketId,
          old_status_id: oldStatusId,
          new_status_id: statusData.id,
          changed_by: user?.id,
          change_notes: 'Ticket resolution approved (Bulk)'
        });
      }
      
      setSelectedTickets([]);
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (err) {
      console.error('Error in bulk approve:', err);
      alert('Failed to approve some tickets.');
    } finally {
      setBulkApproving(false);
    }
  };

  // Left Sidebar views
  const allTicketsView = { id: 'all', name: 'All tickets', icon: Inbox, count: tickets.length };
  
  const statusViews = [
    { id: 'new', name: 'New', count: tickets.filter(t => t.status_code === 'NEW').length },
    { id: 'in_progress', name: 'Support Action', count: tickets.filter(t => t.status_code === 'INVESTIGATION').length },
    { id: 'development_action', name: 'Development Action', count: tickets.filter(t => t.status_code === 'DEVELOPMENT_ACTION').length },
    ...(isAdmin ? [{ id: 'pending_approval', name: 'Pending approval', count: tickets.filter(t => t.status_code === 'RESOLVED_PENDING_APPROVAL').length }] : []),
    { id: 'approved', name: 'Approved', count: tickets.filter(t => t.status_code === 'APPROVED').length },
    { id: 'closed', name: 'Closed', count: tickets.filter(t => t.status_code === 'CLOSED').length },
  ];

  const myWorkViews = [
    { id: 'assigned', name: 'Assigned to me', count: tickets.filter(t => t.assigned_to === user?.id).length },
    { id: 'high_priority', name: 'High priority', count: tickets.filter(t => ['high', 'urgent'].includes((t.priority || '').toLowerCase())).length }
  ];

  // Derived products from tickets for the left panel
  const uniqueProducts = Array.from(new Set(tickets.map(t => t.product_name).filter(Boolean)));
  const productViews = uniqueProducts.map(pName => ({
    id: pName,
    name: pName,
    count: tickets.filter(t => t.product_name === pName).length
  }));

  const filteredTickets = tickets.filter(ticket => {
    // Search is applied server-side (title, description, ticket number) in useTicketsPaginated.

    // View filtering
    let matchesView = true;
    if (viewFilter === 'new') matchesView = ticket.status_code === 'NEW';
    if (viewFilter === 'in_progress') matchesView = ticket.status_code === 'INVESTIGATION';
    if (viewFilter === 'development_action') matchesView = ticket.status_code === 'DEVELOPMENT_ACTION';
    if (viewFilter === 'pending_approval') matchesView = ticket.status_code === 'RESOLVED_PENDING_APPROVAL';
    if (viewFilter === 'approved') matchesView = ticket.status_code === 'APPROVED';
    if (viewFilter === 'closed') matchesView = ticket.status_code === 'CLOSED';
    if (viewFilter === 'assigned') matchesView = ticket.assigned_to === user?.id;
    if (viewFilter === 'high_priority') matchesView = ['high', 'urgent'].includes((ticket.priority || '').toLowerCase());

    const matchesProduct = productFilter === 'all' || ticket.product_name === productFilter;
    const matchesCustomer = customerFilter === 'all' || ticket.customer_name === customerFilter;
    // Engineer filtering is applied server-side in useTicketsPaginated.

    // TODO: Temporary debug logs as requested by user
    if (viewFilter === 'assigned') {
      console.log(`[Debug] Checking Ticket ID: ${ticket.id}`);
      console.log(`[Debug] user.id (current user):`, user?.id);
      console.log(`[Debug] ticket.assigned_to (from object):`, ticket.assigned_to);
      console.log(`[Debug] ticket.assigned_user_id (legacy column, if present):`, (ticket as any).assigned_user_id);
      console.log(`-----------------------------------`);
    }

    // Date Range filtering
    let matchesDate = true;
    if (dateRange !== 'all') {
      const ticketDate = new Date(ticket.created_at);
      const now = new Date();
      if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        matchesDate = ticketDate >= sevenDaysAgo;
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        matchesDate = ticketDate >= thirtyDaysAgo;
      }
    }

    // Priority filtering
    let matchesPriority = true;
    if (priorityFilter !== 'all') {
      matchesPriority = (ticket.priority || '').toLowerCase() === priorityFilter;
    }

    return matchesView && matchesProduct && matchesCustomer && matchesDate && matchesPriority;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    let valA = a[sortColumn];
    let valB = b[sortColumn];

    if (sortColumn === 'priority') {
      const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
      valA = priorityWeight[(a.priority || 'medium').toLowerCase()] || 0;
      valB = priorityWeight[(b.priority || 'medium').toLowerCase()] || 0;
    } else if (sortColumn === 'created_at') {
      valA = new Date(a.created_at).getTime();
      valB = new Date(b.created_at).getTime();
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExportToExcel = () => {
    // Export respects all active filters, but against the FULL unpaginated ticket set
    // (not just the current 50-row page), so the export always contains every matching ticket.
    const searchLower = searchDebounced.toLowerCase();
    const exportRows = allTicketsForExport.filter((ticket: any) => {
      let matchesView = true;
      if (viewFilter === 'new') matchesView = ticket.status_code === 'NEW';
      if (viewFilter === 'in_progress') matchesView = ticket.status_code === 'INVESTIGATION';
      if (viewFilter === 'development_action') matchesView = ticket.status_code === 'DEVELOPMENT_ACTION';
      if (viewFilter === 'pending_approval') matchesView = ticket.status_code === 'RESOLVED_PENDING_APPROVAL';
      if (viewFilter === 'approved') matchesView = ticket.status_code === 'APPROVED';
      if (viewFilter === 'closed') matchesView = ticket.status_code === 'CLOSED';
      if (viewFilter === 'assigned') matchesView = ticket.assigned_to === user?.id;
      if (viewFilter === 'high_priority') matchesView = ['high', 'urgent'].includes((ticket.priority || '').toLowerCase());

      const matchesProduct = productFilter === 'all' || ticket.product_name === productFilter;
      const matchesCustomer = customerFilter === 'all' || ticket.customer_name === customerFilter;
      const matchesEngineer = engineerFilter === 'all' || ticket.assigned_to === engineerFilter;

      let matchesDate = true;
      if (dateRange !== 'all') {
        const ticketDate = new Date(ticket.created_at);
        if (dateRange === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          matchesDate = ticketDate >= sevenDaysAgo;
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          matchesDate = ticketDate >= thirtyDaysAgo;
        }
      }

      let matchesPriority = true;
      if (priorityFilter !== 'all') matchesPriority = (ticket.priority || '').toLowerCase() === priorityFilter;

      const matchesSearch = !searchLower ||
        ticket.title?.toLowerCase().includes(searchLower) ||
        ticket.description?.toLowerCase().includes(searchLower) ||
        ticket.ticket_no?.toLowerCase().includes(searchLower);

      return matchesView && matchesProduct && matchesCustomer && matchesDate && matchesPriority && matchesEngineer && matchesSearch;
    });

    const exportData = exportRows.map((ticket: any) => ({
      'Status': ticket.status_name || ticket.status_code || ticket.status || '',
      'Ticket ID': (ticket.ticket_no || '').split(' - ')[0] || '',
      'Creator': ticket.creator_name || '',
      'Tiket #': ticket.ticket_no || '',
      'Synopsis': ticket.title || '',
      'Severity': ticket.ticket_type === 'DEVELOPMENT' ? '' : (ticket.priority_name || ''),
      'Assigned To': ticket.assigned_to_name || 'Unassigned',
      'Opened Date': ticket.created_at ? new Date(ticket.created_at) : '',
      'Due Date': ticket.sla_due_date ? new Date(ticket.sla_due_date) : '',
      'Closed': ticket.closed_at ? new Date(ticket.closed_at) : '',
      'Account Name': ticket.customer_name || '',
      'Problem Description': ticket.description || '',
      'Solution': ticket.resolution_justification || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData, { cellDates: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
    XLSX.writeFile(workbook, `Tickets_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleOpenCreateModal = () => {
    setSearchParams({ action: 'create' });
  };

  const handleCloseCreateModal = () => {
    searchParams.delete('action');
    setSearchParams(searchParams);
  };

  const getPriorityStyle = (priority: string) => {
    switch((priority || '').toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusDisplay = (statusCode: string) => {
    const s = (statusCode || '').toUpperCase();
    
    let Icon = AlertCircle;
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let text = 'Open';

    if (s === 'NEW' || s === 'OPEN') { 
      Icon = AlertCircle; 
      colorClass = 'bg-blue-50 text-blue-700 border-blue-200'; 
      text = 'New'; 
    }
    else if (s === 'ASSIGNED') { 
      Icon = User; 
      colorClass = 'bg-purple-50 text-purple-700 border-purple-200'; 
      text = 'Assigned'; 
    }
    else if (s === 'INVESTIGATION' || s === 'IN_PROGRESS') {
      Icon = PlayCircle;
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      text = 'Support Action';
    }
    else if (s === 'DEVELOPMENT_ACTION') {
      Icon = PlayCircle;
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      text = 'Development Action';
    }
    else if (s === 'PENDING_CUSTOMER') {
      Icon = Clock; 
      colorClass = 'bg-orange-50 text-orange-700 border-orange-200'; 
      text = 'Pending Customer'; 
    }
    else if (s === 'RESOLVED_PENDING_APPROVAL') { 
      Icon = ShieldAlert; 
      colorClass = 'bg-amber-50 text-amber-700 border-amber-200'; 
      text = 'Pending Approval'; 
    }
    else if (s === 'APPROVED') { 
      Icon = CheckCircle2; 
      colorClass = 'bg-green-50 text-green-700 border-green-200'; 
      text = 'Approved'; 
    }
    else if (s === 'RESOLVED') { 
      Icon = CheckCircle2; 
      colorClass = 'bg-green-50 text-green-700 border-green-200'; 
      text = 'Resolved'; 
    }
    else if (s === 'CLOSED') { 
      Icon = XCircle; 
      colorClass = 'bg-slate-50 text-slate-700 border-slate-200'; 
      text = 'Closed'; 
    }
    else {
      Icon = MoreHorizontal;
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${colorClass}`}>
        <Icon size={14} className="shrink-0" />
        <span>{text}</span>
      </div>
    );
  };

  const renderSlaBadge = (ticket: Ticket) => {
    return <span className="text-slate-400 italic">{t('tickets.notSet')}</span>;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} className="ml-1 inline" /> : <ChevronDown size={14} className="ml-1 inline" />;
  };

  const visibleColSpan =
    1 /* Subject, always visible */ +
    1 /* Action column, always visible */ +
    (viewFilter === 'pending_approval' ? 1 : 0) +
    COLUMN_DEFS.filter(c => (!c.adminOnly || isAdmin) && visibleColumns[c.key]).length;

  const statusIconMap: Record<string, { Icon: any; color: string; activeColor: string }> = {
    new: { Icon: AlertCircle, color: 'text-blue-500', activeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    in_progress: { Icon: PlayCircle, color: 'text-amber-500', activeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    pending_approval: { Icon: ShieldAlert, color: 'text-amber-600', activeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { Icon: CheckCircle2, color: 'text-emerald-500', activeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    closed: { Icon: XCircle, color: 'text-slate-400', activeColor: 'bg-slate-100 text-slate-700 border-slate-300' },
  };

  const renderViewPill = (id: string, name: string, count: number, Icon: any, colorClass: string, activeColorClass: string) => {
    const isActive = viewFilter === id && productFilter === 'all';
    return (
      <button
        key={id}
        onClick={() => { setViewFilter(id); setProductFilter('all'); setCustomerFilter('all'); setCustomerIdFilter(null); setEngineerFilter('all'); }}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors shrink-0 whitespace-nowrap
          ${isActive ? activeColorClass + ' shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
        `}
      >
        <Icon size={14} className={isActive ? '' : colorClass} />
        <span>{name}</span>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/60' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
      </button>
    );
  };

  const priorityAccent = (priority?: string | null) => {
    switch ((priority || '').toLowerCase()) {
      case 'critical': return 'bg-red-600';
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-amber-400';
      case 'low': return 'bg-emerald-500';
      default: return 'bg-slate-300';
    }
  };

  const initialsOf = (name?: string | null) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const timeAgo = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  const renderStatusBadge = (statusCode: string) => {
    const s = (statusCode || '').toUpperCase();
    let label = 'Open';
    let cls = 'bg-slate-100 text-slate-700';
    let dot = 'bg-slate-400';
    if (s === 'NEW' || s === 'OPEN') { label = 'New'; cls = 'bg-blue-50 text-blue-700'; dot = 'bg-blue-500'; }
    else if (s === 'ASSIGNED') { label = 'Assigned'; cls = 'bg-purple-50 text-purple-700'; dot = 'bg-purple-500'; }
    else if (s === 'INVESTIGATION' || s === 'IN_PROGRESS') { label = 'Support Action'; cls = 'bg-amber-50 text-amber-700'; dot = 'bg-amber-500'; }
    else if (s === 'DEVELOPMENT_ACTION') { label = 'Development Action'; cls = 'bg-indigo-50 text-indigo-700'; dot = 'bg-indigo-500'; }
    else if (s === 'PENDING_CUSTOMER') { label = 'Pending Customer'; cls = 'bg-orange-50 text-orange-700'; dot = 'bg-orange-500'; }
    else if (s === 'RESOLVED_PENDING_APPROVAL') { label = 'Pending Approval'; cls = 'bg-amber-50 text-amber-700'; dot = 'bg-amber-500'; }
    else if (s === 'APPROVED') { label = 'Approved'; cls = 'bg-emerald-50 text-emerald-700'; dot = 'bg-emerald-500'; }
    else if (s === 'RESOLVED') { label = 'Resolved'; cls = 'bg-emerald-50 text-emerald-700'; dot = 'bg-emerald-500'; }
    else if (s === 'CLOSED') { label = 'Closed'; cls = 'bg-slate-100 text-slate-600'; dot = 'bg-slate-400'; }
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full px-4 md:px-8 py-6 max-w-[1600px] mx-auto w-full">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-slate-900">
              {(() => {
                if (productFilter !== 'all') return productFilter;
                if (viewFilter === 'all') return 'All tickets';
                const sv = statusViews.find(v => v.id === viewFilter);
                if (sv) return sv.name;
                const mw = myWorkViews.find(v => v.id === viewFilter);
                if (mw) return mw.name;
                return 'Tickets';
              })()}
            </h1>
            {customerFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium">
                Bank: {customerFilter}
                <button
                  onClick={() => { setCustomerFilter('all'); setCustomerIdFilter(null); }}
                  className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                  title="Clear bank filter"
                >
                  <XCircle size={14} />
                </button>
              </span>
            )}
            {engineerFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium">
                Engineer: {
                  engineerFilter === 'unassigned'
                    ? 'Unassigned'
                    : engineerFilter.startsWith('legacy:')
                      ? engineerFilter.slice('legacy:'.length)
                      : (engineers.find(e => e.id === engineerFilter)?.full_name || engineerFilter)
                }
                <button
                  onClick={() => setEngineerFilter('all')}
                  className="hover:bg-indigo-100 rounded-full p-0.5 transition-colors"
                  title="Clear engineer filter"
                >
                  <XCircle size={14} />
                </button>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {totalCount} {totalCount === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap"
            title={t('tickets.exportToExcel')}
          >
            <Download size={15} className="text-slate-400" />
            <span>{t('tickets.export')}</span>
          </button>
          {!isEmbedded && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 h-10 px-4 bg-[#3B82F6] hover:bg-[#2563eb] text-white rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <Plus size={16} />
              Create ticket
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-5 overflow-x-auto">
        {[
          { id: 'all', name: 'All tickets', count: allTicketsView.count },
          ...statusViews.map(v => ({ id: v.id, name: v.name, count: v.count })),
        ].map(tab => {
          const isActive = viewFilter === tab.id && productFilter === 'all';
          return (
            <button
              key={tab.id}
              onClick={() => { setViewFilter(tab.id); setProductFilter('all'); setCustomerFilter('all'); setCustomerIdFilter(null); setEngineerFilter('all'); }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors -mb-px border-b-2 ${
                isActive
                  ? 'border-[#3B82F6] text-[#2563eb]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.name}
              <span className={`min-w-[22px] text-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-50 text-[#2563eb]' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by subject, number or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm w-80 max-w-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#3B82F6] transition"
          />
        </div>

        {/* Quick filters */}
        {myWorkViews.map(view => {
          const isActive = viewFilter === view.id && productFilter === 'all';
          const Icon = view.id === 'assigned' ? User : AlertCircle;
          return (
            <button
              key={view.id}
              onClick={() => {
                setViewFilter(isActive ? 'all' : view.id);
                setProductFilter('all'); setCustomerFilter('all'); setCustomerIdFilter(null); setEngineerFilter('all');
              }}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon size={14} className={isActive ? '' : view.id === 'high_priority' ? 'text-red-400' : 'text-slate-400'} />
              {view.name}
              <span className={`text-xs font-semibold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{view.count}</span>
            </button>
          );
        })}

        {productViews.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsProductOpen(prev => !prev)}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap ${
                productFilter !== 'all' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Package size={14} className={productFilter !== 'all' ? '' : 'text-slate-400'} />
              <span>{productFilter === 'all' ? 'Product' : productFilter}</span>
              <ChevronDown size={14} className="opacity-60" />
            </button>
            {isProductOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-60 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                {productViews.map(prod => {
                  const isActive = productFilter === prod.name;
                  return (
                    <button
                      key={prod.id}
                      onClick={() => { setProductFilter(prod.name); setViewFilter('all'); setCustomerFilter('all'); setCustomerIdFilter(null); setEngineerFilter('all'); setIsProductOpen(false); }}
                      className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left ${isActive ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{prod.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{prod.count}</span>
                    </button>
                  );
                })}
                {productFilter !== 'all' && (
                  <button
                    onClick={() => { setProductFilter('all'); setIsProductOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 border-t border-slate-100"
                  >
                    Clear product filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {viewFilter === 'pending_approval' && selectedTickets.length > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproving}
            className="flex items-center gap-2 h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
          >
            {bulkApproving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle2 size={16} />}
            Approve Selected ({selectedTickets.length})
          </button>
        )}

        {/* Date range */}
        <div className="relative">
          <button
            onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
            className="flex items-center gap-2 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 whitespace-nowrap transition-colors"
          >
            <Clock size={14} className="text-slate-400" />
            <span>{dateRange === 'all' ? 'All time' : dateRange === '7days' ? 'Last 7 days' : 'Last 30 days'}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {isDateRangeOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              {['all', '7days', '30days'].map(val => (
                <button
                  key={val}
                  onClick={() => { setDateRange(val); setIsDateRangeOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${dateRange === val ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {val === 'all' ? 'All time' : val === '7days' ? 'Last 7 days' : 'Last 30 days'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority */}
        <div className="relative">
          <button
            onClick={() => setIsPriorityOpen(!isPriorityOpen)}
            className="flex items-center gap-2 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 whitespace-nowrap transition-colors"
          >
            <span className="capitalize">{priorityFilter === 'all' ? 'All priorities' : priorityFilter}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>
          {isPriorityOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
              {['all', 'urgent', 'high', 'medium', 'low'].map(val => (
                <button
                  key={val}
                  onClick={() => { setPriorityFilter(val); setIsPriorityOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm capitalize ${priorityFilter === val ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {val === 'all' ? 'All priorities' : val}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Engineer */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setIsEngineerFilterOpen(!isEngineerFilterOpen)}
              className="flex items-center gap-2 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 whitespace-nowrap transition-colors"
            >
              <User size={14} className="text-slate-400" />
              <span className="truncate max-w-[130px]">
                {engineerFilter === 'all' ? 'All engineers' :
                 engineerFilter === 'unassigned' ? 'Unassigned' :
                 engineers.find(e => e.id === engineerFilter)?.full_name || 'Engineer'}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {isEngineerFilterOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <button
                  onClick={() => { setEngineerFilter('all'); setIsEngineerFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'all' ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  All engineers
                </button>
                <button
                  onClick={() => { setEngineerFilter('unassigned'); setIsEngineerFilterOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'unassigned' ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  Unassigned
                </button>
                {engineers.length > 0 && <div className="h-px bg-slate-100 my-1"></div>}
                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                  {engineers.map(eng => (
                    <button
                      key={eng.id}
                      onClick={() => { setEngineerFilter(eng.id); setIsEngineerFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === eng.id ? 'bg-blue-50 text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <div className="font-medium truncate">{eng.full_name}</div>
                      <div className="text-xs text-slate-400 truncate">{eng.email}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Column visibility */}
        <div className="relative">
          <button
            onClick={() => setIsColumnsMenuOpen(prev => !prev)}
            className="flex items-center gap-2 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 whitespace-nowrap transition-colors"
            title={t('tickets.showHideColumns')}
          >
            <Columns size={14} className="text-slate-400" />
            <span>{t('tickets.columns')}</span>
          </button>
          {isColumnsMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
              <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t('tickets.toggleColumns')}</div>
              {COLUMN_DEFS.filter(c => !c.adminOnly || isAdmin).map(col => (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span>{t(COLUMN_LABEL_KEYS[col.key] || col.key)}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${visibleColumns[col.key] ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'border-slate-300'}`}>
                    {visibleColumns[col.key] && <Check size={11} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {viewFilter === 'pending_approval' && (
                  <th className="pl-5 pr-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                      onChange={(e) => setSelectedTickets(e.target.checked ? filteredTickets.map(t => t.id) : [])}
                      className="rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                  </th>
                )}
                <th className="pl-6 pr-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('title')}>
                  {t('tickets.subject')} <SortIcon column="title" />
                </th>
                {visibleColumns['ticket_type'] && <th className="px-4 py-3 whitespace-nowrap">{t('tickets.type')}</th>}
                {visibleColumns['priority'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('priority')}>
                    {t('tickets.priority')} <SortIcon column="priority" />
                  </th>
                )}
                {visibleColumns['status_code'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('status_code')}>
                    {t('tickets.status')} <SortIcon column="status_code" />
                  </th>
                )}
                {visibleColumns['customer_name'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('customer_name')}>
                    {t('tickets.customer')} <SortIcon column="customer_name" />
                  </th>
                )}
                {isAdmin && visibleColumns['assigned_to_name'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('assigned_to_name')}>
                    {t('tickets.assignedTo')} <SortIcon column="assigned_to_name" />
                  </th>
                )}
                {isAdmin && visibleColumns['legacy_assigned_to'] && <th className="px-4 py-3 whitespace-nowrap">{t('tickets.legacyAssignee')}</th>}
                {visibleColumns['created_at'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('created_at')}>
                    {t('tickets.created')} <SortIcon column="created_at" />
                  </th>
                )}
                {visibleColumns['sla_due_date'] && (
                  <th className="px-4 py-3 whitespace-nowrap cursor-pointer hover:text-slate-700" onClick={() => handleSort('sla_due_date')}>
                    {t('tickets.slaDue')} <SortIcon column="sla_due_date" />
                  </th>
                )}
                <th className="w-12 pr-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColSpan} className="py-16 text-center text-slate-400 text-sm">{t('tickets.loading')}</td>
                </tr>
              ) : sortedTickets.length === 0 ? (
                <tr>
                  <td colSpan={visibleColSpan} className="py-16 text-center">
                    <Inbox size={28} className="mx-auto text-slate-300 mb-2" />
                    <div className="text-sm text-slate-500">{t('tickets.noTickets')}</div>
                  </td>
                </tr>
              ) : (
                sortedTickets.map(ticket => {
                  const tk = ticket as any;
                  const isDev = tk.ticket_type === 'DEVELOPMENT';
                  const accent = isDev ? 'bg-indigo-300' : priorityAccent(ticket.priority);
                  const noParts = String(tk.ticket_no || '').split(' - ');
                  const shortNo = noParts[0] === 'DV' ? `DV-${noParts[1] || ''}` : noParts[0];
                  const created = ticket.created_at ? new Date(ticket.created_at) : null;
                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => {
                        if (onTicketSelect) onTicketSelect(ticket.id);
                        else navigate(`/tickets/${ticket.id}`);
                      }}
                      className="group cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      {viewFilter === 'pending_approval' && (
                        <td className="pl-5 pr-2 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTickets.includes(ticket.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTickets([...selectedTickets, ticket.id]);
                              else setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
                            }}
                            className="rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                          />
                        </td>
                      )}

                      {/* Subject */}
                      <td className="relative pl-6 pr-4 py-4 min-w-[320px] w-[38%]">
                        <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${accent}`} />
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-[#2563eb] transition-colors line-clamp-2 leading-snug" title={ticket.title}>
                          {ticket.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-500" title={tk.ticket_no || ''}>
                          {shortNo && <span className="font-mono text-[11px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">#{shortNo}</span>}
                          {tk.is_express && (
                            <span className="inline-flex items-center gap-0.5 bg-red-50 text-red-600 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" title="Submitted via Express Ticket">
                              ⚡ Express
                            </span>
                          )}
                          {isDev && !visibleColumns['ticket_type'] && (
                            <span className="inline-flex items-center bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                              Development
                            </span>
                          )}
                          <span className="truncate max-w-[220px]">{ticket.product_name}</span>
                        </div>
                      </td>

                      {visibleColumns['ticket_type'] && (
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isDev ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {isDev ? t('ticketDetail.developmentTicket') : t('tickets.support')}
                          </span>
                        </td>
                      )}

                      {visibleColumns['priority'] && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isDev ? (
                            <span className="text-slate-300">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 capitalize">
                              <span className={`w-2 h-2 rounded-full ${priorityAccent(ticket.priority)}`} />
                              {ticket.priority || 'Medium'}
                            </span>
                          )}
                        </td>
                      )}

                      {visibleColumns['status_code'] && (
                        <td className="px-4 py-4 whitespace-nowrap">{renderStatusBadge(ticket.status_code as string)}</td>
                      )}

                      {visibleColumns['customer_name'] && (
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5 max-w-[240px]" title={ticket.customer_name || ''}>
                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold flex items-center justify-center shrink-0">
                              {initialsOf(ticket.customer_name)}
                            </span>
                            <span className="text-sm text-slate-700 truncate">{ticket.customer_name || 'N/A'}</span>
                          </div>
                        </td>
                      )}

                      {isAdmin && visibleColumns['assigned_to_name'] && (
                        <td className="px-4 py-4">
                          {ticket.assigned_to ? (
                            <div className="flex items-center gap-2.5 max-w-[200px]" title={ticket.assigned_to_name || ''}>
                              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                                {initialsOf(ticket.assigned_to_name)}
                              </span>
                              <span className="text-sm text-slate-700 truncate">{ticket.assigned_to_name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 text-slate-400">
                              <span className="w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                                <User size={14} />
                              </span>
                              <span className="text-sm">Unassigned</span>
                            </div>
                          )}
                        </td>
                      )}

                      {isAdmin && visibleColumns['legacy_assigned_to'] && (
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <div className="truncate max-w-[160px]">{ticket.legacy_assigned_to || <span className="text-slate-300">—</span>}</div>
                        </td>
                      )}

                      {visibleColumns['created_at'] && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-700">{created ? timeAgo(created) : ''}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {created ? created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </div>
                        </td>
                      )}

                      {visibleColumns['sla_due_date'] && (
                        <td className="px-4 py-4 whitespace-nowrap text-sm">{renderSlaBadge(ticket)}</td>
                      )}

                      <td className="pr-4 py-4 text-right">
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-[#3B82F6] group-hover:translate-x-0.5 transition rtl:rotate-180" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
          <div>
            {totalCount === 0
              ? 'No tickets'
              : <>Showing <span className="font-medium text-slate-700">{(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)}</span> of <span className="font-medium text-slate-700">{totalCount}</span></>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors font-medium text-slate-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages || totalPages === 0}
              className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors font-medium text-slate-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isCreateAction && (
        <TicketCreationWizard 
          onClose={handleCloseCreateModal} 
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
          }}
        />
      )}
    </div>
  );
};
