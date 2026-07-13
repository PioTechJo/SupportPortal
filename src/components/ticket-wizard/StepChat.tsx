import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Bot, User, Send, ChevronRight, SkipForward, AlertCircle, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface StepChatProps {
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  onSkip: () => void;
  onNext: () => void;
  selectedProductId?: string;
}

export const StepChat: React.FC<StepChatProps> = ({
  chatHistory,
  setChatHistory,
  onSkip,
  onNext,
  selectedProductId
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(chatHistory.length > 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessage = "Hi! Tell me about the issue you're facing and I'll help clarify it before you submit your ticket.";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isStarted) {
      scrollToBottom();
    }
  }, [chatHistory, isStarted]);

  const handleStartChat = () => {
    if (chatHistory.length === 0) {
      setChatHistory([{ role: 'assistant', content: initialMessage }]);
    }
    setIsStarted(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const updatedHistory: Message[] = [...chatHistory, { role: 'user', content: userMessage }];
    setChatHistory(updatedHistory);
    setIsLoading(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('chat-assistant', {
        body: { messages: updatedHistory, product_id: selectedProductId }
      });

      if (invokeError) throw invokeError;
      
      if (data?.reply) {
        setChatHistory([...updatedHistory, { role: 'assistant', content: data.reply }]);
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setError('Assistant unavailable right now. You can skip or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 bg-[#fff5ee] text-[#f97316] rounded-full flex items-center justify-center mb-6">
          <Bot size={32} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Need help describing your issue?</h3>
        <p className="text-[14px] text-slate-500 mb-8 max-w-sm">
          Chat with our intelligent assistant to help articulate your technical issue clearly before submitting it to the support team.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleStartChat}
            className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-medium py-2.5 px-4 rounded-[8px] transition-colors flex items-center justify-center gap-2 text-[14px]"
          >
            Start Chat <ChevronRight size={18} />
          </button>
          <button
            onClick={onSkip}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 px-4 rounded-[8px] transition-colors flex items-center justify-center gap-2 text-[14px]"
          >
            Skip - I'll describe it myself <SkipForward size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-700 font-medium text-[15px]">
          <Bot className="text-[#f97316]" size={20} />
          AI Assistant
        </div>
        {chatHistory.length > 1 && (
          <button
            onClick={onNext}
            className="text-[13px] bg-green-50 text-green-700 hover:bg-green-100 font-medium py-1.5 px-3 rounded-[6px] transition-colors flex items-center gap-1.5 border border-green-200"
          >
            Done - Continue to ticket <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 rounded-[10px] border border-slate-200 p-4 space-y-4 mb-4">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-[#fff5ee] text-[#f97316]'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-3 rounded-[12px] text-[14px] leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-[#fff5ee] text-[#f97316] flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="p-3 bg-white border border-slate-200 text-slate-700 rounded-[12px] rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#f97316]" />
                <span className="text-[13px] text-slate-500 font-medium">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-[8px] flex items-start gap-2 mb-4 text-[13px] border border-red-100 shrink-0">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-medium block">{error}</span>
          </div>
          <button onClick={() => onSkip()} className="underline font-medium hover:text-red-700 whitespace-nowrap">
            Skip Step
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your issue..."
          disabled={isLoading}
          className="flex-1 border border-slate-300 rounded-[8px] px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:border-[#f97316] focus:ring-[#f97316]/20 disabled:bg-slate-50 transition-all"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-[#f97316] hover:bg-[#ea580c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white w-11 flex items-center justify-center rounded-[8px] transition-colors"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
