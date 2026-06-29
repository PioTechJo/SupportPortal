import React from 'react';
import { ArrowLeft, Send, CheckCircle2, Package, Layers, AlertCircle } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

interface Step7SummaryProps {
  productId: string;
  moduleId: string;
  issueId: string;
  answers: Record<string, any>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const Step7Summary: React.FC<Step7SummaryProps> = ({ 
  productId,
  moduleId,
  issueId,
  answers,
  onBack,
  onSubmit,
  isSubmitting
}) => {
  const product = wizardConfig.products.find(p => p.id === productId);
  const module = product?.modules?.find(m => m.id === moduleId);
  const issue = wizardConfig.issueTypes.find(i => i.id === issueId);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Review Ticket Summary</h2>
        <p className="text-slate-500 font-medium">Please confirm the details below before submitting to our engineering team.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Header Badges */}
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
            <Package size={16} className="text-teal-600" />
            {product?.name}
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
            <Layers size={16} className="text-indigo-600" />
            {module?.name}
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 shadow-sm">
            <AlertCircle size={16} className="text-rose-600" />
            {issue?.name} Issue
          </div>
        </div>

        {/* Answers Grid */}
        <div className="p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Collected Diagnostics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(answers).map(([key, value]) => {
              // Format arrays (checkboxes) into string
              const displayValue = Array.isArray(value) ? value.join(', ') : value;
              // Format key purely for display if we can't find label easily (since we don't have the config context handy)
              const formattedKey = key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

              return (
                <div key={key} className={`${key === 'desc' ? 'md:col-span-2' : ''}`}>
                  <span className="block text-xs font-bold text-slate-500 mb-1">{formattedKey}</span>
                  <div className="text-sm text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">
                    {displayValue || <span className="text-slate-400 italic">Not provided</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
        <button 
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={16} /> Submit Ticket
            </>
          )}
        </button>
      </div>
    </div>
  );
};
