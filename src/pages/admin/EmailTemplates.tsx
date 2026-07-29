import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Save, GripVertical, AlertCircle } from 'lucide-react';

interface EmailTemplateRow {
  id: string;
  trigger_key: string;
  trigger_label: string;
  available_variables: { key: string; label: string }[];
  subject_template: string;
  body_template: string;
}

export const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocusedField = useRef<'subject' | 'body'>('body');

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('trigger_label');
      if (!error && data) {
        setTemplates(data as EmailTemplateRow[]);
        if (data.length > 0) {
          setSelectedKey(data[0].trigger_key);
          setSubject(data[0].subject_template);
          setBody(data[0].body_template);
        }
      }
      setLoading(false);
    };
    fetchTemplates();
  }, []);

  const selectedTemplate = templates.find(t => t.trigger_key === selectedKey);

  const handleSelectTrigger = (key: string) => {
    const tpl = templates.find(t => t.trigger_key === key);
    if (!tpl) return;
    setSelectedKey(key);
    setSubject(tpl.subject_template);
    setBody(tpl.body_template);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ subject_template: subject, body_template: body, updated_at: new Date().toISOString() })
        .eq('trigger_key', selectedTemplate.trigger_key);
      if (error) throw error;

      setTemplates(prev => prev.map(t =>
        t.trigger_key === selectedTemplate.trigger_key
          ? { ...t, subject_template: subject, body_template: body }
          : t
      ));
      setMessage({ text: 'Template saved successfully', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error saving email template:', err);
      setMessage({ text: 'Failed to save template', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Insert a {{variable}} token at the last known cursor position in whichever
  // field (subject/body) was last focused. Used both by drag-drop and click-to-insert.
  const insertVariable = (key: string) => {
    const token = `{{${key}}}`;
    if (lastFocusedField.current === 'subject' && subjectRef.current) {
      const el = subjectRef.current;
      const start = el.selectionStart ?? subject.length;
      const end = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    } else if (bodyRef.current) {
      const el = bodyRef.current;
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    }
  };

  const handleDrop = (field: 'subject' | 'body') => (e: React.DragEvent) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain');
    if (!key) return;
    lastFocusedField.current = field;
    insertVariable(key);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="animate-pulse h-64 bg-slate-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto h-[calc(100vh-60px)] overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Mail size={22} className="text-[#f97316]" />
          Email Templates
        </h1>
        <p className="text-slate-500 mt-1">
          Choose which notification to edit, then drag a variable chip into the subject or body where you want it inserted.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Trigger list */}
        <div className="md:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Trigger Point
          </div>
          <div className="flex flex-col">
            {templates.map(tpl => (
              <button
                key={tpl.trigger_key}
                onClick={() => handleSelectTrigger(tpl.trigger_key)}
                className={`text-left px-4 py-3 text-sm border-l-2 transition-colors ${
                  selectedKey === tpl.trigger_key
                    ? 'bg-orange-50 border-[#f97316] text-slate-900 font-medium'
                    : 'border-transparent text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tpl.trigger_label}
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          {message && (
            <div className={`p-3 rounded-lg text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {!selectedTemplate ? (
            <p className="text-slate-400 text-sm">Select a trigger point on the left.</p>
          ) : (
            <>
              {/* Variable chips */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Drag a variable into Subject or Body
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.available_variables.map(v => (
                    <div
                      key={v.key}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', v.key)}
                      onClick={() => insertVariable(v.key)}
                      title="Drag into a field, or click to insert at your last cursor position"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-medium cursor-grab active:cursor-grabbing hover:bg-indigo-100 transition-colors select-none"
                    >
                      <GripVertical size={12} className="text-indigo-400" />
                      {v.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                <input
                  ref={subjectRef}
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  onFocus={() => { lastFocusedField.current = 'subject'; }}
                  onClick={() => { lastFocusedField.current = 'subject'; }}
                  onKeyUp={() => { lastFocusedField.current = 'subject'; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop('subject')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-[#f97316] focus:border-[#f97316]"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Body</label>
                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={() => { lastFocusedField.current = 'body'; }}
                  onClick={() => { lastFocusedField.current = 'body'; }}
                  onKeyUp={() => { lastFocusedField.current = 'body'; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop('body')}
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-[#f97316] focus:border-[#f97316] resize-y"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex gap-2">
                <AlertCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Only the variables listed above are filled in for this notification — any other <code>{'{{variable}}'}</code> text will be left blank when the email is sent.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
