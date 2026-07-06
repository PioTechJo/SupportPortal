import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { QuestionModal } from './QuestionModal';

interface QuestionsPanelProps {
  categoryId: string | null;
  selectedQuestionId: string | null;
  onSelectQuestion: (id: string, type: string) => void;
}

export const QuestionsPanel: React.FC<QuestionsPanelProps> = ({ categoryId, selectedQuestionId, onSelectQuestion }) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState<any>(null);

  const fetchQuestions = async () => {
    if (!categoryId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_diagnostic_questions')
      .select('*, ai_question_options(count)')
      .eq('category_id', categoryId)
      .order('display_order');
      
    if (!error && data) {
      setQuestions(data);
      if (data.length > 0 && !selectedQuestionId) {
        onSelectQuestion(data[0].id, data[0].question_type);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [categoryId]);

  const handleDelete = async (question: any) => {
    // Block Strategy: check for children
    if (question.ai_question_options[0].count > 0) {
      alert(`Cannot delete this question. It contains ${question.ai_question_options[0].count} options. Please delete the options first.`);
      return;
    }

    if (!window.confirm(`Delete question "${question.question_text}"?`)) return;

    await supabase.from('ai_diagnostic_questions').delete().eq('id', question.id);
    if (selectedQuestionId === question.id) {
      onSelectQuestion('', '');
    }
    fetchQuestions();
  };

  const openNew = () => {
    setQuestionToEdit(null);
    setIsEditing(true);
  };

  const openEdit = (e: React.MouseEvent, question: any) => {
    e.stopPropagation();
    setQuestionToEdit(question);
    setIsEditing(true);
  };

  const handleSaved = () => {
    setIsEditing(false);
    fetchQuestions();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
          Questions
        </h3>
        {categoryId && (
          <button onClick={openNew} className="text-blue-600 hover:text-blue-800 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {!categoryId ? (
          <div className="p-4 text-center text-sm text-slate-500">Select a category to view questions.</div>
        ) : loading ? (
          <div className="p-4 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">No questions found.</div>
        ) : (
          questions.map(q => (
            <div 
              key={q.id}
              onClick={() => onSelectQuestion(q.id, q.question_type)}
              className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-start group ${
                selectedQuestionId === q.id 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex-1 pr-2">
                <div className={`font-medium text-sm leading-snug ${selectedQuestionId === q.id ? 'text-blue-900' : 'text-slate-700'}`}>
                  {q.question_text}
                </div>
                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase text-[10px] font-bold">
                    {q.question_type === 'single_choice' ? 'Choice' : 'Text'}
                  </span>
                  <span>Order: {q.display_order}</span>
                  {q.question_type === 'single_choice' && (
                    <>
                      <span>•</span>
                      <span>{q.ai_question_options[0]?.count || 0} options</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`flex gap-1 ${selectedQuestionId === q.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <button onClick={(e) => openEdit(e, q)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(q); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isEditing && (
        <QuestionModal
          categoryId={categoryId!}
          question={questionToEdit}
          onClose={() => setIsEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
