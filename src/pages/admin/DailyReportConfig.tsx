import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, Send } from 'lucide-react';

export const DailyReportConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [recipients, setRecipients] = useState('');
  // Displayed and edited in Amman time (UTC+3); converted to UTC before saving.
  const [hourAmman, setHourAmman] = useState(8);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'daily_report_recipients')
        .maybeSingle();
      if (data?.setting_value) setRecipients(data.setting_value);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSaveRecipients = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const cleaned = recipients
        .split(',')
        .map(e => e.trim())
        .filter(Boolean)
        .join(', ');

      const { error } = await supabase
        .from('system_settings')
        .upsert({ setting_key: 'daily_report_recipients', setting_value: cleaned, updated_at: new Date().toISOString() }, { onConflict: 'setting_key' });
      if (error) throw error;

      setRecipients(cleaned);
      setMessage({ text: 'Recipients saved successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving daily report recipients:', err);
      setMessage({ text: 'Failed to save recipients', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const hourUtc = (hourAmman - 3 + 24) % 24;
      const { error } = await supabase.rpc('set_daily_report_schedule', {
        p_hour_utc: hourUtc,
        p_minute_utc: minute,
      });
      if (error) throw error;

      setMessage({ text: 'Schedule updated successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving daily report schedule:', err);
      setMessage({ text: 'Failed to update schedule', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNow = async () => {
    setSendingTest(true);
    setMessage(null);
    try {
      const { error } = await supabase.functions.invoke('daily-report', { body: {} });
      if (error) throw error;
      setMessage({ text: 'Test report sent — check the recipients\' inbox and Email Logs.', type: 'success' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error triggering test daily report:', err);
      setMessage({ text: 'Failed to trigger the report', type: 'error' });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="animate-pulse h-48 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto h-[calc(100vh-60px)] overflow-y-auto">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Ticket Report</h1>
          <p className="text-slate-500 mt-1">Configure who receives the automated daily summary, and when it's sent.</p>
        </div>
        <button
          onClick={handleSendTestNow}
          disabled={sendingTest}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {sendingTest ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" /> : <Send size={16} />}
          Send Test Now
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Recipients</label>
        <p className="text-xs text-slate-500 mb-2">Comma-separated email addresses.</p>
        <textarea
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          rows={3}
          placeholder="admin@pio-tech.com, manager@pio-tech.com"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSaveRecipients}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
            Save Recipients
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Send Time (Amman time)</label>
        <div className="flex items-center gap-2 mb-3">
          <select
            value={hourAmman}
            onChange={(e) => setHourAmman(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-slate-400">:</span>
          <select
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
          >
            {[0, 15, 30, 45].map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
            Save Schedule
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2 mt-4">
          <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            The wording of the report itself (subject/body) can be edited from Email Templates → "Daily Report → Recipients".
          </p>
        </div>
      </div>
    </div>
  );
};
