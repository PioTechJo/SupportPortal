import React from 'react';
import { Package, ArrowRight } from 'lucide-react';
import wizardConfig from './wizardConfig.json';

import { api } from '../../lib/api';
import { OrganizationProduct } from '../../types';

interface Step1ProductProps {
  selectedProductId: string;
  organizationId?: string;
  onSelect: (productId: string) => void;
  onNext: () => void;
  onCancel: () => void;
}

export const Step1Product: React.FC<Step1ProductProps> = ({ 
  selectedProductId, 
  organizationId,
  onSelect, 
  onNext,
  onCancel
}) => {
  const [licensedProducts, setLicensedProducts] = React.useState<OrganizationProduct[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadProducts() {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const products = await api.getOrganizationProducts(organizationId);
        setLicensedProducts(products);
      } catch (err) {
        console.error("Failed to load products for wizard", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [organizationId]);

  // Fallback to wizard config if no org or no products (e.g. legacy logic)
  const displayProducts = licensedProducts.length > 0 
    ? licensedProducts.map(lp => {
        // Find matching product in wizard config to preserve the ID format (e.g., prod-dwh)
        const match = wizardConfig.products.find(p => 
          p.name.toLowerCase() === lp.product?.name?.toLowerCase() ||
          p.id.replace('prod-', '').toLowerCase() === lp.product_code?.toLowerCase() ||
          p.id === lp.product_code
        );
        
        return {
          id: match ? match.id : lp.product_code,
          name: lp.product?.name || lp.product_code,
          description: lp.product?.description || 'Support and ticketing.'
        };
      })
    : wizardConfig.products;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Which product are you using?</h2>
        <p className="text-slate-500 font-medium">Select the software product you need assistance with.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
          Loading your licensed products...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
          {displayProducts.map(product => (
            <div 
              key={product.id}
              onClick={() => onSelect(product.id)}
              className={`
                p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col gap-3
                ${selectedProductId === product.id 
                  ? 'border-teal-500 bg-teal-50/50 shadow-sm shadow-teal-500/10' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}
              `}
            >
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                ${selectedProductId === product.id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'}
              `}>
                <Package size={24} />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${selectedProductId === product.id ? 'text-teal-900' : 'text-slate-800'}`}>
                  {product.name}
                </h3>
                <p className={`text-sm mt-1 ${selectedProductId === product.id ? 'text-teal-700/80' : 'text-slate-500'}`}>
                  {product.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center pt-8 mt-8 border-t border-slate-100">
        <button 
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button 
          onClick={onNext}
          disabled={!selectedProductId}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next Step <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};
