import React from 'react';
import { ArrowLeft, Wrench, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type TicketType = 'SUPPORT' | 'DEVELOPMENT';

interface StepTicketTypeProps {
  selectedType: TicketType | '';
  onSelect: (type: TicketType) => void;
  onBack: () => void;
}

export const StepTicketType: React.FC<StepTicketTypeProps> = ({ selectedType, onSelect, onBack }) => {
  const { t } = useTranslation();

  const options: { type: TicketType; icon: React.ReactNode; title: string; description: string }[] = [
    {
      type: 'SUPPORT',
      icon: <Wrench size={20} />,
      title: t('wizard.supportTicketTitle'),
      description: t('wizard.supportTicketDescription'),
    },
    {
      type: 'DEVELOPMENT',
      icon: <Code2 size={20} />,
      title: t('wizard.developmentTicketTitle'),
      description: t('wizard.developmentTicketDescription'),
    },
  ];

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-[18px] font-medium text-slate-800">{t('wizard.selectTicketTypeTitle')}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t('wizard.selectTicketTypeSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {options.map(opt => {
            const isSelected = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => onSelect(opt.type)}
                className={`p-4 rounded-[10px] border-[0.5px] text-start transition-colors flex gap-3 items-start ${
                  isSelected
                    ? 'bg-[#fff5ee] border-[#f97316]'
                    : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                }`}
              >
                <div className={`p-2 rounded-full ${isSelected ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-slate-100 text-slate-500'}`}>
                  {opt.icon}
                </div>
                <div>
                  <div className="font-medium text-[14px] text-slate-900">{opt.title}</div>
                  <div className="text-[12px] text-slate-500 mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
        </button>
      </div>
    </div>
  );
};
