import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface QuestionModalProps {
  categoryId: string;
  question?: any;
  onClose: () => void;
  onSaved: () => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({ categoryId, question, onClose, onSaved }) => {
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState('single_choice');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [newOptions, setNewOptions] = useState<{text: string, point_value: number}[]>([]);
  const [optionInput, setOptionInput] = useState('');
  const [optionPointValue, setOptionPointValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text);
      setQuestionType(question.question_type);
      setDisplayOrder(question.display_order);
    }
  }, [question]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        category_id: categoryId,
        question_text: questionText,
        question_type: questionType,
        display_order: displayOrder
      };

      if (question) {
        const { error: updateError } = await supabase
          .from('ai_diagnostic_questions')
          .update(payload)
          .eq('id', question.id);
        if (updateError) throw updateError;
      } else {
        const { data: insertedQuestion, error: insertError } = await supabase
          .from('ai_diagnostic_questions')
          .insert(payload)
          .select()
          .single();
        if (insertError) throw insertError;

        if (questionType === 'single_choice' && newOptions.length > 0) {
          const optionsPayload = newOptions.map((opt, idx) => ({
            question_id: insertedQuestion.id,
            option_label: opt.text,
            option_value: opt.text,
            display_order: idx,
            point_value: opt.point_value
          }));
          const { error: optError } = await supabase
            .from('ai_question_options')
            .insert(optionsPayload);
          if (optError) throw optError;
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save question");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddOption = () => {
    if (optionInput.trim()) {
      setNewOptions([...newOptions, { text: optionInput.trim(), point_value: optionPointValue }]);
      setOptionInput('');
      setOptionPointValue(0);
    }
  };

  const handleRemoveOption = (idx: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[10px] shadow-sm border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">{question ? 'Edit Question' : 'New Question'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-700 text-[13px] rounded-[8px] border border-red-200">{error}</div>}
          
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Question Text *</label>
            <input
              required
              type="text"
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="w-full rounded-[8px] border-slate-200 focus:border-[#f97316] focus:ring-[#f97316] text-[14px] shadow-sm py-2 px-3"
              placeholder="e.g. Is the issue intermittent?"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Question Type *</label>
            <select
              required
              value={questionType}
              onChange={e => setQuestionType(e.target.value)}
              className="w-full rounded-[8px] border-slate-200 focus:border-[#f97316] focus:ring-[#f97316] text-[14px] shadow-sm py-2 px-3"
              disabled={!!question}
            >
              <option value="single_choice">Single Choice (Dropdown/Radio)</option>
            </select>
          </div>

          {/* Inline Options Builder for New Single Choice Questions */}
          {!question && questionType === 'single_choice' && (
            <div className="bg-slate-50 rounded-[8px] border border-slate-200 p-4 space-y-3">
              <label className="block text-[13px] font-medium text-slate-700">Answer Options</label>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  className="flex-1 rounded-[8px] border-slate-200 focus:border-[#f97316] focus:ring-[#f97316] text-[13px] shadow-sm py-1.5 px-3"
                  placeholder="e.g. Yes"
                />
                <select
                  value={optionPointValue}
                  onChange={e => setOptionPointValue(parseInt(e.target.value))}
                  className="rounded-[8px] border-slate-200 focus:border-[#f97316] focus:ring-[#f97316] text-[13px] shadow-sm py-1.5 px-2"
                >
                  <option value={0}>Low (0)</option>
                  <option value={5}>Medium (5)</option>
                  <option value={10}>High (10)</option>
                </select>
                <button 
                  type="button" 
                  onClick={handleAddOption}
                  disabled={!optionInput.trim()}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[13px] font-medium rounded-[8px] disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {newOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
                      <span className="text-[13px] text-slate-700">{opt.text}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${opt.point_value >= 10 ? 'bg-red-100 text-red-700' : opt.point_value === 5 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {opt.point_value || 0} pts
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-red-500 flex items-center justify-center rounded-sm ml-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Display Order *</label>
            <input
              required
              type="number"
              value={displayOrder}
              onChange={e => setDisplayOrder(parseInt(e.target.value))}
              className="w-full rounded-[8px] border-slate-200 focus:border-[#f97316] focus:ring-[#f97316] text-[14px] shadow-sm py-2 px-3"
            />
          </div>

          <div className="pt-5 border-t border-slate-200 flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[14px] font-medium text-slate-600 hover:bg-slate-100 border border-transparent rounded-[8px] transition-colors">Cancel</button>
            <button type="submit" disabled={isSaving || (!question && questionType === 'single_choice' && newOptions.length === 0)} className="px-5 py-2 text-[14px] font-medium text-white bg-[#f97316] hover:bg-[#ea580c] rounded-[8px] disabled:opacity-50 transition-colors flex items-center gap-2">
              {isSaving ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
