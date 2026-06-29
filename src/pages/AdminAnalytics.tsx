import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
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
  Users
} from 'lucide-react';

const COLORS = ['#0f766e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#64748b', '#8b5cf6', '#ec4899'];

export const AdminAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { tenants } = useTenant();

  // Guard routing if not authorized
  const userRoleUp = user?.role_name?.toUpperCase() || '';
  if (!user || !['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(userRoleUp)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Filter States
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  // Load all tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
    refetchInterval: 15000,
  });

  // Calculate cutoff date based on filter
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dateRange);
    return d;
  }, [dateRange]);

  // Filtered tickets based on controls
  const analyticsTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // Date filter (based on created_at)
      const ticketDate = new Date(ticket.created_at);
      if (ticketDate < cutoffDate) return false;

      // Customer filter
      if (selectedCustomerId !== 'all') {
        const cId = ticket.customer_id || ticket.tenant_id;
        if (cId !== selectedCustomerId) return false;
      }

      return true;
    });
  }, [tickets, cutoffDate, selectedCustomerId]);

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
      const agentName = t.assignee_name || 'Unassigned';

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
      'Assigned Agent': t.assignee_name || 'Unassigned'
    }));

    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Support_Portal_Analytics_Report_${dateRange}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans pb-12">
      {/* Visual Header */}
      <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-teal-500/10 text-teal-400 text-xs font-bold px-3 py-1 rounded-full border border-teal-500/25 flex items-center gap-1.5 font-mono">
              <Sparkles size={11} /> ADMIN PLATFORM METRICS
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Support Operations Analytics</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">Real-time SLA statistics, distribution indexes, and agent workloads.</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto bg-slate-800/40 p-2 rounded-xl border border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 px-1">
            <Filter size={13} className="text-teal-400" />
            <span className="font-mono">Metrics Filter:</span>
          </div>

          {/* Date range picker */}
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value) as any)}
            className="bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-teal-500 text-white"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>

          {/* Customer Bank dropdown */}
          <select 
            value={selectedCustomerId} 
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-teal-500 text-white max-w-[150px]"
          >
            <option value="all">All Banks</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Export to CSV trigger */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition shadow-md shadow-teal-500/10 cursor-pointer"
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
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Total Pending Queue</span>
              <Inbox size={18} className="text-blue-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.totalOpen}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Active live tickets in workspace</span>
            </div>
          </div>

          {/* Card 2: Resolved index (This Month) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Resolved (last 30d)</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.resolvedThisMonth}</span>
              <span className="text-[10px] text-emerald-600 font-medium block mt-1 flex items-center gap-1">
                <TrendingUp size={11} /> Closing resolution loops
              </span>
            </div>
          </div>

          {/* Card 3: Average Resolution time */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">Average Resolution Time</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <div className="mt-2.5">
              <span className="text-3xl font-extrabold text-slate-900 font-mono">{metrics.avgResolutionTime} <span className="text-sm font-normal text-slate-500">hr</span></span>
              <span className="text-[10px] text-slate-500 block mt-1">Submission validation cycle</span>
            </div>
          </div>

          {/* Card 4: SLA Breaches */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider font-mono">SLA Breaches (&gt; 5 Days)</span>
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
            <div className="mt-2.5 text-left">
              <span className={`text-3xl font-extrabold font-mono ${metrics.slaBreaches > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{metrics.slaBreaches}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Exceeded established response terms</span>
            </div>
          </div>
        </div>
      )}

      {/* Mid Charts Grid Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Tickets by Customer/Bank (Bar chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-left">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider font-mono">
              <Building size={16} className="text-teal-600" /> Tickets Count by Bank Domain
            </h3>
            <p className="text-xs text-slate-400 mt-1">Shows total documented volume across top 10 core banking units.</p>
          </div>

          <div className="h-72 w-full">
            {customerChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No bank ticket data logged for this timeframe.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={customerChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 9 }} stroke="#64748b" />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Pie Distribution by Product Area */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="border-b border-slate-100 pb-3 mb-4 text-left">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider font-mono">
              <Inbox size={16} className="text-teal-600" /> Share Contribution by Product
            </h3>
            <p className="text-xs text-slate-400 mt-1">Distribution index comparing active systems, gateways, and modules.</p>
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
                    <div key={entry.name} className="flex items-start gap-2 text-[11px]">
                      <span className="w-3 h-3 rounded mt-[1.5px] shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium text-slate-700 truncate flex-1">{entry.name}</span>
                      <span className="font-mono text-slate-500 font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Production avg resolution rate chart by system */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="border-b border-slate-100 pb-4 mb-5 text-left">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider font-mono">
            <Clock size={16} className="text-teal-600" /> Average Resolution Cycle (by Product Application)
          </h3>
          <p className="text-xs text-slate-400 mt-1">Represents average hour delay to successfully validate formal resolution drafts.</p>
        </div>

        <div className="h-60 w-full">
          {productAvgResolutionData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">No resolved records found in timeframe to index performance cycles.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productAvgResolutionData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="#64748b" label={{ value: 'Hours', position: 'insideBottom', offset: -5, fontSize: 9 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="#64748b" width={110} />
                <Tooltip wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="hours" fill="#0f766e" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Area: Agent Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 text-left">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider font-mono">
            <Users size={16} className="text-teal-600" /> Active Agent Workloads & Speed Performance Indexes
          </h3>
          <p className="text-xs text-slate-400 mt-1">Direct performance summary compiling queue allotments, resolution rates, and speed efficiency metrics.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs text-slate-700">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold font-mono tracking-wider uppercase text-[10px]">
                <th className="py-3 px-6">Assigned Specialist Officer</th>
                <th className="py-3 px-6 text-center">Active Queue Loads</th>
                <th className="py-3 px-6 text-center">Approved Resolutions</th>
                <th className="py-3 px-6 text-center">Avg Response Speed</th>
                <th className="py-3 px-6">Status Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">No agent queue actions logged.</td>
                </tr>
              ) : (
                agentPerformance.map(agent => (
                  <tr key={agent.name} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center font-bold text-slate-700">
                        {(agent.name || '?').charAt(0)}
                      </div>
                      <div>
                        <p className="text-[12px]">{agent.name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {(agent.name || 'unknown').replaceAll(' ', '-').toLowerCase()}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-medium">{agent.assigned}</td>
                    <td className="py-4 px-6 text-center font-mono font-medium text-emerald-600">{agent.resolved}</td>
                    <td className="py-4 px-6 text-center font-mono font-bold text-teal-700">{agent.avgTime} hrs</td>
                    <td className="py-4 px-6">
                      {agent.assigned > 5 ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] font-mono leading-none">HIGH LOAD</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-full text-[10px] font-mono leading-none">ACTIVE DUTY</span>
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
