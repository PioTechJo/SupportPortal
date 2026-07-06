import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { OptionModal } from './OptionModal';

interface OptionsPanelProps {
  questionId: string | null;
  questionType: string | null;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ questionId, questionType }) => {
  const [options, setOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [optionToEdit, setOptionToEdit] = useState<any>(null);

  const fetchOptions = async () => {
    if (!questionId || questionType === 'text') return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_question_options')
      .select('*')
      .eq('question_id', questionId)
      .order('display_order');
      
    if (!error && data) {
      setOptions(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptions();
  }, [questionId, questionType]);

  const handleDelete = async (option: any) => {
    // Options don't have children in our schema, so we can just delete
    // However, if we wanted to be super safe about recommendation_rules, we could check if this option is used in a rule.
    // For now, we allow deletion.
    if (!window.confirm(`Delete option "${option.option_label}"?`)) return;

    await supabase.from('ai_question_options').delete().eq('id', option.id);
    fetchOptions();
  };

  const openNew = () => {
    setOptionToEdit(null);
    setIsEditing(true);
  };

  const openEdit = (e: React.MouseEvent, option: any) => {
    e.stopPropagation();
    setOptionToEdit(option);
    setIsEditing(true);
  };

  const handleSaved = () => {
    setIsEditing(false);
    fetchOptions();
  };

  if (questionType === 'text') {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h3 className="font-semibold text-slate-700">Text Input Question</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-xs">
          Free text questions do not require predefined options. The user will simply type their answer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">3</span>
          Options
        </h3>
        {questionId && questionType === 'single_choice' && (
          <button onClick={openNew} className="text-amber-600 hover:text-amber-800 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {!questionId ? (
          <div className="p-4 text-center text-sm text-slate-500">Select a question to view options.</div>
        ) : loading ? (
          <div className="p-4 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
        ) : options.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">No options found. Add some to make the dropdown work!</div>
        ) : (
          options.map(opt => (
            <div 
              key={opt.id}
              className="p-3 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50 transition flex justify-between items-center group"
            >
              <div className="flex-1">
                <div className="font-medium text-sm text-slate-700">
                  {opt.option_label}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">Val: {opt.option_value}</span>
                  <span>Order: {opt.display_order}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => openEdit(e, opt)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(opt); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isEditing && (
        <OptionModal
          questionId={questionId!}
          option={optionToEdit}
          onClose={() => setIsEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
