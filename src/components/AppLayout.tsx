import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { forceLocalMode } from '../lib/api';
import { 
  LayoutDashboard, 
  TicketCheck, 
  Settings, 
  Users, 
  LogOut, 
  Database, 
  Building2, 
  Menu, 
  X, 
  Shield, 
  CheckCircle,
  HelpCircle,
  BarChart3
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, signOut, dbMode } = useAuth();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  console.log("6. AppLayout render user:", { role: user?.role, role_name: user?.role_name, fullObject: user });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleToggleDbMode = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    forceLocalMode(value === 'local');
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['client', 'cab_user', 'agent', 'admin', 'administrator', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_MANAGER', 'CEO'] },
    { name: 'Support Tickets', path: '/tickets', icon: TicketCheck, roles: ['client', 'cab_user', 'agent', 'admin', 'administrator', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_MANAGER', 'CEO'] },
    { name: 'Resolution Approvals', path: '/resolution-approvals', icon: CheckCircle, roles: ['agent', 'admin', 'administrator', 'SUPPORT_OFFICER', 'SUPPORT_MANAGER', 'CEO'] },
    { name: 'Analytics Dashboard', path: '/admin/analytics', icon: BarChart3, roles: ['admin', 'administrator', 'SUPPORT_MANAGER', 'CEO'] },
    { name: 'System Admin', path: '/admin', icon: Settings, roles: ['admin', 'administrator', 'SUPPORT_MANAGER', 'CEO'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['admin', 'administrator', 'SUPPORT_MANAGER', 'CEO', 'SUPPORT_OFFICER'] },
  ];

  const allowedNavigation = navigationItems.filter(item => {
    if (!user || !user.role_name) return false;
    const roleUpper = user.role_name.toUpperCase();
    return item.roles.some(r => r.toUpperCase() === roleUpper);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-teal-500 flex items-center justify-center font-bold text-slate-900 tracking-wider">
            PT
          </div>
          <span className="font-semibold tracking-tight text-lg">PIO-TECH Support</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 hover:bg-slate-800 rounded transition"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar (Desktop & Collapsible Mobile) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo Brand Bar */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-teal-400 flex items-center justify-center font-extrabold text-slate-900 text-lg shadow-md shadow-teal-500/10">
                PT
              </div>
              <div>
                <h1 className="font-bold text-white tracking-tight leading-none text-base">PIO-TECH</h1>
                <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-widest mt-1 block">Support Portal</span>
              </div>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-white rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Current Tenant Badge (if client/cab_user/BANK_USER) */}
          {(user?.role_name?.toUpperCase() === 'CLIENT' || user?.role_name?.toUpperCase() === 'CAB_USER' || user?.role_name?.toUpperCase() === 'BANK_USER') && currentTenant && (
            <div className="mx-4 my-4 p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center gap-2">
              <span className="text-xl">{currentTenant.logo_url || '🏢'}</span>
              <div className="truncate">
                <p className="text-xs text-slate-400 font-medium font-mono">ORGANIZATION</p>
                <p className="text-sm font-semibold text-white truncate">{currentTenant.name}</p>
              </div>
            </div>
          )}

          {/* User Profile Summary */}
          <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-3">
            <img 
              src={(user?.avatar_url && !user.avatar_url.includes('unsplash.com')) ? user.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=0D8B95&color=fff&bold=true`} 
              alt={user?.full_name} 
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-white truncate">{user?.full_name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider leading-none text-slate-900 bg-teal-400`}>
                  {user?.role_name}
                </span>
                {(user?.role_name?.toUpperCase() === 'ADMIN' || user?.role_name?.toUpperCase() === 'ADMINISTRATOR' || user?.role_name?.toUpperCase() === 'SYS_ADMIN' || user?.role_name?.toUpperCase() === 'CEO' || user?.role_name?.toUpperCase() === 'SUPPORT_MANAGER') && <Shield size={12} className="text-teal-400" />}
              </div>
            </div>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            {allowedNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition duration-200
                    ${isActive 
                      ? 'bg-teal-500 text-slate-900 font-semibold' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Database Toggle & Sign Out Footer */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          {/* DB Control Engine */}
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5 mb-1.5">
              <Database size={11} className="text-teal-400" />
              DB Engine Module
            </label>
            <select
              value={dbMode}
              onChange={handleToggleDbMode}
              className="w-full bg-slate-950 text-slate-200 text-xs rounded border border-slate-700 p-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              <option value="supabase">Supabase Server (Cloud)</option>
              <option value="local">Stateful Local DB (Mock)</option>
            </select>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${dbMode === 'supabase' ? 'bg-teal-400 animate-pulse' : 'bg-amber-400'}`} />
              Running in {dbMode === 'supabase' ? 'Cloud database' : 'Local Sandbox'}
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-slate-400 hover:bg-red-950/40 hover:text-red-400 transition duration-200 text-sm font-medium"
          >
            <span className="flex items-center gap-3">
              <LogOut size={18} />
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Panel bar */}
        <header className="hidden md:flex bg-white h-16 border-b border-slate-200 items-center justify-between px-8 shadow-xs">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">PIO-TECH SUPPORT CENTER</span>
            <span>/</span>
            <span className="capitalize">{location.pathname.replace('/', '')}</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-slate-100 hover:bg-slate-200 cursor-pointer transition px-3 py-1.5 rounded text-slate-600 font-mono flex items-center gap-1">
              <Database size={12} className={dbMode === 'supabase' ? 'text-teal-600' : 'text-amber-500'} />
              Database Mode: <strong className="uppercase">{dbMode}</strong>
            </span>
            <span className="text-xs font-mono text-slate-400">
              System Time: 2026-06-23 UTC
            </span>
          </div>
        </header>

        {/* Page Inner Container */}
        <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
