import React, { useState, useEffect, useRef } from 'react';
import { Zap, X, Send, CheckCircle2, Mic, Square, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export const ExpressTicketButton: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<{ id: string; ticket_no?: string } | null>(null);
  const [voiceUploadFailed, setVoiceUploadFailed] = useState(false);
  const [expressEnabled, setExpressEnabled] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const roleUpper = (user?.role_code || '').toUpperCase();
  const isBankUser = ['BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN', 'CLIENT', 'CAB_USER'].includes(roleUpper);
  const customerId = user?.customer_id || user?.tenant_id;

  useEffect(() => {
    if (!isBankUser || !customerId) return;
    supabase
      .from('customers')
      .select('express_enabled')
      .eq('id', customerId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExpressEnabled(data.express_enabled !== false);
      });
  }, [isBankUser, customerId]);

  if (!user || !isBankUser || !expressEnabled) return null;

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setMicError(null);
  };

  const handleClose = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }
    setIsOpen(false);
    setIsRecording(false);
    setDescription('');
    setCreatedTicket(null);
    setVoiceUploadFailed(false);
    resetRecording();
  };

  const handleStartRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      setMicError(t('expressTicket.micError'));
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleReRecord = () => {
    resetRecording();
  };

  const handleSend = async () => {
    const customerId = user.customer_id || user.tenant_id;
    const trimmedDescription = description.trim();
    if ((!trimmedDescription && !audioBlob) || !customerId) return;

    setSubmitting(true);
    try {
      const ticket = await api.createExpressTicket({
        description: trimmedDescription || `🎤 ${t('expressTicket.voiceReportDescription')}`,
        customerId,
        createdBy: user.id,
      });

      if (audioBlob) {
        const filePath = `${ticket.id}/${Date.now()}_voice-report.webm`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, audioBlob, { contentType: 'audio/webm' });

        if (uploadError) {
          console.error('Failed to upload voice report:', uploadError);
          setVoiceUploadFailed(true);
        } else {
          const { error: attachError } = await supabase.from('ticket_attachments').insert({
            ticket_id: ticket.id,
            uploaded_by: user.id,
            file_name: 'voice-report.webm',
            file_path: filePath,
          });
          if (attachError) {
            console.error('Failed to record voice attachment:', attachError);
            setVoiceUploadFailed(true);
          }
        }
      }

      setCreatedTicket(ticket);
    } catch (err) {
      console.error('Failed to submit express ticket:', err);
      alert(t('expressTicket.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 rtl:right-auto rtl:left-6 z-40 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-3 rounded-full shadow-lg shadow-red-600/30 transition-transform hover:scale-105"
        title={t('expressTicket.reportNow')}
      >
        <Zap size={18} className="fill-current" />
        {t('expressTicket.reportUrgentIssue')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            {createdTicket ? (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">{t('expressTicket.received')}</h2>
                <p className="text-sm text-slate-500 mb-4">
                  {t('expressTicket.ticketCreatedPrefix')} <span className="font-semibold text-slate-700">{createdTicket.ticket_no || createdTicket.id.slice(0, 8).toUpperCase()}</span> {t('expressTicket.ticketCreatedSuffix')}
                </p>
                {voiceUploadFailed && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                    {t('expressTicket.voiceUploadFailed')}
                  </p>
                )}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {t('expressTicket.close')}
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/tickets/${createdTicket.id}`);
                      handleClose();
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('expressTicket.viewTicket')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Zap size={20} className="text-red-600" />
                    {t('expressTicket.reportUrgentIssue')}
                  </h2>
                  <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-sm text-slate-500">
                    {t('expressTicket.description')}
                  </p>
                  <textarea
                    autoFocus
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('expressTicket.placeholder')}
                    className="w-full h-28 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                  />

                  {micError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{micError}</p>
                  )}

                  {audioUrl ? (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <audio controls src={audioUrl} className="flex-1 h-9" />
                      <button
                        onClick={handleReRecord}
                        title={t('expressTicket.deleteRecording')}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                        isRecording
                          ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isRecording ? <Square size={16} className="fill-current" /> : <Mic size={16} />}
                      {isRecording ? t('expressTicket.stopRecording') : t('expressTicket.recordVoiceNote')}
                    </button>
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    {t('expressTicket.cancel')}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={submitting || isRecording || (!description.trim() && !audioBlob)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send size={16} />
                    )}
                    {t('expressTicket.sendNow')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
