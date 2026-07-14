import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ArrowRight, ChevronRight, Folder, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Step2CategoryProps {
  productId: string;
  productName?: string;
  selectedCategoryId: string;
  onSelect: (id: string, name: string) => void;
  onBack: () => void;
}

export const Step2Category: React.FC<Step2CategoryProps> = ({ productId, productName, selectedCategoryId, onSelect, onBack }) => {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedId, setLocalSelectedId] = useState<string>(selectedCategoryId);
  const [localSelectedName, setLocalSelectedName] = useState<string>('');

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('ai_diagnostic_categories')
        .select('*')
        .eq('product_id', productId)
        .order('display_order');
        
      if (!error && data) {
        setCategories(data);
      }
      setLoading(false);
    };
    fetchCategories();
  }, [productId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium text-[14px]">{t('wizard.loadingCategories')}</div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] mb-4">
            <Package size={14} className="text-slate-500" />
            <span className="text-[12px] font-medium text-slate-700">{productName || 'Product'}</span>
            <ChevronRight size={14} className="rtl:rotate-180 text-slate-400" />
            <span className="text-[12px] font-medium text-slate-500">{t("wizard.selectCategoryTitle")}</span>
          </div>
          <h3 className="text-[18px] font-medium text-slate-800">{t("wizard.selectCategoryTitle")}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t("wizard.whatTypeIssue")}</p>
        </div>

        {categories.length === 0 ? (
          <div className="p-6 bg-slate-50 text-center rounded-[10px] border border-slate-200 text-slate-500 text-[13px]">
            No diagnostic categories configured for this product.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map(c => {
              const isSelected = localSelectedId === c.id;
              const displayCategory = i18n.language === 'ar' && c.category_name_ar 
                ? c.category_name_ar 
                : c.category_name;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setLocalSelectedId(c.id);
                    setLocalSelectedName(displayCategory);
                  }}
                  className={`p-4 rounded-[10px] border-[0.5px] text-start transition-colors flex items-center gap-4 ${
                    isSelected 
                      ? 'bg-[#fff5ee] border-[#f97316]' 
                      : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                  }`}
                >
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-[#f97316]/10 text-[#f97316]' : 'bg-slate-100 text-slate-500'}`}>
                    <Folder size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[14px] text-slate-900">{displayCategory}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{c.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-slate-400">{t('wizard.stepQuestions')}</span>
                    <ChevronRight size={16} className={`rtl:rotate-180 ${isSelected ? 'text-[#f97316]' : 'text-slate-300'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
        </button>
        
        <button 
          onClick={() => localSelectedId && onSelect(localSelectedId, localSelectedName)}
          disabled={!localSelectedId}
          className="bg-[#f97316] disabled:opacity-50 text-white font-medium text-[14px] py-2 px-4 rounded-[8px] flex items-center gap-2 hover:bg-[#ea580c] transition-colors"
        >
          {t('wizard.next')} <ArrowRight className="rtl:rotate-180" size={16} />
        </button>
      </div>
    </div>
  );
};
