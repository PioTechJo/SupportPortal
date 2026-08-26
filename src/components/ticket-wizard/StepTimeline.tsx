import React from 'react';
import { ArrowLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StepTimelineProps {
  value: string;
  onChange: (date: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepTimeline: React.FC<StepTimelineProps> = ({ value, onChange, onNext, onBack }) => {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-[18px] font-medium text-slate-800">{t('wizard.timelineTitle')}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t('wizard.timelineSubtitle')}</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-5 space-y-3">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <CalendarClock size={16} className="text-slate-400" />
            {t('wizard.neededByDate')}
          </label>
          <input
            type="date"
            min={today}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border-[0.5px] border-slate-200 rounded-[10px] text-[14px] text-slate-800 focus:outline-none focus:border-[#f97316]"
          />
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
        </button>
        <button
          onClick={onNext}
          disabled={!value}
          className="bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-[14px] py-2 px-4 rounded-[8px] transition-colors flex items-center gap-2"
        >
          {t('wizard.next')} <ChevronRight className="rtl:rotate-180" size={16} />
        </button>
      </div>
    </div>
  );
};
