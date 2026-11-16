import React from 'react';
import { ArrowLeft, ArrowRight, Check, Lightbulb } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SelfServiceGuide } from './selfServiceGuides';

// issue text -> user's note (empty string = selected without a note)
export type SelfServiceSelections = Record<string, string>;

interface StepSelfServiceProps {
  productName: string;
  guide: SelfServiceGuide;
  selections: SelfServiceSelections;
  onChange: (next: SelfServiceSelections) => void;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const StepSelfService: React.FC<StepSelfServiceProps> = ({ productName, guide, selections, onChange, onNext, onSkip, onBack }) => {
  const { t } = useTranslation();

  const toggle = (issue: string) => {
    const next = { ...selections };
    if (issue in next) delete next[issue];
    else next[issue] = '';
    onChange(next);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-3">
        <div>
          <h3 className="text-[16px] font-medium text-slate-800">{t('wizard.selfServiceTitle', { product: productName })}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t('wizard.selfServiceSubtitle')}</p>
        </div>

        <div className="space-y-1.5">
          {guide.items.map(item => {
            const selected = item.issue in selections;
            return (
              <div key={item.issue} className={`rounded-[10px] border-[0.5px] ${selected ? 'border-[#f97316] bg-[#fff5ee]' : 'border-slate-200 bg-white'}`}>
                <button
                  type="button"
                  onClick={() => toggle(item.issue)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-start"
                >
                  <span className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 ${selected ? 'bg-[#f97316] border-[#f97316] text-white' : 'border-slate-300 bg-white'}`}>
                    {selected && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="font-medium text-[14px] text-slate-900">{item.issue}</span>
                </button>
                {selected && (
                  <div className="px-3.5 pb-3.5 space-y-3">
                    <p className="text-[13px] text-slate-600 leading-relaxed">{item.resolution}</p>
                    <textarea
                      value={selections[item.issue]}
                      onChange={e => onChange({ ...selections, [item.issue]: e.target.value })}
                      placeholder={t('wizard.selfServiceNotePlaceholder')}
                      rows={2}
                      className="w-full text-[13px] border-[0.5px] border-slate-200 rounded-[8px] p-2.5 bg-white focus:outline-none focus:border-[#f97316] resize-y"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {guide.preventive && (
          <div className="flex gap-2.5 bg-blue-50 border border-blue-200 rounded-[10px] px-3.5 py-2.5">
            <Lightbulb size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-blue-900">
              <span className="font-semibold">{t('wizard.preventiveRecommendation')}: </span>
              {guide.preventive}
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onSkip} className="px-4 py-2 rounded-[8px] text-[14px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
            {t('wizard.selfServiceSkip')}
          </button>
          <button onClick={onNext} className="flex items-center gap-2 px-5 py-2 rounded-[8px] text-[14px] font-medium text-white bg-[#f97316] hover:bg-[#ea580c] transition-colors">
            {t('wizard.selfServiceContinue')} <ArrowRight className="rtl:rotate-180" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
