import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ConditionBuilder, ConditionRow } from './ConditionBuilder';

interface RuleEditorProps {
  categoryId: string;
  ruleToEdit?: any; // null if creating
  onClose: () => void;
  onSaved: () => void;
}

export const RuleEditor: React.FC<RuleEditorProps> = ({ categoryId, ruleToEdit, onClose, onSaved }) => {
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [recommendationText, setRecommendationText] = useState('');
  const [rootCauseText, setRootCauseText] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number>(50);
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ruleToEdit) {
      setRecommendationText(ruleToEdit.recommendation_text || '');
      setRootCauseText(ruleToEdit.root_cause_text || '');
      setConfidenceScore(ruleToEdit.confidence_score || 50);
      
      // Parse match_criteria back into rows
      if (ruleToEdit.match_criteria) {
        const rows = Object.entries(ruleToEdit.match_criteria).map(([qId, val]) => ({
          questionId: qId,
          expectedValue: String(val)
        }));
        setConditions(rows);
      }
    }
  }, [ruleToEdit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate
    const validConditions = conditions.filter(c => c.questionId && c.expectedValue);
    if (validConditions.length === 0) {
      setError("Please add at least one complete condition.");
      return;
    }
    
    setIsSaving(true);
    
    // Build JSONB object
    const matchCriteria = validConditions.reduce((acc, row) => {
      acc[row.questionId] = row.expectedValue;
      return acc;
    }, {} as Record<string, string>);
    
    const payload = {
      category_id: categoryId,
      match_criteria: matchCriteria,
      recommendation_text: recommendationText,
      root_cause_text: rootCauseText,
      confidence_score: confidenceScore
    };
    
    try {
      if (ruleToEdit) {
        const { error: updateError } = await supabase
          .from('recommendation_rules')
          .update(payload)
          .eq('id', ruleToEdit.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('recommendation_rules')
          .insert(payload);
        if (insertError) throw insertError;
      }
      onSaved();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving the rule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">
            {ruleToEdit ? 'Edit Recommendation Rule' : 'Create New Rule'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}
          
          <form id="rule-form" onSubmit={handleSave} className="space-y-6">
            <ConditionBuilder 
              categoryId={categoryId} 
              conditions={conditions} 
              onChange={setConditions} 
            />
            
            <hr className="border-slate-100" />
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Outcomes</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recommendation Text *</label>
                <textarea
                  required
                  value={recommendationText}
                  onChange={e => setRecommendationText(e.target.value)}
                  placeholder="e.g. Please restart the router..."
                  className="w-full rounded-lg border-slate-300 focus:border-teal-500 focus:ring-teal-500 min-h-[100px] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Root Cause Text (Optional)</label>
                <input
                  type="text"
                  value={rootCauseText}
                  onChange={e => setRootCauseText(e.target.value)}
                  placeholder="e.g. Hardware failure"
                  className="w-full rounded-lg border-slate-300 focus:border-teal-500 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confidence Score (0-100)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidenceScore}
                    onChange={e => setConfidenceScore(Number(e.target.value))}
                    className="flex-1 accent-teal-600"
                  />
                  <span className="font-mono text-sm font-medium bg-slate-100 px-3 py-1 rounded-md text-slate-600">
                    {confidenceScore}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Used as a tiebreaker if multiple rules match.</p>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            form="rule-form"
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Rule'}
          </button>
        </div>
      </div>
    </div>
  );
};
