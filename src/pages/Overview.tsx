import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { useTicketsPaginated } from '../hooks/useTickets';
import { 
  Clock, AlertTriangle, FileSpreadsheet, Filter, CheckCircle2, TrendingUp,
  Inbox, Users, ChevronDown, ChevronUp, Check, ShieldAlert, Download, List,
  Plus, Activity, ChevronRight, RotateCcw
} from 'lucide-react';

const COLORS = ['#3B82F6', '#14b8a6', '#6366f1', '#ec4899', '#8b5cf6', '#f59e0b', '#10b981'];

const MultiSelect = ({ options, selectedValues, onChange, placeholder }: { options: {id: string, name: string}[], selectedValues: string[], onChange: (vals: string[]) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const toggle = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 flex items-center gap-2 max-w-[170px]"
      >
        <span className="truncate flex-1 text-start">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} ${t('overview.selected')}`}
        </span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-white rounded-t-lg">
            <input
              type="text"
              placeholder={t('overview.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 italic">{t('overview.noBanksFound')}</div>
            ) : (
              filteredOptions.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  className="w-full text-start px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-3 h-3 rounded flex items-center justify-center shrink-0 border ${selectedValues.includes(opt.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
                    {selectedValues.includes(opt.id) && <Check size={10} />}
                  </div>
                  <span className="truncate">{opt.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const formatDuration = (startStr: string, endStr: string | null) => {
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const diff = end - start;
  if (diff < 0) return '0.0 days';
  const days = diff / (1000 * 60 * 60 * 24);
  return `${days.toFixed(1)} days`;
};

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const { tenants } = useTenant();
  const { data: recentTicketsData } = useTicketsPaginated(1, 5);
  const dashboardTickets = recentTicketsData?.data || [];
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userRoleUp = user?.role_code?.toUpperCase() || '';
  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(userRoleUp);

  // Filter States for Analytics
  const [fromDate, setFromDate] = useState<string>('2020-01-01');
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [selectedEscalationTeams, setSelectedEscalationTeams] = useState<string[]>([]);
  const [selectedEscalationDevelopers, setSelectedEscalationDevelopers] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [zeroTicketSearch, setZeroTicketSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [bankListSearch, setBankListSearch] = useState('');
  const [contractSearch, setContractSearch] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'expired'>('all');

  const yearOptions = useMemo(() => {
    const currentYear = new Date(toDate).getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2015; y--) years.push(y);
    return years;
  }, [toDate]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (year === 'all') {
      setFromDate('2020-01-01');
      setToDate(new Date().toISOString().split('T')[0]);
    } else {
      setFromDate(`${year}-01-01`);
      setToDate(`${year}-12-31`);
    }
  };

  // Fetch Server-Side Dashboard Analytics
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['dashboardAnalytics', fromDate, toDate, selectedCustomerIds, selectedEngineers],
    queryFn: () => api.getDashboardAnalytics(fromDate, toDate, selectedCustomerIds, selectedEngineers),
    refetchInterval: 30000,
    retry: false,
  });

  if (analyticsError) {
    console.error('[Overview] RPC get_dashboard_analytics failed:', analyticsError);
  }

  // Fetch Maintenance Contracts (all banks)
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['maintenanceContractsOverview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_contracts')
        .select('id, project_code, fiscal_year, start_date, end_date, customer:customers(id, name), product:products(product_name)')
        .order('end_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    retry: false,
  });

  const getContractStatus = (start: string, end: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (today < startDate) return { key: 'upcoming', label: 'Upcoming', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (today > endDate) return { key: 'expired', label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200' };
    return { key: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  const filteredContracts = useMemo(() => {
    const list = contractsData || [];
    const q = contractSearch.trim().toLowerCase();
    return list.filter((c: any) => {
      const status = getContractStatus(c.start_date, c.end_date);
      if (contractStatusFilter !== 'all' && status.key !== contractStatusFilter) return false;
      if (!q) return true;
      const bankName = (c.customer?.name || '').toLowerCase();
      const projectCode = (c.project_code || '').toLowerCase();
      const productName = (c.product?.product_name || '').toLowerCase();
      return bankName.includes(q) || projectCode.includes(q) || productName.includes(q);
    });
  }, [contractsData, contractSearch, contractStatusFilter]);

  const isLoading = analyticsLoading;

  // --- Dashboard Metrics Calculation ---
  const currentAndRecent = dashboardTickets.slice(0, 5);

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
      case 'REOPENED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'ASSIGNED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVESTIGATION': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DEVELOPMENT_ACTION': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PENDING_CUSTOMER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // --- Analytics Metrics Extraction ---
  const metrics = analyticsData?.metrics || { new_tickets: 0, reopened_tickets: 0, in_progress_tickets: 0, development_action_tickets: 0, closed_tickets: 0 };
  const customerListData = analyticsData?.ticketsByBankAll || [];
  const bankListFilteredData = useMemo(() => {
    return customerListData.filter((bank: any) => bank.name.toLowerCase().includes(bankListSearch.toLowerCase()));
  }, [customerListData, bankListSearch]);
  const zeroTicketBanks = analyticsData?.zeroTicketBanks || [];
  const productChartData = analyticsData?.ticketsByProduct || [];
  const productFilteredData = useMemo(() => {
    return productChartData
      .map((entry: any, index: number) => ({ ...entry, originalIndex: index }))
      .filter((entry: any) => entry.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [productChartData, productSearch]);
  const agentPerformance = analyticsData?.engineerPerformance || [];

  type EngineerSortColumn = 'name' | 'assigned' | 'resolved' | 'avgTime';
  const [engineerSortColumn, setEngineerSortColumn] = useState<EngineerSortColumn>('assigned');
  const [engineerSortDirection, setEngineerSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleEngineerSort = (column: EngineerSortColumn) => {
    setEngineerPage(1);
    if (engineerSortColumn === column) {
      setEngineerSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setEngineerSortColumn(column);
      setEngineerSortDirection('asc');
    }
  };

  const EngineerSortIcon = ({ column }: { column: EngineerSortColumn }) => {
    if (engineerSortColumn !== column) return null;
    return engineerSortDirection === 'asc' ? <ChevronUp size={13} className="inline ml-1" /> : <ChevronDown size={13} className="inline ml-1" />;
  };

  const sortedAgentPerformance = useMemo(() => {
    return [...agentPerformance].sort((a: any, b: any) => {
      let valA = a[engineerSortColumn];
      let valB = b[engineerSortColumn];
      if (engineerSortColumn === 'name') {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return engineerSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return engineerSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [agentPerformance, engineerSortColumn, engineerSortDirection]);

  const engineerPageSize = 10;
  const [engineerPage, setEngineerPage] = useState(1);
  const engineerTotalPages = Math.max(1, Math.ceil(sortedAgentPerformance.length / engineerPageSize));
  useEffect(() => {
    if (engineerPage > engineerTotalPages) setEngineerPage(1);
  }, [engineerTotalPages]);
  const paginatedAgentPerformance = sortedAgentPerformance.slice(
    (engineerPage - 1) * engineerPageSize,
    engineerPage * engineerPageSize
  );
  const developerWorkload = analyticsData?.developerWorkload || [];
  const rawEscalations = analyticsData?.escalations || [];

  const escalationMetrics = useMemo(() => {
    const uniqueEscalationTickets = new Set(rawEscalations.map((f: any) => f.ticket_id)).size;
    return { totalEscalations: uniqueEscalationTickets, rawData: rawEscalations };
  }, [rawEscalations]);

  const escalationTeamOptions = useMemo(() => {
    const teams = new Set(rawEscalations.map((esc: any) => esc.team_name).filter(Boolean));
    return Array.from(teams).map(t => ({ id: t as string, name: t as string }));
  }, [rawEscalations]);

  const escalationDeveloperOptions = useMemo(() => {
    const devs = new Set(rawEscalations.map((esc: any) => esc.escalated_developer_name).filter(Boolean));
    return Array.from(devs).map(d => ({ id: d as string, name: d as string }));
  }, [rawEscalations]);

  const displayedEscalations = useMemo(() => {
    let result = rawEscalations;
    if (selectedEscalationTeams.length > 0) {
      result = result.filter((esc: any) => selectedEscalationTeams.includes(esc.team_name));
    }
    if (selectedEscalationDevelopers.length > 0) {
      result = result.filter((esc: any) => selectedEscalationDevelopers.includes(esc.escalated_developer_name));
    }
    return result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rawEscalations, selectedEscalationTeams, selectedEscalationDevelopers]);

  const uniqueEngineers = []; // Keep for now if needed, though we should populate it differently if the filter depends on it. We can populate it from agentPerformance.
  if (agentPerformance.length > 0) {
     agentPerformance.forEach((a: any) => {
       if (a.id !== 'unassigned') uniqueEngineers.push({id: a.id, name: a.name});
     });
  }

  const handleExportCSV = () => {
     alert("CSV Export requires detailed ticket data which is no longer loaded on the dashboard. This feature will be moved to the Tickets List page.");
  };

  const handleExportZeroTicketBanks = () => {
    const rows = zeroTicketBanks
      .filter((bank: any) => bank.name.toLowerCase().includes(zeroTicketSearch.toLowerCase()))
      .map((bank: any) => ({ Bank: bank.name, Country: bank.country || '' }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `banks-with-zero-tickets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans p-3 md:p-6">
      {/* Welcome Banner */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('overview.welcome', { name: user?.full_name })}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role_code === 'client' 
              ? t('overview.clientSubtitle') 
              : t('overview.adminSubtitle')}
          </p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => navigate('/tickets?action=create')}
            className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
          >
            <Plus size={16} />
            {t('overview.fileTicket')}
          </button>
        )}
      </div>

      {/* Admin Analytics Filters */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Filter size={16} className="text-slate-500" /> {t('overview.analyticsFilters')}
        </div>
        <div className="flex flex-wrap gap-2.5 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
          <MultiSelect options={tenants.map(t => ({ id: t.id, name: t.customer_code ? `${t.name} - ${t.customer_code}` : t.name }))} selectedValues={selectedCustomerIds} onChange={setSelectedCustomerIds} placeholder={t('overview.allBanks')} />
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-1 focus-within:ring-blue-500">
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setSelectedYear('all'); }} className="bg-transparent text-slate-900 text-xs outline-none w-[110px]" />
            <span className="text-slate-400 text-xs">{t('overview.to')}</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setSelectedYear('all'); }} className="bg-transparent text-slate-900 text-xs outline-none w-[110px]" />
          </div>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Years</option>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <MultiSelect options={uniqueEngineers} selectedValues={selectedEngineers} onChange={setSelectedEngineers} placeholder={t('overview.allEngineers')} />
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer">
            <FileSpreadsheet size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Metrics Cards */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className="bg-white h-24 rounded-xl border border-slate-200" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=new')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.new')}</span>
              <Inbox size={18} className="text-blue-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.new_tickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.newDesc')}</span>
            </div>
          </div>

          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=reopened')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.reopened')}</span>
              <RotateCcw size={18} className="text-indigo-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.reopened_tickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.reopenedDesc')}</span>
            </div>
          </div>
          
          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=in_progress')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.inProgress')}</span>
              <Activity size={18} className="text-blue-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.in_progress_tickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.inProgressDesc')}</span>
            </div>
          </div>

          <div
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=development_action')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.developmentAction')}</span>
              <Activity size={18} className="text-indigo-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.development_action_tickets ?? 0}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.developmentActionDesc')}</span>
            </div>
          </div>

          <div
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?escalated=true')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.escalated')}</span>
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{escalationMetrics.totalEscalations}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.escalatedDesc')}</span>
            </div>
          </div>

          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=closed')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.closed')}</span>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.closed_tickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.closedDesc')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Banks with zero tickets */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 p-6 pb-3 text-start">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <AlertTriangle size={16} className="text-amber-500" /> Banks with 0 tickets
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Never opened a ticket this period ({zeroTicketBanks.length} banks).
            </p>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                placeholder="Filter by bank name..."
                value={zeroTicketSearch}
                onChange={(e) => setZeroTicketSearch(e.target.value)}
                className="flex-1 pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleExportZeroTicketBanks}
                disabled={zeroTicketBanks.length === 0}
                title="Export to Excel"
                className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-1.5 rounded-lg shrink-0 transition"
              >
                <FileSpreadsheet size={14} />
              </button>
            </div>
          </div>
          <div className="h-72 overflow-y-auto">
            {zeroTicketBanks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic px-4 text-center">
                Every bank has opened at least one ticket in this period. 🎉
              </div>
            ) : (
              <table className="w-full text-xs text-slate-700">
                <tbody className="divide-y divide-slate-100">
                  {zeroTicketBanks
                    .filter((bank: any) => bank.name.toLowerCase().includes(zeroTicketSearch.toLowerCase()))
                    .map((bank: any, idx: number) => (
                      <tr key={bank.id} className="hover:bg-amber-50/40 transition">
                        <td className="py-2 px-6 text-slate-400 w-6">{idx + 1}</td>
                        <td className="py-2 px-2 font-medium text-slate-900 truncate">{bank.name}</td>
                        <td className="py-2 px-6 text-slate-500 text-end">{bank.country || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* By Bank - Full List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 p-6 pb-3 text-start">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><List size={16} className="text-slate-500" /> {t('overview.ticketsByBank')} — All Banks</h3>
            <p className="text-xs text-slate-500 mt-1">Full breakdown for the selected period ({customerListData.length} banks)</p>
            <input
              type="text"
              placeholder="Search banks..."
              value={bankListSearch}
              onChange={(e) => setBankListSearch(e.target.value)}
              className="mt-3 pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="h-72 overflow-y-auto">
            {customerListData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">{t('overview.noBankData')}</div>
            ) : bankListFilteredData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No banks match "{bankListSearch}".</div>
            ) : (
              <table className="w-full text-xs text-slate-700">
                <tbody className="divide-y divide-slate-100">
                  {bankListFilteredData.map((bank: any, idx: number) => (
                    <tr
                      key={bank.name}
                      onClick={() => navigate(`/tickets?customerId=${encodeURIComponent(bank.id || 'none')}&customer=${encodeURIComponent(bank.name)}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-2 px-6 text-slate-400 w-6">{idx + 1}</td>
                      <td className="py-2 px-2 font-medium text-slate-900 truncate">{bank.name}</td>
                      <td className="py-2 px-6 text-right font-bold text-slate-700">{bank.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* By Product */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-3 text-start">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Inbox size={16} className="text-slate-500" /> {t('overview.ticketsByProduct')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('overview.ticketsByProductDesc')}</p>
          </div>
          <input
            type="text"
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="mb-3 pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="h-64 w-full flex flex-col sm:flex-row justify-center items-center gap-4">
            {productChartData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-slate-400 italic">{t('overview.noProductData')}</div>
            ) : productFilteredData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-slate-400 italic">No products match "{productSearch}".</div>
            ) : (
              <>
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={productFilteredData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {productFilteredData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[entry.originalIndex % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto w-full text-start">
                  {productFilteredData.map((entry: any) => (
                    <div key={entry.name} className="flex items-start gap-2 text-xs">
                      <span className="w-3 h-3 rounded mt-[2px] shrink-0" style={{ backgroundColor: COLORS[entry.originalIndex % COLORS.length] }} />
                      <span className="font-medium text-slate-700 truncate flex-1">{entry.name}</span>
                      <span className="font-semibold text-slate-500">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Contracts */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-start">
            <div>
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><FileSpreadsheet size={16} className="text-slate-500" /> Maintenance Contracts</h3>
              <p className="text-xs text-slate-500 mt-1">Project code, start/end dates for all banks ({filteredContracts.length} contracts)</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={contractStatusFilter}
                onChange={(e) => setContractStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="expired">Expired</option>
              </select>
              <input
                type="text"
                placeholder="Search bank, project code, product..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-64 max-w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full min-w-[700px] border-collapse text-start text-xs text-slate-700">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-6">Bank</th>
                  <th className="py-3 px-6">Product</th>
                  <th className="py-3 px-6">Project Code</th>
                  <th className="py-3 px-6">Start Date</th>
                  <th className="py-3 px-6">End Date</th>
                  <th className="py-3 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractsLoading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic">Loading contracts...</td></tr>
                ) : filteredContracts.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic">No contracts match your filters.</td></tr>
                ) : (
                  filteredContracts.map((c: any) => {
                    const status = getContractStatus(c.start_date, c.end_date);
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="py-3 px-6 font-semibold text-slate-900">{c.customer?.name || 'Unknown'}</td>
                        <td className="py-3 px-6 text-slate-600">{c.product?.product_name || '—'}</td>
                        <td className="py-3 px-6 text-slate-600">{c.project_code || <span className="text-slate-300 italic">—</span>}</td>
                        <td className="py-3 px-6 text-slate-600">{new Date(c.start_date).toLocaleDateString()}</td>
                        <td className="py-3 px-6 text-slate-600">{new Date(c.end_date).toLocaleDateString()}</td>
                        <td className="py-3 px-6">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${status.color}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Engineer Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 text-start">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Users size={16} className="text-slate-500" /> {t('overview.engineerPerformance')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-start text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-6 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleEngineerSort('name')}>
                  {t('overview.engineer')}<EngineerSortIcon column="name" />
                </th>
                <th className="py-3 px-6 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleEngineerSort('assigned')}>
                  {t('overview.activeQueue')}<EngineerSortIcon column="assigned" />
                </th>
                <th className="py-3 px-6 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleEngineerSort('resolved')}>
                  {t('overview.resolved')}<EngineerSortIcon column="resolved" />
                </th>
                <th className="py-3 px-6 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => handleEngineerSort('avgTime')}>
                  {t('overview.avgResolutionSpeed')}<EngineerSortIcon column="avgTime" />
                </th>
                <th className="py-3 px-6">{t('overview.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAgentPerformance.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic">{t('overview.noEngineerActions')}</td></tr>
              ) : (
                paginatedAgentPerformance.map(agent => (
                  <tr 
                    key={agent.id} 
                    className="hover:bg-slate-100 transition cursor-pointer"
                    onClick={() => navigate(`/tickets?engineer=${encodeURIComponent(agent.id)}`)}
                  >
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">{(agent.name || '?').charAt(0)}</div>
                      <div><p className="text-sm font-medium">{agent.name || 'Unknown'}</p><p className="text-xs text-slate-400">ID: {(agent.name || 'unknown').replaceAll(' ', '-').toLowerCase()}</p></div>
                    </td>
                    <td className="py-4 px-6 text-center font-medium">{agent.assigned}</td>
                    <td className="py-4 px-6 text-center font-medium text-emerald-600">{agent.resolved}</td>
                    <td className="py-4 px-6 text-center font-bold text-slate-700">{agent.avgTime} days</td>
                    <td className="py-4 px-6">
                      {agent.assigned > 5 ? <span className="bg-red-50 text-red-700 border border-red-100 font-medium px-2 py-0.5 rounded text-xs">{t('overview.highLoad')}</span> : <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium px-2 py-0.5 rounded text-xs">{t('overview.active')}</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {sortedAgentPerformance.length > engineerPageSize && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {(engineerPage - 1) * engineerPageSize + 1} to {Math.min(engineerPage * engineerPageSize, sortedAgentPerformance.length)} of {sortedAgentPerformance.length} engineers
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEngineerPage(p => Math.max(1, p - 1))}
                disabled={engineerPage <= 1}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              <span className="text-slate-400">Page {engineerPage} of {engineerTotalPages}</span>
              <button
                onClick={() => setEngineerPage(p => Math.min(engineerTotalPages, p + 1))}
                disabled={engineerPage >= engineerTotalPages}
                className="px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 text-start">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Users size={16} className="text-slate-500" /> {t('overview.developerWorkload')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-6">{t('overview.developer')}</th>
                <th className="py-3 px-6">{t('overview.team')}</th>
                <th className="py-3 px-6 text-center">{t('overview.totalEscalations')}</th>
                <th className="py-3 px-6 text-center">{t('overview.pending')}</th>
                <th className="py-3 px-6 text-center">{t('overview.returned')}</th>
                <th className="py-3 px-6 text-end">{t('overview.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {developerWorkload.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 italic">{t('overview.noDevelopers')}</td></tr>
              ) : (
                developerWorkload.map((dev) => (
                  <tr 
                    key={dev.developer} 
                    onClick={() => navigate(`/tickets?escalated=true&developer=${encodeURIComponent(dev.developer)}`)}
                    className="hover:bg-slate-50 transition cursor-pointer group"
                  >
                    <td className="py-3 px-6 font-medium text-slate-900 group-hover:text-indigo-700">{dev.developer}</td>
                    <td className="py-3 px-6 text-slate-600 font-medium">{dev.team}</td>
                    <td className="py-3 px-6 text-center font-bold text-slate-700">{dev.total}</td>
                    <td className={`py-3 px-6 text-center font-bold ${dev.pending > 0 ? 'text-orange-500' : 'text-slate-400'}`}>{dev.pending}</td>
                    <td className="py-3 px-6 text-center font-bold text-emerald-600">{dev.returned}</td>
                    <td className="py-3 px-6 text-end">
                      <span className="text-indigo-600 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                        {t('overview.viewTickets')} <ChevronRight size={14} className="rtl:rotate-180" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><List size={16} className="text-slate-500" /> {t('overview.escalationDetails')}</h3>
          <div className="flex items-center gap-2 w-[400px]">
            <div className="flex-1">
              <MultiSelect options={escalationTeamOptions} selectedValues={selectedEscalationTeams} onChange={setSelectedEscalationTeams} placeholder={t("overview.filterByTeam")} />
            </div>
            <div className="flex-1">
              <MultiSelect options={escalationDeveloperOptions} selectedValues={selectedEscalationDevelopers} onChange={setSelectedEscalationDevelopers} placeholder={t("overview.filterByDeveloper")} />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-start text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-6 w-32">{t('overview.ticketNo')}</th><th className="py-3 px-6">{t('overview.subject')}</th><th className="py-3 px-6">{t('overview.assignedEngineer')}</th><th className="py-3 px-6">{t('overview.escalatedTo')}</th><th className="py-3 px-6">{t('overview.developer')}</th><th className="py-3 px-6">{t('overview.escalatedOn')}</th><th className="py-3 px-6">{t('overview.returnedOn')}</th><th className="py-3 px-6 text-end">{t('overview.duration')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEscalations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">{t('overview.noEscalations')}</td>
                </tr>
              ) : (
                displayedEscalations.map((esc: any) => (
                  <tr 
                    key={esc.id} 
                    onClick={() => navigate(`/tickets/${esc.ticket_id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="py-3 px-6 font-medium">
                      <span className="text-orange-500 font-semibold">
                        TK-{esc.tickets?.ticket_no || esc.ticket_id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-900 font-medium truncate max-w-[200px]" title={esc.tickets?.subject}>{esc.tickets?.subject || '—'}</td>
                    <td className="py-3 px-6 text-slate-600 font-medium">{esc.tickets?.assigned_to_name || 'Unassigned'}</td>
                    <td className="py-3 px-6 font-medium text-slate-900">{esc.teams?.team_name || 'Unknown Team'}</td>
                    <td className="py-3 px-6 text-slate-500">{esc.escalated_developer_name || '—'}</td>
                    <td className="py-3 px-6 text-slate-600">{new Date(esc.created_at).toLocaleString()}</td>
                    <td className="py-3 px-6">{esc.escalation_returned_at ? <span className="text-emerald-600 font-medium">{new Date(esc.escalation_returned_at).toLocaleString()}</span> : <span className="text-orange-500 font-medium">{t('overview.pending')}</span>}</td>
                    <td className="py-3 px-6 text-end">
                      {esc.escalation_returned_at ? (
                        <span className="font-bold text-slate-700">{formatDuration(esc.created_at, esc.escalation_returned_at)}</span>
                      ) : (
                        <span className={`font-bold ${((Date.now() - new Date(esc.created_at).getTime()) / (1000 * 60 * 60)) > 48 ? 'text-red-600' : 'text-orange-500'}`}>
                          {formatDuration(esc.created_at, null)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-950 text-sm uppercase tracking-wider">{t('overview.recentTicketIntake')}</h3>
          <button onClick={() => navigate('/tickets')} className="text-xs text-teal-600 hover:text-teal-700 font-semibold cursor-pointer">{t('overview.viewAll')}</button>
        </div>
        {analyticsLoading ? (
          <div className="space-y-4 mt-4">
            {[1,2,3].map((i) => <div key={i} className="animate-pulse flex gap-3"><div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0" /><div className="flex-1 space-y-1.5 pt-1"><div className="h-3 bg-slate-100 rounded w-3/4" /><div className="h-2 bg-slate-100 rounded w-1/2" /></div></div>)}
          </div>
        ) : currentAndRecent.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">{t('overview.noTickets')}</div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {currentAndRecent.map((ticket) => (
              <div key={ticket.id} onClick={() => navigate(`/tickets?id=${ticket.id}`)} className="py-3.5 flex items-start gap-3 hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition">
                <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 bg-teal-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{ticket.title}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate uppercase">{ticket.id} • {ticket.customer_name || 'System'}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 border rounded-full leading-none py-0.5 ${getPriorityStyle(ticket.priority)}`}>{ticket.priority}</span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 border rounded-full leading-none py-0.5 ${getStatusStyle(ticket.status_code || ticket.status)}`}>{ticket.status_code ? ticket.status_code.replace('_', ' ') : ticket.status}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 self-center rtl:rotate-180" />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
