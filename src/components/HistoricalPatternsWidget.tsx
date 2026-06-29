import React, { useState } from 'react';
import { Sparkles, AlertCircle, Clock, Award, Hammer, HelpCircle, ChevronRight, Activity, Database } from 'lucide-react';
import { api } from '../lib/api';

interface SimilarTicket {
  id: string;
  title: string;
  similarity_score: number;
  resolution_summary: string;
}

interface HistoricalPatternsData {
  similar_tickets: SimilarTicket[];
  common_root_causes: string[];
  avg_resolution_hours: number;
  recommended_assignee_skills: string[];
  confidence_level: 'high' | 'medium' | 'low';
}

interface HistoricalPatternsWidgetProps {
  productId: string;
  currentDescription: string;
}

export const HistoricalPatternsWidget: React.FC<HistoricalPatternsWidgetProps> = ({
  productId,
  currentDescription
}) => {
  const [data, setData] = useState<HistoricalPatternsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.analyzeHistoricalPatterns(productId, currentDescription);
      setData(response);
      setIsOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch historical intelligence via Gemini API.');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceBadgeColor = (level?: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-150';
      case 'low':
        return 'bg-rose-50 text-rose-700 border-rose-150';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-150';
    }
  };

  return (
    <div className="w-full bg-slate-900 text-white rounded-xl border border-slate-800 p-5 font-sans my-4 overflow-hidden relative">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-xs shrink-0 mt-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Gemini Co-Pilot • Ticket Intelligence Engine
            </h4>
            <p className="text-[11px] text-slate-400 max-w-md font-medium mt-0.5 leading-relaxed">
              Analyze historical ticket resolutions, predict recurring system failure patterns, and suggest required technician profiles instantly.
            </p>
          </div>
        </div>

        <div>
          {!data ? (
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="w-full md:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-mono font-black uppercase text-[10px] tracking-wider rounded-lg transition duration-150 shadow-md inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping mr-1"></span>
                  Analyzing History...
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5" />
                  Run Analysis
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-black uppercase text-[10px] tracking-wider rounded-lg transition"
            >
              {isOpen ? 'Collapse Intelligence' : 'Expand Intelligence'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-950/40 border border-red-900 rounded-lg flex items-center gap-2.5 text-xs text-red-200">
          <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isOpen && data && (
        <div className="mt-5 pt-5 border-t border-slate-800 space-y-5 animate-in fade-in duration-300">
          {/* Top Header Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-teal-400 shrink-0" />
              <div>
                <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 block font-bold">AVG RESOLUTION</span>
                <span className="text-sm font-black text-white">{data.avg_resolution_hours} hrs</span>
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
              <Award className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 block font-bold">CONFIDENCE LEVEL</span>
                <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border inline-block font-mono ${getConfidenceBadgeColor(data.confidence_level)}`}>
                  {data.confidence_level}
                </span>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
              <Database className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 block font-bold">TICKET SOURCE PNEUMA</span>
                <span className="text-xs font-black text-slate-200">Production History</span>
              </div>
            </div>
          </div>

          {/* Root causes and suggested skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1 font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> Recurring Root Causes
              </h5>
              <div className="space-y-1.5 bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
                {data.common_root_causes.map((rc, i) => (
                  <div key={i} className="flex gap-2 text-xs text-slate-300">
                    <span className="text-amber-500 font-mono font-bold">0{i+1}.</span>
                    <span className="font-semibold">{rc}</span>
                  </div>
                ))}
                {data.common_root_causes.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">No patterns detected on root causes.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase text-teal-400 tracking-wider flex items-center gap-1 font-mono">
                <Hammer className="w-3.5 h-3.5" /> Required Technician Skills
              </h5>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/30 border border-slate-850">
                {data.recommended_assignee_skills.map((skill, i) => (
                  <span key={i} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {skill}
                  </span>
                ))}
                {data.recommended_assignee_skills.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic">No explicit skills mapped.</p>
                )}
              </div>
            </div>
          </div>

          {/* Similar historical resolutions */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1 font-mono">
              <HelpCircle className="w-3.5 h-3.5" /> Top Similar Historical Tickets
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.similar_tickets.map((ticket, idx) => (
                <div key={idx} className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded lowercase">
                        id: {ticket.id}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-mono font-black text-teal-400">
                        <span>{Math.round(ticket.similarity_score * 100)}% Match</span>
                      </div>
                    </div>
                    <h6 className="text-[11px] font-black text-slate-200 line-clamp-1 leading-tight hover:text-indigo-400 transition cursor-pointer">
                      {ticket.title}
                    </h6>
                  </div>

                  <div className="bg-slate-900 border border-slate-850 p-2.5 rounded text-[10px] text-slate-300 font-mono leading-relaxed">
                    <span className="text-teal-400 uppercase font-black text-[8px] tracking-wider block mb-0.5">SLA RESOLUTION RESOLVE</span>
                    {ticket.resolution_summary}
                  </div>
                </div>
              ))}

              {data.similar_tickets.length === 0 && (
                <div className="col-span-3 text-center py-5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs text-slate-400 italic">
                  No similar matching tickets found from previous cycles.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
