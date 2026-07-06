import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface ConditionRow {
  questionId: string;
  expectedValue: string;
}

interface ConditionBuilderProps {
  categoryId: string;
  conditions: ConditionRow[];
  onChange: (conditions: ConditionRow[]) => void;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  ai_question_options: { id: string; option_value: string }[];
}

export const ConditionBuilder: React.FC<ConditionBuilderProps> = ({ categoryId, conditions, onChange }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_diagnostic_questions')
        .select(`
          *,
          ai_question_options (id, option_value)
        `)
        .eq('category_id', categoryId)
        .order('display_order');
      
      if (!error && data) {
        setQuestions(data as unknown as Question[]);
      }
      setLoading(false);
    };

    if (categoryId) {
      fetchQuestions();
    } else {
      setQuestions([]);
      setLoading(false);
    }
  }, [categoryId]);

  const addRow = () => {
    onChange([...conditions, { questionId: '', expectedValue: '' }]);
  };

  const removeRow = (index: number) => {
    const updated = [...conditions];
    updated.splice(index, 1);
    onChange(updated);
  };

  const updateRow = (index: number, field: keyof ConditionRow, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset expected value if question changes
    if (field === 'questionId') {
      updated[index].expectedValue = '';
    }
    
    onChange(updated);
  };

  if (loading) return <div className="text-sm text-slate-500 animate-pulse">Loading conditions...</div>;
  if (questions.length === 0) return <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">This category has no diagnostic questions configured. You cannot build rules for it yet.</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-semibold text-slate-700">Match Conditions (AND logic)</label>
      </div>
      
      {conditions.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-sm">
          No conditions defined. This rule will never match.
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((row, index) => {
            const selectedQ = questions.find(q => q.id === row.questionId);
            
            return (
              <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex-1 space-y-2">
                  <select
                    value={row.questionId}
                    onChange={(e) => updateRow(index, 'questionId', e.target.value)}
                    className="w-full text-sm rounded-md border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                  >
                    <option value="">-- Select Question --</option>
                    {questions.map(q => (
                      <option key={q.id} value={q.id}>{q.question_text}</option>
                    ))}
                  </select>
                  
                  {selectedQ && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-mono text-slate-400">equals = </span>
                      {selectedQ.question_type === 'single_choice' || selectedQ.question_type === 'radio' || selectedQ.question_type === 'select' ? (
                        <select
                          value={row.expectedValue}
                          onChange={(e) => updateRow(index, 'expectedValue', e.target.value)}
                          className="flex-1 text-sm rounded-md border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        >
                          <option value="">-- Select expected answer --</option>
                          {selectedQ.ai_question_options?.map(opt => (
                            <option key={opt.id} value={opt.option_value}>{opt.option_value}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row.expectedValue}
                          onChange={(e) => updateRow(index, 'expectedValue', e.target.value)}
                          placeholder="Type expected text match..."
                          className="flex-1 text-sm rounded-md border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        />
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                  title="Remove condition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <button
        type="button"
        onClick={addRow}
        className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Condition
      </button>
    </div>
  );
};
