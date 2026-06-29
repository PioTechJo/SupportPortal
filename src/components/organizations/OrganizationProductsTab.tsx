import React, { useState, useEffect } from 'react';
import { Tenant, OrganizationProduct, Product } from '../../types';
import { Package, Search, Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface OrganizationProductsTabProps {
  organization: Tenant;
}

export const OrganizationProductsTab: React.FC<OrganizationProductsTabProps> = ({ organization }) => {
  const [licensedProducts, setLicensedProducts] = useState<OrganizationProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Track selected product codes for checkboxes
  const [selectedProductCodes, setSelectedProductCodes] = useState<Set<string>>(new Set());



  useEffect(() => {
    fetchData();
  }, [organization.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch both licensed products and all available products
      const [licensed, all] = await Promise.all([
        api.getOrganizationProducts(organization.id),
        api.getProducts() // assuming this exists, if not we fall back
      ]);
      
      setLicensedProducts(licensed);
      // Ensure we have a master list of products
      setAllProducts(all.length > 0 ? all : [
        { id: 'prod-goaml', name: 'goAML', description: 'Anti-Money Laundering Compliance Engine' },
        { id: 'prod-dwh', name: 'DWH', description: 'Data Warehouse & Analytics' },
        { id: 'prod-ifrs9', name: 'IFRS9', description: 'Financial Instruments & ECL Calculation' },
        { id: 'prod-ftp', name: 'FTP', description: 'Funds Transfer Pricing' },
        { id: 'prod-regulatory', name: 'Regulatory Reports', description: 'Central Bank Reporting Suite' }
      ]);
      
      // Initialize selected set
      const initialSelected = new Set<string>();
      licensed.filter(lp => lp.is_active).forEach(lp => {
        // Use the native product_id directly from the database
        if (lp.product_id) {
          initialSelected.add(lp.product_id);
        }
      });
      setSelectedProductCodes(initialSelected);
      
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load licensed products.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProduct = (productCode: string) => {
    const next = new Set(selectedProductCodes);
    if (next.has(productCode)) {
      next.delete(productCode);
    } else {
      next.add(productCode);
    }
    setSelectedProductCodes(next);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.updateOrganizationProducts(organization.id, Array.from(selectedProductCodes));
      setSuccess('Successfully updated licensed products.');
      await fetchData(); // Refresh
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save licensed products.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Loading licensed products...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shield size={20} className="text-teal-600" />
            Licensed Products
          </h2>
          <p className="text-sm text-slate-500">
            Manage which products this organization has access to.
          </p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save size={16} />
            )}
            Save Licenses
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={16} className="text-red-500" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in">
          <CheckCircle size={16} className="text-emerald-500" />
          {success}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Product Name</th>
              <th className="px-6 py-4">Description</th>
              <th className="px-6 py-4 text-center">Version (Demo)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductCodes.has(product.id);
              
              return (
                <tr 
                  key={product.id} 
                  className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-teal-50/10' : ''}`}
                  onClick={() => handleToggleProduct(product.id)}
                >
                  <td className="px-6 py-4 w-16">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by tr click
                        className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500 focus:ring-2"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                        <Package size={16} />
                      </div>
                      <span className="font-bold text-slate-800">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {product.description || 'No description available.'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 rounded">
                      v2025.1
                    </span>
                  </td>
                </tr>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
