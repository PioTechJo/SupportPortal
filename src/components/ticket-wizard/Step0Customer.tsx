import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';

interface Step0CustomerProps {
  selectedCustomerId: string;
  onSelect: (id: string) => void;
}

export const Step0Customer: React.FC<Step0CustomerProps> = ({ selectedCustomerId, onSelect }) => {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedId, setLocalSelectedId] = useState<string>(selectedCustomerId);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data, error } = await supabase.from('customers').select('id, customer_name, customer_code').order('customer_name');
      if (!error && data) setOrganizations(data);
      setLoading(false);
    };
    fetchOrgs();
  }, []);

  const filteredOrganizations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter(org =>
      (org.customer_name || '').toLowerCase().includes(q) ||
      (org.customer_code || '').toLowerCase().includes(q)
    );
  }, [organizations, search]);

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

        <div className="relative">
          <Search size={15} className="absolute inset-y-0 start-3 my-auto text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('wizard.searchBanks')}
            className="w-full ps-9 pe-3 py-2.5 bg-slate-50 text-slate-900 rounded-[10px] border-[0.5px] border-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] text-[13px] transition"
          />
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className="p-6 bg-slate-50 text-center rounded-[10px] border border-slate-200 text-slate-500 text-[13px]">
            {t('wizard.noBanksFound')}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredOrganizations.map(org => {
            const isSelected = localSelectedId === org.id;
            return (
              <button
                key={org.id}
                onClick={() => {
                  setLocalSelectedId(org.id);
                  onSelect(org.id);
                }}
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
        )}
      </div>
    </div>
  );
};
