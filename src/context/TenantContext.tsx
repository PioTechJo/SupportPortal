import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Tenant } from '../types';
import { useAuth } from './AuthContext';

interface TenantContextType {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  loading: boolean;
  refreshTenants: () => Promise<void>;
  createTenant: (tenant: Omit<Tenant, 'id' | 'created_at'>) => Promise<Tenant>;
  updateTenant: (id: string, updates: Partial<Tenant>) => Promise<Tenant>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const data = await api.getTenants();
      setTenants(data);

      const userTenantId = user?.customer_id || user?.tenant_id;
      if (user && userTenantId) {
        const found = data.find(t => t.id === userTenantId);
        setCurrentTenant(found || null);
      } else {
        setCurrentTenant(null);
      }
    } catch (err) {
      console.error("Failed to fetch tenants in context", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [user]);

  // Listen to forced db mode changes to force-reload tenants
  useEffect(() => {
    const handleDbModeChange = () => {
      fetchTenants();
    };
    window.addEventListener('db_mode_changed', handleDbModeChange);
    return () => {
      window.removeEventListener('db_mode_changed', handleDbModeChange);
    };
  }, [user]);

  const createTenant = async (tenantData: Omit<Tenant, 'id' | 'created_at'>): Promise<Tenant> => {
    const createdBy = user ? { id: user.id, name: user.name || (user as any).full_name || 'Admin' } : undefined;
    const newT = await api.createTenant(tenantData, createdBy);
    await fetchTenants();
    return newT;
  };

  const updateTenant = async (id: string, updates: Partial<Tenant>): Promise<Tenant> => {
    const updated = await api.updateTenant(id, updates);
    await fetchTenants();
    return updated;
  };

  return (
    <TenantContext.Provider value={{
      tenants,
      currentTenant,
      loading,
      refreshTenants: fetchTenants,
      createTenant,
      updateTenant
    }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
