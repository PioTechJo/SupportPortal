import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTickets, useTicketDetails } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Ticket, Profile, CustomerProduct } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Inbox,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Package
} from 'lucide-react';
import { TicketCreationWizard } from '../components/ticket-wizard/TicketCreationWizard';

export const Tickets: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenants } = useTenant();
  const { tickets, isLoading, createTicket, updateTicket } = useTickets();

  // Create Modal Action
  const isCreateAction = searchParams.get('action') === 'create';
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewFilter, setViewFilter] = useState<string>(
    ['SUPPORT_ENGINEER', 'TEAM_LEAD'].includes(user?.role_name?.toUpperCase() || '') ? 'assigned' : 'all'
  );
  const [productFilter, setProductFilter] = useState<string>('all');
  
  // Collapsible state
  
  // TODO: Temporary debug logs as requested by user
  useEffect(() => {
    console.log('[DEBUG Tickets.tsx] Total tickets received from useTickets():', tickets.length);
    console.log('[DEBUG Tickets.tsx] Current viewFilter state:', viewFilter);
  }, [tickets.length, viewFilter]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(true);
  const [isProductOpen, setIsProductOpen] = useState(true);
  const [isMyWorkOpen, setIsMyWorkOpen] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER'].includes(user?.role_name?.toUpperCase() || '');

  const [engineers, setEngineers] = useState<any[]>([]);
  const [engineerFilter, setEngineerFilter] = useState<string>('all');
  const [isEngineerFilterOpen, setIsEngineerFilterOpen] = useState(false);

  const [dateRange, setDateRange] = useState<string>('all');
  const [isDateRangeOpen, setIsDateRangeOpen] = useState(false);
  
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  type SortColumn = 'title' | 'priority' | 'status_code' | 'customer_name' | 'assigned_to_name' | 'created_at';
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
  }, [viewFilter, productFilter, search]);

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
    const matchesSearch = (ticket.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (ticket.id || '').toLowerCase().includes(search.toLowerCase());
    
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
    const matchesEngineer = !isAdmin || engineerFilter === 'all' || 
                            (engineerFilter === 'unassigned' && !ticket.assigned_to) || 
                            (engineerFilter !== 'unassigned' && engineerFilter !== 'all' && ticket.assigned_to === engineerFilter);

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

    return matchesSearch && matchesView && matchesProduct && matchesEngineer && matchesDate && matchesPriority;
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
    let color = 'bg-slate-400';
    let text = 'Open';
    
    if (s === 'NEW' || s === 'OPEN') { color = 'bg-blue-500'; text = 'New'; }
    else if (s === 'ASSIGNED') { color = 'bg-purple-500'; text = 'Assigned'; }
    else if (s === 'INVESTIGATION' || s === 'IN_PROGRESS') { color = 'bg-amber-500'; text = 'In Progress'; }
    else if (s === 'PENDING_CUSTOMER') { color = 'bg-orange-500'; text = 'Pending Customer'; }
    else if (s === 'RESOLVED_PENDING_APPROVAL') { color = 'bg-amber-500'; text = 'Pending Approval'; }
    else if (s === 'APPROVED') { color = 'bg-green-500'; text = 'Approved'; }
    else if (s === 'RESOLVED') { color = 'bg-green-500'; text = 'Resolved'; }
    else if (s === 'CLOSED') { color = 'bg-slate-400'; text = 'Closed'; }

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        <span className="text-slate-700">{text}</span>
      </div>
    );
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

  return (
    <div className="flex h-full p-6 max-w-[1600px] mx-auto">
      
      {/* Left Panel Wrapper */}
      <div 
        className="relative shrink-0 transition-all duration-200"
        style={{ 
          width: isSidebarOpen ? '200px' : '0px', 
          marginRight: isSidebarOpen ? '1.5rem' : '0' 
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-0 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm z-50 transition-colors`}
        >
          {isSidebarOpen ? <ChevronLeft size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
        </button>
        
        {/* Inner Content (clipped when collapsed) */}
        <div className={`overflow-hidden w-full h-full transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-[200px] flex flex-col gap-6 select-none">
            
            {/* Section 1: Ticket Views */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Ticket views</h3>
          <nav className="flex flex-col gap-1">
            
            {/* All tickets */}
            <button
              onClick={() => { setViewFilter('all'); setProductFilter('all'); }}
              className={`
                flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-colors w-full text-left
                ${viewFilter === 'all' && productFilter === 'all' ? 'bg-[#fff5ee] text-[#f97316] font-medium' : 'text-slate-600 hover:bg-slate-100'}
              `}
            >
              <div className="flex items-center gap-2">
                <Inbox size={16} className={viewFilter === 'all' && productFilter === 'all' ? 'text-[#f97316]' : 'text-slate-400'} />
                <span>All tickets</span>
              </div>
              <span className={`text-xs ${viewFilter === 'all' && productFilter === 'all' ? 'text-[#f97316]' : 'text-slate-400'}`}>{allTicketsView.count}</span>
            </button>

            {/* By status */}
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); setIsStatusOpen(prev => !prev); }} 
              className="flex items-center justify-between px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg w-full text-left font-medium mt-1"
            >
              <span>By status</span>
              {isStatusOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            <div className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-150 ease-in-out ${isStatusOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}>
              {statusViews.map(view => {
                const isActive = viewFilter === view.id && productFilter === 'all';
                return (
                  <button
                    key={view.id}
                    onClick={() => { setViewFilter(view.id); setProductFilter('all'); }}
                    className={`
                      flex items-center justify-between py-1.5 pr-3 pl-8 rounded-lg text-[13px] transition-colors w-full text-left
                      ${isActive ? 'bg-[#fff5ee] text-[#f97316] font-medium' : 'text-slate-500 hover:bg-slate-100'}
                    `}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`w-1 h-1 rounded-full shrink-0 ${isActive ? 'bg-[#f97316]' : 'bg-slate-300'}`} />
                      <span className="truncate">{view.name}</span>
                    </div>
                    <span className={`text-xs ${isActive ? 'text-[#f97316]' : 'text-slate-400'}`}>{view.count}</span>
                  </button>
                );
              })}
            </div>

            {/* By product */}
            {productViews.length > 0 && (
              <>
                <button 
                  type="button"
                  onClick={(e) => { e.preventDefault(); setIsProductOpen(prev => !prev); }} 
                  className="flex items-center justify-between px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-100 rounded-lg w-full text-left font-medium mt-1"
                >
                  <span>By product</span>
                  {isProductOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                </button>
                <div className={`flex flex-col gap-0.5 overflow-hidden transition-all duration-150 ease-in-out ${isProductOpen ? 'max-h-[1000px] opacity-100 mt-1' : 'max-h-0 opacity-0 mt-0'}`}>
                  {productViews.map(prod => {
                    const isActive = productFilter === prod.name;
                    return (
                      <button
                        key={prod.id}
                        onClick={() => { setProductFilter(prod.name); setViewFilter('all'); }}
                        className={`
                          flex items-center justify-between py-1.5 pr-3 pl-8 rounded-lg text-[13px] transition-colors w-full text-left
                          ${isActive ? 'bg-[#fff5ee] text-[#f97316] font-medium' : 'text-slate-500 hover:bg-slate-100'}
                        `}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div className={`w-1 h-1 rounded-full shrink-0 ${isActive ? 'bg-[#f97316]' : 'bg-slate-300'}`} />
                          <span className="truncate">{prod.name}</span>
                        </div>
                        <span className={`text-xs ${isActive ? 'text-[#f97316]' : 'text-slate-400'}`}>{prod.count}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </nav>
        </div>

        {/* Section 2: My Work */}
        <div>
          <button 
            type="button"
            onClick={(e) => { e.preventDefault(); setIsMyWorkOpen(prev => !prev); }}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2 hover:text-slate-600 transition-colors text-left"
          >
            <span>My work</span>
            {isMyWorkOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>
          <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-150 ease-in-out ${isMyWorkOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <nav className="flex flex-col gap-1">
              {myWorkViews.map(view => {
                const isActive = viewFilter === view.id && productFilter === 'all';
                return (
                  <button
                    key={view.id}
                    onClick={() => { setViewFilter(view.id); setProductFilter('all'); }}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-colors w-full text-left
                      ${isActive ? 'bg-[#fff5ee] text-[#f97316] font-medium' : 'text-slate-600 hover:bg-slate-100'}
                    `}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{view.name}</span>
                    </div>
                    <span className={`text-xs ${isActive ? 'text-[#f97316]' : 'text-slate-400'}`}>{view.count}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
    </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">
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
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-1 focus:ring-[#f97316]"
              />
            </div>
            
            {/* Date Range Filter */}
            <div className="relative">
              <button 
                onClick={() => setIsDateRangeOpen(!isDateRangeOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
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
                      className={`w-full text-left px-4 py-2 text-sm ${dateRange === val ? 'bg-[#fff5ee] text-[#f97316]' : 'text-slate-700 hover:bg-slate-50'}`}
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
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
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
                      className={`w-full text-left px-4 py-2 text-sm capitalize ${priorityFilter === val ? 'bg-[#fff5ee] text-[#f97316]' : 'text-slate-700 hover:bg-slate-50'}`}
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
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="truncate max-w-[120px]">
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
                      className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'all' ? 'bg-[#fff5ee] text-[#f97316]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      All Engineers
                    </button>
                    <button 
                      onClick={() => { setEngineerFilter('unassigned'); setIsEngineerFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === 'unassigned' ? 'bg-[#fff5ee] text-[#f97316]' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      Unassigned
                    </button>
                    {engineers.length > 0 && <div className="h-px bg-slate-100 my-1"></div>}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {engineers.map(eng => (
                        <button
                          key={eng.id}
                          onClick={() => { setEngineerFilter(eng.id); setIsEngineerFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-sm ${engineerFilter === eng.id ? 'bg-[#fff5ee] text-[#f97316]' : 'text-slate-700 hover:bg-slate-50'}`}
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
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors ml-2 shadow-sm disabled:opacity-50"
              >
                {bulkApproving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <CheckCircle2 size={16} />}
                Approve Selected ({selectedTickets.length})
              </button>
            )}
            
            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors ml-2 shadow-sm"
            >
              <Plus size={16} />
              Create ticket
            </button>
          </div>
        </div>

        {/* Clean Data Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  {viewFilter === 'pending_approval' && (
                    <th className="px-4 py-4 w-12 text-center">
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
                        className="rounded border-slate-300 text-[#f97316] focus:ring-[#f97316]"
                      />
                    </th>
                  )}
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('title')}>Subject <SortIcon column="title" /></th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('priority')}>Priority <SortIcon column="priority" /></th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-40 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status_code')}>Status <SortIcon column="status_code" /></th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('customer_name')}>Customer <SortIcon column="customer_name" /></th>
                  {isAdmin && <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('assigned_to_name')}>Assigned To <SortIcon column="assigned_to_name" /></th>}
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('created_at')}>Created <SortIcon column="created_at" /></th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={viewFilter === 'pending_approval' ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6)} className="px-6 py-12 text-center text-slate-400">Loading tickets...</td>
                  </tr>
                ) : sortedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={viewFilter === 'pending_approval' ? (isAdmin ? 8 : 7) : (isAdmin ? 7 : 6)} className="px-6 py-12 text-center text-slate-400">No tickets found.</td>
                  </tr>
                ) : (
                  sortedTickets.map(ticket => (
                    <tr 
                      key={ticket.id} 
                      onDoubleClick={() => navigate(`/tickets/${ticket.id}`)}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      title="Double-click to open ticket"
                    >
                      {viewFilter === 'pending_approval' && (
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                            className="rounded border-slate-300 text-[#f97316] focus:ring-[#f97316]"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-[#f97316] transition-colors line-clamp-1">{ticket.title}</div>
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{ticket.product_name} • {ticket.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityStyle(ticket.priority)}`}>
                          {ticket.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        {getStatusDisplay(ticket.status_code as string)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[120px]">
                        {ticket.customer_name || 'N/A'}
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {ticket.assigned_to_name ? (
                              <>
                                <img 
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(ticket.assigned_to_name)}&background=f1f5f9&color=64748b&bold=true`} 
                                  className="w-6 h-6 rounded-full shrink-0" 
                                  alt="avatar" 
                                />
                                <span className="text-sm text-slate-700 font-medium truncate max-w-[100px]">{ticket.assigned_to_name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-300 italic truncate max-w-[100px]">Unassigned</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${ticket.id}`);
                          }}
                          className="text-[#f97316] hover:text-[#ea580c] text-sm font-medium transition-colors bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100"
                        >
                          Open
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
            <div>Showing {filteredTickets.length} tickets</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50" disabled>Next</button>
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
