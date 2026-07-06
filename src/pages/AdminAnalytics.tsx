import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Building, 
  Clock, 
  AlertTriangle, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  CheckCircle2, 
  TrendingUp,
  Inbox,
  Sparkles,
  Users,
  ChevronDown,
  Check,
  ShieldAlert,
  Download,
  List
} from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#6366f1', '#14b8a6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const MultiSelect = ({ options, selectedValues, onChange, placeholder }: { options: {id: string, name: string}[], selectedValues: string[], onChange: (vals: string[]) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter(v => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-900 flex items-center gap-2 max-w-[170px]"
      >
        <span className="truncate flex-1 text-left">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} Selected`}
        </span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button 
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-3 h-3 rounded flex items-center justify-center shrink-0 border ${selectedValues.includes(opt.id) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                {selectedValues.includes(opt.id) && <Check size={10} />}
              </div>
              <span className="truncate">{opt.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const formatDuration = (startStr: string, endStr: string | null) => {
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const diff = end - start;
  
  if (diff < 0) return '0m';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  if (days === 0) parts.push(`${minutes}m`);
  
  return parts.join(' ');
};

export const AdminAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { tenants } = useTenant();

  // Guard routing if not authorized
  const userRoleUp = user?.role_name?.toUpperCase() || '';
  if (!user || !['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(userRoleUp)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Filter States
  const [fromDate, setFromDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);

  // Load all tickets
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

  const isLoading = ticketsLoading || escalationsLoading;

  // Extract unique engineers
  const uniqueEngineers = useMemo(() => {
    const engs = new Map<string, string>();
    tickets.forEach(t => {
      if (t.assigned_to) {
        engs.set(t.assigned_to, t.assigned_to_name || 'Unknown Engineer');
      }
    });
    return Array.from(engs.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  // Filtered tickets based on controls
  const analyticsTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Date filter (based on created_at)
      const ticketDate = new Date(ticket.created_at).toISOString().split('T')[0];
      if (ticketDate < fromDate || ticketDate > toDate) return false;

      // Customer filter
      if (selectedCustomerIds.length > 0) {
        const cId = ticket.customer_id || ticket.tenant_id;
        if (!cId || !selectedCustomerIds.includes(cId)) return false;
      }

      // Engineer filter
      if (selectedEngineers.length > 0) {
        if (!ticket.assigned_to || !selectedEngineers.includes(ticket.assigned_to)) return false;
      }

      return true;
    });
  }, [tickets, fromDate, toDate, selectedCustomerIds, selectedEngineers]);

  // Compute stats metrics
  const metrics = useMemo(() => {
    const openCodes = ['NEW', 'ASSIGNED', 'INVESTIGATION', 'PENDING_CUSTOMER'];
    const resolvedCodes = ['RESOLVED', 'CLOSED'];

    let totalOpen = 0;
    let resolvedCount = 0;
    let totalSlaBreaches = 0;
    let approvedForResolution: number[] = [];

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    analyticsTickets.forEach(t => {
      const code = (t.status_code || '').toUpperCase();
      const isClosedOrResolved = resolvedCodes.includes(code) || ['resolved', 'closed'].includes(t.status);

      if (!isClosedOrResolved) {
        totalOpen++;
        
        // SLA breach if open > 5 days
        const createdAt = new Date(t.created_at);
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (diffDays > 5) {
          totalSlaBreaches++;
        }
      } else {
        // Count resolved in the last 30 days
        const resolvedAtStr = t.resolution_approved_at || t.resolved_at || t.updated_at;
        const resDate = resolvedAtStr ? new Date(resolvedAtStr) : null;
        if (resDate && resDate >= thirtyDaysAgo) {
          resolvedCount++;
        }

        // Calculate resolution time in hours
        const crDate = new Date(t.created_at);
        const clDate = resDate || new Date(t.updated_at);
        const hours = (clDate.getTime() - crDate.getTime()) / (1000 * 60 * 60);
        if (!isNaN(hours) && hours >= 0) {
          approvedForResolution.push(hours);
        }
      }
    });

    const avgResolutionTime = approvedForResolution.length > 0 
      ? (approvedForResolution.reduce((sum, h) => sum + h, 0) / approvedForResolution.length).toFixed(1)
      : '0.0';

    return {
      totalOpen,
      resolvedThisMonth: resolvedCount,
      avgResolutionTime,
      slaBreaches: totalSlaBreaches
    };
  }, [analyticsTickets]);

  // Escalations metrics
  const escalationMetrics = useMemo(() => {
    // Apply filters
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
    const teamStats: Record<string, { teamName: string; totalCases: number; pendingCases: number; totalHours: number; returnedCount: number }> = {};

    filtered.forEach(esc => {
      const teamId = esc.escalated_team_id || 'unknown';
      const teamName = esc.teams?.team_name || 'Unknown Team';
      if (!teamStats[teamId]) {
        teamStats[teamId] = { teamName, totalCases: 0, pendingCases: 0, totalHours: 0, returnedCount: 0 };
      }
      teamStats[teamId].totalCases++;

      if (esc.escalation_returned_at) {
        const crDate = new Date(esc.created_at);
        const retDate = new Date(esc.escalation_returned_at);
        const hours = (retDate.getTime() - crDate.getTime()) / (1000 * 60 * 60);
        if (!isNaN(hours) && hours >= 0) {
          teamStats[teamId].totalHours += hours;
          teamStats[teamId].returnedCount++;
        }
      } else {
        teamStats[teamId].pendingCases++;
      }
    });

    const teams = Object.values(teamStats).map(t => ({
      ...t,
      avgHours: t.returnedCount > 0 ? (t.totalHours / t.returnedCount).toFixed(1) : 'N/A'
    })).sort((a, b) => b.totalCases - a.totalCases);

    return { totalEscalations: uniqueEscalationTickets, teams, rawData: filtered };
  }, [escalations, fromDate, toDate, selectedCustomerIds, selectedEngineers]);

  // 1. Chart Data: Tickets by Customer/Bank (Bar chart - top 10)
  const customerChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsTickets.forEach(t => {
      const bName = t.customer_name || t.tenant_name || 'Global Core';
      counts[bName] = (counts[bName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [analyticsTickets]);

  // 2. Chart Data: Tickets by Product (Pie Chart)
  const productChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    analyticsTickets.forEach(t => {
      const pName = t.product_name || 'PIO-INTEGRATOR API Gateway';
      counts[pName] = (counts[pName] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analyticsTickets]);

  // 3. Chart Data: Avg Resolution Time by Product (Bar Chart)
  const productAvgResolutionData = useMemo(() => {
    const resolvedCodes = ['RESOLVED', 'CLOSED'];
    const sums: Record<string, { totalHours: number; count: number }> = {};

    analyticsTickets.forEach(t => {
      const code = (t.status_code || '').toUpperCase();
      const isResolved = resolvedCodes.includes(code) || ['resolved', 'closed'].includes(t.status);

      if (isResolved) {
        const pName = t.product_name || 'PIO-INTEGRATOR API Gateway';
        const resolvedAtStr = t.resolution_approved_at || t.resolved_at || t.updated_at;
        const resDate = resolvedAtStr ? new Date(resolvedAtStr) : new Date(t.updated_at);
        const crDate = new Date(t.created_at);
        const hours = (resDate.getTime() - crDate.getTime()) / (1000 * 60 * 60);

        if (!isNaN(hours) && hours >= 0) {
          if (!sums[pName]) sums[pName] = { totalHours: 0, count: 0 };
          sums[pName].totalHours += hours;
          sums[pName].count += 1;
        }
      }
    });

    return Object.entries(sums).map(([name, stat]) => ({
      name,
      hours: parseFloat((stat.totalHours / stat.count).toFixed(1))
    }));
  }, [analyticsTickets]);

  // 4. Agent Performance Table Calculation
  const agentPerformance = useMemo(() => {
    const resolvedCodes = ['RESOLVED', 'CLOSED'];
    const performance: Record<string, { name: string; assigned: number; resolved: number; totalHours: number }> = {};

    analyticsTickets.forEach(t => {
      const code = (t.status_code || '').toUpperCase();
      const isResolved = resolvedCodes.includes(code) || ['resolved', 'closed'].includes(t.status);
      const agentId = t.assigned_to || 'unassigned';
      const agentName = t.assigned_to_name || 'Unassigned';

      if (!performance[agentId]) {
        performance[agentId] = { name: agentName, assigned: 0, resolved: 0, totalHours: 0 };
      }

      performance[agentId].assigned++;

      if (isResolved) {
        performance[agentId].resolved++;
        const resolvedAtStr = t.resolution_approved_at || t.resolved_at || t.updated_at;
        const resDate = resolvedAtStr ? new Date(resolvedAtStr) : new Date(t.updated_at);
        const crDate = new Date(t.created_at);
        const hours = (resDate.getTime() - crDate.getTime()) / (1000 * 60 * 60);
        if (!isNaN(hours) && hours >= 0) {
          performance[agentId].totalHours += hours;
        }
      }
    });

    return Object.values(performance).map(p => {
      const avgTime = p.resolved > 0 
        ? (p.totalHours / p.resolved).toFixed(1) 
        : '0.0';
      return {
        ...p,
        avgTime: parseFloat(avgTime)
      };
    }).sort((a, b) => b.resolved - a.resolved);
  }, [analyticsTickets]);

  // Export view data as CSV via Papa Parse
  const handleExportCSV = () => {
    const csvRows = analyticsTickets.map(t => ({
      'Ticket ID': t.id,
      'Title': t.title,
      'Status': t.status_code || t.status,
      'Priority': t.priority_name || t.priority,
      'Product': t.product_name,
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportEscalations = () => {
    const csvRows = escalationMetrics.rawData.map(esc => ({
      'Ticket ID': esc.ticket_id,
      'Team': esc.teams?.team_name || 'Unknown',
      'Escalated At': new Date(esc.created_at).toLocaleString(),
      'Returned At': esc.escalation_returned_at ? new Date(esc.escalation_returned_at).toLocaleString() : 'Pending',
      'Bank ID': esc.tickets?.customer_id || esc.tickets?.tenant_id || 'Unknown',
      'Assigned To ID': esc.tickets?.assigned_to || 'Unassigned'
    }));
    
    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Escalations_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Visual Header */}
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Admin Analytics</h2>
          <p className="text-sm text-slate-500 mt-1">Performance metrics, team workloads, and resolution times.</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1">
            <Filter size={13} className="text-slate-400" />
            <span>Filter:</span>
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 focus-within:ring-1 focus-within:ring-orange-500">
            <input 
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-slate-900 text-xs outline-none w-[110px]"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input 
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-slate-900 text-xs outline-none w-[110px]"
            />
          </div>

          {/* Customer Bank dropdown */}
          <MultiSelect 
            options={tenants.map(t => ({ id: t.id, name: t.name }))} 
            selectedValues={selectedCustomerIds} 
            onChange={setSelectedCustomerIds} 
            placeholder="All Banks" 
          />

          {/* Engineer dropdown */}
          <MultiSelect 
            options={uniqueEngineers} 
            selectedValues={selectedEngineers} 
            onChange={setSelectedEngineers} 
            placeholder="All Engineers" 
          />

          {/* Export to CSV trigger */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Primary Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white h-24 rounded-xl border border-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Open */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">Total Pending</span>
              <Inbox size={18} className="text-blue-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.totalOpen}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">Active tickets in workspace</span>
            </div>
          </div>

          {/* Card 2: Resolved index (This Month) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">Resolved</span>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.resolvedThisMonth}</span>
              <span className="text-[10.5px] text-emerald-600 font-medium block mt-1 flex items-center gap-1">
                <TrendingUp size={11} /> Closing resolution loops
              </span>
            </div>
          </div>

          {/* Card 3: Average Resolution time */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">Avg Resolution</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-bold text-slate-900">{metrics.avgResolutionTime} <span className="text-sm font-normal text-slate-500">hrs</span></span>
              <span className="text-[10.5px] text-slate-500 block mt-1">Time from creation to resolution</span>
            </div>
          </div>

          {/* Card 4: SLA Breaches */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs uppercase font-bold tracking-wider">SLA Breaches</span>
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="mt-2.5 text-left">
              <span className={`text-3xl font-bold ${metrics.slaBreaches > 0 ? 'text-red-600' : 'text-slate-900'}`}>{metrics.slaBreaches}</span>
              <span className="text-[10.5px] text-slate-500 block mt-1">Open longer than 5 days</span>
            </div>
          </div>
        </div>
      )}

      {/* Mid Charts Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Tickets by Customer/Bank (Bar chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-left">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Building size={16} className="text-slate-500" /> Tickets by Bank
            </h3>
            <p className="text-xs text-slate-500 mt-1">Total volume across top 10 clients.</p>
          </div>

          <div className="h-72 w-full">
            {customerChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No bank ticket data logged for this timeframe.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip wrapperStyle={{ fontSize: 12, borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Pie Distribution by Product Area */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-left">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Inbox size={16} className="text-slate-500" /> Tickets by Product
            </h3>
            <p className="text-xs text-slate-500 mt-1">Distribution across products and modules.</p>
          </div>

          <div className="h-72 w-full flex flex-col sm:flex-row justify-center items-center gap-4">
            {productChartData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-slate-400 italic">No products referenced in tickets.</div>
            ) : (
              <>
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {productChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto w-full text-left">
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

      {/* Production avg resolution rate chart by system */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-5 text-left">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Clock size={16} className="text-slate-500" /> Resolution Time by Product
          </h3>
          <p className="text-xs text-slate-500 mt-1">Average hours taken to resolve tickets per product.</p>
        </div>

        <div className="h-60 w-full">
          {productAvgResolutionData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No resolved records found in timeframe.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productAvgResolutionData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="#64748b" label={{ value: 'Hours', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#64748b" width={110} />
                <Tooltip wrapperStyle={{ fontSize: 12, borderRadius: '8px' }} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Area: Agent Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 text-left">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <Users size={16} className="text-slate-500" /> Engineer Performance
          </h3>
          <p className="text-xs text-slate-500 mt-1">Workload and resolution speed per assigned engineer.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs">
                <th className="py-3 px-6">Engineer</th>
                <th className="py-3 px-6 text-center">Active Queue</th>
                <th className="py-3 px-6 text-center">Resolved</th>
                <th className="py-3 px-6 text-center">Avg Resolution Speed</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">No engineer actions logged.</td>
                </tr>
              ) : (
                agentPerformance.map(agent => (
                  <tr key={agent.name} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                        {(agent.name || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{agent.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">ID: {(agent.name || 'unknown').replaceAll(' ', '-').toLowerCase()}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-medium">{agent.assigned}</td>
                    <td className="py-4 px-6 text-center font-medium text-emerald-600">{agent.resolved}</td>
                    <td className="py-4 px-6 text-center font-bold text-slate-700">{agent.avgTime} hrs</td>
                    <td className="py-4 px-6">
                      {agent.assigned > 5 ? (
                        <span className="bg-red-50 text-red-700 border border-red-100 font-medium px-2 py-0.5 rounded text-xs">High Load</span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium px-2 py-0.5 rounded text-xs">Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Escalations Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ShieldAlert size={16} className="text-slate-500" /> Internal Escalations
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Cross-team escalation volumes and delays.
              <span className="ml-2 font-medium text-slate-700">Total Escalated Tickets: {escalationMetrics.totalEscalations}</span>
            </p>
          </div>
          <button
            onClick={handleExportEscalations}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition border border-slate-200 cursor-pointer self-start md:self-auto"
          >
            <Download size={13} />
            Export Escalations
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs">
                <th className="py-3 px-6">Team</th>
                <th className="py-3 px-6 text-center">Escalations</th>
                <th className="py-3 px-6 text-center">Pending Return</th>
                <th className="py-3 px-6 text-center">Avg Turnaround</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escalationMetrics.teams.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 italic">No escalations recorded for these filters.</td>
                </tr>
              ) : (
                escalationMetrics.teams.map((team, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      {team.teamName}
                    </td>
                    <td className="py-4 px-6 text-center font-medium">{team.totalCases}</td>
                    <td className="py-4 px-6 text-center font-medium">
                      {team.pendingCases > 0 ? (
                        <span className="text-red-600 font-bold">{team.pendingCases}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-slate-700">
                      {team.avgHours} {team.avgHours !== 'N/A' && 'hrs'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Internal Escalations Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-6">
        <div className="p-6 border-b border-slate-100 text-left">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
            <List size={16} className="text-slate-500" /> Escalation Details
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Row per escalation record corresponding to the filtered timeframe.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs">
                <th className="py-3 px-6 w-32">Ticket #</th>
                <th className="py-3 px-6">Subject</th>
                <th className="py-3 px-6">Escalated To</th>
                <th className="py-3 px-6">Developer</th>
                <th className="py-3 px-6">Escalated On</th>
                <th className="py-3 px-6">Returned On</th>
                <th className="py-3 px-6 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {escalationMetrics.rawData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">No detailed escalation records found for these filters.</td>
                </tr>
              ) : (
                escalationMetrics.rawData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((esc: any) => (
                  <tr key={esc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-6 font-medium">
                      <Link to={`/tickets/${esc.ticket_id}`} className="text-orange-500 hover:text-orange-600 hover:underline">
                        TK-{esc.tickets?.ticket_no || esc.ticket_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="py-3 px-6 text-slate-900 font-medium truncate max-w-[200px]" title={esc.tickets?.subject}>
                      {esc.tickets?.subject || '—'}
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-900">
                      {esc.teams?.team_name || 'Unknown Team'}
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      {esc.escalated_developer_name || '—'}
                    </td>
                    <td className="py-3 px-6 text-slate-600">
                      {new Date(esc.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-6">
                      {esc.escalation_returned_at ? (
                        <span className="text-emerald-600 font-medium">{new Date(esc.escalation_returned_at).toLocaleString()}</span>
                      ) : (
                        <span className="text-orange-500 font-medium">Still pending</span>
                      )}
                    </td>
                    <td className="py-3 px-6 text-right">
                      {esc.escalation_returned_at ? (
                        <span className="font-bold text-slate-700">{formatDuration(esc.created_at, esc.escalation_returned_at)}</span>
                      ) : (
                        <span className="font-bold text-orange-500">{formatDuration(esc.created_at, null)} (Ongoing)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
