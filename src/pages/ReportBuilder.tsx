import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import Papa from 'papaparse';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  FileSpreadsheet, 
  TableProperties, 
  X, 
  GripVertical,
  LayoutDashboard
} from 'lucide-react';

type FieldDef = { id: string; label: string; category: string };

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
  { id: 'created_at', label: 'Created Date', category: 'Dates' },
  { id: 'assigned_at', label: 'Assigned Date', category: 'Dates' },
  { id: 'resolution_approved_at', label: 'Approved Date', category: 'Dates' },

  // Computed Metrics
  { id: 'time_open', label: 'Duration to Close', category: 'Computed Metrics' },
  { id: 'escalated', label: 'Escalated', category: 'Computed Metrics' },
];

export const ReportBuilder: React.FC = () => {
  const defaultFields = [
    AVAILABLE_FIELDS.find(f => f.id === 'subject')!,
    AVAILABLE_FIELDS.find(f => f.id === 'created_at')!,
    AVAILABLE_FIELDS.find(f => f.id === 'customer_name')!,
    AVAILABLE_FIELDS.find(f => f.id === 'assigned_to_name')!,
    AVAILABLE_FIELDS.find(f => f.id === 'product_name')!,
    AVAILABLE_FIELDS.find(f => f.id === 'time_open')!,
    AVAILABLE_FIELDS.find(f => f.id === 'escalated')!
  ];

  const [reportMode, setReportMode] = useState<'group' | 'list'>('list');
  const [draggedFields, setDraggedFields] = useState<FieldDef[]>(defaultFields);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
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

  const extractValue = (ticket: any, fieldId: string) => {
    if (fieldId === 'time_open') {
      const code = (ticket.status_code || '').toUpperCase();
      const isResolved = ['RESOLVED', 'CLOSED', 'APPROVED'].includes(code) || ['resolved', 'closed'].includes(ticket.status);
      const created = new Date(ticket.created_at).getTime();
      let end = Date.now();
      if (isResolved) {
        const resolvedAt = ticket.resolution_approved_at || ticket.resolved_at || ticket.updated_at;
        end = resolvedAt ? new Date(resolvedAt).getTime() : new Date(ticket.updated_at).getTime();
      }
      return formatDuration(end - created);
    }
    
    if (fieldId === 'escalated') {
      const ticketEscs = escalations.filter(e => e.ticket_id === ticket.id && e.is_internal);
      if (ticketEscs.length > 0) {
        const teamDetails = ticketEscs.map(e => {
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

  const reportData = useMemo(() => {
    if (reportMode === 'list' || draggedFields.length === 0 || tickets.length === 0) return [];
    
    const groups: Record<string, any> = {};
    
    tickets.forEach(ticket => {
      const fieldValues = draggedFields.map(f => extractValue(ticket, f.id));
      const compositeKey = fieldValues.join(' | ');
      
      if (!groups[compositeKey]) {
        groups[compositeKey] = {
          compositeKey,
          ticketCount: 0,
        };
        draggedFields.forEach((f, idx) => {
          groups[compositeKey][f.id] = fieldValues[idx];
        });
      }
      
      groups[compositeKey].ticketCount += 1;
    });
    
    return Object.values(groups).sort((a, b: any) => b.ticketCount - a.ticketCount);
  }, [tickets, draggedFields, reportMode, escalations]);

  const handleDragStart = (e: React.DragEvent, fieldId: string) => {
    e.dataTransfer.setData('fieldId', fieldId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldId = e.dataTransfer.getData('fieldId');
    const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
    
    if (field && !draggedFields.some(df => df.id === fieldId)) {
      setDraggedFields([...draggedFields, field]);
    }
  };

  const removeField = (fieldId: string) => {
    setDraggedFields(draggedFields.filter(f => f.id !== fieldId));
  };

  const handleExportCSV = () => {
    if (reportMode === 'group' && reportData.length === 0) return;
    if (reportMode === 'list' && (tickets.length === 0 || draggedFields.length === 0)) return;

    let csvRows: any[] = [];

    if (reportMode === 'group') {
      csvRows = reportData.map(row => {
        const exportRow: Record<string, string | number> = {};
        draggedFields.forEach(f => {
          exportRow[f.label] = (row as any)[f.id];
        });
        exportRow['Ticket Count'] = (row as any).ticketCount;
        return exportRow;
      });
    } else {
      csvRows = tickets.map(ticket => {
        const exportRow: Record<string, string | number> = {};
        exportRow['Ticket #'] = ticket.ticket_no || ticket.id.slice(0, 8).toUpperCase();
        draggedFields.forEach(f => {
          exportRow[f.label] = extractValue(ticket, f.id);
        });
        return exportRow;
      });
    }

    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Custom_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fieldsByCategory = AVAILABLE_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) acc[field.category] = [];
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FieldDef[]>);

  const switchMode = (mode: 'group' | 'list') => {
    setReportMode(mode);
    if (mode === 'list') {
      setDraggedFields(defaultFields);
    } else {
      setDraggedFields([]);
    }
  };

  return (
    <div className="font-sans space-y-6 pb-12">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-slate-200">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Report Builder</h2>
          <p className="text-sm text-slate-500 mt-1">Drag and drop fields to dynamically group and analyze your ticket data.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => switchMode('group')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${reportMode === 'group' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Group & Count
            </button>
            <button
              onClick={() => switchMode('list')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${reportMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Detailed List
            </button>
          </div>
          {(reportMode === 'group' ? reportData.length > 0 : tickets.length > 0 && draggedFields.length > 0) && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition shadow-sm cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet size={16} />
              Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-72 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TableProperties size={16} className="text-slate-500" />
              Available Fields
            </h3>
          </div>
          <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
            {Object.entries(fieldsByCategory).map(([category, fields]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{category}</h4>
                <div className="flex flex-col gap-2">
                  {fields.map(field => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-grab active:cursor-grabbing transition-colors ${
                        draggedFields.some(df => df.id === field.id)
                          ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-orange-300 hover:shadow-sm'
                      }`}
                    >
                      <GripVertical size={14} className="text-slate-400 shrink-0" />
                      {field.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full space-y-6">
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`min-h-[120px] bg-white border-2 border-dashed rounded-xl p-6 transition-colors ${
              draggedFields.length > 0 ? 'border-orange-200 bg-orange-50/30' : 'border-slate-300 hover:border-orange-400 hover:bg-slate-50'
            }`}
          >
            <h3 className="font-bold text-slate-800 text-sm mb-4">
              {reportMode === 'group' ? 'Group Report By' : 'Report Columns'}
            </h3>
            
            {draggedFields.length === 0 ? (
              <div className="h-20 flex flex-col items-center justify-center text-slate-400 gap-2">
                <LayoutDashboard size={24} className="opacity-50" />
                <p className="text-sm font-medium">
                  {reportMode === 'group' ? 'Drag a field here to start building your report' : 'Drag fields here to build your list'}
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {draggedFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    {index > 0 && <span className="text-slate-400 font-semibold mx-1">+</span>}
                    <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
                      {field.label}
                      <button 
                        onClick={() => removeField(field.id)}
                        className="hover:bg-orange-600 rounded-full p-0.5 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {draggedFields.length > 0 && (
            <>
              {reportMode === 'group' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs h-[350px]">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                    </div>
                  ) : reportData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available for the selected groupings.</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="compositeKey" 
                          tick={{ fontSize: 11 }} 
                          stroke="#64748b"
                          angle={reportData.length > 5 ? -45 : 0}
                          textAnchor={reportData.length > 5 ? "end" : "middle"}
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip 
                          wrapperStyle={{ fontSize: 12, borderRadius: '8px' }} 
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="ticketCount" name="Tickets" fill="#f97316" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold whitespace-nowrap">
                        {reportMode === 'list' && <th className="py-3 px-4 w-32">Ticket #</th>}
                        {draggedFields.map(f => (
                          <th key={f.id} className="py-3 px-4">{f.label}</th>
                        ))}
                        {reportMode === 'group' && <th className="py-3 px-4 text-center border-l border-slate-200 w-32">Ticket Count</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr><td colSpan={draggedFields.length + (reportMode === 'group' ? 1 : 1)} className="py-8 text-center"><div className="animate-spin inline-block rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div></td></tr>
                      ) : reportMode === 'group' ? (
                        reportData.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            {draggedFields.map(f => (
                              <td key={f.id} className="py-3 px-4 font-medium text-slate-900">
                                {row[f.id]}
                              </td>
                            ))}
                            <td className="py-3 px-4 text-center font-bold text-orange-600 border-l border-slate-100 bg-orange-50/30">
                              {row.ticketCount}
                            </td>
                          </tr>
                        ))
                      ) : (
                        tickets.map((ticket: any) => (
                          <tr key={ticket.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 font-medium">
                              <Link to={`/tickets/${ticket.id}`} className="text-orange-500 hover:underline">
                                TK-{ticket.ticket_no || ticket.id.slice(0, 8).toUpperCase()}
                              </Link>
                            </td>
                            {draggedFields.map(f => (
                              <td key={f.id} className="py-3 px-4 font-medium text-slate-900">
                                {extractValue(ticket, f.id)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
