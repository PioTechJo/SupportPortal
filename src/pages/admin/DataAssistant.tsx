import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Database, Send, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  query_used?: string;
  error?: boolean;
}

export const DataAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedQueries, setExpandedQueries] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleQuery = (index: number) => {
    setExpandedQueries(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-data-assistant', {
        body: { question: userMessage, user_id: user?.id }
      });

      if (error) throw error;

      if (data?.error) {
        // Handled graceful error from Edge Function (e.g., query failed)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.error,
          error: true
        }]);
      } else if (data?.answer) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.answer,
          query_used: data.query_used
        }]);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      console.error('Data Assistant error:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'An unexpected error occurred while communicating with the server.',
        error: true
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
          Ask Your Data
        </h1>
        <p className="text-slate-500 mt-1">
          Ask natural language questions about tickets, SLAs, teams, and customers. The assistant will safely query the database and answer you.
        </p>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 opacity-70">
              <Database className="w-16 h-16 text-indigo-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">How can I help you analyze your data?</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Try asking questions like "How many open tickets are assigned to the BPM team?" or "Which customers have active maintenance contracts?"
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
                  
                  {msg.query_used && (
                    <div className="mt-2 w-full">
                      <button 
                        onClick={() => toggleQuery(idx)}
                        className="text-[12px] flex items-center gap-1 text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        {expandedQueries[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {expandedQueries[idx] ? 'Hide SQL Query' : 'View SQL Query'}
                      </button>
                      
                      {expandedQueries[idx] && (
                        <div className="mt-2 p-3 bg-slate-800 text-slate-300 text-[12px] font-mono rounded-lg overflow-x-auto whitespace-pre">
                          {msg.query_used}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="p-4 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-indigo-500" />
                <span className="text-sm font-medium">Analyzing database...</span>
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
              placeholder="Ask anything about your data..."
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
              Data Assistant is an AI tool and may occasionally misinterpret schemas. Always verify critical metrics.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
