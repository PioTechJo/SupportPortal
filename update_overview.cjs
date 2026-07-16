const fs = require('fs');
let content = fs.readFileSync('src/pages/Overview.tsx', 'utf8');

// Replace old useQuery calls for tickets and escalations with the new RPC call
const oldQueries = `  // Load all tickets for Analytics
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

  const isLoading = ticketsLoading || escalationsLoading || dashLoading;`;

const newQueries = `  // Fetch Server-Side Dashboard Analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['dashboardAnalytics', fromDate, toDate, selectedCustomerIds, selectedEngineers],
    queryFn: () => api.getDashboardAnalytics(fromDate, toDate, selectedCustomerIds, selectedEngineers),
    refetchInterval: 15000,
  });

  const isLoading = analyticsLoading || dashLoading;`;

content = content.replace(oldQueries, newQueries);

// Replace all the massive useMemo blocks with direct assignments from analyticsData
const oldMemoBlocks = `  // --- Analytics Metrics Calculation ---
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
  }, [analyticsTickets]);`;

const newAssignments = `  // --- Analytics Metrics Extraction ---
  const metrics = analyticsData?.metrics || { new_tickets: 0, reopened_tickets: 0, in_progress_tickets: 0, closed_tickets: 0 };
  const customerChartData = analyticsData?.ticketsByBank || [];
  const productChartData = analyticsData?.ticketsByProduct || [];
  const agentPerformance = analyticsData?.engineerPerformance || [];
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
  }`;

content = content.replace(oldMemoBlocks, newAssignments);

// Also need to fix the JSX rendering references where metric names changed:
// metrics.newTickets -> metrics.new_tickets
// metrics.reopenedTickets -> metrics.reopened_tickets
// metrics.inProgressTickets -> metrics.in_progress_tickets
// metrics.closedTickets -> metrics.closed_tickets

content = content.replace(/metrics\.newTickets/g, 'metrics.new_tickets');
content = content.replace(/metrics\.reopenedTickets/g, 'metrics.reopened_tickets');
content = content.replace(/metrics\.inProgressTickets/g, 'metrics.in_progress_tickets');
content = content.replace(/metrics\.closedTickets/g, 'metrics.closed_tickets');

// Replace ticketsLoading with analyticsLoading in the JSX
content = content.replace(/ticketsLoading/g, 'analyticsLoading');

// Disable CSV Export since analyticsTickets doesn't exist anymore
const oldExport = `  const handleExportCSV = () => {
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
    link.setAttribute("download", \`Support_Portal_Analytics_Report_\${fromDate}_to_\${toDate}.csv\`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };`;

const newExport = `  const handleExportCSV = () => {
     alert("CSV Export requires detailed ticket data which is no longer loaded on the dashboard. This feature will be moved to the Tickets List page.");
  };`;
content = content.replace(oldExport, newExport);

fs.writeFileSync('src/pages/Overview.tsx', content);
