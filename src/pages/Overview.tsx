import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useTickets } from '../hooks/useTickets';
import { 
  Building, Clock, AlertTriangle, FileSpreadsheet, Filter, CheckCircle2, TrendingUp,
  Inbox, Users, ChevronDown, Check, ShieldAlert, Download, List,
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
  const { tickets: dashboardTickets, activeTicketsCount, isLoading: dashLoading } = useTickets();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const userRoleUp = user?.role_code?.toUpperCase() || '';
  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(userRoleUp);

  // Filter States for Analytics
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [selectedEscalationTeams, setSelectedEscalationTeams] = useState<string[]>([]);
  const [selectedEscalationDevelopers, setSelectedEscalationDevelopers] = useState<string[]>([]);

  // Load all tickets for Analytics
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
    refetchInterval: 15000,
  });

  // Load escalations
  const { data: escalations = [], isLoading: escalationsLoading } = useQuery({
    queryKey: ['internalEscalations'],
    queryFn: () => api.getAllInternalEscalations(),
    refetchInterval: 15000,
  });

  console.log("Escalations RAW Count:", escalations.length);
  if (escalations.length > 0) {
    console.log("Escalations First Item:", JSON.stringify(escalations[0]));
  }
  console.log("Current Filters -> fromDate:", fromDate, "toDate:", toDate);

  const isLoading = ticketsLoading || escalationsLoading || dashLoading;

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
      case 'PENDING_CUSTOMER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // --- Analytics Metrics Calculation ---
  const uniqueEngineers = useMemo(() => {
    const engs = new Map<string, string>();
    tickets.forEach(t => {
      if (t.assigned_to) {
        engs.set(t.assigned_to, t.assigned_to_name || 'Unknown Engineer');
      }
    });
    return Array.from(engs.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const analyticsTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at).toISOString().split('T')[0];
      if (ticketDate < fromDate || ticketDate > toDate) return false;
      if (selectedCustomerIds.length > 0) {
        const cId = ticket.customer_id || ticket.tenant_id;
        if (!cId || !selectedCustomerIds.includes(cId)) return false;
      }
      if (selectedEngineers.length > 0) {
        if (!ticket.assigned_to || !selectedEngineers.includes(ticket.assigned_to)) return false;
      }
      return true;
    });
  }, [tickets, fromDate, toDate, selectedCustomerIds, selectedEngineers]);

  const metrics = useMemo(() => {
    let newTickets = 0;
    let reopenedTickets = 0;
    let inProgressTickets = 0;
    let closedTickets = 0;

    analyticsTickets.forEach(t => {
      const code = (t.status_code || '').toUpperCase();
      if (code === 'NEW') newTickets++;
      else if (code === 'REOPENED') reopenedTickets++;
      else if (code === 'INVESTIGATION') inProgressTickets++;
      else if (code === 'CLOSED' || code === 'APPROVED') closedTickets++;
    });

    return { newTickets, reopenedTickets, inProgressTickets, closedTickets };
  }, [analyticsTickets]);

  const escalationMetrics = useMemo(() => {
    const filtered = escalations.filter(esc => {
      const escDate = new Date(esc.created_at).toISOString().split('T')[0];
      if (escDate < fromDate || escDate > toDate) return false;
      const cId = esc.tickets?.customer_id || esc.tickets?.tenant_id;
      if (selectedCustomerIds.length > 0) {
        if (!cId || !selectedCustomerIds.includes(cId)) return false;
      }
      const assignedTo = esc.tickets?.assigned_to;
      if (selectedEngineers.length > 0) {
        if (!assignedTo || !selectedEngineers.includes(assignedTo)) return false;
      }
      return true;
    });

    const uniqueEscalationTickets = new Set(filtered.map(f => f.ticket_id)).size;

    return { totalEscalations: uniqueEscalationTickets, rawData: filtered };
  }, [escalations, fromDate, toDate, selectedCustomerIds, selectedEngineers]);

  const escalationTeamOptions = useMemo(() => {
    const teams = new Set(escalationMetrics.rawData.map((esc: any) => esc.teams?.team_name).filter(Boolean));
    return Array.from(teams).map(t => ({ id: t as string, name: t as string }));
  }, [escalationMetrics.rawData]);

  const escalationDeveloperOptions = useMemo(() => {
    const devs = new Set(escalationMetrics.rawData.map((esc: any) => esc.escalated_developer_name).filter(Boolean));
    return Array.from(devs).map(d => ({ id: d as string, name: d as string }));
  }, [escalationMetrics.rawData]);

  const displayedEscalations = useMemo(() => {
    let result = escalationMetrics.rawData;
    if (selectedEscalationTeams.length > 0) {
      result = result.filter((esc: any) => selectedEscalationTeams.includes(esc.teams?.team_name));
    }
    if (selectedEscalationDevelopers.length > 0) {
      result = result.filter((esc: any) => selectedEscalationDevelopers.includes(esc.escalated_developer_name));
    }
    return result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [escalationMetrics.rawData, selectedEscalationTeams, selectedEscalationDevelopers]);

  const developerWorkload = useMemo(() => {
    const workload: Record<string, { developer: string, team: string, total: number, pending: number, returned: number }> = {};
    escalationMetrics.rawData.forEach((esc: any) => {
      const devName = esc.escalated_developer_name;
      if (devName) {
        const teamName = esc.teams?.team_name || 'Unknown Team';
        if (!workload[devName]) {
          workload[devName] = { developer: devName, team: teamName, total: 0, pending: 0, returned: 0 };
        }
        workload[devName].total++;
        if (esc.escalation_returned_at) {
          workload[devName].returned++;
        } else {
          workload[devName].pending++;
        }
      }
    });
    return Object.values(workload).sort((a, b) => b.total - a.total);
  }, [escalationMetrics.rawData]);

  const customerChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsTickets.forEach(t => {
      const bName = t.customer_name || t.tenant_name || 'Global Core';
      counts[bName] = (counts[bName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [analyticsTickets]);

  const productChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsTickets.forEach(t => {
      const pName = t.product_name || 'PIO-INTEGRATOR API Gateway';
      counts[pName] = (counts[pName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyticsTickets]);



  const agentPerformance = useMemo(() => {
    const resolvedCodes = ['RESOLVED', 'CLOSED', 'APPROVED'];
    const performance: Record<string, { id: string; name: string; assigned: number; resolved: number; totalHours: number }> = {};
    analyticsTickets.forEach(t => {
      const code = (t.status_code || '').toUpperCase();
      const isResolved = resolvedCodes.includes(code) || ['resolved', 'closed'].includes(t.status);
      const agentId = t.assigned_to || 'unassigned';
      const agentName = t.assigned_to_name || 'Unassigned';
      if (!performance[agentId]) performance[agentId] = { id: agentId, name: agentName, assigned: 0, resolved: 0, totalHours: 0 };
      performance[agentId].assigned++;
      if (isResolved) {
        performance[agentId].resolved++;
        const resolvedAtStr = t.resolution_approved_at || t.resolved_at || t.updated_at;
        const resDate = resolvedAtStr ? new Date(resolvedAtStr) : new Date(t.updated_at);
        const crDate = new Date(t.created_at);
        const hours = (resDate.getTime() - crDate.getTime()) / (1000 * 60 * 60);
        if (!isNaN(hours) && hours >= 0) performance[agentId].totalHours += hours;
      }
    });
    return Object.values(performance).map(p => {
      const avgTime = p.resolved > 0 ? ((p.totalHours / p.resolved) / 24).toFixed(1) : '0.0';
      return { ...p, avgTime: parseFloat(avgTime) };
    }).sort((a, b) => b.resolved - a.resolved);
  }, [analyticsTickets]);

  const handleExportCSV = () => {
    const csvRows = analyticsTickets.map(t => ({
      'Ticket ID': t.id, 'Title': t.title, 'Status': t.status_code || t.status,
      'Priority': t.priority_name || t.priority, 'Product': t.product_name,
      'Customer/Bank': t.customer_name || t.tenant_name,
      'Created At': new Date(t.created_at).toLocaleString(),
      'Resolved At': t.resolution_approved_at || t.resolved_at || 'N/A',
      'Assigned Agent': t.assigned_to_name || 'Unassigned'
    }));
    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Support_Portal_Analytics_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans p-6">
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
          <MultiSelect options={tenants.map(t => ({ id: t.id, name: t.name }))} selectedValues={selectedCustomerIds} onChange={setSelectedCustomerIds} placeholder={t('overview.allBanks')} />
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-1 focus-within:ring-blue-500">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="bg-transparent text-slate-900 text-xs outline-none w-[110px]" />
            <span className="text-slate-400 text-xs">{t('overview.to')}</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="bg-transparent text-slate-900 text-xs outline-none w-[110px]" />
          </div>
          <MultiSelect options={uniqueEngineers} selectedValues={selectedEngineers} onChange={setSelectedEngineers} placeholder={t('overview.allEngineers')} />
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer">
            <FileSpreadsheet size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Analytics Metrics Cards */}
      {ticketsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 animate-pulse">
          {[1,2,3,4,5].map(i => <div key={i} className="bg-white h-24 rounded-xl border border-slate-200" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between cursor-pointer hover:bg-slate-50 transition"
            onClick={() => navigate('/tickets?status=new')}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">{t('overview.new')}</span>
              <Inbox size={18} className="text-blue-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.newTickets}</span>
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
              <span className="text-3xl font-bold text-slate-900">{metrics.reopenedTickets}</span>
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
              <span className="text-3xl font-bold text-slate-900">{metrics.inProgressTickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.inProgressDesc')}</span>
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
              <span className="text-3xl font-bold text-slate-900">{metrics.closedTickets}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">{t('overview.closedDesc')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Bank */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-start">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Building size={16} className="text-slate-500" /> {t('overview.ticketsByBank')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('overview.ticketsByBankDesc')}</p>
          </div>
          <div className="h-72 w-full">
            {customerChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">{t('overview.noBankData')}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip wrapperStyle={{ fontSize: 12, borderRadius: '8px' }} cursor={{ fill: '#f1f5f9' }} />
                  <Bar 
                    dataKey="count" 
                    fill="#3b82f6" 
                    radius={[4, 4, 0, 0]} 
                    barSize={32} 
                    onClick={(data) => {
                      if (data && data.name) {
                        navigate(`/tickets?customer=${encodeURIComponent(data.name)}`);
                      }
                    }}
                    cursor="pointer"
                    className="hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        {/* By Product */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-start">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Inbox size={16} className="text-slate-500" /> {t('overview.ticketsByProduct')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('overview.ticketsByProductDesc')}</p>
          </div>
          <div className="h-72 w-full flex flex-col sm:flex-row justify-center items-center gap-4">
            {productChartData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-slate-400 italic">{t('overview.noProductData')}</div>
            ) : (
              <>
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={productChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {productChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto w-full text-start">
                  {productChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-start gap-2 text-xs">
                      <span className="w-3 h-3 rounded mt-[2px] shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
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



      {/* Engineer Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 text-start">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm"><Users size={16} className="text-slate-500" /> {t('overview.engineerPerformance')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-start text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-6">{t('overview.engineer')}</th><th className="py-3 px-6 text-center">{t('overview.activeQueue')}</th><th className="py-3 px-6 text-center">{t('overview.resolved')}</th><th className="py-3 px-6 text-center">{t('overview.avgResolutionSpeed')}</th><th className="py-3 px-6">{t('overview.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-slate-400 italic">{t('overview.noEngineerActions')}</td></tr>
              ) : (
                agentPerformance.map(agent => (
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
        {dashLoading ? (
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
