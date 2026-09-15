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
    groupId: '',
    product_ids: [] as string[],
    project_code: '',
    fiscal_year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });
  const [saving, setSaving] = useState(false);

  // Rows sharing the same contract_group_id are one contract covering
  // multiple products - group them for display/edit/delete as a single unit.
  const contractGroups = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    contracts.forEach((c: any) => {
      const key = c.contract_group_id || c.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });
    return Array.from(groups.entries()).map(([groupId, rows]) => ({
      groupId,
      rows,
      productNames: rows.map(r => r.product?.product_name || 'Unknown Product').join(', '),
      project_code: rows[0].project_code,
      fiscal_year: rows[0].fiscal_year,
      start_date: rows[0].start_date,
      end_date: rows[0].end_date,
    }));
  }, [contracts]);

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
            id: Array.isArray(item.product) ? item.product[0]?.id : (item.product as any)?.id,
            name: Array.isArray(item.product) ? item.product[0]?.product_name : (item.product as any)?.product_name,
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
      groupId: '',
      product_ids: [],
      project_code: '',
      fiscal_year: new Date().getFullYear(),
      start_date: '',
      end_date: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (group: { groupId: string; rows: any[] }) => {
    setFormData({
      groupId: group.groupId,
      product_ids: group.rows.map(r => r.product_id),
      project_code: group.rows[0].project_code || '',
      fiscal_year: group.rows[0].fiscal_year,
      start_date: group.rows[0].start_date,
      end_date: group.rows[0].end_date
    });
    setIsModalOpen(true);
  };

  const toggleFormProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this contract?')) return;
    try {
      const { error } = await supabase.from('maintenance_contracts').delete().eq('contract_group_id', groupId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Error deleting contract:', err);
      alert('Failed to delete contract.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.product_ids.length === 0 || !formData.fiscal_year || !formData.start_date || !formData.end_date) {
      alert('Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      const basePayload = {
        customer_id: organization.id,
        project_code: formData.project_code || null,
        fiscal_year: formData.fiscal_year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        created_by: user?.id
      };

      if (formData.groupId) {
        // Editing an existing contract: reconcile the selected products against
        // whichever rows already exist for this group - update the shared
        // fields on rows that stay, insert rows for newly added products, and
        // remove rows for products the admin unchecked. One contract stays one
        // logical entity (contract_group_id) even though it's still stored as
        // one row per product to keep the ticket_no enrichment trigger's
        // (customer_id, product_id) lookup working unchanged.
        const existingRows = contracts.filter((c: any) => c.contract_group_id === formData.groupId);
        const existingProductIds = existingRows.map((r: any) => r.product_id);
        const keptProductIds = formData.product_ids.filter(id => existingProductIds.includes(id));
        const addedProductIds = formData.product_ids.filter(id => !existingProductIds.includes(id));
        const removedRowIds = existingRows.filter((r: any) => !formData.product_ids.includes(r.product_id)).map((r: any) => r.id);

        if (keptProductIds.length > 0) {
          const { error } = await supabase
            .from('maintenance_contracts')
            .update(basePayload)
            .eq('contract_group_id', formData.groupId)
            .in('product_id', keptProductIds);
          if (error) throw error;
        }
        if (addedProductIds.length > 0) {
          const rows = addedProductIds.map(productId => ({ ...basePayload, product_id: productId, contract_group_id: formData.groupId }));
          const { error } = await supabase.from('maintenance_contracts').insert(rows);
          if (error) throw error;
        }
        if (removedRowIds.length > 0) {
          const { error } = await supabase.from('maintenance_contracts').delete().in('id', removedRowIds);
          if (error) throw error;
        }
      } else {
        // One contract can cover multiple products - insert one row per
        // selected product, all sharing the same contract_group_id, so the
        // UI can display/edit/delete them together as a single contract while
        // ticket creation still matches on (customer_id, product_id).
        const groupId = crypto.randomUUID();
        const rows = formData.product_ids.map(productId => ({ ...basePayload, product_id: productId, contract_group_id: groupId }));
        const { error } = await supabase.from('maintenance_contracts').insert(rows);
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
              <th className="px-6 py-4">Products</th>
              <th className="px-6 py-4">Project Code</th>
              <th className="px-6 py-4">Fiscal Year</th>
              <th className="px-6 py-4">Start Date</th>
              <th className="px-6 py-4">End Date</th>
              <th className="px-6 py-4">Status</th>
              {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contractGroups.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-6 py-8 text-center text-slate-500">
                  No maintenance contracts found.
                </td>
              </tr>
            ) : (
              contractGroups.map((group) => {
                const status = getStatus(group.start_date, group.end_date);
                return (
                  <tr key={group.groupId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {group.productNames}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {group.project_code || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {group.fiscal_year}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(group.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(group.end_date).toLocaleDateString()}
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
                            onClick={() => openEditModal(group)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(group.groupId)}
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
                {formData.groupId ? 'Edit Contract' : 'Add Contract'}
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
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Products</label>
                {products.length === 0 ? (
                  <div className="w-full px-3 py-2 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    No products assigned to this organization yet.
                  </div>
                ) : (
                  <div className="border border-slate-300 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                    {products.map(p => (
                      <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={formData.product_ids.includes(p.id)}
                          onChange={() => toggleFormProduct(p.id)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-1">Select every product this contract covers.</p>
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
                  {formData.groupId ? 'Save Changes' : 'Add Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
