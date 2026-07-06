import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Package, ChevronRight } from 'lucide-react';

interface Step3QuestionsProps {
  categoryId: string;
  productName?: string;
  categoryName?: string;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onBack: () => void;
  onNext: () => void;
}

export const Step3Questions: React.FC<Step3QuestionsProps> = ({ 
  categoryId, productName, categoryName, answers, setAnswers, onBack, onNext 
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('ai_diagnostic_questions')
        .select(`
          *,
          ai_question_options (*)
        `)
        .eq('category_id', categoryId)
        .order('display_order');
        
      if (!error && data) {
        setQuestions(data);
      }
      setLoading(false);
    };
    fetchQuestions();
  }, [categoryId]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500 font-medium text-[14px]">Loading diagnostic questions...</div>;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1 space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-[8px] mb-4">
            <Package size={14} className="text-slate-500" />
            <span className="text-[12px] font-medium text-slate-700">{productName || 'Product'}</span>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-[12px] font-medium text-slate-700">{categoryName || 'Category'}</span>
          </div>
          <h3 className="text-[18px] font-medium text-slate-800">{categoryName || 'Diagnostic Questions'}</h3>
          <p className="text-[13px] text-slate-500 mt-1">Please answer these questions to help us diagnose the issue.</p>
        </div>

        {questions.length > 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-5 space-y-5">
            {questions.map(q => (
              <div key={q.id} className="space-y-3">
                <label className="block text-[13px] font-medium text-slate-700">{q.question_text}</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.ai_question_options?.map((opt: any) => {
                    const isSelected = answers[q.id] === opt.option_value;
                    return (
                      <label 
                        key={opt.id} 
                        className={`flex items-center gap-3 p-3 border-[0.5px] rounded-[10px] cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#fff5ee] border-[#f97316]' : 'bg-white border-slate-200 hover:border-[#f97316]/50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={q.id}
                          value={opt.option_value}
                          checked={isSelected}
                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                          className="text-[#f97316] focus:ring-[#f97316]"
                        />
                        <span className="text-[13px] font-medium text-slate-700">{opt.option_label || opt.option_value}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 font-medium text-[14px] bg-slate-50 border border-slate-200 rounded-[10px]">
            No diagnostic questions for this category. You can proceed to the next step.
          </div>
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-slate-200 flex justify-between items-center shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 border-[0.5px] border-slate-200 rounded-[8px] text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          onClick={onNext} 
          className="bg-[#f97316] hover:bg-[#ea580c] text-white font-medium text-[14px] py-2 px-4 rounded-[8px] transition-colors flex items-center gap-2"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
