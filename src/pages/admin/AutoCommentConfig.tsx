import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, Send, MessageSquareText } from 'lucide-react';

export const AutoCommentConfig: React.FC = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSetting = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auto_comment_enabled')
        .maybeSingle();
      if (data?.setting_value != null) setEnabled(data.setting_value !== 'false');
      setLoading(false);
    };
    fetchSetting();
  }, []);

  const handleToggle = async () => {
    const next = !enabled;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          { setting_key: 'auto_comment_enabled', setting_value: String(next), updated_at: new Date().toISOString() },
          { onConflict: 'setting_key' }
        );
      if (error) throw error;
      setEnabled(next);
      setMessage({ text: next ? 'Auto-comment turned ON' : 'Auto-comment turned OFF', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error toggling auto-comment:', err);
      setMessage({ text: 'Failed to update setting', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNow = async () => {
    setSendingTest(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('daily-ticket-update', { body: {} });
      if (error) throw error;
      setMessage({ text: data?.message || `Run complete — checked ${data?.totalChecked ?? 0} ticket(s).`, type: 'success' });
      setTimeout(() => setMessage(null), 5000);
    } catch (err) {
      console.error('Error triggering auto-comment run:', err);
      setMessage({ text: 'Failed to trigger the run', type: 'error' });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="animate-pulse h-32 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto h-[calc(100vh-60px)] overflow-y-auto">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <MessageSquareText size={22} className="text-[#f97316]" />
            Auto-Comment
          </h1>
          <p className="text-slate-500 mt-1">
            When a ticket sits with no support update for 24 hours, the portal automatically posts a status comment and notifies the customer.
          </p>
        </div>
        <button
          onClick={handleSendTestNow}
          disabled={sendingTest}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          {sendingTest ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" /> : <Send size={16} />}
          Run Now
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-700">Auto-Comment Status</div>
          <p className="text-xs text-slate-500 mt-1">Runs automatically every hour on the portal's schedule — this switch turns it on/off portal-wide.</p>
        </div>
        <button
          onClick={handleToggle}
          disabled={saving}
          role="switch"
          aria-checked={enabled}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-50 shrink-0 ${enabled ? 'bg-[#f97316]' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2 mt-6">
        <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          This checks tickets in New, Assigned, Support Action, Development Action, or Pending Customer status. Tickets already Resolved, Closed, or Approved are skipped.
        </p>
      </div>
    </div>
  );
};
