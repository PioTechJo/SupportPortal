import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Tenant } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Ticket, Clock, ShieldCheck, Users as UsersIcon, AlertTriangle, Zap } from 'lucide-react';

interface OrganizationOverviewTabProps {
  organization: Tenant;
  totalUsers: number;
}

export const OrganizationOverviewTab: React.FC<OrganizationOverviewTabProps> = ({ organization, totalUsers }) => {
  const { user } = useAuth();
  const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes((user?.role_code || '').toUpperCase());

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    overdueTickets: 0,
    activeContracts: 0,
    missingOrExpiredContracts: 0
  });
  const [expressEnabled, setExpressEnabled] = useState(true);
  const [updatingExpress, setUpdatingExpress] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch tickets for this organization
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id, sla_due_date, status:ticket_statuses(status_code)')
          .eq('customer_id', organization.id);

        let totalT = 0;
        let openT = 0;
        let overdueT = 0;

        if (tickets) {
          totalT = tickets.length;
          const now = new Date();
          tickets.forEach((t: any) => {
            const code = t.status?.status_code?.toUpperCase();
            if (code !== 'CLOSED' && code !== 'APPROVED' && code !== 'RESOLVED_PENDING_APPROVAL') {
              openT++;
              if (t.sla_due_date && new Date(t.sla_due_date) < now) {
                overdueT++;
              }
            }
          });
        }

        // Fetch products and contracts
        const [orgProductsData, contractsData] = await Promise.all([
          supabase
            .from('organization_products')
            .select('product_code')
            .eq('organization_id', organization.id)
            .eq('is_active', true),
          supabase
            .from('maintenance_contracts')
            .select('*')
            .eq('customer_id', organization.id)
        ]);

        let activeC = 0;
        let missingOrExpiredC = 0;
        
        const products = orgProductsData.data || [];
        const contracts = contractsData.data || [];
        const today = new Date();
        today.setHours(0,0,0,0);

        products.forEach(p => {
          // Find latest contract for this product
          const productContracts = contracts.filter(c => c.product_id === p.product_id);
          if (productContracts.length === 0) {
            missingOrExpiredC++;
          } else {
            productContracts.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
            const latest = productContracts[0];
            if (new Date(latest.end_date) < today) {
              missingOrExpiredC++;
            } else {
              activeC++;
            }
          }
        });

        setStats({
          totalTickets: totalT,
          openTickets: openT,
          overdueTickets: overdueT,
          activeContracts: activeC,
          missingOrExpiredContracts: missingOrExpiredC
        });
      } catch (err) {
        console.error('Error fetching overview stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    supabase
      .from('customers')
      .select('express_enabled')
      .eq('id', organization.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setExpressEnabled(data.express_enabled !== false);
      });
  }, [organization.id]);

  const handleToggleExpress = async () => {
    const next = !expressEnabled;
    setUpdatingExpress(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ express_enabled: next })
        .eq('id', organization.id);
      if (error) throw error;
      setExpressEnabled(next);
    } catch (err) {
      console.error('Failed to update express_enabled:', err);
      alert('Failed to update Express Ticket access.');
    } finally {
      setUpdatingExpress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
        Loading overview...
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tickets Overview',
      value: `${stats.openTickets} / ${stats.totalTickets}`,
      subtitle: 'Open / Total Tickets',
      icon: Ticket,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      title: 'SLA Status',
      value: stats.overdueTickets,
      subtitle: 'Overdue Tickets',
      icon: Clock,
      color: stats.overdueTickets > 0 ? 'text-red-600' : 'text-emerald-600',
      bg: stats.overdueTickets > 0 ? 'bg-red-50' : 'bg-emerald-50'
    },
    {
      title: 'Contracts Health',
      value: `${stats.activeContracts} Active`,
      subtitle: stats.missingOrExpiredContracts > 0 ? `${stats.missingOrExpiredContracts} Expired/Missing` : 'All Products Covered',
      icon: stats.missingOrExpiredContracts > 0 ? AlertTriangle : ShieldCheck,
      color: stats.missingOrExpiredContracts > 0 ? 'text-amber-600' : 'text-teal-600',
      bg: stats.missingOrExpiredContracts > 0 ? 'bg-amber-50' : 'bg-teal-50'
    },
    {
      title: 'Registered Users',
      value: totalUsers,
      subtitle: 'Active accounts',
      icon: UsersIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Organization Overview</h2>
        <p className="text-sm text-slate-500">Summary of the current state and health of this organization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className={`p-4 rounded-xl ${card.bg} ${card.color} mb-4`}>
              <card.icon size={28} />
            </div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</h3>
            <div className="text-3xl font-black text-slate-800 mt-2 mb-1">{card.value}</div>
            <p className="text-sm font-medium text-slate-500">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${expressEnabled ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
              <Zap size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Express Ticket Access</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {expressEnabled
                  ? 'This organization can use the urgent "Report Urgent Issue" fast-path.'
                  : 'Express Ticket is disabled for this organization (e.g. due to misuse).'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleExpress}
            disabled={updatingExpress}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${expressEnabled ? 'bg-red-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${expressEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      )}
    </div>
  );
};
