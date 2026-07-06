import React from 'react';
import { ArrowLeft, Check, Package, ChevronRight } from 'lucide-react';

interface Step4DetailsProps {
  productName?: string;
  categoryName?: string;
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  error: string | null;
}

export const Step4Details: React.FC<Step4DetailsProps> = ({
  productName, categoryName, title, setTitle, description, setDescription, onBack, onSubmit, isSubmitting, error
}) => {
  const isFormValid = title.trim() && description.trim();

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] mb-4">
            <Package size={14} className="text-slate-500" />
            <span className="text-[12px] font-medium text-slate-700">{productName || 'Product'}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-[12px] font-medium text-slate-700">{categoryName || 'Category'}</span>
          </div>
          <h3 className="text-[18px] font-medium text-slate-800">Issue details</h3>
          <p className="text-[13px] text-slate-500 mt-1">Please provide details to help us diagnose the issue.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Subject / Title *</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full border border-slate-200 rounded-[8px] px-3 py-2 text-[14px] focus:ring-[#f97316] focus:border-[#f97316] outline-none transition-colors shadow-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Detailed Description *</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain what happened..."
              className="w-full border border-slate-200 rounded-[8px] px-3 py-2 text-[14px] h-32 focus:ring-[#f97316] focus:border-[#f97316] outline-none transition-colors shadow-sm"
              required
            />
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-[8px] text-[13px] font-medium">{error}</div>}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onSubmit} 
          disabled={!isFormValid || isSubmitting}
          className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-medium text-[14px] py-2 px-4 rounded-[8px] transition-colors flex items-center gap-2"
        >
          {isSubmitting ? 'Submitting...' : 'Submit ticket'} <Check size={16} />
        </button>
      </div>
    </div>
  );
};
