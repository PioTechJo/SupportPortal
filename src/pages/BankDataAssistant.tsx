import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

export const BankDataAssistant: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('bank-data-assistant', {
        body: { question: userMessage },
      });

      if (error) throw error;

      if (data?.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.error, error: true }]);
      } else if (data?.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      console.error('Bank Data Assistant error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('askYourData.unexpectedError'),
        error: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-60px)] flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Database className="w-7 h-7 text-indigo-500" />
          {t('askYourData.title')}
        </h1>
        <p className="text-slate-500 mt-1">
          {t('askYourData.subtitle')}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {[t('askYourData.exampleOpenCount'), t('askYourData.exampleOldestOpen')].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setInput(example)}
              className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-full transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
              <Database className="w-16 h-16 text-indigo-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">{t('askYourData.emptyTitle')}</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {t('askYourData.emptyExample')}
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : msg.error
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-tl-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.error && <AlertCircle className="w-4 h-4 mb-2 inline-block mr-1.5" />}
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="p-4 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
                <span className="text-sm font-medium">{t('askYourData.analyzing')}</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-200 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('askYourData.inputPlaceholder')}
              disabled={isLoading}
              className="w-full pl-4 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 text-[15px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[11px] text-slate-400">
              {t('askYourData.disclaimer')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
