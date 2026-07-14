import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Step0CustomerProps {
  selectedCustomerId: string;
  onSelect: (id: string) => void;
}

export const Step0Customer: React.FC<Step0CustomerProps> = ({ selectedCustomerId, onSelect }) => {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedId, setLocalSelectedId] = useState<string>(selectedCustomerId);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data, error } = await supabase.from('customers').select('id, customer_name, customer_code').order('customer_name');
      if (!error && data) setOrganizations(data);
      setLoading(false);
    };
    fetchOrgs();
  }, []);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium text-[14px]">{t('wizard.loadingOrganizations')}</div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] mb-4">
            <span className="text-[12px] font-medium text-slate-700">{t('wizard.administratorView')}</span>
          </div>
          <h3 className="text-[18px] font-medium text-slate-800">{t('wizard.selectCustomer')}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t('wizard.adminChooseCustomer')}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {organizations.map(org => {
            const isSelected = localSelectedId === org.id;
            return (
              <button
                key={org.id}
                onClick={() => setLocalSelectedId(org.id)}
                className={`p-4 rounded-[10px] border-[0.5px] text-start transition-colors ${
                  isSelected 
                    ? 'bg-[#fff5ee] border-[#f97316]' 
                    : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                }`}
              >
                <div className="font-medium text-[14px] text-slate-900">{org.customer_name}</div>
                {org.customer_code && <div className="text-[12px] text-slate-500 mt-1">{org.customer_code}</div>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-end shrink-0">
        <button 
          onClick={() => localSelectedId && onSelect(localSelectedId)}
          disabled={!localSelectedId}
          className="bg-[#f97316] disabled:opacity-50 text-white font-medium text-[14px] py-2 px-4 rounded-[8px] flex items-center gap-2 hover:bg-[#ea580c] transition-colors"
        >
          {t('wizard.next')} <ArrowRight className="rtl:rotate-180" size={16} />
        </button>
      </div>
    </div>
  );
};
