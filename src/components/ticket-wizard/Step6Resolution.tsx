import React from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';

interface Step6ResolutionProps {
  onResolved: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export const Step6Resolution: React.FC<Step6ResolutionProps> = ({ 
  onResolved,
  onContinue,
  onBack
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto text-center mt-12">
      <div className="mx-auto w-20 h-20 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-6">
        <HelpCircle size={40} />
      </div>
      
      <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Was your issue resolved?</h2>
      <p className="text-slate-500 font-medium text-lg mb-10">Did the AI recommendations help you fix the problem?</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={onResolved}
          className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-2xl hover:bg-emerald-100 transition-colors flex flex-col items-center justify-center gap-3 group"
        >
          <CheckCircle2 size={32} className="text-emerald-600 group-hover:scale-110 transition-transform" />
          <div className="text-emerald-900 font-bold text-lg">Yes, it's resolved</div>
          <div className="text-emerald-700/80 text-sm font-medium">Cancel this ticket</div>
        </button>

        <button 
          onClick={onContinue}
          className="p-6 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-colors flex flex-col items-center justify-center gap-3 group"
        >
          <div className="w-8 h-8 rounded-full border-2 border-slate-400 group-hover:border-indigo-500 flex items-center justify-center">
            <div className="w-3 h-3 bg-slate-400 group-hover:bg-indigo-500 rounded-full" />
          </div>
          <div className="text-slate-800 group-hover:text-indigo-900 font-bold text-lg">No, I still need help</div>
          <div className="text-slate-500 group-hover:text-indigo-700/80 text-sm font-medium">Continue to submit ticket</div>
        </button>
      </div>

      <div className="flex justify-start pt-8 mt-8 border-t border-slate-100">
        <button 
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    </div>
  );
};
