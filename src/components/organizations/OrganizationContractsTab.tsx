import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Tenant, Product } from '../../types';
import { Plus, Edit2, Trash2, Calendar, FileText, X, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';

interface OrganizationContractsTabProps {
  organization: Tenant;
}

export const OrganizationContractsTab: React.FC<OrganizationContractsTabProps> = ({ organization }) => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    product_id: '',
    project_code: '',
    fiscal_year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'CEO', 'SUPPORT_MANAGER'].includes(user?.role_code?.toUpperCase() || '');

  useEffect(() => {
    fetchData();
  }, [organization.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('--- DEBUG START ---');
      console.log('1. Current Organization ID:', organization.id);
      
      const orgProductsPromise = supabase
        .from('organization_products')
        .select('product_code, product:products(id, product_name)')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      const contractsPromise = supabase
        .from('maintenance_contracts')
        .select('*, product:products(product_name)')
        .eq('customer_id', organization.id)
        .order('fiscal_year', { ascending: false });

      const [contractsData, orgProductsData] = await Promise.all([
        contractsPromise,
        orgProductsPromise
      ]);
      
      console.log('2. Query Result - Error:', orgProductsData.error);
      console.log('3. Query Result - Data:', JSON.stringify(orgProductsData.data, null, 2));
      console.log('--- DEBUG END ---');
      
      if (contractsData.data) {
        setContracts(contractsData.data);
      }
      
      if (orgProductsData.data && orgProductsData.data.length > 0) {
        // Map the joined data to Product array structure
        const mappedProducts = orgProductsData.data
          .filter(item => item.product)
          .map(item => ({
            id: item.product_id,
            name: Array.isArray(item.product) ? item.product[0]?.product_name : item.product?.product_name,
            description: ''
          }));
        setProducts(mappedProducts as any[]);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      id: '',
      product_id: products[0]?.id || '',
      project_code: '',
      fiscal_year: new Date().getFullYear(),
      start_date: '',
      end_date: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (contract: any) => {
    setFormData({
      id: contract.id,
      product_id: contract.product_id,
      project_code: contract.project_code || '',
      fiscal_year: contract.fiscal_year,
      start_date: contract.start_date,
      end_date: contract.end_date
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      const { error } = await supabase.from('maintenance_contracts').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting contract:', err);
      alert('Failed to delete contract.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || !formData.fiscal_year || !formData.start_date || !formData.end_date) {
      alert('Please fill all fields');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        customer_id: organization.id,
        product_id: formData.product_id,
        project_code: formData.project_code || null,
        fiscal_year: formData.fiscal_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        created_by: user?.id
      };

      if (formData.id) {
        const { error } = await supabase.from('maintenance_contracts').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('maintenance_contracts').insert(payload);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error('Error saving contract:', err);
      alert('Failed to save contract.');
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (start: string, end: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (today < startDate) return { label: 'Upcoming', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    if (today > endDate) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200' };
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Loading contracts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText size={20} className="text-teal-600" />
            Maintenance Contracts
          </h2>
          <p className="text-sm text-slate-500">
            Manage the maintenance contracts and SLA dates for this organization's products.
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold transition flex items-center gap-2"
          >
            <Plus size={16} />
            Add Contract
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-6 py-4">Product</th>
              <th className="px-6 py-4">Project Code</th>
              <th className="px-6 py-4">Fiscal Year</th>
              <th className="px-6 py-4">Start Date</th>
              <th className="px-6 py-4">End Date</th>
              <th className="px-6 py-4">Status</th>
              {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                  No maintenance contracts found.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => {
                const status = getStatus(contract.start_date, contract.end_date);
                return (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {contract.product?.product_name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {contract.project_code || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {contract.fiscal_year}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(contract.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(contract.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(contract)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(contract.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {formData.id ? 'Edit Contract' : 'Add Contract'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product</label>
                {products.length === 0 ? (
                  <div className="w-full px-3 py-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    No products assigned to this organization yet.
                  </div>
                ) : (
                  <select 
                    required
                    value={formData.product_id}
                    onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="" disabled>Select a product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Code</label>
                <input
                  type="text"
                  value={formData.project_code}
                  onChange={(e) => setFormData({...formData, project_code: e.target.value})}
                  placeholder="e.g. PT-2026-014"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fiscal Year</label>
                <input 
                  type="number"
                  required
                  min="2000"
                  max="2100"
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData({...formData, fiscal_year: parseInt(e.target.value) || 2026})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Start Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">End Date</label>
                  <input 
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || products.length === 0}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                  {formData.id ? 'Save Changes' : 'Add Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
