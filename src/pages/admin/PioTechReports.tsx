import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import {
  Download, Search, RefreshCw, Clock, CheckCircle2, FileSpreadsheet,
  Mail, X, Plus, Loader2, Check, AlertCircle,
} from 'lucide-react';

/**
 * Pio-Tech Reports — the two standard ticket spreadsheets the support team
 * sends out ("Ticket - TEMP 1" = pending tickets, "Ticket - TEMP 2" = closed
 * tickets). Column order, labels, widths, date format and the red overdue
 * Due Date cells follow those sample files.
 */

type ReportKey = 'pending' | 'closed';
type Cell = string | Date | null;

interface ColumnDef {
  header: string;
  width: number; // Excel column width units, as in the sample files
  align?: 'right';
  get: (t: any) => Cell;
  kind?: 'date' | 'due' | 'long';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 18-Jun-26, same as the sample files
const formatDate = (d: Date | null) => {
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
};

const toDate = (v: any): Date | null => (v ? new Date(v) : null);

// "DV - 22297 - LIC-NIS-AMLrenew-07-26" -> "22297"; "22009 - LIC-..." -> "22009"
const ticketIdOf = (ticketNo: string) => {
  const parts = String(ticketNo || '').split(' - ');
  if (parts[0] === 'DV') return parts[1] || '';
  return parts[0] || '';
};

const priorityOf = (t: any) => (t.ticket_type === 'DEVELOPMENT' ? '' : t.priority_name || t.priority || '');

const col = {
  ticketId: (): ColumnDef => ({ header: 'Ticket ID', width: 6.6, align: 'right', get: t => ticketIdOf(t.ticket_no) }),
  currentStatus: (): ColumnDef => ({ header: 'Current Status', width: 13.7, get: () => 'under process' }),
  statusName: (w: number): ColumnDef => ({ header: 'Status', width: w, get: t => t.status_name || t.status || '' }),
  creator: (): ColumnDef => ({ header: 'Creator', width: 13.8, get: t => t.creator_name || '' }),
  opened: (w: number): ColumnDef => ({ header: 'Opened Date', width: w, kind: 'date', get: t => toDate(t.created_at) }),
  due: (w: number): ColumnDef => ({ header: 'Due Date', width: w, kind: 'due', get: t => toDate(t.sla_due_date) }),
  closed: (): ColumnDef => ({ header: 'Closed', width: 8.2, kind: 'date', get: t => toDate(t.closed_at) }),
  assigned: (): ColumnDef => ({ header: 'Assigned To', width: 17.9, get: t => (t.assigned_to ? t.assigned_to_name || '' : '') }),
  severity: (w: number): ColumnDef => ({ header: 'Severity', width: w, get: t => priorityOf(t) }),
  ticketNo: (w: number): ColumnDef => ({ header: 'Tiket #', width: w, get: t => t.ticket_no || '' }),
  synopsis: (): ColumnDef => ({ header: 'Synopsis', width: 35.8, get: t => t.title || t.subject || '' }),
  description: (): ColumnDef => ({ header: 'Problem Description', width: 35.8, kind: 'long', get: t => t.description || '' }),
  solution: (): ColumnDef => ({ header: 'Solution', width: 35.8, kind: 'long', get: t => t.resolution_justification || '' }),
  account: (w: number): ColumnDef => ({ header: 'Account Name', width: w, get: t => t.customer_name || '' }),
};

const REPORTS: Record<ReportKey, {
  title: string;
  hint: string;
  sample: string;
  columns: ColumnDef[];
  filter: (t: any) => boolean;
  sort: (a: any, b: any) => number;
}> = {
  pending: {
    title: 'Pending Tickets',
    hint: 'All open tickets, oldest due date first',
    sample: 'Ticket - TEMP 1',
    columns: [
      col.ticketId(), col.currentStatus(), col.statusName(10.2), col.opened(9.9), col.due(7.9), col.assigned(),
      col.severity(6.2), col.ticketNo(34.8), col.synopsis(), col.closed(), col.description(), col.solution(), col.account(29.9),
    ],
    filter: t => !['CLOSED', 'APPROVED'].includes(String(t.status_code || '').toUpperCase()),
    sort: (a, b) => {
      const da = a.sla_due_date ? new Date(a.sla_due_date).getTime() : Infinity;
      const db = b.sla_due_date ? new Date(b.sla_due_date).getTime() : Infinity;
      return da - db;
    },
  },
  closed: {
    title: 'Closed Tickets',
    hint: 'Closed tickets, most recently closed first',
    sample: 'Ticket - TEMP 2',
    columns: [
      col.statusName(12.6), col.ticketId(), col.creator(), col.ticketNo(31.7), col.synopsis(), col.severity(11.2), col.assigned(),
      col.opened(9.9), col.due(8.2), col.closed(), col.account(21.3), col.description(), col.solution(),
    ],
    filter: t => String(t.status_code || '').toUpperCase() === 'CLOSED',
    sort: (a, b) => {
      const da = a.closed_at ? new Date(a.closed_at).getTime() : 0;
      const db = b.closed_at ? new Date(b.closed_at).getTime() : 0;
      return db - da;
    },
  },
};

// Local YYYY-MM-DD (what <input type="date"> uses)
const localDateKey = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const DEFAULT_SUPPORT_EMAILS = ['support.team@pio-tech.com', 'support@pio-tech.com'];
const EMAIL_RE = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const splitEmails = (raw: string) => raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(Boolean);

type SendResult = { email: string; status: 'sent' | 'failed'; error?: string };

export const PioTechReports: React.FC = () => {
  const [active, setActive] = useState<ReportKey>('pending');
  const [search, setSearch] = useState('');
  const [bank, setBank] = useState('all');
  // Created-date filter (Closed report only); defaults to today, empty = all dates
  const [createdDate, setCreatedDate] = useState<string>(() => localDateKey(new Date()));

  // Send-by-email dialog
  const [showSend, setShowSend] = useState(false);
  const [presetChecked, setPresetChecked] = useState<Record<string, boolean>>({});
  const [customEmails, setCustomEmails] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendResults, setSendResults] = useState<SendResult[] | null>(null);

  const { data: allTickets = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
    refetchInterval: 30000,
  });

  const { data: supportEmails = DEFAULT_SUPPORT_EMAILS } = useQuery({
    queryKey: ['support-group-emails'],
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'support_group_email')
        .maybeSingle();
      const list = String(data?.setting_value || '')
        .split(',')
        .map((e: string) => e.trim())
        .filter(Boolean);
      return list.length > 0 ? list : DEFAULT_SUPPORT_EMAILS;
    },
  });

  const report = REPORTS[active];

  // The created-date filter only applies to the Closed report; Pending always
  // lists every open ticket.
  const matchesCreated = (t: any, key: ReportKey = active) =>
    key !== 'closed' || !createdDate || (t.created_at && localDateKey(new Date(t.created_at)) === createdDate);

  const counts = useMemo(() => ({
    pending: allTickets.filter((t: any) => REPORTS.pending.filter(t) && matchesCreated(t, 'pending')).length,
    closed: allTickets.filter((t: any) => REPORTS.closed.filter(t) && matchesCreated(t, 'closed')).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [allTickets, createdDate]);

  const banks = useMemo(() => {
    const set = new Set<string>();
    allTickets.forEach((t: any) => t.customer_name && set.add(t.customer_name));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allTickets]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTickets
      .filter((t: any) => report.filter(t))
      .filter((t: any) => matchesCreated(t))
      .filter((t: any) => bank === 'all' || t.customer_name === bank)
      .filter((t: any) => {
        if (!q) return true;
        return `${t.ticket_no || ''} ${t.title || t.subject || ''} ${t.customer_name || ''} ${t.assigned_to_name || ''}`
          .toLowerCase()
          .includes(q);
      })
      .sort(report.sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTickets, report, bank, search, createdDate, active]);

  const today = startOfToday();

  const buildWorkbook = () => {
    const aoa: (string | Date | null)[][] = [report.columns.map(c => c.header)];
    rows.forEach((t: any) => aoa.push(report.columns.map(c => {
      const v = c.get(t);
      return v === null ? '' : v;
    })));
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
    // Match the sample files: column widths and d-mmm-yy dates.
    ws['!cols'] = report.columns.map(c => ({ wch: c.width }));
    report.columns.forEach((c, ci) => {
      if (c.kind !== 'date' && c.kind !== 'due') return;
      for (let ri = 1; ri < aoa.length; ri++) {
        const ref = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (ws[ref] && ws[ref].t === 'd') ws[ref].z = 'd-mmm-yy';
      }
    });
    const stamp = new Date().toISOString().replace(/:/g, '').replace('Z', '');
    const name = `Ticket - ${stamp}`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    return { wb, name };
  };

  const handleDownload = () => {
    if (rows.length === 0) return;
    const { wb, name } = buildWorkbook();
    XLSX.writeFile(wb, `${name}.xlsx`);
  };

  // ---- Send by email ----
  const openSendDialog = () => {
    // The support-team addresses start selected; the sender can untick any of them.
    setPresetChecked(Object.fromEntries(supportEmails.map((e: string) => [e, true])));
    setCustomEmails([]);
    setCustomInput('');
    setCustomError('');
    setSendError('');
    setSendResults(null);
    setShowSend(true);
  };

  // Returns true if the text was fully accepted (and can be cleared from the input).
  const addCustomEmails = (raw: string): boolean => {
    const parts = splitEmails(raw);
    if (parts.length === 0) return true;
    const bad = parts.filter(e => !EMAIL_RE.test(e));
    if (bad.length > 0) {
      setCustomError(`Not a valid email: ${bad.join(', ')}`);
      return false;
    }
    setCustomError('');
    setCustomEmails(prev => Array.from(new Set([...prev, ...parts.filter(e => !supportEmails.includes(e))])));
    // An address typed that is already one of the presets just ticks it.
    setPresetChecked(prev => {
      const next = { ...prev };
      parts.filter(e => supportEmails.includes(e)).forEach(e => { next[e] = true; });
      return next;
    });
    return true;
  };

  const selectedRecipients = [
    ...supportEmails.filter((e: string) => presetChecked[e]),
    ...customEmails,
  ];

  const handleSend = async () => {
    setSendError('');
    const typed = splitEmails(customInput);
    const badTyped = typed.filter(e => !EMAIL_RE.test(e));
    if (badTyped.length > 0) {
      setCustomError(`Not a valid email: ${badTyped.join(', ')}`);
      return;
    }
    const recipients = Array.from(new Set([...selectedRecipients, ...typed]));
    if (recipients.length === 0) {
      setSendError('Choose at least one recipient.');
      return;
    }
    if (rows.length === 0) {
      setSendError('This report has no rows to send.');
      return;
    }
    setSending(true);
    try {
      const { wb, name } = buildWorkbook();
      const contentBytes = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const d = new Date();
      const dateLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          recipients,
          subject: `Pio-Tech ${report.title} Report - ${dateLabel}`,
          message: note.trim(),
          attachment: { name: `${name}.xlsx`, contentBytes },
        },
      });
      if (error) {
        // For non-2xx responses the JSON error body is on error.context.
        let detail = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep the generic message */ }
        throw new Error(detail);
      }
      setSendResults((data?.results as SendResult[]) || []);
    } catch (err: any) {
      setSendError(err.message || 'Failed to send the report.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="font-sans px-4 md:px-8 py-6 max-w-[1700px] mx-auto w-full space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-8 font-semibold tracking-tight text-slate-900">Pio-Tech Reports</h1>
          <p className="text-sm text-slate-500 mt-1">The standard ticket reports, laid out exactly like the spreadsheets sent to the team.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={15} className={`text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openSendDialog}
            disabled={rows.length === 0}
            className="flex items-center gap-2 h-10 px-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Mail size={15} className="text-slate-400" /> Send by email
          </button>
          <button
            onClick={handleDownload}
            disabled={rows.length === 0}
            className="flex items-center gap-2 h-10 px-4 bg-[#3B82F6] hover:bg-[#2563eb] text-white rounded-xl text-sm font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Download size={16} /> Download Excel
          </button>
        </div>
      </div>

      {/* Report picker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(REPORTS) as ReportKey[]).map(key => {
          const r = REPORTS[key];
          const isActive = active === key;
          const Icon = key === 'pending' ? Clock : CheckCircle2;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`text-left flex items-center gap-4 p-4 rounded-2xl border transition ${
                isActive ? 'bg-blue-50/60 border-[#3B82F6] shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                key === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Icon size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{r.title}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{isLoading ? '…' : counts[key]}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{r.hint}</div>
              </div>
              <FileSpreadsheet size={18} className={isActive ? 'text-[#3B82F6]' : 'text-slate-300'} />
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search ticket, synopsis, bank or engineer"
            className="h-10 pl-9 pr-3 bg-white border border-slate-200 rounded-xl text-sm w-80 max-w-full placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
          />
        </div>
        {active === 'closed' && (
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-slate-500 whitespace-nowrap" htmlFor="created-date">Created</label>
            <input
              id="created-date"
              type="date"
              value={createdDate}
              onChange={e => setCreatedDate(e.target.value)}
              className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            />
            {createdDate !== localDateKey(new Date()) && (
              <button
                onClick={() => setCreatedDate(localDateKey(new Date()))}
                className="h-10 px-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Today
              </button>
            )}
            {createdDate && (
              <button
                onClick={() => setCreatedDate('')}
                className="h-10 px-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                All dates
              </button>
            )}
          </div>
        )}
        <select
          value={bank}
          onChange={e => setBank(e.target.value)}
          className="h-10 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition max-w-[260px]"
        >
          <option value="all">All banks</option>
          {banks.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <div className="flex-1" />
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{rows.length}</span> {rows.length === 1 ? 'row' : 'rows'}
          {active === 'pending' && (
            <span className="ml-3 inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border border-slate-300" style={{ backgroundColor: '#FF0000' }} /> overdue
            </span>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-auto max-h-[calc(100vh-380px)] min-h-[260px]">
        <table
          className="border-collapse text-[13px] text-black"
          style={{ fontFamily: "'Aptos Narrow', 'Arial Narrow', Arial, sans-serif", tableLayout: 'fixed' }}
        >
          <colgroup>
            {report.columns.map((c, i) => (
              <col key={i} style={{ width: `${Math.round(c.width * 7 + 5)}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {report.columns.map((c, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 bg-slate-100 border border-slate-300 px-1.5 py-1.5 text-left font-semibold align-middle"
                  style={{ height: 38 }}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={report.columns.length} className="py-14 text-center text-slate-400 font-sans">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={report.columns.length} className="py-14 text-center text-slate-400 font-sans">No tickets for the selected filters.</td></tr>
            ) : (
              rows.map((t: any) => (
                <tr key={t.id} className="hover:bg-blue-50/40">
                  {report.columns.map((c, i) => {
                    const v = c.get(t);
                    const isDate = c.kind === 'date' || c.kind === 'due';
                    const text = isDate ? formatDate(v as Date | null) : String(v ?? '');
                    const overdue = active === 'pending' && c.kind === 'due' && v instanceof Date && v.getTime() < today;
                    return (
                      <td
                        key={i}
                        className="border border-slate-200 px-1.5 py-1 align-bottom whitespace-pre-wrap break-words"
                        style={{
                          textAlign: c.align === 'right' ? 'right' : 'left',
                          backgroundColor: overdue ? '#FF0000' : undefined,
                        }}
                      >
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Send by email dialog */}
      {showSend && (
        <div
          className="fixed inset-0 bg-[rgba(15,20,35,0.55)] flex items-center justify-center z-50 p-4"
          onClick={() => !sending && setShowSend(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Send report by email</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {report.title} · {rows.length} {rows.length === 1 ? 'row' : 'rows'} as an Excel attachment
                </p>
              </div>
              <button
                onClick={() => !sending && setShowSend(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {sendResults ? (
              <div className="p-5 space-y-3">
                {sendResults.map(r => (
                  <div
                    key={r.email}
                    className={`flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm ${r.status === 'sent' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
                  >
                    {r.status === 'sent' ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.email}</div>
                      <div className="text-xs opacity-80">{r.status === 'sent' ? 'Sent' : r.error || 'Failed to send'}</div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-2">
                  <button onClick={() => setShowSend(false)} className="h-10 px-5 rounded-xl text-sm font-medium text-white bg-[#3B82F6] hover:bg-[#2563eb]">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Support team</div>
                  <div className="space-y-1.5">
                    {supportEmails.map((email: string) => {
                      const checked = !!presetChecked[email];
                      return (
                        <button
                          key={email}
                          type="button"
                          onClick={() => setPresetChecked(prev => ({ ...prev, [email]: !prev[email] }))}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition ${
                            checked ? 'border-[#3B82F6] bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-[#3B82F6] border-[#3B82F6] text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {checked && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-sm text-slate-800">{email}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Other recipients</div>
                  {customEmails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {customEmails.map(email => (
                        <span key={email} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-lg pl-2.5 pr-1.5 py-1 text-sm">
                          {email}
                          <button
                            onClick={() => setCustomEmails(prev => prev.filter(e => e !== email))}
                            className="p-0.5 rounded hover:bg-slate-300/60 text-slate-500"
                            aria-label={`Remove ${email}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={e => { setCustomInput(e.target.value); setCustomError(''); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
                          e.preventDefault();
                          if (addCustomEmails(customInput)) setCustomInput('');
                        }
                      }}
                      placeholder="name@example.com"
                      className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                    />
                    <button
                      onClick={() => { if (addCustomEmails(customInput)) setCustomInput(''); }}
                      disabled={!customInput.trim()}
                      className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {customError && <div className="text-xs text-red-600 mt-1.5">{customError}</div>}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message (optional)</div>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={3}
                    placeholder="Add a note to include in the email"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition resize-y"
                  />
                </div>

                {sendError && (
                  <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl px-3.5 py-2.5 text-sm">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" /> {sendError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-slate-500">
                    {selectedRecipients.length} recipient{selectedRecipients.length === 1 ? '' : 's'} selected
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSend(false)}
                      disabled={sending}
                      className="h-10 px-4 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || (selectedRecipients.length === 0 && !customInput.trim())}
                      className="h-10 px-5 flex items-center gap-2 rounded-xl text-sm font-medium text-white bg-[#3B82F6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
