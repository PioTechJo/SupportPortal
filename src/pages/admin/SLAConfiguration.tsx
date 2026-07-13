import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle } from 'lucide-react';

export const SLAConfiguration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const [slaValues, setSlaValues] = useState({
    sla_days_critical: 1,
    sla_days_urgent: 2,
    sla_days_high: 3,
    sla_days_medium: 5,
    sla_days_low: 7
  });

  useEffect(() => {
    const fetchSlaSettings = async () => {
      setLoading(true);
      try {
        const keys = [
          'sla_days_critical',
          'sla_days_urgent',
          'sla_days_high',
          'sla_days_medium',
          'sla_days_low'
        ];
        
        const { data, error } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', keys);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const newValues = { ...slaValues };
          data.forEach(item => {
            if (item.setting_key in newValues) {
              const val = parseInt(item.setting_value, 10);
              if (!isNaN(val)) {
                newValues[item.setting_key as keyof typeof slaValues] = val;
              }
            }
          });
          setSlaValues(newValues);
        }
      } catch (err) {
        console.error('Error fetching SLA settings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSlaSettings();
  }, []);

  const handleChange = (key: keyof typeof slaValues, value: string) => {
    const num = parseInt(value, 10);
    setSlaValues(prev => ({
      ...prev,
      [key]: isNaN(num) ? '' : Math.max(1, num) // Ensure minimum is 1
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updates = Object.entries(slaValues).map(([key, value]) => ({
        setting_key: key,
        setting_value: value.toString(),
        updated_at: new Date().toISOString()
      }));

      // Upsert all settings at once
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'setting_key' });
        
      if (error) throw error;
      
      setMessage({ text: 'Saved successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving SLA settings:', err);
      setMessage({ text: 'Failed to save changes', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const slaInputs = [
    { key: 'sla_days_critical', label: 'Critical Priority SLA' },
    { key: 'sla_days_urgent', label: 'Urgent Priority SLA' },
    { key: 'sla_days_high', label: 'High Priority SLA' },
    { key: 'sla_days_medium', label: 'Medium Priority SLA' },
    { key: 'sla_days_low', label: 'Low Priority SLA' },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse flex flex-col gap-4 max-w-2xl">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="mt-8 space-y-6">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-10 bg-slate-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-60px)] overflow-y-auto">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SLA Configuration</h1>
          <p className="text-slate-500 mt-1">Manage the Service Level Agreement (SLA) duration for each ticket priority.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-6">
          {slaInputs.map(({ key, label }) => (
            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 last:border-0 pb-6 last:pb-0">
              <div className="mb-2 sm:mb-0">
                <label className="text-sm font-semibold text-slate-700">{label}</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={slaValues[key as keyof typeof slaValues]}
                  onChange={(e) => handleChange(key as keyof typeof slaValues, e.target.value)}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
                />
                <span className="text-sm text-slate-500">days</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
          <AlertCircle size={18} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 leading-relaxed">
            <strong>Note:</strong> Any modifications to these SLA values will only apply to newly created tickets, or tickets that are manually reassigned a priority. Existing tickets will retain their original SLA due dates.
          </p>
        </div>
      </div>
    </div>
  );
};
