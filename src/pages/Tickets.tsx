import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTickets, useTicketDetails } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { Ticket, Comment, UserRole, Profile, Product, CustomerProduct } from '../types';
import { api } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Filter, 
  Plus, 
  Send, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  FolderPlus,
  MessageSquareCode,
  Lock,
  Building,
  ArrowRightLeft,
  X,
  Link,
  Package
} from 'lucide-react';
import { SmartTicketWizard } from '../components/ticket-wizard/SmartTicketWizard';
import { KnowledgeBaseSearch } from '../components/KnowledgeBaseSearch';
import { HistoricalPatternsWidget } from '../components/HistoricalPatternsWidget';
import ResolutionModal from '../components/ResolutionModal';

const getProductNameById = (id?: string) => {
  switch (id) {
    case 'prod-1': return 'PIO-RECON Balance Suite';
    case 'prod-2': return 'PIO-INTEGRATOR API Gateway';
    case 'prod-3': return 'AML-Compliance Engine';
    case 'prod-4': return 'PIO-COLLATERAL Manager';
    default: return id || 'Enterprise Core';
  }
};

export const Tickets: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { tenants } = useTenant();
  const { tickets, isLoading, createTicket, updateTicket } = useTickets();

  // Selected Ticket from URL query params or state
  const selectedTicketId = searchParams.get('id') || '';
  const isCreateAction = searchParams.get('action') === 'create';

  // Details hook for single ticket rendering
  const { 
    ticket, 
    comments, 
    isTicketLoading, 
    addComment, 
    isAddingComment 
  } = useTicketDetails(selectedTicketId);

  // States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [commentContent, setCommentContent] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);

  // Create Ticket Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newCategory, setNewCategory] = useState<'bug' | 'feature_request' | 'billing' | 'question' | 'other'>('bug');
  const [newTenantId, setNewTenantId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [customerProducts, setCustomerProducts] = useState<CustomerProduct[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdTicketInfo, setCreatedTicketInfo] = useState<any>(null);

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<any>(null);

  // Resolution Modal State
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);

  // Load real profiles and diagnostic answers
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<any[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [adminDiagnostics, setAdminDiagnostics] = useState<any>(null);

  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await api.getProfiles();
        setAllProfiles(data || []);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };
    fetchProfiles();
  }, []);

  // Fetch diagnostics when selectedTicketId changes
  useEffect(() => {
    if (selectedTicketId) {
      const fetchDiagnostics = async () => {
        try {
          const data = await api.getDiagnosticAnswers(selectedTicketId);
          setDiagnosticAnswers(data || []);
        } catch (err) {
          console.error("Error fetching diagnostics:", err);
          setDiagnosticAnswers([]);
        }
      };
      fetchDiagnostics();
    } else {
      setDiagnosticAnswers([]);
    }
  }, [selectedTicketId]);

  const handleAssignTicketTransaction = async (agentId: string) => {
    if (!ticket || !user) return;
    setIsAssigning(true);
    setAssignmentError(null);
    try {
      const selectedAgent = allProfiles.find(p => p.id === agentId);
      const agentFullName = selectedAgent ? selectedAgent.full_name : 'Assigned Agent';
      
      await api.assignTicket({
        ticketId: ticket.id,
        agentId,
        agentName: agentFullName,
        ticketTitle: ticket.title,
        assignedById: user.id,
        assignedByName: user.full_name
      });

      // Invalidate queries to refresh data in real-time
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    } catch (err: any) {
      console.error(err);
      setAssignmentError(err.message || 'Failed to process team assignment transaction.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Auto-set tenant-id for client who can only create tickets inside their tenant
  useEffect(() => {
    const userTenantId = user?.customer_id || user?.tenant_id;
    if (user && userTenantId) {
      setNewTenantId(userTenantId);
    } else if (tenants.length > 0) {
      setNewTenantId(tenants[0].id);
    }
  }, [user, tenants]);

  // DEV DIAGNOSTICS: Administrator Tickets Loading Flow
  useEffect(() => {
    const roleUp = user?.role_name?.toUpperCase() || '';
    const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_ENGINEER', 'TEAM_LEAD'].includes(roleUp);

    if (isAdmin) {
      const runDiagnostics = async () => {
        try {
          const { data: authUser } = await supabase.auth.getUser();

          const query = supabase
            .from('tickets')
            .select(`*`, { count: 'exact' });

          const { data, error, status, count } = await query;

          setAdminDiagnostics({
            step1: {
              id: authUser.user?.id,
              email: authUser.user?.email,
              role: user?.role_name,
            },
            step2: `supabase.from('tickets').select('*', { count: 'exact' })`,
            step3: `No programmatic filters applied.\n(customer_id, organization_id, assigned_to, created_by, status, role are ALL unrestricted in the API call.)`,
            step4: {
              data: data ? (data.length > 0 ? data : '[] (Empty Array)') : null,
              error,
              status,
              count
            },
            step5: data && data.length === 0 ? `EXPLICIT STATEMENT: The API request executes successfully (status 200), but returns 0 rows. Because the database contains tickets and no programmatic filters are applied, Row-Level Security (RLS) is explicitly filtering out all rows and denying access.` : `RLS did not filter out all rows.`,
            step6: `COMPARING QUERIES:\n\n1. Bank User Query (Client):\nExecutes: supabase.from('tickets').select('*')\n\n2. Administrator Query:\nExecutes: supabase.from('tickets').select('*')\n\nHIGHLIGHTED DIFFERENCE:\nThere is NO difference in the application code or SQL query.\nThe exact same request is sent.\n\nThe ONLY difference is the RLS Policy Evaluation context on the database server:\n\nBank User Policy Match:\ncustomer_id = auth_user_customer_id() OR created_by = auth.uid()\n-> Evaluates TRUE for their own tickets.\n\nAdministrator Policy Match:\nUPPER(auth_user_role_name()) IN ('ADMIN', ...)\n-> Evaluates FALSE (or throws an exception internally like auth_user_role_name() failing), causing 0 rows to be returned.`
          });
        } catch (err) {
          console.error('Diagnostics failed', err);
        }
      };
      runDiagnostics();
    } else {
      setAdminDiagnostics(null);
    }
  }, [user]);

  // Fetch products for create ticket dialog dynamically
  useEffect(() => {
    const fetchProductsForCreate = async () => {
      try {
        const customerId = newTenantId || user?.tenant_id || user?.customer_id || '';
        if (customerId) {
          let productList = await api.getCustomerProducts(customerId);
          
          if (productList.length === 0) {
            const allProducts = await api.getProducts();
            productList = allProducts.map(p => ({
              id: `cp-fallback-${p.id}`,
              customer_id: customerId,
              product_id: p.id,
              products: p
            }));
          }
          
          setCustomerProducts(productList);
          if (productList.length > 0) {
            setNewProductId(productList[0].products?.id || '');
          } else {
            setNewProductId('');
          }
        } else {
          const allProducts = await api.getProducts();
          const mappedProducts: CustomerProduct[] = allProducts.map(p => ({
            id: `cp-debug-${p.id}`,
            customer_id: 'internal',
            product_id: p.id,
            products: p
          }));
          setCustomerProducts(mappedProducts);
          if (mappedProducts.length > 0) {
            setNewProductId(mappedProducts[0].products?.id || '');
          } else {
            setNewProductId('');
          }
        }
      } catch (err) {
        console.error('Failed to fetch product catalog', err);
      }
    };
    fetchProductsForCreate();
  }, [newTenantId, user]);

  // Filters logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = (ticket.title || '').toLowerCase().includes((search || '').toLowerCase()) || 
                          (ticket.description || '').toLowerCase().includes((search || '').toLowerCase()) ||
                          (ticket.id || '').toLowerCase().includes((search || '').toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const handleSelectTicket = (id: string) => {
    setSearchParams({ id });
  };

  const handleCloseDetail = () => {
    searchParams.delete('id');
    setSearchParams(searchParams);
  };

  const handleOpenCreateModal = () => {
    setSearchParams({ action: 'create' });
  };

  const handleCloseCreateModal = () => {
    searchParams.delete('action');
    setSearchParams(searchParams);
    setNewTitle('');
    setNewDescription('');
    setNewProductId('');
    setCreateError(null);
    setCreateSuccess(false);
    setWizardStep(1);
    setWizardData(null);
    setCreatedTicketInfo(null);
  };

  // Submit Comments
  const handleAddCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !user || !selectedTicketId) return;

    try {
      await addComment({
        ticket_id: selectedTicketId,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.role_name as any,
        content: commentContent,
        is_internal: isInternalComment
      });

      setCommentContent('');
      setIsInternalComment(false);
      
      // Update ticket updated_at too:
      await updateTicket({ id: selectedTicketId, updates: { updated_at: new Date().toISOString() } });
    } catch (err) {
      console.error(err);
    }
  };

  // Submit New Ticket
  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim() || !newTenantId) {
      setCreateError('Please enter a valid title, description, and organize tenant association.');
      return;
    }
    if (!newProductId) {
      setCreateError('You must select an affected banking module or product endpoint.');
      return;
    }

    try {
      setCreateError(null);
      await createTicket({
        title: newTitle,
        description: newDescription,
        status: 'open',
        priority: newPriority,
        category: newCategory,
        tenant_id: newTenantId,
        assigned_to: null,
        product_id: newProductId
      });

      setCreateSuccess(true);
      setTimeout(() => {
        handleCloseCreateModal();
      }, 1000);
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to dispatch ticket pipeline.');
    }
  };

  // Quick State Updates
  const handleStatusChange = async (newStatus: any) => {
    if (!ticket) return;
    if (
      newStatus === 'pending_approval' || 
      (newStatus === 'resolved' && ticket.status !== 'pending_approval')
    ) {
      setIsResolutionModalOpen(true);
      return;
    }
    try {
      await updateTicket({ id: ticket.id, updates: { status: newStatus } });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePriorityChange = async (newPriorityAttr: any) => {
    if (!ticket) return;
    try {
      await updateTicket({ id: ticket.id, updates: { priority: newPriorityAttr } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgentChange = async (newAgentId: string) => {
    if (!ticket) return;
    try {
      await updateTicket({ id: ticket.id, updates: { assigned_to: newAgentId || null } });
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveResolution = async () => {
    if (!ticket || !user) return;
    try {
      await updateTicket({ 
        id: ticket.id, 
        updates: { 
          status: 'resolved',
          updated_at: new Date().toISOString()
        } 
      });

      // Add approval comment:
      await api.createComment({
        ticket_id: ticket.id,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.role_name as any,
        content: `🎉 Resolution approved by manager ${user.full_name}. Ticket marked as Resolved.`,
        is_internal: false
      });

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    } catch (err) {
      console.error("Failed to approve resolution draft:", err);
    }
  };

  const handleRejectResolution = async () => {
    if (!ticket || !user) return;
    try {
      await updateTicket({ 
        id: ticket.id, 
        updates: { 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        } 
      });

      // Add rejection comment:
      await api.createComment({
        ticket_id: ticket.id,
        author_id: user.id,
        author_name: user.full_name,
        author_role: user.role_name as any,
        content: `❌ Resolution rejected by manager ${user.full_name}. Status reverted to In Progress. Please revise root cause details or resolution documentation.`,
        is_internal: false
      });

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
    } catch (err) {
      console.error("Failed to reject resolution draft:", err);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusStyle = (statusCode: string) => {
    switch((statusCode || '').toUpperCase()) {
      case 'NEW': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'INVESTIGATION': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PENDING_CUSTOMER': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'RESOLVED': return 'bg-green-50 text-green-700 border-green-200';
      case 'CLOSED': return 'bg-gray-50 text-gray-700 border-gray-200';
      // Fallbacks
      case 'open': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'resolved': return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Pre-configured lists for select dropdowns
  const statuses = ['open', 'in_progress', 'resolved', 'closed'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const categories = ['bug', 'feature_request', 'billing', 'question', 'other'];

  // Statically seed mock agents array to easily reassign inside local sandbox mode
  const mockPersonnel = [
    { id: 'u-agent', name: 'Dana Naber (Agent)' }
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="p-8 max-w-[1600px] mx-auto min-h-screen">
      {adminDiagnostics && (
        <div className="mb-6 p-6 bg-slate-900 text-green-400 rounded-xl border border-slate-700 font-mono text-sm overflow-auto shadow-2xl">
          <h3 className="text-white font-bold mb-6 text-lg border-b border-slate-700 pb-2">DEV DIAGNOSTICS: ADMIN TICKETS LOADING FLOW</h3>
          
          <div className="mb-6">
            <strong className="text-blue-300 text-base">STEP 1: Current Authenticated User</strong>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-slate-300">{JSON.stringify(adminDiagnostics.step1, null, 2)}</pre>
          </div>

          <div className="mb-6">
            <strong className="text-blue-300 text-base">STEP 2: Exact PostgREST Query Executed</strong>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-slate-300">{adminDiagnostics.step2}</pre>
          </div>

          <div className="mb-6">
            <strong className="text-blue-300 text-base">STEP 3: Every Filter Applied</strong>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-slate-300">{adminDiagnostics.step3}</pre>
          </div>

          <div className="mb-6">
            <strong className="text-blue-300 text-base">STEP 4: Raw Supabase Response</strong>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-slate-300">{JSON.stringify(adminDiagnostics.step4, null, 2)}</pre>
          </div>

          <div className="mb-6">
            <strong className="text-blue-300 text-base">STEP 5: Explicit RLS Statement</strong>
            <pre className="mt-2 p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg text-orange-300 whitespace-pre-wrap font-bold">{adminDiagnostics.step5}</pre>
          </div>

          <div className="mb-4">
            <strong className="text-blue-300 text-base">STEP 6: Bank User vs Administrator Query</strong>
            <pre className="mt-2 p-3 bg-black/50 rounded-lg text-slate-300 whitespace-pre-wrap leading-relaxed">{adminDiagnostics.step6}</pre>
          </div>
        </div>
      )}

      {/* Top action/filters segment */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex-1 max-w-lg relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search tickets by tracking ID or keyword description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 test-sm transition"
          />
        </div>

        <button 
          onClick={handleOpenCreateModal}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-2 transition cursor-pointer"
        >
          <Plus size={14} />
          Create Ticket
        </button>
      </div>

      {/* Filter panel bars */}
      <div className="bg-white py-3 px-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
          <Filter size={13} className="text-teal-600" />
          Filter Parameters
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Status:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 capitalize text-xs"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Priority:</span>
          <select 
            value={priorityFilter} 
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 capitalize text-xs"
          >
            <option value="all">All Priorities</option>
            {priorities.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Category */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">Category:</span>
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 capitalize text-xs"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Master Detail Board Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 column: Tickets Grid Listing */}
        <div className={`lg:col-span-1 border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden flex flex-col h-[650px] ${selectedTicketId ? 'hidden lg:flex' : ''}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono">
              Work Queue ({filteredTickets.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Active Filter Applied</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400 animate-pulse">Scanning ticket queue...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No matching support tickets in current queue.
              </div>
            ) : (
              filteredTickets.map(t => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className={`p-4 transition duration-200 cursor-pointer text-left border-l-4 ${isSelected ? 'bg-teal-50/70 border-teal-500' : 'hover:bg-slate-50/60 border-transparent'}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">{t.id}</span>
                      <span className="text-[10px] font-medium text-slate-400 font-mono">{new Date(t.created_at).toLocaleDateString()}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-1 truncate">{t.title}</h4>
                    <p className="text-xs text-slate-500 font-mono truncate mt-1">{t.customer_name}</p>

                    <div className="flex items-center gap-1.5 mt-3.5">
                      <span className={`text-[9px] uppercase tracking-wider font-semibold border px-2 py-0.5 rounded-full ${getPriorityStyle(t.priority)}`}>
                        {t.priority}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider font-semibold border px-2 py-0.5 rounded-full ${getStatusStyle(t.status_code || t.status)}`}>
                        {t.status_code ? t.status_code.replace('_', ' ') : t.status}
                      </span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold font-mono ml-auto">
                        {t.category}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 column or overlay details: Ticket detail pane */}
        <div className={`lg:col-span-2 border border-slate-200 bg-white rounded-xl shadow-xs overflow-hidden flex flex-col h-[650px] ${!selectedTicketId ? 'hidden lg:flex' : ''}`}>
          {selectedTicketId ? (
            isTicketLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
                <span className="text-xs font-medium">Reconciling ledger index...</span>
              </div>
            ) : ticket ? (
              (() => {
                const roleUp = user?.role_name?.toUpperCase() || '';
                const isAdminOrAgent = roleUp === 'ADMIN' || roleUp === 'ADMINISTRATOR' || roleUp === 'SYS_ADMIN' || roleUp === 'AGENT' || roleUp === 'SUPPORT_ENGINEER' || roleUp === 'SUPPORT_OFFICER';
                const isSystemAdmin = roleUp === 'ADMIN' || roleUp === 'ADMINISTRATOR' || roleUp === 'SYS_ADMIN';

                // Resolve eligible agents to assign to
                const eligibleAgents = allProfiles.filter(p => {
                  const pRoleUp = p.role_name?.toUpperCase() || '';
                  const isAgent = pRoleUp === 'AGENT' || pRoleUp === 'SUPPORT_ENGINEER' || pRoleUp === 'SUPPORT_OFFICER' || pRoleUp === 'ADMIN' || pRoleUp === 'ADMINISTRATOR' || pRoleUp === 'SYS_ADMIN';
                  if (!isAgent) return false;
                  if (isSystemAdmin) return true;
                  
                  const ticketIdCust = (ticket as any).customer_id || ticket.tenant_id;
                  const agentIdCust = p.customer_id || p.tenant_id;
                  return agentIdCust === ticketIdCust;
                });

                const getInitials = (name?: string) => {
                  if (!name) return '??';
                  const parts = name.trim().split(' ');
                  if (parts.length > 1) {
                    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  }
                  return name.substring(0, 2).toUpperCase();
                };

                const getCommentTypeBadge = (comment: Comment) => {
                  const role = (comment.author_role || '').toLowerCase();
                  const name = (comment.author_name || '').toLowerCase();
                  const content = (comment.content || '').toLowerCase();
                  
                  if (role === 'system' || name.includes('system') || content.includes('system logged') || content.includes('audit log')) {
                    return { label: 'System', style: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
                  }
                  if (role === 'ai' || name.includes('ai') || name.includes('gemini') || name.includes('intelligence') || content.includes('hypothesized root cause')) {
                    return { label: 'AI', style: 'bg-teal-100 text-teal-800 border-teal-200 font-bold' };
                  }
                  if (role === 'client' || role === 'cab_user' || role === 'customer') {
                    return { label: 'Customer', style: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
                  }
                  return { label: 'Agent', style: 'bg-amber-100 text-amber-800 border-amber-200' };
                };

                if (isAdminOrAgent) {
                  return (
                    <div className="flex-1 flex flex-col h-full overflow-hidden text-left" id="admin-detail-root-layout">
                      {/* Detail Header bar */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0" id="admin-detail-header">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleCloseDetail}
                            className="p-1 hover:bg-slate-200 text-slate-500 rounded block lg:hidden"
                            aria-label="Back to queue"
                          >
                            <X size={18} />
                          </button>
                          <div>
                            <span className="text-[9px] font-extrabold font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 leading-none">{ticket.id}</span>
                            <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{ticket.customer_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-slate-150 text-slate-700 rounded-sm border border-slate-200 font-mono">
                            {user?.role_name} Access Mode
                          </span>
                        </div>
                      </div>

                      {/* Split Grid Layout Content */}
                      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden" id="admin-split-body">
                        
                        {/* LEFT: 70% Width Detail Main Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 lg:border-r lg:border-slate-150">
                          
                          {/* Structured Cognitive AI Diagnostics Cards */}
                          {diagnosticAnswers.length > 0 && (
                            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 space-y-3" id="diagnostic-segment">
                              <h4 className="text-[10px] font-black uppercase text-indigo-700 tracking-wider font-mono flex items-center gap-1.5 label-diagnostics">
                                🧠 COGNITIVE DIAGNOSTIC ANSWERS & TELEMETRY
                              </h4>
                              <div className="grid grid-cols-1 gap-3">
                                {diagnosticAnswers.map((ans, idx) => (
                                  <div key={ans.id || idx} className="text-left py-1" id={`diag-ans-${idx}`}>
                                    <span className="text-xs font-bold text-slate-800 block">Q: {ans.question_text}</span>
                                    <span className="text-xs text-slate-600 mt-1 block pl-3 border-l-2 border-indigo-400 font-mono font-medium">{ans.answer_text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resolution Draft & Approval Review Panel */}
                          {(ticket.status === 'pending_approval' || (ticket as any).resolution_draft) && (
                            <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5 space-y-4 text-slate-800" id="resolution-review-block">
                              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="text-amber-600 shrink-0" size={18} />
                                  <div>
                                    <h4 className="text-xs font-black uppercase text-amber-800 tracking-wider font-mono">
                                      Resolution Document Draft {ticket.status === 'pending_approval' ? '(Awaiting Approval)' : '(Approved)'}
                                    </h4>
                                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                                      Submitted {ticket.resolution_submitted_at ? `on ${new Date(ticket.resolution_submitted_at).toLocaleString()}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono tracking-wider border ${
                                  ticket.status === 'pending_approval' 
                                    ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' 
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}>
                                  {ticket.status === 'pending_approval' ? 'Pending Approval' : 'Verified'}
                                </span>
                              </div>

                              {(ticket as any).resolution_draft ? (
                                <div className="grid grid-cols-1 gap-3.5 text-xs text-left">
                                  <div>
                                    <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase">
                                      1. Root Cause
                                    </span>
                                    <p className="bg-white border border-slate-150 p-3 rounded-lg leading-relaxed text-slate-700 mt-1 font-sans">
                                      {(ticket as any).resolution_draft.rootCause}
                                    </p>
                                  </div>

                                  <div>
                                    <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase">
                                      2. Resolution Steps
                                    </span>
                                    <p className="bg-white border border-slate-150 p-3 rounded-lg leading-relaxed text-slate-700 mt-1 font-sans">
                                      {(ticket as any).resolution_draft.resolutionSteps}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase">
                                        3. Resolution Category
                                      </span>
                                      <p className="bg-white border border-slate-150 py-1.5 px-3 rounded-lg font-mono font-bold text-[11px] text-slate-700 mt-1">
                                        {(ticket as any).resolution_draft.resolutionCategory || 'Uncategorized'}
                                      </p>
                                    </div>

                                    {(ticket as any).resolution_draft.referenceLink && (
                                      <div>
                                        <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase">
                                          Attached documentation reference
                                        </span>
                                        <div className="bg-white border border-slate-150 py-1.5 px-3 rounded-lg flex items-center gap-1.5 mt-1 text-teal-600 truncate font-mono text-[11px] font-medium">
                                          <Link size={11} className="shrink-0" />
                                          <a 
                                            href={(ticket as any).resolution_draft.referenceLink.startsWith('http') ? (ticket as any).resolution_draft.referenceLink : '#'}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="hover:underline truncate"
                                          >
                                            {(ticket as any).resolution_draft.referenceLink}
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {(ticket as any).resolution_draft.preventiveMeasures && (
                                    <div>
                                      <span className="font-extrabold text-[10px] text-slate-500 font-mono block uppercase">
                                        4. Preventive Measures
                                      </span>
                                      <p className="bg-white border border-slate-150 p-3 rounded-lg leading-relaxed text-slate-700 mt-1 font-sans">
                                        {(ticket as any).resolution_draft.preventiveMeasures}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No formal resolution documents attached.</p>
                              )}

                              {ticket.status === 'pending_approval' && isSystemAdmin && (
                                <div className="pt-3 border-t border-amber-200/50 flex flex-wrap gap-3.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={handleRejectResolution}
                                    className="px-4 py-2 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-105 text-red-750 text-xs font-semibold rounded-lg transition cursor-pointer select-none"
                                    id="btn-reject-resolution"
                                  >
                                    Reject & Decline
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleApproveResolution}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer select-none"
                                    id="btn-approve-resolution"
                                  >
                                    <CheckCircle size={13} /> Approve Resolution
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* AI Knowledge base dynamic search */}
                          <div id="kb-search-container">
                            <KnowledgeBaseSearch productId={(ticket as any).product_id || (ticket.title?.includes("INTEGRATOR") ? "prod-2" : ticket.title?.includes("RECON") ? "prod-1" : ticket.title?.includes("AML") ? "prod-3" : ticket.title?.includes("COLLATERAL") ? "prod-4" : "prod-2")} />
                          </div>

                          {/* Title and Narrative Description */}
                          <div className="space-y-4" id="ticket-narration">
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" id="ticket-title-heading">{ticket.title}</h2>
                            
                            <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date(ticket.created_at).toLocaleString()}</span>
                              <span className="flex items-center gap-1.5"><User size={13} /> Coordinator: {ticket.creator_name}</span>
                              <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider font-bold text-[10px]">CATEGORY: {ticket.category}</span>
                            </div>

                            <div className="mt-4 p-4.5 bg-slate-50/75 rounded-xl border border-slate-100 leading-relaxed text-slate-700 text-xs font-mono whitespace-pre-wrap shadow-inner" id="ticket-description-box">
                              {ticket.description}
                            </div>
                          </div>

                          {/* Gemini Historical Pattern Intelligence widget */}
                          <div id="historical-patterns-container">
                            <HistoricalPatternsWidget 
                              productId={(ticket as any).product_id || (ticket.title?.includes("INTEGRATOR") ? "prod-2" : ticket.title?.includes("RECON") ? "prod-1" : ticket.title?.includes("AML") ? "prod-3" : ticket.title?.includes("COLLATERAL") ? "prod-4" : "prod-2")} 
                              currentDescription={ticket.description}
                            />
                          </div>

                          {/* Chronological thread for Response logs */}
                          <div className="space-y-4 pt-4 border-t border-slate-100" id="comment-thread-logs">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-mono">
                              Response logs / Thread ({comments.length})
                            </h3>

                            <div className="space-y-3.5">
                              {comments.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No comment entries reported yet.</p>
                              ) : (
                                comments.map((comment) => {
                                  const isInternal = comment.is_internal;
                                  const badge = getCommentTypeBadge(comment);
                                  return (
                                    <div 
                                      key={comment.id}
                                      className={`p-4 rounded-xl border transition ${isInternal ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-slate-200 shadow-2xs'}`}
                                      id={`comment-card-${comment.id}`}
                                    >
                                      <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="h-6 w-6 bg-slate-900 text-teal-400 text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                                            {getInitials(comment.author_name)}
                                          </div>
                                          <span className="text-xs font-bold text-slate-900">{comment.author_name}</span>
                                          <span className={`text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded border ${badge.style}`}>
                                            {badge.label} {isInternal && '• Internal Access'}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-slate-700 leading-relaxed pl-8 whitespace-pre-wrap">{comment.content}</p>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Add comment action form */}
                          <div className="pt-4 border-t border-slate-100 shrink-0" id="comment-box-editor">
                            <form onSubmit={handleAddCommentSubmit} className="space-y-3">
                              <textarea
                                placeholder="Draft support response summary..."
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                required
                                className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs placeholder-slate-400 ring-offset-white focus:outline-none focus:ring-1 focus:ring-teal-500 h-20 transition"
                                id="comment-textarea"
                              />

                              <div className="flex justify-between items-center">
                                <label className="flex items-center gap-2 text-xs text-slate-500 font-mono cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={isInternalComment}
                                    onChange={(e) => setIsInternalComment(e.target.checked)}
                                    className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                  />
                                  <span className="flex items-center gap-1 font-semibold text-amber-600 uppercase text-[10px]"><Lock size={11} /> Mark internal notes</span>
                                </label>

                                <button
                                  type="submit"
                                  disabled={isAddingComment || !commentContent.trim()}
                                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition ml-auto"
                                  id="btn-comment-submit"
                                >
                                  {isAddingComment ? 'Syncing...' : 'Dispatch Comment'}
                                  <Send size={12} />
                                </button>
                              </div>
                            </form>
                          </div>

                        </div>

                        {/* RIGHT: 30% Width Assignment / Lifecycle Sidebar Status Control panel */}
                        <div className="w-full lg:w-72 shrink-0 bg-slate-50/70 p-5 flex flex-col space-y-6 overflow-y-auto" id="admin-sidebar-controls">
                          
                          {/* Status flow checker: Open -> In Progress -> Pending Review -> Resolved -> Closed */}
                          <div className="space-y-3" id="state-controls-section">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                              Ticket Lifecycle Control
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                              {[
                                { value: 'open', label: 'Open' },
                                { value: 'in_progress', label: 'In Progress' },
                                { value: 'pending_approval', label: 'Pending Approval' },
                                { value: 'resolved', label: 'Resolved' },
                                { value: 'closed', label: 'Closed' }
                              ].map((step) => {
                                const isCurrent = ticket.status === step.value;
                                return (
                                  <button
                                    key={step.value}
                                    type="button"
                                    onClick={() => handleStatusChange(step.value)}
                                    className={`w-full py-2 px-3 rounded-lg border text-left text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                                      isCurrent
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                        : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/80 text-slate-600'
                                    }`}
                                    id={`status-step-${step.value}`}
                                  >
                                    <span>{step.label}</span>
                                    {isCurrent && (
                                      <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                                    )}
                                  </button>
                                );
                              })}

                              {['open', 'in_progress'].includes(ticket.status) && (
                                <button
                                  type="button"
                                  onClick={() => setIsResolutionModalOpen(true)}
                                  className="w-full mt-2.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                                  id="btn-trigger-resolve"
                                >
                                  <span>✨ Submit Resolution</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Assignment Control Box */}
                          <div className="space-y-3" id="team-assignment-section">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">
                              Team Assignment Panel
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                              
                              {/* Current Assignee Details Cards */}
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block mb-1.5 font-mono">
                                  Current Assignee
                                </span>
                                {ticket.assigned_to ? (
                                  <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-150" id="current-assignee-card">
                                    <div className="h-8 w-8 bg-slate-900 text-teal-300 font-extrabold rounded-full flex items-center justify-center font-mono text-xs uppercase shadow-inner">
                                      {getInitials(ticket.assignee_name || 'Assigned Agent')}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-extrabold text-slate-900 truncate">
                                        {ticket.assignee_name || 'Assigned Specialist'}
                                      </p>
                                      <span className="text-[9px] text-teal-600 font-mono uppercase tracking-wide font-bold">
                                        Specialist Stack
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium" id="unassigned-card">
                                    Unassigned
                                  </div>
                                )}
                              </div>

                              {/* Assignment interactive Select options */}
                              <div className="space-y-2">
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">
                                  Assign Team Member
                                </label>

                                <select
                                  disabled={isAssigning}
                                  value={ticket.assigned_to || ''}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAssignTicketTransaction(e.target.value);
                                    }
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-705 font-mono cursor-pointer"
                                  id="choose-team-member-dropdown"
                                >
                                  <option value="">-- Choose Agent Specialist --</option>
                                  {eligibleAgents.map((ag) => (
                                    <option key={ag.id} value={ag.id}>
                                      {ag.full_name} ({['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN'].includes(ag.role_name?.toUpperCase() || '') ? 'Admin' : 'Agent'})
                                    </option>
                                  ))}
                                </select>

                                {assignmentError && (
                                  <p className="text-[10px] text-red-600 font-semibold leading-normal mt-1">
                                    ⚠ {assignmentError}
                                  </p>
                                )}
                              </div>

                            </div>
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                }

                // Default Legacy Client View
                return (
                  <div className="flex-1 flex flex-col h-full overflow-hidden" id="legacy-client-view">
                    {/* Detail Header bar */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleCloseDetail}
                          className="p-1 hover:bg-slate-200 text-slate-500 rounded block lg:hidden"
                          aria-label="Back to queue"
                        >
                          <X size={18} />
                        </button>
                        <div>
                          <span className="text-[9px] font-extrabold font-mono text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100 leading-none">{ticket.id}</span>
                          <p className="text-[10px] text-slate-400 font-medium font-mono mt-0.5">{ticket.customer_name}</p>
                        </div>
                      </div>

                      {/* Client actions / details status tracker */}
                      <span className={`text-[10px] uppercase font-mono tracking-widest font-bold border px-2.5 py-1 rounded shadow-inner ${getStatusStyle(ticket.status_code || ticket.status)}`}>
                        {ticket.status_code ? ticket.status_code.replace('_', ' ') : ticket.status}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                      {/* AI Knowledge base dynamic search */}
                      <KnowledgeBaseSearch productId={(ticket as any).product_id || (ticket.title?.includes("INTEGRATOR") ? "prod-2" : ticket.title?.includes("RECON") ? "prod-1" : ticket.title?.includes("AML") ? "prod-3" : ticket.title?.includes("COLLATERAL") ? "prod-4" : "prod-2")} />

                      {/* Title and main issue description */}
                      <div className="border-b border-slate-100 pb-5">
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{ticket.title}</h2>
                        
                        <div className="flex items-center gap-3.5 mt-3.5 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5"><Clock size={13} /> {new Date(ticket.created_at).toLocaleString()}</span>
                          <span className="flex items-center gap-1.5"><User size={13} /> Coordinator: {ticket.creator_name}</span>
                          <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider font-bold text-[10px]">CATEGORY: {ticket.category}</span>
                        </div>

                        <div className="mt-4 p-4.5 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed text-slate-700 text-sm whitespace-pre-wrap">
                          {ticket.description}
                        </div>
                      </div>

                      {/* Gemini Historical Pattern Intelligence */}
                      <HistoricalPatternsWidget 
                        productId={(ticket as any).product_id || (ticket.title?.includes("INTEGRATOR") ? "prod-2" : ticket.title?.includes("RECON") ? "prod-1" : ticket.title?.includes("AML") ? "prod-3" : ticket.title?.includes("COLLATERAL") ? "prod-4" : "prod-2")} 
                        currentDescription={ticket.description}
                      />

                      {/* Comments logs stream for clients */}
                      <div className="space-y-4" id="client-comment-stream">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 font-mono">
                          Response logs / Thread ({comments.length})
                        </h3>

                        <div className="space-y-4">
                          {comments.map((comment) => {
                            const isInternal = comment.is_internal;
                            // Client can only view external public comments!
                            if (isInternal) return null;
                            const badge = getCommentTypeBadge(comment);
                            return (
                              <div 
                                key={comment.id}
                                className="p-4 rounded-xl border transition bg-white border-slate-200 shadow-2xs"
                              >
                                <div className="flex justify-between items-center mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-slate-950 text-teal-400 text-[10px] font-bold rounded-full flex items-center justify-center font-mono">
                                      {getInitials(comment.author_name)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-900">{comment.author_name}</span>
                                    <span className={`text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded border ${badge.style}`}>
                                      {badge.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">{new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap pl-8">{comment.content}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Common text area editor footer for public messages */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                      <form onSubmit={handleAddCommentSubmit} className="space-y-3">
                        <textarea
                          placeholder="Draft public response..."
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          required
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs placeholder-slate-400 ring-offset-white focus:outline-none focus:ring-1 focus:ring-teal-500 h-20 transition"
                        />

                        <div className="flex justify-end items-center">
                          <button
                            type="submit"
                            disabled={isAddingComment || !commentContent.trim()}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition"
                          >
                            {isAddingComment ? 'Syncing...' : 'Dispatch Comment'}
                            <Send size={12} />
                          </button>
                        </div>
                      </form>
                    </div>

                  </div>
                );
              })()
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 p-8 text-xs">
                File not indexed correctly. Check reference catalog.
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <MessageSquareCode className="w-12 h-12 text-slate-200 mb-4" />
              <h3 className="font-bold text-slate-900 text-sm">No Active Ticket Indexed</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
                Select a support ticket tracking ID from the list on the left to review telemetry history and append logging responses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL OVERLAY DRAWER */}
      {isCreateAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-4xl py-12 animate-in fade-in zoom-in-95 duration-200">
            {createSuccess && createdTicketInfo ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden font-sans max-w-xl mx-auto text-left">
                {/* Confirmed Header */}
                <div className="bg-slate-950 text-white p-6 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/40 via-transparent to-transparent"></div>
                  <div className="relative z-10 space-y-2">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                      ✓
                    </div>
                    <span className="text-[10px] tracking-widest font-mono font-bold text-teal-400 uppercase block">
                      PIO-SUPPORT CONSOLE • ARCHIVE CONFIRMED
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-white animate-pulse">
                      Ticket Successfully Archived!
                    </h2>
                  </div>
                </div>

                <div className="p-6 space-y-5 text-left">
                  <div className="space-y-2.5">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider font-mono">Submission Summary</h4>
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-slate-400 font-bold font-mono">SUBJECT / TITLE:</span>
                        <span className="text-slate-900 font-bold text-right">{createdTicketInfo.title}</span>
                      </div>
                      <div className="h-px bg-slate-200/50"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold font-mono">PRODUCT:</span>
                        <span className="text-slate-800 font-semibold">{createdTicketInfo.productName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs text-slate-600 leading-relaxed">
                    💬 <strong className="text-slate-800">Our team has been notified.</strong> An administrator will assign a specialist to your ticket shortly.
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const ticketIdToSelect = createdTicketInfo.id;
                        handleCloseCreateModal();
                        if (ticketIdToSelect) {
                          setTimeout(() => {
                            handleSelectTicket(ticketIdToSelect);
                          }, 100);
                        }
                      }}
                      className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-teal-400 border border-teal-900/30 font-bold font-mono text-[11px] uppercase tracking-wider px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 cursor-pointer"
                    >
                      <span>View My Tickets</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <SmartTicketWizard 
                organizationId={user?.customer_id || user?.tenant_id || undefined}
                onCancel={handleCloseCreateModal}
                onSubmitTicket={async (payload) => {
                  try {
                    setCreateError(null);

                    let diagnosticPayloadText = '';
                    if (payload.answers) {
                      diagnosticPayloadText = `\n\n---------- COGNITIVE AI DIAGNOSTICS ----------\n`;
                      Object.entries(payload.answers).forEach(([key, val]) => {
                        const formattedVal = Array.isArray(val) ? val.join(', ') : val;
                        diagnosticPayloadText += `[${key}] ${formattedVal}\n`;
                      });
                    }

                    const descriptionPayload = 
                      `Core Operational Narrative:\n${payload.description}` +
                      diagnosticPayloadText + 
                      `\n\n---------- TECHNICAL AUDIT TELEMETRY ----------\n` +
                      `Authorized Product: ${payload.product}\n` +
                      `Target Module: ${payload.module}\n` +
                      `Issue Type: ${payload.issueType}\n`;

                    const created = await api.submitWizardTicket({
                      customerId: user?.customer_id || user?.tenant_id || 't-riyadh',
                      productId: payload.product,
                      priorityId: payload.priority === 'urgent' ? 'p-urgent' : payload.priority === 'high' ? 'p-high' : payload.priority === 'low' ? 'p-low' : 'p-medium',
                      title: payload.title,
                      description: descriptionPayload,
                      createdBy: user?.id || 'u-client1',
                      customerName: user?.full_name || 'Client User',
                      productName: getProductNameById(payload.product) || 'Authorized Product',
                      aiRecommendation: {
                        rootCause: "Based on your selections, this appears to be a known issue type.",
                        recommendedActions: ["Please refer to the suggested articles provided in the wizard."],
                        estimatedCategory: payload.issueType,
                        severity: payload.priority
                      },
                      diagnosticAnswers: Object.entries(payload.answers).map(([k, v]) => ({ question_text: k, answer_text: Array.isArray(v) ? v.join(', ') : v }))
                    });

                    setCreatedTicketInfo({
                      id: created.id,
                      title: created.title,
                      productName: getProductNameById(payload.product) || 'Authorized Product',
                      priority: created.priority
                    });

                    queryClient.invalidateQueries({ queryKey: ['tickets'] });
                    setCreateSuccess(true);
                  } catch (err: any) {
                    console.error("Failed to submit ticket from wizard:", err);
                    setCreateError(err.message || 'Failed to submit ticket');
                    throw err; // Let the wizard know the submission failed
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {ticket && user && (
        <ResolutionModal
          isOpen={isResolutionModalOpen}
          onClose={() => setIsResolutionModalOpen(false)}
          ticketId={ticket.id}
          ticketTitle={ticket.title}
          productId={(ticket as any).product_id || 'prod-1'}
          agentId={user.id}
          agentName={user.full_name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            queryClient.invalidateQueries({ queryKey: ['ticket', ticket.id] });
          }}
        />
      )}

    </div>
    </div>
  );
};
