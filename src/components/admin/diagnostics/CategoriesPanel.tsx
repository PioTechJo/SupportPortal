import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CategoryModal } from './CategoryModal';

interface CategoriesPanelProps {
  productId: string;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string) => void;
}

export const CategoriesPanel: React.FC<CategoriesPanelProps> = ({ productId, selectedCategoryId, onSelectCategory }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<any>(null);

  const fetchCategories = async () => {
    if (!productId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_diagnostic_categories')
      .select('*, ai_diagnostic_questions(count)')
      .eq('product_id', productId)
      .order('display_order');
      
    if (!error && data) {
      setCategories(data);
      // Auto-select first if nothing is selected
      if (data.length > 0 && !selectedCategoryId) {
        onSelectCategory(data[0].id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, [productId]);

  const handleDelete = async (category: any) => {
    // Block Strategy: check for children
    if (category.ai_diagnostic_questions[0].count > 0) {
      alert(`Cannot delete this category. It contains ${category.ai_diagnostic_questions[0].count} questions. Please delete the questions first to prevent accidental data loss.`);
      return;
    }
    
    if (!window.confirm(`Delete category "${category.category_name}"?`)) return;

    await supabase.from('ai_diagnostic_categories').delete().eq('id', category.id);
    if (selectedCategoryId === category.id) {
      onSelectCategory('');
    }
    fetchCategories();
  };

  const openNew = () => {
    setCategoryToEdit(null);
    setIsEditing(true);
  };

  const openEdit = (e: React.MouseEvent, category: any) => {
    e.stopPropagation();
    setCategoryToEdit(category);
    setIsEditing(true);
  };

  const handleSaved = () => {
    setIsEditing(false);
    fetchCategories();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">1</span>
          Categories
        </h3>
        {productId && (
          <button onClick={openNew} className="text-indigo-600 hover:text-indigo-800 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {!productId ? (
          <div className="p-4 text-center text-sm text-slate-500">Select a product to view categories.</div>
        ) : loading ? (
          <div className="p-4 text-center text-sm text-slate-400 animate-pulse">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">No categories found.</div>
        ) : (
          categories.map(cat => (
            <div 
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center group ${
                selectedCategoryId === cat.id 
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                  : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex-1">
                <div className={`font-medium text-sm ${selectedCategoryId === cat.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {cat.category_name}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                  <span>Order: {cat.display_order}</span>
                  <span>•</span>
                  <span>{cat.ai_diagnostic_questions[0]?.count || 0} questions</span>
                </div>
              </div>
              <div className={`flex gap-1 ${selectedCategoryId === cat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                <button onClick={(e) => openEdit(e, cat)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(cat); }} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isEditing && (
        <CategoryModal
          productId={productId}
          category={categoryToEdit}
          onClose={() => setIsEditing(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
};
