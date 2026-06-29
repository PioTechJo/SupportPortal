import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Ticket, Profile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Clock, 
  User, 
  HelpCircle, 
  FileText, 
  Link as LinkIcon, 
  AlertCircle, 
  ChevronRight, 
  FileCheck,
  Building,
  Activity,
  Layers,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';

export default function ResolutionApprovals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filterManagerIdOnly, setFilterManagerIdOnly] = useState(true);
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});
  const [activeRevisionId, setActiveRevisionId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch tickets
  const { data: tickets = [], isLoading: loadingTickets, refetch: refetchTickets } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets()
  });

  // 2. Fetch profiles to link agent to manager ID
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery<Profile[]>({
    queryKey: ['profiles-list'],
    queryFn: () => api.getProfiles()
  });

  const getProductNameById = (id?: string) => {
    switch (id) {
      case 'prod-1': return 'PIO-RECON';
      case 'prod-2': return 'PIO-INTEGRATOR';
      case 'prod-3': return 'PIO-AML';
      case 'prod-4': return 'PIO-COLLATERAL';
      default: return 'PIO-INTEGRATOR';
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // 3. Mutations for approving & rejecting
  const approveMutation = useMutation({
    mutationFn: (params: {
      ticketId: string;
      ticketTitle: string;
      managerId: string;
      managerName: string;
      agentId: string;
      customerId: string;
      draft: any;
    }) => api.approveTicketResolution(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      refetchTickets();
      showToast(`🎉 Resolution approved and published successfully for ticket #${variables.ticketId.replace('tick-', '').toUpperCase()}!`);
    },
    onError: (err: any) => {
      console.error(err);
      alert('Failed to approve resolution: ' + err.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (params: {
      ticketId: string;
      ticketTitle: string;
      managerId: string;
      managerName: string;
      agentId: string;
      feedback: string;
    }) => api.rejectTicketResolution(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      refetchTickets();
      setActiveRevisionId(null);
      // Clear specific feedback text
      setFeedbackTexts(prev => {
        const copy = { ...prev };
        delete copy[variables.ticketId];
        return copy;
      });
      showToast(`📝 Feedback submitted and ticket reverted to In-Progress status.`);
    },
    onError: (err: any) => {
      console.error(err);
      alert('Failed to request revision: ' + err.message);
    }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans" id="approvals-unauth">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl max-w-sm text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
            Please log in first to access the resolution auditing dashboards.
          </p>
        </div>
      </div>
    );
  }

  // 4. Derive matched tickets & relevant info
  // Find profiles matching managers
  const profilesMap = new Map<string, Profile>();
  profiles.forEach(p => profilesMap.set(p.id, p));

  // Filter criteria: Status = 'pending_approval'
  const pendingTickets = tickets.filter(t => t.status === 'pending_approval');

  // Filter further: manager_id of the assigned agent = current_user.id
  // Also support seeing all if manager_id is null/not configured OR user is administrator/selected to view all
  const filteredTickets = pendingTickets.filter(t => {
    const uRoleUp = user?.role_name?.toUpperCase() || '';
    const isGlobalAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(uRoleUp);
    
    const assignee = t.assigned_to ? profilesMap.get(t.assigned_to) : null;
    const isDirectReport = assignee?.manager_id === user.id;

    // Search query matches ticket ID, title, bank/tenant, product, category
    const cleanTktId = t.id.replace('tick-', '').toUpperCase();
    const productName = (getProductNameById((t as any).product_id) || '').toLowerCase();
    const matchesSearch = searchQuery === '' || 
      cleanTktId.includes(searchQuery.toUpperCase()) ||
      (t.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.tenant_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      productName.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterManagerIdOnly) {
      return isDirectReport;
    }
    return true; // view all pending approvals (e.g. for main admin / audit overview)
  });

  const handleApprove = (ticket: Ticket) => {
    const assignee = ticket.assigned_to ? profilesMap.get(ticket.assigned_to) : null;
    approveMutation.mutate({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      managerId: user.id,
      managerName: user.full_name,
      agentId: ticket.assigned_to || '',
      customerId: ticket.created_by,
      draft: ticket.resolution_draft || {}
    });
  };

  const handleReject = (ticket: Ticket) => {
    const feedback = feedbackTexts[ticket.id] || '';
    if (!feedback.trim()) {
      alert('Please explain the revision required before sending back.');
      return;
    }
    rejectMutation.mutate({
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      managerId: user.id,
      managerName: user.full_name,
      agentId: ticket.assigned_to || '',
      feedback: feedback
    });
  };

  const isLoading = loadingTickets || loadingProfiles;

  return (
    <div className="space-y-8 font-sans pb-16" id="resolution-approvals-view">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-6 right-6 z-50 max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3"
            id="toast-notification"
          >
            <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg shrink-0 mt-0.5">
              <CheckCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase block">SUCCESS OPERATION</span>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">{successToast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar and info summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black uppercase tracking-wider font-mono px-2.5 py-0.5 rounded-full">
              Manager Verification Hub
            </span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
              <Activity size={10} className="animate-pulse" /> {pendingTickets.length} Pending Globally
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            Resolution Approvals
          </h1>
          <p className="text-slate-500 text-xs mt-1 max-w-xl leading-relaxed">
            Verify resolutions drafted by your direct reports. Double-check core technical findings, categorize corrective steps, and ensure alignment with support metrics before publishing solutions to bank portals.
          </p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Toggle team reports select */}
          <div className="bg-white border border-slate-200 rounded-lg p-1 flex items-center shadow-xs">
            <button
              onClick={() => setFilterManagerIdOnly(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                filterManagerIdOnly 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              My Direct Reports
            </button>
            <button
              onClick={() => setFilterManagerIdOnly(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition select-none cursor-pointer ${
                !filterManagerIdOnly 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All Open Approvals
            </button>
          </div>

          <button 
            type="button"
            onClick={() => refetchTickets()}
            className="px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="approvals-metric-cards">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned To Me</span>
            <span className="text-xl font-extrabold text-slate-800 font-mono">
              {pendingTickets.filter(t => (t.assigned_to ? profilesMap.get(t.assigned_to) : null)?.manager_id === user.id).length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <FileText size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Global Audits</span>
            <span className="text-xl font-extrabold text-slate-800 font-mono">
              {pendingTickets.length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Building size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Impacted Clients</span>
            <span className="text-xl font-extrabold text-slate-800 font-mono">
              {Array.from(new Set(pendingTickets.map(t => t.tenant_id))).length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
        <Search className="text-slate-400 shrink-0" size={16} />
        <input 
          type="text"
          placeholder="Search by ticket ID, title, customer bank, product channel..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs border-none outline-none focus:ring-0 text-slate-800 placeholder-slate-400 bg-transparent"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>

      {/* Main Content Arena */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-500 font-sans border border-dashed border-slate-200 rounded-2xl bg-white/40" id="approvals-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700 tracking-wider font-mono">SYNCHRONIZING RECONCILIATIONS...</p>
          <p className="text-[11px] text-slate-400 mt-1">Retrieving direct report performance and diagnostic drafts</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl p-6" id="approvals-empty">
          <FileCheck className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-sm font-bold text-slate-800">No Audits Pending</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
            {filterManagerIdOnly 
              ? "All resolutions drafted by your direct reports have been finalized and published. Great job! Switch to 'All Open Approvals' to review global submissions."
              : "No support tickets across any channel are currently waiting for manager resolution auditing."
            }
          </p>
        </div>
      ) : (
        <div className="space-y-8" id="approvals-grid">
          {filteredTickets.map((ticket) => {
            const cleanId = ticket.id.replace('tick-', '').toUpperCase();
            const assignee = ticket.assigned_to ? profilesMap.get(ticket.assigned_to) : null;
            const draft = ticket.resolution_draft || {};
            const isDirectReport = assignee?.manager_id === user.id;

            return (
              <div 
                key={ticket.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition duration-200"
                id={`audit-card-${ticket.id}`}
              >
                
                {/* 1. Header Bar: Ticket Metadata */}
                <div className="bg-slate-900 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-950">
                  <div className="flex items-start gap-2.5">
                    <div className="bg-teal-500 text-slate-950 font-black text-[11px] tracking-wider font-mono px-2.5 py-1 rounded">
                      #TKT-{cleanId}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight leading-tight mr-2">
                        {ticket.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 mt-1.5 text-[10px] text-slate-300 font-mono font-medium">
                        <span className="flex items-center gap-1 text-teal-400">
                          <Building size={11} className="shrink-0" />
                          {ticket.customer_name || 'Riyadh Bank'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="flex items-center gap-1 text-blue-300">
                          <Layers size={11} className="shrink-0" />
                          {getProductNameById((ticket as any).product_id)}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                          {ticket.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end text-xs font-semibold">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-705 flex items-center justify-center font-bold text-[9px]">
                        {assignee?.full_name?.charAt(0) || 'A'}
                      </div>
                      <span className="text-teal-400">{assignee?.full_name || 'dana@piotech.com'}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">
                      Submitted {ticket.resolution_submitted_at ? new Date(ticket.resolution_submitted_at).toLocaleDateString() : 'Today'}
                    </span>
                  </div>
                </div>

                {/* 2. Side-by-Side Verification Diff Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-slate-50/50">
                  
                  {/* Left Column: Problem Space Reported by Customer & Priority */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5">
                      <Activity className="text-red-500 shrink-0" size={14} />
                      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                        CLIENT WORKSPACE INCIDENT LOG
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {/* Priority and Tenant */}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold border rounded uppercase font-mono ${
                          ticket.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                          ticket.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {ticket.priority} Priority
                        </span>
                        <span className="text-slate-400 text-xs">|</span>
                        <span className="text-slate-500 text-xs font-medium">
                          Created {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Ticket Description */}
                      <div className="bg-white border border-slate-150 p-4 rounded-xl shadow-xs">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase font-mono tracking-wider block mb-1">
                          Reported Symptom & Context:
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap max-h-[180px] overflow-y-auto pr-1">
                          {ticket.description || 'No direct logs provided by the bank operator.'}
                        </p>
                      </div>

                      {/* Help guide / Knowledge check */}
                      <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-lg text-xs leading-relaxed text-blue-800 flex gap-2.5">
                        <BookOpen size={16} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-[11px] text-blue-900 uppercase tracking-wide">Manager Knowledge Insight</p>
                          <p className="text-[11px] text-blue-700 mt-1">
                            This core failure maps directly into documented patterns. Verify the agent resolution steps against standard SLA procedures.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Resolution Draft Submitted by Agent */}
                  <div className="p-5 space-y-4 bg-emerald-50/10">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="text-emerald-600 shrink-0" size={14} />
                        <h4 className="text-[10px] font-black uppercase text-emerald-800 tracking-wider font-mono">
                          AGENT PROPOSED RESOLUTION DRAFT
                        </h4>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase">
                        Auditing Draft
                      </span>
                    </div>

                    <div className="space-y-4 text-slate-800 text-xs">
                      
                      {/* 1. Root Cause */}
                      <div>
                        <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase tracking-wider">
                          1. Diagnosed Root Cause
                        </span>
                        <div className="bg-white border border-emerald-100/80 p-3.5 rounded-xl shadow-xs leading-relaxed text-slate-700 mt-1">
                          {draft.rootCause || <span className="text-slate-400 italic">No diagnostic root cause provided.</span>}
                        </div>
                      </div>

                      {/* 2. Resolution Steps */}
                      <div>
                        <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase tracking-wider">
                          2. Detailed Corrective Steps Deployed
                        </span>
                        <div className="bg-white border border-emerald-100/80 p-3.5 rounded-xl shadow-xs leading-relaxed text-slate-700 mt-1">
                          {draft.resolutionSteps || <span className="text-slate-400 italic">No steps logged by the operator.</span>}
                        </div>
                      </div>

                      {/* 3. Category & Reference link side-by-side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase tracking-wider">
                            3. Categorized Taxonomy
                          </span>
                          <div className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg font-mono font-bold text-[10px] text-slate-700 mt-1">
                            {draft.resolutionCategory || 'System / Config Error'}
                          </div>
                        </div>

                        <div>
                          <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase tracking-wider">
                            Knowledge Link Reference
                          </span>
                          {draft.referenceLink ? (
                            <div className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mt-1 text-teal-600 truncate font-mono text-[10px] font-semibold">
                              <LinkIcon size={12} className="shrink-0" />
                              <a 
                                href={draft.referenceLink.startsWith('http') ? draft.referenceLink : '#'}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline truncate"
                              >
                                {draft.referenceLink}
                              </a>
                            </div>
                          ) : (
                            <div className="bg-white border border-slate-150 py-1.5 px-3 rounded-lg text-slate-400 italic text-[10px] mt-1">
                              No documents referenced.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. Preventive Measures */}
                      {draft.preventiveMeasures && (
                        <div>
                          <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase tracking-wider">
                            4. Formulated Preventive Measures
                          </span>
                          <div className="bg-white border border-emerald-100/80 p-3.5 rounded-xl shadow-xs leading-relaxed text-slate-700 mt-1">
                            {draft.preventiveMeasures}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Action Control Footer / Feedback forms */}
                <div className="px-5 py-4 bg-slate-100 border-t border-slate-200 flex flex-col gap-3">
                  
                  {/* Revision Expand Panel */}
                  <AnimatePresence>
                    {activeRevisionId === ticket.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col gap-3 shadow-xs">
                          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
                            Revision guidelines for Agent ({assignee?.full_name}):
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Specify exact changes needed. (e.g. 'Please expand code documentation, attach the correct PIO-AML internal link, or double-check the database timeout threshold.')"
                            value={feedbackTexts[ticket.id] || ''}
                            onChange={(e) => setFeedbackTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans text-slate-800 placeholder-slate-400"
                          />
                          <div className="flex justify-end gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveRevisionId(null);
                                setFeedbackTexts(prev => {
                                  const copy = { ...prev };
                                  delete copy[ticket.id];
                                  return copy;
                                });
                              }}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(ticket)}
                              disabled={rejectMutation.isPending}
                              className="px-4 py-1.5 bg-red-650 hover:bg-red-750 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              {rejectMutation.isPending ? 'Sending request...' : 'Send Revision Request'}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Operational primary button line */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isDirectReport ? 'bg-teal-500' : 'bg-slate-400 animate-pulse'}`} />
                      <span className="text-[11px] text-slate-500 font-mono">
                        {isDirectReport 
                          ? 'This is your direct report. You are the authorized auditor.' 
                          : 'Global audit. You are reviewing as a System Administrator.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {activeRevisionId !== ticket.id && (
                        <button
                          type="button"
                          onClick={() => setActiveRevisionId(ticket.id)}
                          className="px-4 py-2 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-extrabold rounded-lg transition cursor-pointer"
                        >
                          Request Revision
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => handleApprove(ticket)}
                        disabled={approveMutation.isPending}
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm scroll-smooth shrink-0 cursor-pointer"
                      >
                        <CheckCircle size={13} className="text-teal-400 shrink-0" />
                        <span>Approve & Publish</span>
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
