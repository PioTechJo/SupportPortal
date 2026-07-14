import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface CategoryModalProps {
  productId: string;
  category?: any;
  onClose: () => void;
  onSaved: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({ productId, category, onClose, onSaved }) => {
  const { t } = useTranslation();
  const [categoryName, setCategoryName] = useState('');
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setCategoryName(category.category_name || '');
      setCategoryNameAr(category.category_name_ar || '');
      setDisplayOrder(category.display_order || 0);
    }
  }, [category]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        product_id: productId,
        category_name: categoryName,
        category_name_ar: categoryNameAr,
        display_order: displayOrder
      };

      if (category) {
        const { error: updateError } = await supabase
          .from('ai_diagnostic_categories')
          .update(payload)
          .eq('id', category.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('ai_diagnostic_categories')
          .insert(payload);
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{category ? t('diagnosticBuilder.editCategory') : t('diagnosticBuilder.newCategory')}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.categoryName')} *</label>
            <input
              required
              type="text"
              value={categoryName}
              onChange={e => setCategoryName(e.target.value)}
              className="w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('diagnosticBuilder.categoryNameAr')}</label>
            <input
              type="text"
              value={categoryNameAr}
              onChange={e => setCategoryNameAr(e.target.value)}
              className="w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm text-right"
              dir="rtl"
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
              className="w-full rounded-md border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md">{t('diagnosticBuilder.cancel')}</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50">
              {isSaving ? t('diagnosticBuilder.saving') : t('diagnosticBuilder.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
