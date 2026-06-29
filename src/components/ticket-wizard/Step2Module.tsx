import React from 'react';
import { Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

interface Step2ModuleProps {
  productId: string;
  selectedModuleId: string;
  onSelect: (moduleId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step2Module: React.FC<Step2ModuleProps> = ({ 
  productId,
  selectedModuleId, 
  onSelect, 
  onNext,
  onBack
}) => {
  const product = wizardConfig.products.find(p => p.id === productId);
  const modules = product?.modules || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Which module has an issue?</h2>
        <p className="text-slate-500 font-medium">You selected <span className="font-bold text-slate-700">{product?.name}</span>. Please choose the specific module.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {modules.map(mod => (
          <div 
            key={mod.id}
            onClick={() => onSelect(mod.id)}
            className={`
              p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-3 items-start
              ${selectedModuleId === mod.id 
                ? 'border-indigo-500 bg-indigo-50/50 shadow-sm shadow-indigo-500/10' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
            `}
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center
              ${selectedModuleId === mod.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}
            `}>
              <Layers size={20} />
            </div>
            <h3 className={`font-bold ${selectedModuleId === mod.id ? 'text-indigo-900' : 'text-slate-800'}`}>
              {mod.name}
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
          disabled={!selectedModuleId}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
