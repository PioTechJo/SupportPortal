import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, AlertCircle, Send } from 'lucide-react';

export const DailyReportConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // The daily report sends two separate emails - every pending ticket to
  // "allRecipients", and only Support-team-assigned pending tickets to
  // "supportRecipients" - each with its own recipient list.
  const [allRecipients, setAllRecipients] = useState('');
  const [supportRecipients, setSupportRecipients] = useState('');
  // Displayed and edited in Amman time (UTC+3); converted to UTC before saving.
  const [hourAmman, setHourAmman] = useState(8);
  const [minute, setMinute] = useState(0);
  // Cron day-of-week numbers: 0=Sun..6=Sat. All selected by default.
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const [{ data }, { data: scheduleData }] = await Promise.all([
        supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['daily_report_all_recipients', 'daily_report_support_recipients']),
        supabase.rpc('get_daily_report_schedule'),
      ]);
      (data || []).forEach((row: any) => {
        if (row.setting_key === 'daily_report_all_recipients') setAllRecipients(row.setting_value || '');
        if (row.setting_key === 'daily_report_support_recipients') setSupportRecipients(row.setting_value || '');
      });
      if (scheduleData) {
        setHourAmman((scheduleData.hour_utc + 3) % 24);
        setMinute(scheduleData.minute);
        if (scheduleData.days && scheduleData.days !== '*') {
          setDays(scheduleData.days.split(',').map((d: string) => parseInt(d, 10)).filter((d: number) => !isNaN(d)));
        } else {
          setDays([0, 1, 2, 3, 4, 5, 6]);
        }
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSaveRecipients = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const cleanList = (value: string) => value.split(',').map(e => e.trim()).filter(Boolean).join(', ');
      const cleanedAll = cleanList(allRecipients);
      const cleanedSupport = cleanList(supportRecipients);

      const { error } = await supabase
        .from('system_settings')
        .upsert([
          { setting_key: 'daily_report_all_recipients', setting_value: cleanedAll, updated_at: new Date().toISOString() },
          { setting_key: 'daily_report_support_recipients', setting_value: cleanedSupport, updated_at: new Date().toISOString() },
        ], { onConflict: 'setting_key' });
      if (error) throw error;

      setAllRecipients(cleanedAll);
      setSupportRecipients(cleanedSupport);
      setMessage({ text: 'Recipients saved successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving daily report recipients:', err);
      setMessage({ text: 'Failed to save recipients', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    setDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  const handleSaveSchedule = async () => {
    if (days.length === 0) {
      setMessage({ text: 'Select at least one day', type: 'error' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const hourUtc = (hourAmman - 3 + 24) % 24;
      const pDays = days.length === 7 ? '*' : days.join(',');
      const { error } = await supabase.rpc('set_daily_report_schedule', {
        p_hour_utc: hourUtc,
        p_minute_utc: minute,
        p_days: pDays,
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">All Tickets Report — Recipients</label>
          <p className="text-xs text-slate-500 mb-2">Gets every pending ticket regardless of assignee. Comma-separated email addresses.</p>
          <textarea
            value={allRecipients}
            onChange={(e) => setAllRecipients(e.target.value)}
            rows={2}
            placeholder="leen.aloraidi@pio-tech.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Support Team Report — Recipients</label>
          <p className="text-xs text-slate-500 mb-2">Gets only pending tickets assigned to a Support team member. Comma-separated email addresses.</p>
          <textarea
            value={supportRecipients}
            onChange={(e) => setSupportRecipients(e.target.value)}
            rows={2}
            placeholder="support@pio-tech.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
          />
        </div>
        <div className="flex justify-end">
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

        <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Send on These Days</label>
        <div className="flex flex-wrap gap-2 mb-4">
          {DAY_LABELS.map((label, day) => (
            <label
              key={day}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                days.includes(day) ? 'bg-orange-50 border-[#f97316] text-slate-800' : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              <input
                type="checkbox"
                checked={days.includes(day)}
                onChange={() => toggleDay(day)}
                className="rounded border-slate-300 text-[#f97316] focus:ring-[#f97316]"
              />
              {label}
            </label>
          ))}
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
