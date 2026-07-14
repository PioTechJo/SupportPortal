import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from 'react-i18next';

interface Category {
  id: string;
  category_name: string;
  product_id: string;
  products?: {
    product_name: string;
  };
}

interface CategorySelectorProps {
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ selectedCategoryId, onSelect }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('ai_diagnostic_categories')
        .select('id, category_name, product_id')
        .order('category_name');
        
      if (error) console.error('Categories error:', error);
      if (data) console.log('Categories data:', data);
        
      if (!error && data) {
        // Sort manually by product name then category name to group them nicely
        const sorted = data.sort((a, b) => {
          const pA = a.products?.product_name || '';
          const pB = b.products?.product_name || '';
          if (pA !== pB) return pA.localeCompare(pB);
          return a.category_name.localeCompare(b.category_name);
        });
        setCategories(sorted);
      }
      setLoading(false);
    };
    fetchCategories();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-10 bg-slate-100 rounded-lg w-full max-w-md"></div>;
  }

  return (
    <div className="w-full max-w-md">
      <label className="block text-sm font-semibold text-slate-700 mb-2">{t('recommendationRules.selectTargetCategory')}</label>
      <select
        value={selectedCategoryId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-teal-500 focus:ring-teal-500"
      >
        <option value="">{t('recommendationRules.chooseCategory')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.products?.product_name} &gt; {c.category_name}
          </option>
        ))}
      </select>
    </div>
  );
};
