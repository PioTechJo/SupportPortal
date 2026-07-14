import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface OptionModalProps {
  questionId: string;
  option?: any;
  onClose: () => void;
  onSaved: () => void;
}

export const OptionModal: React.FC<OptionModalProps> = ({ questionId, option, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [optionLabel, setOptionLabel] = useState('');
  const [optionLabelAr, setOptionLabelAr] = useState('');
  const [optionValue, setOptionValue] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [pointValue, setPointValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (option) {
      setOptionLabel(option.option_label || '');
      setOptionLabelAr(option.option_label_ar || '');
      setOptionValue(option.option_value || '');
      setDisplayOrder(option.display_order || 0);
      setPointValue(option.point_value || 0);
    }
  }, [option]);

  // Auto-fill value from label if empty
  const handleLabelChange = (val: string) => {
    setOptionLabel(val);
    if (!option && !optionValue) {
      setOptionValue(val);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        question_id: questionId,
        option_label: optionLabel,
        option_label_ar: optionLabelAr,
        option_value: optionValue || optionLabel, // fallback to label
        display_order: displayOrder,
        point_value: pointValue
      };

      if (option) {
        const { error: updateError } = await supabase
          .from('ai_question_options')
          .update(payload)
          .eq('id', option.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ai_question_options')
          .insert(payload);
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save option");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{option ? t('diagnosticBuilder.editOption') : t('diagnosticBuilder.newOption')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.optionLabel')} *</label>
            <input
              required
              type="text"
              value={optionLabel}
              onChange={e => handleLabelChange(e.target.value)}
              className="w-full rounded-md border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.optionLabelAr')}</label>
            <input
              type="text"
              value={optionLabelAr}
              onChange={e => setOptionLabelAr(e.target.value)}
              className="w-full rounded-md border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-sm text-right"
              dir="rtl"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.optionValue')} *</label>
            <input
              required
              type="text"
              value={optionValue}
              onChange={e => setOptionValue(e.target.value)}
              className="w-full rounded-md border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.displayOrder')} *</label>
            <input
              required
              type="number"
              value={displayOrder}
              onChange={e => setDisplayOrder(parseInt(e.target.value))}
              className="w-full rounded-md border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.severityWeight')} *</label>
            <select
              required
              value={pointValue}
              onChange={e => setPointValue(parseInt(e.target.value))}
              className="w-full rounded-md border-slate-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
            >
              <option value={0}>{t('diagnosticBuilder.low')} (0 {t('diagnosticBuilder.pts')})</option>
              <option value={5}>{t('diagnosticBuilder.medium')} (5 {t('diagnosticBuilder.pts')})</option>
              <option value={10}>{t('diagnosticBuilder.high')} (10 {t('diagnosticBuilder.pts')})</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">{t('diagnosticBuilder.cancel')}</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50">
              {isSaving ? t('diagnosticBuilder.saving') : t('diagnosticBuilder.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
