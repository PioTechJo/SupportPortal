import React from 'react';
import { AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

interface Step3IssueTypeProps {
  selectedIssueId: string;
  onSelect: (issueId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step3IssueType: React.FC<Step3IssueTypeProps> = ({ 
  selectedIssueId, 
  onSelect, 
  onNext,
  onBack
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">What type of issue is this?</h2>
        <p className="text-slate-500 font-medium">Categorizing the issue helps us ask the right questions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {wizardConfig.issueTypes.map(issue => (
          <div 
            key={issue.id}
            onClick={() => onSelect(issue.id)}
            className={`
              p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-3 items-center text-center
              ${selectedIssueId === issue.id 
                ? 'border-rose-500 bg-rose-50/50 shadow-sm shadow-rose-500/10' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${selectedIssueId === issue.id ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}
            `}>
              <AlertCircle size={24} />
            </div>
            <h3 className={`font-bold ${selectedIssueId === issue.id ? 'text-rose-900' : 'text-slate-800'}`}>
              {issue.name}
            </h3>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
        <button 
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onNext}
          disabled={!selectedIssueId}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
