import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Step1ProductProps {
  organizationId: string;
  selectedProductId: string;
  onSelect: (id: string, name: string) => void;
  onBack?: () => void;
}

export const Step1Product: React.FC<Step1ProductProps> = ({ organizationId, selectedProductId, onSelect, onBack }) => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedId, setLocalSelectedId] = useState<string>(selectedProductId);
  const [localSelectedName, setLocalSelectedName] = useState<string>('');

  useEffect(() => {
    const fetchProducts = async () => {
      if (!organizationId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('organization_products')
        .select(`
          product_id,
          products!inner (
            id,
            product_name,
            description,
            icon,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .eq('products.is_active', true);

      if (error) {
        console.error("Supabase Error fetching products:", error);
        setError(error.message);
      } else {
        console.log("Supabase Data fetched for org", organizationId, ":", data);
        setProducts(data?.map(cp => cp.products).filter(Boolean) || []);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [organizationId]);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium text-[14px]">{t("wizard.loadingLicensedProducts")}</div>;

  const chipText = onBack ? "Selected Customer" : "Your organization";

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[12px] font-medium rounded-full mb-3">
            {chipText}
          </span>
          <h3 className="text-[18px] font-medium text-slate-800">{t("wizard.selectProductTitle")}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t("wizard.whichProduct")}</p>
        </div>

        {error && <div className="p-3 bg-red-50 text-red-600 rounded-[8px] text-[13px]">{error}</div>}

        {products.length === 0 ? (
          <div className="p-6 bg-slate-50 text-center rounded-[10px] border border-slate-200 text-slate-500 text-[13px]">
            No active product licenses found for this organization.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {products.map(p => {
              const isSelected = localSelectedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setLocalSelectedId(p.id);
                    setLocalSelectedName(p.product_name);
                  }}
                  className={`p-4 rounded-[10px] border-[0.5px] text-start transition-colors flex gap-3 items-start ${
                    isSelected 
                      ? 'bg-[#fff5ee] border-[#f97316]' 
                      : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                  }`}
                >
                  <div className={`mt-0.5 text-xl ${isSelected ? 'text-[#f97316]' : 'text-slate-400'}`}>
                    {p.icon || <Package size={20} />}
                  </div>
                  <div>
                    <div className="font-medium text-[14px] text-slate-900">{p.product_name}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{p.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        {onBack ? (
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <ArrowLeft className="rtl:rotate-180" size={16} /> {t('wizard.back')}
          </button>
        ) : <div />}
        
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
