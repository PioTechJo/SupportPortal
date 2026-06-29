import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, FileText, Send, AlertTriangle, Link } from 'lucide-react';
import { api } from '../lib/api';
import { KnowledgeArticle } from '../types';

interface ResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketTitle: string;
  productId: string;
  agentId: string;
  agentName: string;
  onSuccess: () => void;
}

export default function ResolutionModal({
  isOpen,
  onClose,
  ticketId,
  ticketTitle,
  productId,
  agentId,
  agentName,
  onSuccess
}: ResolutionModalProps) {
  // Form fields
  const [rootCause, setRootCause] = useState('');
  const [resolutionSteps, setResolutionSteps] = useState('');
  const [resolutionCategory, setResolutionCategory] = useState('Bug Fix');
  const [preventiveMeasures, setPreventiveMeasures] = useState('');
  const [articleSelection, setArticleSelection] = useState('none');
  const [customReference, setCustomReference] = useState('');

  // Loaded DB knowledge articles
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isArticlesLoading, setIsArticlesLoading] = useState(false);

  // Loading/Success states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch articles on load/productId change
  useEffect(() => {
    if (isOpen && productId) {
      const loadArticles = async () => {
        setIsArticlesLoading(true);
        try {
          const list = await api.getArticlesForProduct(productId);
          setArticles(list || []);
        } catch (err) {
          console.error("Could not fetch articles for resolution reference selection", err);
        } finally {
          setIsArticlesLoading(false);
        }
      };
      loadArticles();
    }
  }, [isOpen, productId]);

  const cleanTicketCode = ticketId.replace('tick-', '').toUpperCase();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolutionSteps.trim()) {
      setError('Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const referenceLink = articleSelection === 'custom' 
      ? customReference 
      : articleSelection !== 'none' 
        ? articles.find(a => a.id === articleSelection)?.title || 'Knowledge Article'
        : '';

    const payload = {
      rootCause,
      resolutionSteps,
      resolutionCategory,
      preventiveMeasures: preventiveMeasures.trim() || undefined,
      referenceArticleId: articleSelection !== 'none' && articleSelection !== 'custom' ? articleSelection : undefined,
      referenceLink: referenceLink || undefined
    };

    try {
      await api.submitTicketResolution({
        ticketId,
        ticketTitle,
        agentId,
        agentName,
        formData: payload
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Resolution transaction failed to process.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    // Reset all form states
    setRootCause('');
    setResolutionSteps('');
    setResolutionCategory('Bug Fix');
    setPreventiveMeasures('');
    setArticleSelection('none');
    setCustomReference('');
    setError(null);
    setSubmitSuccess(false);
    onClose();
    if (submitSuccess) {
      onSuccess();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="resolution-modal-overlay">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleModalClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            id="resolution-modal-backdrop"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-10 text-left flex flex-col max-h-[90vh]"
            id="resolution-modal-card"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest font-mono text-white bg-slate-900 px-2.5 py-1 rounded">
                  #TKT-{cleanTicketCode}
                </span>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  Resolution Protocol
                </span>
              </div>
              <button
                type="button"
                onClick={handleModalClose}
                className="p-1 px-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-150 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!submitSuccess ? (
                <form onSubmit={handleFormSubmit} className="space-y-5" id="resolution-form">
                  <div className="bg-slate-50 border border-slate-150/80 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-widest">Target Ticket Title</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">{ticketTitle}</p>
                    <p className="text-[9px] text-slate-400 font-mono font-medium mt-1 leading-normal">
                      Note: Submitting this resolution updates the status to <span className="text-indigo-600 font-bold uppercase">Pending Approval</span>. Managers must authorize this change before clients are permanently notified of service restoration.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 p-3.5 rounded-lg flex items-start gap-2 text-xs text-red-700 font-medium">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 1. Root Cause */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 font-mono block">
                      1. Root Cause <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mb-1.5">What was the root cause of this issue?</p>
                    <textarea
                      required
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="e.g., Memory leak in transaction dispatch loop for high-frequency order book indices."
                      className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-lg p-3 text-xs min-h-[75px] outline-none transition placeholder-slate-400"
                      id="input-root-cause"
                    />
                  </div>

                  {/* 2. Resolution Steps */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 font-mono block">
                      2. Resolution Steps <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mb-1.5">What steps were taken to resolve it?</p>
                    <textarea
                      required
                      value={resolutionSteps}
                      onChange={(e) => setResolutionSteps(e.target.value)}
                      placeholder="e.g., Cleaned up detached event listeners, deployed a garbage collector trigger, and executed diagnostic heap profiles."
                      className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-lg p-3 text-xs min-h-[75px] outline-none transition placeholder-slate-400"
                      id="input-resolution-steps"
                    />
                  </div>

                  {/* 3. Resolution Category */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 font-mono block">
                      3. Resolution Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={resolutionCategory}
                      onChange={(e) => setResolutionCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-teal-500 focus:border-transparent outline-none cursor-pointer font-mono font-medium"
                      id="input-resolution-category"
                    >
                      <option value="Configuration">Configuration</option>
                      <option value="Bug Fix">Bug Fix</option>
                      <option value="Training">Training</option>
                      <option value="Integration">Integration</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* 4. Preventive Measures */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 font-mono block">
                      4. Preventive Measures <span className="text-slate-400 text-[10px]">(Optional)</span>
                    </label>
                    <p className="text-[10px] text-slate-400 font-medium mb-1.5">What can prevent this in the future?</p>
                    <textarea
                      value={preventiveMeasures}
                      onChange={(e) => setPreventiveMeasures(e.target.value)}
                      placeholder="e.g., Setup alert metrics measuring high transaction durations above threshold limits."
                      className="w-full bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-slate-300 rounded-lg p-3 text-xs min-h-[60px] outline-none transition placeholder-slate-400"
                      id="input-preventive-measures"
                    />
                  </div>

                  {/* 5. Reference Article selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold uppercase text-slate-500 font-mono block">
                      5. Reference Article Selection <span className="text-slate-400 text-[10px]">(Optional)</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block mb-1">Knowledge Link Type</span>
                        <select
                          value={articleSelection}
                          onChange={(e) => setArticleSelection(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none cursor-pointer text-slate-700"
                          id="select-reference-option"
                        >
                          <option value="none">No Attached Article</option>
                          {articles.length > 0 && <option value="select">Link Knowledge Article</option>}
                          <option value="custom">Custom URL Reference Link</option>
                        </select>
                      </div>

                      {articleSelection === 'select' && articles.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block mb-1">Select Knowledge Article</span>
                          <select
                            value={articleSelection === 'select' ? '' : articleSelection}
                            onChange={(e) => setArticleSelection(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none cursor-pointer max-w-full text-slate-700 text-ellipsis truncate"
                            id="select-kb-article"
                          >
                            <option value="">-- Choose Article --</option>
                            {articles.map(art => (
                              <option key={art.id} value={art.id}>{art.title}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {articleSelection === 'custom' && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block mb-1">Reference URL</span>
                          <input
                            type="url"
                            value={customReference}
                            onChange={(e) => setCustomReference(e.target.value)}
                            placeholder="https://kb.yourdomain.com/docs/192"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-slate-300 transition text-slate-700"
                            id="input-custom-reference"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-2 flex justify-end gap-3.5 border-t border-slate-100 bg-white sticky h-14 items-center shrink-0">
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="px-4 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition select-none"
                    >
                      Dismiss
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition select-none shadow-xs"
                      id="btn-resolution-submit"
                    >
                      {isSubmitting ? 'Submitting...' : 'File Resolution'}
                      <Send size={12} />
                    </button>
                  </div>
                </form>
              ) : (
                /* Success Notification State */
                <div className="py-8 px-4 flex flex-col items-center text-center space-y-4" id="resolution-success-container">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce shadow-inner" id="success-icon-badge">
                    <CheckCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Resolution Filed Successfully</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1 font-mono uppercase tracking-wider">
                      Target state changed: Awaiting Authorized Verification
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl max-w-md text-left text-xs text-slate-600 space-y-2.5">
                    <p className="font-medium text-slate-800">
                      Our system logged your transaction records:
                    </p>
                    <div className="border-l-2 border-emerald-500 pl-3.5 space-y-1 font-mono text-[10px]">
                      <p><span className="text-slate-400">STATUS:</span> PENDING_APPROVAL</p>
                      <p><span className="text-slate-400">RESOLVER:</span> {agentName}</p>
                      <p><span className="text-slate-400">TIMESTAMP:</span> {new Date().toLocaleTimeString()}</p>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
                      ⚠️ Resolution submitted. Awaiting manager approval before the customer is notified. Your resolution document has been sent to the auditing dashboard.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer transition select-none"
                    id="btn-success-close"
                  >
                    Return to Queue
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
