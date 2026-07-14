import React, { useState } from 'react';
import { CategorySelector } from '../../components/admin/rules/CategorySelector';
import { RulesList } from '../../components/admin/rules/RulesList';
import { RuleEditor } from '../../components/admin/rules/RuleEditor';
import { useTranslation } from 'react-i18next';

export const RecommendationRulesManager: React.FC = () => {
  const { t } = useTranslation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreateNew = () => {
    setRuleToEdit(null);
    setIsEditing(true);
  };

  const handleEdit = (rule: any) => {
    setRuleToEdit(rule);
    setIsEditing(true);
  };

  const handleSaved = () => {
    setIsEditing(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t('recommendationRules.managerTitle')}</h2>
          <p className="text-slate-500 mt-1">{t('recommendationRules.managerSubtitle')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
          <CategorySelector 
            selectedCategoryId={selectedCategoryId} 
            onSelect={setSelectedCategoryId} 
          />
          
          {selectedCategoryId && (
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('recommendationRules.createRule')}
            </button>
          )}
        </div>

        {selectedCategoryId ? (
          <RulesList 
            categoryId={selectedCategoryId} 
            onEdit={handleEdit} 
            triggerRefresh={refreshKey}
          />
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <div className="text-4xl mb-4">🔮</div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('recommendationRules.selectCategoryManage')}</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              {t('recommendationRules.selectCategoryManageDesc')}
            </p>
          </div>
        )}
      </div>

      {isEditing && (
        <RuleEditor
          categoryId={selectedCategoryId}
          ruleToEdit={ruleToEdit}
          onClose={() => setIsEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
