import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useTenant } from '../../context/TenantContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Filter, ChevronDown, Check, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';

const MultiSelect = ({ options, selectedValues, onChange, placeholder }: { options: {id: string, name: string}[], selectedValues: string[], onChange: (vals: string[]) => void, placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 flex items-center gap-2 min-w-[170px]"
      >
        <span className="truncate flex-1 text-left">
          {selectedValues.length === 0 ? placeholder : `${selectedValues.length} Selected`}
        </span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-white rounded-t-lg">
            <input
              type="text"
              placeholder={`Search...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-400 italic">No items found</div>
            ) : (
              filteredOptions.map(opt => (
                <button 
                  key={opt.id}
                  onClick={() => toggle(opt.id)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${selectedValues.includes(opt.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
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

export const AgingReport: React.FC = () => {
  const { tenants } = useTenant();
  const navigate = useNavigate();

  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);

  // Aging Report State
  const [agingMinDays, setAgingMinDays] = useState<number>(0);
  const [agingMaxDays, setAgingMaxDays] = useState<number | ''>('');
  const [applyAgingFilter, setApplyAgingFilter] = useState<{min: number, max: number | ''}>({min: 0, max: ''});

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

  const uniqueEngineers = useMemo(() => {
    const engs = new Map<string, string>();
    tickets.forEach(t => {
      if (t.assigned_to) {
        engs.set(t.assigned_to, t.assigned_to_name || 'Unknown Engineer');
      }
    });
    return Array.from(engs.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tickets]);

  const agingTicketsData = useMemo(() => {
    let result = tickets.filter(t => {
      const code = (t.status_code || '').toUpperCase();
      if (code === 'CLOSED' || code === 'APPROVED') return false;
      
      if (selectedCustomerIds.length > 0) {
        const cId = t.customer_id || t.tenant_id;
        if (!cId || !selectedCustomerIds.includes(cId)) return false;
      }
      if (selectedEngineers.length > 0) {
        if (!t.assigned_to || !selectedEngineers.includes(t.assigned_to)) return false;
      }
      
      const createdTime = new Date(t.created_at).getTime();
      const ageDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
      
      if (ageDays < applyAgingFilter.min) return false;
      if (applyAgingFilter.max !== '' && ageDays > Number(applyAgingFilter.max)) return false;
      
      return true;
    }).map(t => {
      const createdTime = new Date(t.created_at).getTime();
      const ageDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
      
      const ticketEscalations = escalations.filter(e => e.ticket_id === t.id);
      const latestEscalation = ticketEscalations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const escalatedDev = latestEscalation ? latestEscalation.escalated_developer_name || 'N/A' : 'N/A';
      
      return {
        ...t,
        ageDays,
        escalatedDev
      };
    });
    
    return result.sort((a, b) => b.ageDays - a.ageDays);
  }, [tickets, selectedCustomerIds, selectedEngineers, applyAgingFilter, escalations]);

  const handleExportCSV = () => {
    const csvRows = agingTicketsData.map((t: any) => ({
      'Ticket #': `TK-${t.ticket_no || t.id.slice(0, 8).toUpperCase()}`,
      'Bank / Customer': t.customer_name || t.tenant_name || '—',
      'Product': t.product_name || '—',
      'Created Date': new Date(t.created_at).toLocaleDateString(),
      'Age': `${t.ageDays.toFixed(1)} days`,
      'Assigned Engineer': t.assigned_to_name || 'Unassigned',
      'Escalated Dev': t.escalatedDev
    }));
    
    const csvContent = Papa.unparse(csvRows);
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `aging_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans p-6 max-w-[1600px] mx-auto w-full">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Clock className="text-blue-500" /> Aging Report
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track and monitor open tickets based on their age to prevent SLA breaches.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Filter size={16} className="text-slate-500" /> Filters
        </div>
        <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
          <MultiSelect options={tenants.map(t => ({ id: t.id, name: t.name }))} selectedValues={selectedCustomerIds} onChange={setSelectedCustomerIds} placeholder="All Banks" />
          <MultiSelect options={uniqueEngineers} selectedValues={selectedEngineers} onChange={setSelectedEngineers} placeholder="All Engineers" />
          <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-blue-500">
            <span className="text-sm text-slate-500 font-medium">Age Range:</span>
            <input 
              type="number" 
              min="0"
              value={agingMinDays} 
              onChange={e => setAgingMinDays(Number(e.target.value))} 
              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" 
              placeholder="Min"
            />
            <span className="text-sm text-slate-400">-</span>
            <input 
              type="number" 
              min="0"
              value={agingMaxDays} 
              onChange={e => setAgingMaxDays(e.target.value === '' ? '' : Number(e.target.value))} 
              className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-500" 
              placeholder="Max"
            />
            <button 
              onClick={() => setApplyAgingFilter({ min: agingMinDays, max: agingMaxDays })}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded transition shadow-sm ml-1"
            >
              Apply
            </button>
            <button 
              onClick={() => {
                setAgingMinDays(0);
                setAgingMaxDays('');
                setApplyAgingFilter({ min: 0, max: '' });
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold px-4 py-1.5 rounded transition shadow-sm ml-2 border border-slate-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            Open Tickets Ranked by Age
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{agingTicketsData.length}</span>
          </h3>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow-sm cursor-pointer">
            <FileSpreadsheet size={14} /> Export CSV
          </button>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-left text-sm text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-6 w-32 whitespace-nowrap">Ticket #</th>
                  <th className="py-3 px-6 whitespace-nowrap">Bank / Customer</th>
                  <th className="py-3 px-6 whitespace-nowrap">Product</th>
                  <th className="py-3 px-6 whitespace-nowrap">Created Date</th>
                  <th className="py-3 px-6 whitespace-nowrap">Age</th>
                  <th className="py-3 px-6 whitespace-nowrap">Assigned Engineer</th>
                  <th className="py-3 px-6 whitespace-nowrap">Escalated Dev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agingTicketsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 italic">No open tickets match the aging criteria.</td>
                  </tr>
                ) : (
                  agingTicketsData.map((t: any) => (
                    <tr 
                      key={t.id} 
                      onClick={() => navigate(`/tickets/${t.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      <td className="py-4 px-6 font-medium text-blue-600">
                        TK-{t.ticket_no || t.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900 truncate max-w-[200px]" title={t.customer_name || t.tenant_name}>
                        {t.customer_name || t.tenant_name || '—'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 truncate max-w-[200px]" title={t.product_name}>
                        {t.product_name || '—'}
                      </td>
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-700 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs ${t.ageDays > 30 ? 'bg-red-100 text-red-800 border border-red-200' : t.ageDays > 14 ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                          {t.ageDays.toFixed(1)} days
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {t.assigned_to_name || 'Unassigned'}
                      </td>
                      <td className="py-4 px-6 text-slate-500 truncate max-w-[200px]">
                        {t.escalatedDev}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
