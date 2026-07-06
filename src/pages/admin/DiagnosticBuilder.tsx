import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CategoriesPanel } from '../../components/admin/diagnostics/CategoriesPanel';
import { QuestionsPanel } from '../../components/admin/diagnostics/QuestionsPanel';
import { OptionsPanel } from '../../components/admin/diagnostics/OptionsPanel';

export const DiagnosticBuilder: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('product_name');
      
      if (!error && data) {
        setProducts(data);
        if (data.length > 0) {
          setSelectedProductId(data[0].id);
        }
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  // Handle cascaded selections
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProductId(e.target.value);
    setSelectedCategoryId(null);
    setSelectedQuestionId(null);
    setSelectedQuestionType(null);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    setSelectedQuestionId(null);
    setSelectedQuestionType(null);
  };

  const handleQuestionSelect = (id: string, type: string) => {
    setSelectedQuestionId(id);
    setSelectedQuestionType(type);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Diagnostic Builder</h2>
          <p className="text-slate-500 mt-1">Manage the AI troubleshooting wizard structure.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0 flex items-center gap-4">
        <label className="font-semibold text-slate-700">Select Product:</label>
        {loading ? (
          <div className="w-64 h-10 bg-slate-100 rounded animate-pulse"></div>
        ) : (
          <select
            value={selectedProductId}
            onChange={handleProductChange}
            className="w-64 rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">-- Choose a Product --</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.product_name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6">
        <CategoriesPanel 
          productId={selectedProductId} 
          selectedCategoryId={selectedCategoryId} 
          onSelectCategory={handleCategorySelect} 
        />
        
        <QuestionsPanel 
          categoryId={selectedCategoryId} 
          selectedQuestionId={selectedQuestionId} 
          onSelectQuestion={handleQuestionSelect} 
        />
        
        <OptionsPanel 
          questionId={selectedQuestionId} 
          questionType={selectedQuestionType} 
        />
      </div>
    </div>
  );
};
