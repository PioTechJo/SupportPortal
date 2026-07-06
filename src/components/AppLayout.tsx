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
  HelpCircle,
  BarChart3,
  CheckCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Brain,
  TableProperties,
  ChevronDown
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getBreadcrumbTitle = (pathname: string) => {
  const path = pathname.replace(/^\//, ''); // remove leading slash
  
  if (path.startsWith('tickets/') && path.split('/').length > 1) {
    const id = path.split('/')[1];
    if (id.length >= 8) {
      return `Tickets / TK-${id.slice(0, 8).toUpperCase()}`;
    }
  }
  
  return path || 'Dashboard';
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, signOut, dbMode } = useAuth();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdminConfigExpanded, setIsAdminConfigExpanded] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['client', 'cab_user', 'agent', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD'] },
    { name: 'Support Tickets', path: '/tickets', icon: TicketCheck, roles: ['client', 'cab_user', 'agent', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD'] },
    { name: 'Users', path: '/users', icon: Users, roles: ['SUPPORT_OFFICER'] },
  ];

  const allowedNavigation = navigationItems.filter(item => {
    if (!user || !user.role_name) return false;
    const roleUpper = user.role_name.toUpperCase();
    return item.roles.some(r => r.toUpperCase() === roleUpper);
  });

  const isAdmin = user?.role_name && ['ADMIN', 'ADMINISTRATOR', 'SUPPORT_MANAGER', 'CEO'].includes(user.role_name.toUpperCase());

  const adminNavItems = [
    { name: 'Support Tickets', path: '/tickets', icon: TicketCheck },
    { name: 'Overview', path: '/admin/overview', icon: LayoutDashboard },
    { name: 'Report Builder', path: '/admin/reports', icon: TableProperties },
  ];

  const adminConfigItems = [
    { name: 'Diagnostic Builder', path: '/diagnostic-builder', icon: Settings2 },
    { name: 'Recommendation Rules', path: '/recommendation-rules', icon: Brain },
    { name: 'Banks Management', path: '/admin', icon: Settings },
    { name: 'Users', path: '/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">
      
      <aside 
        className="sticky top-0 h-screen overflow-y-auto bg-[#1a1f2e] flex flex-col py-4 border-r border-[#1a1f2e] shrink-0 z-40 custom-scrollbar"
        style={{ 
          width: isExpanded ? '220px' : '52px',
          transition: 'width 200ms ease-in-out'
        }}
      >
        
        {/* Logo area */}
        <div className={`flex items-center mb-8 px-2 ${isExpanded ? 'px-4' : 'justify-center'}`}>
          <div className="w-8 h-8 rounded bg-[#f97316] flex items-center justify-center font-bold text-white tracking-wider cursor-pointer shrink-0 shadow-sm">
            PT
          </div>
          <span className={`font-bold text-white whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 ml-3 w-auto' : 'opacity-0 w-0 overflow-hidden ml-0'}`}>
            PioTech
          </span>
        </div>

        {/* Vertical Icons */}
        <nav className={`flex-1 flex flex-col gap-2 w-full px-1.5 ${!isExpanded && 'items-center'}`}>
          {!isAdmin && allowedNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                title={!isExpanded ? item.name : undefined}
                className={`
                  flex items-center rounded-lg transition-colors overflow-hidden
                  ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0'}
                  ${isActive 
                    ? 'bg-[#2d3548] text-white' 
                    : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden ml-0'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!isExpanded ? item.name : undefined}
                    className={`
                      flex items-center rounded-lg transition-colors overflow-hidden
                      ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0'}
                      ${isActive 
                        ? 'bg-[#2d3548] text-white' 
                        : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                    `}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden ml-0'}`}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}

              <div className={`mt-2 mb-2 w-full flex flex-col ${!isExpanded ? 'items-center' : ''}`}>
                <button 
                  onClick={() => setIsAdminConfigExpanded(!isAdminConfigExpanded)}
                  title={!isExpanded ? "Configuration & Administration" : undefined}
                  className={`flex items-center justify-between rounded-lg transition-colors overflow-hidden
                    ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0 hidden'}
                    text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50
                  `}
                >
                  <span className={`whitespace-nowrap font-bold text-[11px] tracking-wider transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    CONFIGURATION
                  </span>
                  {isExpanded && <ChevronDown size={14} className={`transform transition-transform ${isAdminConfigExpanded ? 'rotate-180' : ''}`} />}
                </button>
                
                {(isAdminConfigExpanded || !isExpanded) && (
                  <div className={`flex flex-col gap-2 w-full ${isExpanded ? 'mt-1' : ''} ${!isExpanded ? 'items-center' : ''}`}>
                    {adminConfigItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          title={!isExpanded ? item.name : undefined}
                          className={`
                            flex items-center rounded-lg transition-colors overflow-hidden
                            ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0'}
                            ${isActive 
                              ? 'bg-[#2d3548] text-white' 
                              : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                          `}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                          <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden ml-0'}`}>
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Bottom Icons (Logout, Collapse) */}
        <div className={`flex flex-col gap-2 w-full mt-auto px-1.5 ${!isExpanded && 'items-center'}`}>
          <button
            onClick={handleSignOut}
            title={!isExpanded ? "Sign Out" : undefined}
            className={`flex items-center rounded-lg text-[#8892a4] hover:text-red-400 hover:bg-red-900/20 transition-colors overflow-hidden
              ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0'}
            `}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100 ml-3' : 'opacity-0 w-0 overflow-hidden ml-0'}`}>
              Sign Out
            </span>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
            className={`flex items-center justify-center rounded-lg text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50 transition-colors overflow-hidden mt-2
              w-10 h-10 shrink-0 ${isExpanded ? 'ml-2' : ''}
            `}
          >
            {isExpanded ? <ChevronLeft size={20} className="shrink-0" /> : <ChevronRight size={20} className="shrink-0" />}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top bar */}
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30">
          <div className="flex items-center text-sm">
            <span className="text-slate-400 font-medium">Home</span>
            <span className="mx-2 text-slate-300">›</span>
            <span className="text-slate-800 font-medium capitalize">{getBreadcrumbTitle(location.pathname)}</span>
          </div>

          <div className="flex items-center gap-5">
            <button className="text-slate-400 hover:text-slate-600 relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#f97316] rounded-full border border-white"></span>
            </button>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-900 leading-tight">{user?.full_name || 'User'}</div>
                <div className="text-xs text-slate-500 leading-tight">{user?.role_name || 'Guest'}</div>
              </div>
              <img 
                src={(user?.avatar_url && !user.avatar_url.includes('unsplash.com')) ? user.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=f97316&color=fff&bold=true`} 
                alt={user?.full_name} 
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </main>

      </div>
    </div>
  );
};
