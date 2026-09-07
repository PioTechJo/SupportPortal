import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronRight, Users } from 'lucide-react';

interface StepFollowersProps {
  customerId: string;
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepFollowers: React.FC<StepFollowersProps> = ({ customerId, selectedUserIds, onChange, onNext, onBack }) => {
  const { t } = useTranslation();
  const [bankUsers, setBankUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    const fetchUsers = async () => {
      setLoading(true);
      // Regular clients can't SELECT other users directly (RLS) - the app's
      // existing user-listing pages all go through this admin-only edge
      // function instead, so we do the same here.
      const { data, error } = await supabase.functions.invoke('get-users-admin');
      if (!error && data?.data) {
        const bankOnly = (data.data as any[])
          .filter(u => u.customer_id === customerId || u.tenant_id === customerId)
          .sort((a, b) => (a.full_name || a.name || '').localeCompare(b.full_name || b.name || ''));
        setBankUsers(bankOnly);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [customerId]);

  const toggleUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      onChange(selectedUserIds.filter(u => u !== id));
    } else {
      onChange([...selectedUserIds, id]);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-[18px] font-medium text-slate-800">{t('wizard.followersTitle')}</h3>
          <p className="text-[13px] text-slate-500 mt-1">{t('wizard.followersSubtitle')}</p>
        </div>

        {loading ? (
          <div className="p-8 text-center animate-pulse text-slate-500 font-medium text-[14px]">{t('wizard.loadingOrganizations')}</div>
        ) : bankUsers.length === 0 ? (
          <div className="p-6 bg-slate-50 text-center rounded-[10px] border border-slate-200 text-slate-500 text-[13px]">
            {t('wizard.noBankUsersFound')}
          </div>
        ) : (
          <div className="space-y-2">
            {bankUsers.map(u => {
              const isSelected = selectedUserIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-[10px] border-[0.5px] text-start transition-colors ${
                    isSelected
                      ? 'bg-[#fff5ee] border-[#f97316]'
                      : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#f97316] border-[#f97316]' : 'border-slate-300'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                  </div>
                  <Users size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <div className="font-medium text-[13px] text-slate-900">{u.full_name || u.name}</div>
                    <div className="text-[12px] text-slate-500">{u.email}</div>
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
          onClick={onNext}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-[14px] py-2 px-4 rounded-[8px] transition-colors flex items-center gap-2"
        >
          {t('wizard.next')} <ChevronRight className="rtl:rotate-180" size={16} />
        </button>
      </div>
    </div>
  );
};
