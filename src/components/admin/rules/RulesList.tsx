import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

interface RulesListProps {
  categoryId: string;
  onEdit: (rule: any) => void;
  triggerRefresh: number; // to refetch when a rule is saved
}

export const RulesList: React.FC<RulesListProps> = ({ categoryId, onEdit, triggerRefresh }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // Fetch questions to map IDs to text
      const { data: questionsData } = await supabase
        .from('ai_diagnostic_questions')
        .select('id, question_text')
        .eq('category_id', categoryId);
        
      const qMap: Record<string, string> = {};
      if (questionsData) {
        questionsData.forEach(q => {
          qMap[q.id] = q.question_text;
        });
      }
      setQuestionsMap(qMap);

      // Fetch rules
      const { data: rulesData } = await supabase
        .from('recommendation_rules')
        .select('*')
        .eq('category_id', categoryId)
        .order('confidence_score', { ascending: false });
        
      if (rulesData) {
        setRules(rulesData);
      }
      
      setLoading(false);
    };

    if (categoryId) {
      fetchData();
    } else {
      setRules([]);
      setLoading(false);
    }
  }, [categoryId, triggerRefresh]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    
    await supabase.from('recommendation_rules').delete().eq('id', id);
    setRules(rules.filter(r => r.id !== id));
  };

  // Compute duplicate hashes
  const duplicateHashes = useMemo(() => {
    const hashCounts: Record<string, number> = {};
    rules.forEach(r => {
      if (!r.match_criteria) return;
      const keys = Object.keys(r.match_criteria).sort();
      const obj: any = {};
      keys.forEach(k => obj[k] = r.match_criteria[k]);
      const hash = JSON.stringify(obj);
      hashCounts[hash] = (hashCounts[hash] || 0) + 1;
    });
    return hashCounts;
  }, [rules]);

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading rules...</div>;
  
  if (rules.length === 0) {
    return (
      <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500">
        No recommendation rules exist for this category yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => {
        // Build readable conditions
        let criteriaEntries: [string, string][] = [];
        if (rule.match_criteria) {
          criteriaEntries = Object.entries(rule.match_criteria);
        }
        
        // Check for duplicates
        let isDuplicate = false;
        if (rule.match_criteria) {
          const keys = Object.keys(rule.match_criteria).sort();
          const obj: any = {};
          keys.forEach(k => obj[k] = rule.match_criteria[k]);
          const hash = JSON.stringify(obj);
          isDuplicate = duplicateHashes[hash] > 1;
        }

        return (
          <div key={rule.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition hover:shadow-md flex flex-col sm:flex-row relative">
            {isDuplicate && (
              <div 
                className="absolute top-3 right-3 text-amber-500"
                title="Warning: Another rule in this category has identical match criteria. The system will use Confidence Score as a tiebreaker."
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            
            <div className="flex-1 p-5 border-b sm:border-b-0 sm:border-r border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded">
                  Score: {rule.confidence_score}
                </span>
                <h4 className="font-semibold text-slate-800">Match Conditions</h4>
              </div>
              
              <ul className="space-y-2">
                {criteriaEntries.length === 0 && <li className="text-sm text-slate-500 italic">No conditions</li>}
                {criteriaEntries.map(([qId, val], idx) => (
                  <li key={idx} className="text-sm flex gap-2">
                    <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {questionsMap[qId] || 'Unknown Question'}
                    </span>
                    <span className="text-slate-400">=</span>
                    <span className="font-semibold text-teal-700">"{String(val)}"</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex-1 p-5 flex flex-col justify-between bg-slate-50">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recommendation</h4>
                  <p className="text-sm text-slate-800">{rule.recommendation_text}</p>
                </div>
                {rule.root_cause_text && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Root Cause</h4>
                    <p className="text-sm text-slate-700">{rule.root_cause_text}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => onEdit(rule)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Edit Rule
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="px-3 py-1.5 bg-white border border-red-200 rounded text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  title="Delete Rule"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
