import React, { useMemo } from 'react';
import { ArrowRight, ArrowLeft, MessageSquareCode } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

interface Step4QuestionsProps {
  productId: string;
  moduleId: string;
  issueId: string;
  answers: Record<string, any>;
  onAnswerChange: (questionId: string, value: any) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step4Questions: React.FC<Step4QuestionsProps> = ({ 
  productId,
  moduleId,
  issueId,
  answers, 
  onAnswerChange, 
  onNext,
  onBack
}) => {
  const questions = useMemo(() => {
    const configKey = `${productId}_${moduleId}_${issueId}`;
    const dynamicQuestions = (wizardConfig.dynamicQuestions as any)[configKey];
    const defaultQuestions = (wizardConfig.dynamicQuestions as any)["default"];
    return dynamicQuestions || defaultQuestions;
  }, [productId, moduleId, issueId]);

  const isFormValid = useMemo(() => {
    return questions.every((q: any) => {
      if (!q.required) return true;
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== null && val.trim?.() !== '';
    });
  }, [questions, answers]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tell us more about the issue</h2>
        <p className="text-slate-500 font-medium">Please answer these diagnostic questions.</p>
      </div>

      <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <MessageSquareCode size={20} />
          </div>
          <h3 className="font-bold text-slate-800">Diagnostic Details</h3>
        </div>

        {questions.map((q: any) => (
          <div key={q.id} className="space-y-2">
            <label className="block text-sm font-bold text-slate-700">
              {q.label} {q.required && <span className="text-red-500">*</span>}
            </label>
            
            {q.type === 'text' && (
              <input 
                type="text" 
                value={answers[q.id] || ''}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                placeholder="Type your answer..."
              />
            )}

            {q.type === 'textarea' && (
              <textarea 
                value={answers[q.id] || ''}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
                placeholder="Provide detailed description..."
              />
            )}

            {q.type === 'dropdown' && (
              <select
                value={answers[q.id] || ''}
                onChange={(e) => onAnswerChange(q.id, e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors appearance-none"
              >
                <option value="" disabled>Select an option...</option>
                {q.options?.map((opt: string) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {q.type === 'radio' && (
              <div className="space-y-2">
                {q.options?.map((opt: string) => (
                  <label key={opt} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input 
                      type="radio" 
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={(e) => onAnswerChange(q.id, e.target.value)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-sm font-medium text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'checkbox' && (
              <div className="space-y-2">
                {q.options?.map((opt: string) => {
                  const currentAnswers = answers[q.id] || [];
                  return (
                    <label key={opt} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        value={opt}
                        checked={currentAnswers.includes(opt)}
                        onChange={(e) => {
                          const val = e.target.value;
                          let newAnswers = [...currentAnswers];
                          if (e.target.checked) {
                            newAnswers.push(val);
                          } else {
                            newAnswers = newAnswers.filter((a: string) => a !== val);
                          }
                          onAnswerChange(q.id, newAnswers);
                        }}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-slate-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
        <button 
          onClick={onBack}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onNext}
          disabled={!isFormValid}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
