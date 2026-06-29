import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Eye, X, Sparkles, HelpCircle, Tag, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { KnowledgeArticle } from '../types';

interface KnowledgeBaseSearchProps {
  productId?: string;
  placeholder?: string;
}

export const KnowledgeBaseSearch: React.FC<KnowledgeBaseSearchProps> = ({
  productId = 'prod-2', // fallback default if none is chosen
  placeholder = "Search our AI-powered knowledge base for instant answers..."
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const data = await api.searchKnowledgeArticles(productId, query);
        setResults(data);
      } catch (err) {
        console.error("Failed to perform knowledge search:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query, productId]);

  const handleOpenArticle = async (article: KnowledgeArticle) => {
    setSelectedArticle(article);
    setViewCount(article.view_count);
    try {
      const updatedCount = await api.incrementArticleViewCount(article.id);
      setViewCount(updatedCount);
    } catch (err) {
      console.warn("Could not increment view count", err);
    }
  };

  const handleCloseArticle = () => {
    setSelectedArticle(null);
    setViewCount(null);
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-sans mb-6">
      <div className="space-y-4">
        {/* Title / Description */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                Support Knowledge Base Assistant
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Our cognitive AI scans official product specifications to resolve issues instantly.
              </p>
            </div>
          </div>
          {productId && (
            <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 border border-indigo-150 rounded uppercase tracking-wider">
              Scoped Search Active
            </span>
          )}
        </div>

        {/* Input Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-teal-500 transition shadow-xs"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs font-mono font-bold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
            <span>Gemini LLM is evaluating candidate solutions...</span>
          </div>
        )}

        {/* Results Cards List */}
        {!isLoading && query && results.length === 0 && (
          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white space-y-1">
            <HelpCircle className="w-6 h-6 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">No exact match found in our primary support index.</p>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
              Please refine your description terms, verify your product, or proceed to submit standard telemetry logs.
            </p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {results.map((art, idx) => (
              <div
                key={art.id}
                onClick={() => handleOpenArticle(art)}
                className="group bg-white border border-slate-200 hover:border-teal-500 rounded-xl p-4 cursor-pointer hover:shadow-xs transition duration-150 relative overflow-hidden flex flex-col justify-between"
              >
                {/* AI Relevance Tag Indicator */}
                {idx === 0 && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-teal-500 to-teal-400 text-white font-mono font-black uppercase text-[8px] tracking-wider py-0.5 px-2.5 rounded-bl-lg flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI MATCH</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono font-black uppercase text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">
                      {art.category}
                    </span>
                    <span className="text-[9px] font-mono font-semibold text-slate-400">
                      • {art.tags?.[0]}
                    </span>
                  </div>

                  <h4 className="text-xs font-extrabold text-slate-800 tracking-tight group-hover:text-teal-600 transition">
                    {art.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    {art.content.length > 135 ? art.content.slice(0, 135) + '...' : art.content}
                  </p>
                </div>

                <div className="flex justify-between items-center pt-3 mt-3 border-t border-slate-100 text-[10px] font-mono text-slate-400 font-bold">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-300" />
                    <span>{art.view_count} views</span>
                  </div>
                  <span className="text-teal-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition duration-150 uppercase tracking-widest text-[9px] font-black">
                    Read Article <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Overlay / Details */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 font-sans text-left">
            {/* Header */}
            <div className="bg-slate-950 text-white p-5 flex justify-between items-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/30 via-transparent to-transparent"></div>
              <div className="relative z-10 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                <div>
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-teal-400 block">
                    {selectedArticle.category} • USER DOCUMENTATION
                  </span>
                  <h3 className="text-sm font-black text-white hover:text-teal-300 transition">
                    {selectedArticle.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={handleCloseArticle}
                className="bg-white/10 hover:bg-white/20 transition p-1.5 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Article Content */}
            <div className="p-6 space-y-5 text-xs text-slate-700 leading-relaxed max-h-[70vh] overflow-y-auto">
              {/* Keywords Tag block */}
              <div className="flex flex-wrap gap-1.5">
                {(selectedArticle.tags || []).map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded px-2.5 py-0.5 font-mono text-[9px] font-bold">
                    <Tag className="w-2.5 h-2.5" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Real Content Body */}
              <div className="whitespace-pre-line bg-slate-50 border border-slate-150 rounded-xl p-5 font-mono text-slate-800 text-[11px] leading-relaxed select-text">
                {selectedArticle.content}
              </div>

              <div className="bg-amber-50/50 border border-amber-150 p-4 rounded-xl flex gap-2.5 text-slate-600">
                <span className="text-base text-amber-500 leading-none">⚠️</span>
                <div>
                  <p className="font-bold text-slate-800 mb-0.5">SLA Critical Action Required</p>
                  <p className="text-[11px]">If following these actions does not resolve your balance or wiring constraints, please click the wizard button to submit a formal system diagnostic ticket.</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[11px] font-mono font-bold text-slate-400">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-slate-300" />
                <span>Current Article Views: {viewCount !== null ? viewCount : selectedArticle.view_count}</span>
              </div>
              <button
                type="button"
                onClick={handleCloseArticle}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-white rounded-lg transition text-[10px] uppercase font-black tracking-wider cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
