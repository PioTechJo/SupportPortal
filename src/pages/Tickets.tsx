import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';

const COLUMN_DEFS: { key: string; label: string; adminOnly?: boolean }[] = [
  { key: 'priority', label: 'Priority' },
  { key: 'status_code', label: 'Status' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'assigned_to_name', label: 'Assigned To', adminOnly: true },
  { key: 'legacy_assigned_to', label: 'Legacy Assignee', adminOnly: true },
  { key: 'created_at', label: 'Created' },
  { key: 'sla_due_date', label: 'SLA Due' },
];
import { TicketCreationWizard } from '../components/ticket-wizard/TicketCreationWizard';

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
  const { createTicket, updateTicket } = useTickets();
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
    ['SUPPORT_ENGINEER', 'TEAM_LEAD'].includes(user?.role_name?.toUpperCase() || '') ? 'assigned' : 'all'
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

  const cellPadding = 'py-2';

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ticketsTableColumnWidths');
    return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => {
    localStorage.setItem('ticketsTableColumnWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const defaults = COLUMN_DEFS.reduce((acc, c) => { acc[c.key] = true; return acc; }, {} as Record<string, boolean>);
    const saved = localStorage.getItem('ticketsTableVisibleColumns');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });
  useEffect(() => {
    localStorage.setItem('ticketsTableVisibleColumns', JSON.stringify(visibleColumns));
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
    { id: 'in_progress', name: 'In progress', count: tickets.filter(t => t.status_code === 'INVESTIGATION').length },
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
      text = 'In Progress'; 
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
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${colorClass}`}>
        <Icon size={14} className="shrink-0" />
        <span>{text}</span>
      </div>
    );
  };

  const renderSlaBadge = (ticket: Ticket) => {
    return <span className="text-slate-400 italic">Not set</span>;
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
          flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors shrink-0 whitespace-nowrap
          ${isActive ? activeColorClass + ' shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
        `}
      >
        <Icon size={14} className={isActive ? '' : colorClass} />
        <span>{name}</span>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/60' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-6 max-w-[1600px] mx-auto">

      {/* Horizontal Ticket Views Bar */}
      <div className="flex items-center flex-wrap gap-2 pb-4 mb-4 border-b border-slate-200">
        {renderViewPill('all', 'All tickets', allTicketsView.count, Inbox, 'text-slate-400', 'bg-[#3B82F6] text-white border-[#3B82F6]')}
        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
        {statusViews.map(view => {
          const meta = statusIconMap[view.id] || { Icon: AlertCircle, color: 'text-slate-400', activeColor: 'bg-slate-100 text-slate-700 border-slate-300' };
          return renderViewPill(view.id, view.name, view.count, meta.Icon, meta.color, meta.activeColor);
        })}
        <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
        {myWorkViews.map(view => {
          const Icon = view.id === 'assigned' ? User : AlertCircle;
          const color = view.id === 'high_priority' ? 'text-red-400' : 'text-slate-400';
          return renderViewPill(view.id, view.name, view.count, Icon, color, 'bg-indigo-50 text-indigo-700 border-indigo-200');
        })}

        {productViews.length > 0 && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
            <div className="relative shrink-0">
              <button
                onClick={() => setIsProductOpen(prev => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium border transition-colors whitespace-nowrap
                  ${productFilter !== 'all' ? 'bg-violet-50 text-violet-700 border-violet-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <Package size={14} className={productFilter !== 'all' ? '' : 'text-slate-400'} />
                <span>{productFilter === 'all' ? 'By product' : productFilter}</span>
                <ChevronDown size={13} className="text-current opacity-60" />
              </button>
              {isProductOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  {productViews.map(prod => {
                    const isActive = productFilter === prod.name;
                    return (
                      <button
                        key={prod.id}
                        onClick={() => { setProductFilter(prod.name); setViewFilter('all'); setCustomerFilter('all'); setCustomerIdFilter(null); setEngineerFilter('all'); setIsProductOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2 text-sm text-left ${isActive ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="truncate">{prod.name}</span>
                        <span className="text-xs text-slate-400">{prod.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header Actions */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 truncate">
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
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium shrink-0">
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
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-medium shrink-0">
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

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-48 lg:w-56 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <button
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <span>
                  {dateRange === 'all' ? 'All time' : dateRange === '7days' ? 'Last 7 days' : 'Last 30 days'}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {isDateRangeOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  {['all', '7days', '30days'].map(val => (
                    <button
                      key={val}
                      onClick={() => { setDateRange(val); setIsDateRangeOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${dateRange === val ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {val === 'all' ? 'All time' : val === '7days' ? 'Last 7 days' : 'Last 30 days'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Filter */}
            <div className="relative">
              <button
                onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <span className="capitalize">
                  {priorityFilter === 'all' ? 'All Priorities' : priorityFilter}
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {isPriorityOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                  {['all', 'urgent', 'high', 'medium', 'low'].map(val => (
                    <button
                      key={val}
                      onClick={() => { setPriorityFilter(val); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm capitalize ${priorityFilter === val ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {val === 'all' ? 'All Priorities' : val}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setIsEngineerFilterOpen(!isEngineerFilterOpen)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <span className="truncate max-w-[110px]">
                    {engineerFilter === 'all' ? 'All Engineers' :
                     engineerFilter === 'unassigned' ? 'Unassigned' :
                     engineers.find(e => e.id === engineerFilter)?.full_name || 'Filter by Engineer'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                </button>

                {isEngineerFilterOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                    <button
                      onClick={() => { setEngineerFilter('all'); setIsEngineerFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'all' ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      All Engineers
                    </button>
                    <button
                      onClick={() => { setEngineerFilter('unassigned'); setIsEngineerFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'unassigned' ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      Unassigned
                    </button>
                    {engineers.length > 0 && <div className="h-px bg-slate-100 my-1"></div>}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {engineers.map(eng => (
                        <button
                          key={eng.id}
                          onClick={() => { setEngineerFilter(eng.id); setIsEngineerFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === eng.id ? 'bg-[#eff6ff] text-[#3B82F6]' : 'text-slate-700 hover:bg-slate-50'}`}
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

            {viewFilter === 'pending_approval' && selectedTickets.length > 0 && (
              <button
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                {bulkApproving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle2 size={16} />}
                Approve Selected ({selectedTickets.length})
              </button>
            )}

            {/* Column Visibility */}
            <div className="relative">
              <button
                onClick={() => setIsColumnsMenuOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                title="Show/hide columns"
              >
                <Columns size={14} className="text-slate-400" />
                <span>Columns</span>
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              </button>

              {isColumnsMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50">
                  <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Toggle columns</div>
                  {COLUMN_DEFS.filter(c => !c.adminOnly || isAdmin).map(col => (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{col.label}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border ${visibleColumns[col.key] ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'border-slate-300'}`}>
                        {visibleColumns[col.key] && <Check size={11} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!isEmbedded && (
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] hover:bg-[#2563eb] text-white rounded-lg text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Create ticket
              </button>
            )}
          </div>
        </div>

        {/* Clean Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {viewFilter === 'pending_approval' && (
                    <th className={`px-4 ${cellPadding} w-12 text-center relative`} style={{ width: colWidths['checkbox'] ? `${colWidths['checkbox']}px` : undefined }}>
                      <input 
                        type="checkbox" 
                        checked={selectedTickets.length === filteredTickets.length && filteredTickets.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTickets(filteredTickets.map(t => t.id));
                          } else {
                            setSelectedTickets([]);
                          }
                        }}
                        className="rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                      />
                      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10" onMouseDown={(e) => handleResizeStart(e, 'checkbox')} />
                    </th>
                  )}
                  <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['title'] ? `${colWidths['title']}px` : undefined }} onClick={() => handleSort('title')}>
                    Subject <SortIcon column="title" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'title'); }} />
                  </th>
                  {visibleColumns['priority'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['priority'] ? `${colWidths['priority']}px` : '112px' }} onClick={() => handleSort('priority')}>
                    Priority <SortIcon column="priority" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'priority'); }} />
                  </th>}
                  {visibleColumns['status_code'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['status_code'] ? `${colWidths['status_code']}px` : '160px' }} onClick={() => handleSort('status_code')}>
                    Status <SortIcon column="status_code" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'status_code'); }} />
                  </th>}
                  {visibleColumns['customer_name'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['customer_name'] ? `${colWidths['customer_name']}px` : '144px' }} onClick={() => handleSort('customer_name')}>
                    Customer <SortIcon column="customer_name" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'customer_name'); }} />
                  </th>}
                  {isAdmin && visibleColumns['assigned_to_name'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['assigned_to_name'] ? `${colWidths['assigned_to_name']}px` : '192px' }} onClick={() => handleSort('assigned_to_name')}>
                    Assigned To <SortIcon column="assigned_to_name" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'assigned_to_name'); }} />
                  </th>}
                  {isAdmin && visibleColumns['legacy_assigned_to'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider relative group/th`} style={{ width: colWidths['legacy_assigned_to'] ? `${colWidths['legacy_assigned_to']}px` : '160px' }}>
                    Legacy Assignee
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'legacy_assigned_to'); }} />
                  </th>}
                  {visibleColumns['created_at'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['created_at'] ? `${colWidths['created_at']}px` : '128px' }} onClick={() => handleSort('created_at')}>
                    Created <SortIcon column="created_at" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'created_at'); }} />
                  </th>}
                  {visibleColumns['sla_due_date'] && <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors relative group/th`} style={{ width: colWidths['sla_due_date'] ? `${colWidths['sla_due_date']}px` : '144px' }} onClick={() => handleSort('sla_due_date')}>
                    SLA Due <SortIcon column="sla_due_date" />
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-slate-300/60 z-10 opacity-0 group-hover/th:opacity-100 transition-opacity" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'sla_due_date'); }} />
                  </th>}
                  <th className={`px-6 ${cellPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider text-right relative group/th`} style={{ width: colWidths['action'] ? `${colWidths['action']}px` : '80px' }}>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={visibleColSpan} className={`px-6 py-12 ${cellPadding} text-center text-slate-400`}>Loading tickets...</td>
                  </tr>
                ) : sortedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColSpan} className={`px-6 py-12 ${cellPadding} text-center text-slate-400`}>No tickets found.</td>
                  </tr>
                ) : (
                  sortedTickets.map(ticket => (
                    <tr 
                      key={ticket.id} 
                      onClick={() => {
                        if (onTicketSelect) {
                          onTicketSelect(ticket.id);
                        } else {
                          navigate(`/tickets/${ticket.id}`);
                        }
                      }}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      title="Click to open ticket"
                    >
                      {viewFilter === 'pending_approval' && (
                        <td className={`px-4 ${cellPadding} text-center`} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedTickets.includes(ticket.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTickets([...selectedTickets, ticket.id]);
                              } else {
                                setSelectedTickets(selectedTickets.filter(id => id !== ticket.id));
                              }
                            }}
                            className="rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                          />
                        </td>
                      )}
                      <td className={`px-6 ${cellPadding}`}>
                        <div className="flex items-center gap-1.5">
                          {(ticket as any).is_express && (
                            <span className="inline-flex items-center gap-0.5 shrink-0 bg-red-50 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" title="Submitted via Express Ticket">
                              ⚡ Express
                            </span>
                          )}
                          <div className="text-sm font-semibold text-slate-900 group-hover:text-[#3B82F6] transition-colors line-clamp-1">{ticket.title}</div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {ticket.product_name} • {
                            (i18n.language === 'ar' && ticket.diagnostic_category?.category_name_ar)
                              ? ticket.diagnostic_category.category_name_ar
                              : (ticket.diagnostic_category?.category_name || ticket.category)
                          }
                        </div>
                      </td>
                      {visibleColumns['priority'] && (
                        <td className={`px-6 ${cellPadding}`}>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityStyle(ticket.priority)}`}>
                            {ticket.priority || 'Medium'}
                          </span>
                        </td>
                      )}
                      {visibleColumns['status_code'] && (
                        <td className={`px-6 ${cellPadding} text-sm font-medium`}>
                          {getStatusDisplay(ticket.status_code as string)}
                        </td>
                      )}
                      {visibleColumns['customer_name'] && (
                        <td className={`px-6 ${cellPadding} text-sm text-slate-600 truncate max-w-[120px]`}>
                          {ticket.customer_name || 'N/A'}
                        </td>
                      )}
                      {isAdmin && visibleColumns['assigned_to_name'] && (
                        <td className={`px-6 ${cellPadding}`}>
                          <div className="flex items-center gap-2">
                            {ticket.assigned_to ? (
                              <>
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.assigned_to_name || '?')}&background=dbeafe&color=1d4ed8&bold=true`}
                                  className="w-6 h-6 rounded-full shrink-0"
                                  alt="avatar"
                                />
                                <span className="text-sm text-slate-700 font-medium truncate max-w-[100px]">{ticket.assigned_to_name}</span>
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 italic truncate max-w-[120px]">
                                <User size={13} className="text-slate-300 shrink-0" /> Unassigned
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {isAdmin && visibleColumns['legacy_assigned_to'] && (
                        <td className={`px-6 ${cellPadding} text-sm text-slate-600 truncate max-w-[140px]`}>
                          {ticket.legacy_assigned_to || <span className="text-slate-300 italic">—</span>}
                        </td>
                      )}
                      {visibleColumns['created_at'] && (
                        <td className={`px-6 ${cellPadding} text-sm text-slate-500 whitespace-nowrap`}>
                          {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      )}
                      {visibleColumns['sla_due_date'] && (
                        <td className={`px-6 ${cellPadding} text-sm whitespace-nowrap`}>
                          {renderSlaBadge(ticket)}
                        </td>
                      )}
                      <td className={`px-6 ${cellPadding} text-right`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${ticket.id}`);
                          }}
                          className="text-[#3B82F6] hover:text-[#2563eb] transition-colors bg-blue-50 hover:bg-blue-100 p-2 rounded-lg opacity-0 group-hover:opacity-100 inline-flex items-center justify-center border border-blue-100 hover:border-blue-200 shadow-sm"
                          title="Open ticket"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Bar */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
            <div>Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} tickets</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => p - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || totalPages === 0}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
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
