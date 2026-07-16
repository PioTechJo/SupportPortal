import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { forceLocalMode } from '../lib/api';
import { supabase } from '../lib/supabase';
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
  ChevronDown,
  Menu,
  Clock,
  History,
  Mail
} from 'lucide-react';
import logoWhite from '../assets/pio-tech-logo-white.png';

interface AppLayoutProps {
  children: React.ReactNode;
}

const getBreadcrumbTitle = (pathname: string, t: any) => {
  const path = pathname.replace(/^\//, ''); // remove leading slash
  
  if (path.startsWith('tickets/') && path.split('/').length > 1) {
    const id = path.split('/')[1];
    if (id.length >= 8) {
      return `${t('layout.supportTickets')} / TK-${id.slice(0, 8).toUpperCase()}`;
    }
  }
  
    const pathKeyMap: Record<string, string> = {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'tickets': 'supportTickets',
    'users': 'users',
    'admin/overview': 'overview',
    'admin/data-assistant': 'askYourData',
    'admin/reports': 'reportBuilder',
    'admin/aging-report': 'agingReport',
    'diagnostic-builder': 'diagnosticBuilder',
    'recommendation-rules': 'recommendationRules',
    'admin/sla': 'slaConfiguration',
    'admin/emails': 'emailLogs',
    'admin': 'banksManagement'
  };
  const key = pathKeyMap[path];
  if (key) return t(`layout.${key}`);
  return path || t('layout.dashboard');
};

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, signOut, dbMode } = useAuth();
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdminConfigExpanded, setIsAdminConfigExpanded] = useState(false);
  const [isAdminReportingExpanded, setIsAdminReportingExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const currentLang = i18n.language || localStorage.getItem('appLanguage') || 'en';
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLang;
  }, [i18n.language]);

  const toggleLanguage = async () => {
    const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    await i18n.changeLanguage(newLang);
    
    localStorage.setItem('appLanguage', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', user?.id, 'unreadCount'],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('profile_id', user!.id).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigationItems = [
    { name: 'dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['client', 'cab_user', 'agent', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD'] },
    { name: 'supportTickets', path: '/tickets', icon: TicketCheck, roles: ['client', 'cab_user', 'agent', 'BANK_USER', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD'] },
    { name: 'myEscalations', path: '/tickets', icon: TicketCheck, roles: ['TEAM_MEMBER'] },
    { name: 'users', path: '/users', icon: Users, roles: ['SUPPORT_OFFICER'] },
  ];

  const allowedNavigation = navigationItems.filter(item => {
    if (!user || !user.role_code) return false;
    const roleUpper = user.role_code.toUpperCase();
    return item.roles.some(r => r.toUpperCase() === roleUpper);
  });

  const isAdmin = user?.role_code && ['ADMIN', 'ADMINISTRATOR', 'SUPPORT_MANAGER', 'CEO', 'SYS_ADMIN'].includes(user.role_code.toUpperCase());

  const adminNavItems = [
    { name: 'supportTickets', path: '/tickets', icon: TicketCheck },
    { name: 'overview', path: '/admin/overview', icon: LayoutDashboard },
  ];

  const adminReportingItems = [
    { name: 'askYourData', path: '/admin/data-assistant', icon: Database },
    { name: 'reportBuilder', path: '/admin/reports', icon: TableProperties },
    { name: 'agingReport', path: '/admin/aging-report', icon: Clock },
    { name: 'ticketLifecycle', path: '/admin/ticket-lifecycle', icon: History },
  ];

  const adminConfigItems = [
    { name: 'diagnosticBuilder', path: '/diagnostic-builder', icon: Settings2 },
    { name: 'recommendationRules', path: '/recommendation-rules', icon: Brain },
    { name: 'slaConfiguration', path: '/admin/sla', icon: Clock },
    { name: 'emailLogs', path: '/admin/emails', icon: Mail },
    { name: 'banksManagement', path: '/admin', icon: Settings },
    { name: 'users', path: '/users', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex font-sans">

      {/* Mobile drawer backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 h-screen overflow-y-auto bg-[#1a1f2e] flex flex-col py-4 border-r border-[#1a1f2e] shrink-0 z-40 custom-scrollbar
          transition-transform duration-200 md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'}
        `}
        style={{
          width: isExpanded ? '220px' : '52px',
          transition: 'width 200ms ease-in-out, transform 200ms ease-in-out'
        }}
      >
        
        {/* Logo area */}
        <div className={`flex items-center mb-8 px-2 h-[32px] ${isExpanded ? 'px-4' : 'justify-center'}`}>
          <img 
            src={logoWhite} 
            alt="Pio-Tech" 
            className={`h-auto object-contain transition-all duration-200 ${isExpanded ? 'w-[140px] opacity-100' : 'w-8 opacity-100'}`}
          />
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
                title={!isExpanded ? t(`layout.${item.name}`) : undefined}
                className={`
                  flex items-center rounded-lg transition-colors overflow-hidden
                  ${isExpanded ? 'w-full px-3 py-2.5 h-10 gap-3' : 'w-10 h-10 justify-center shrink-0'}
                  ${isActive 
                    ? 'bg-[#2d3548] text-white' 
                    : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                  {t(`layout.${item.name}`)}
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
                    title={!isExpanded ? t(`layout.${item.name}`) : undefined}
                    className={`
                      flex items-center rounded-lg transition-colors overflow-hidden
                      ${isExpanded ? 'w-full px-3 py-2.5 h-10 gap-3' : 'w-10 h-10 justify-center shrink-0'}
                      ${isActive 
                        ? 'bg-[#2d3548] text-white' 
                        : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                    `}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                    <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                      {t(`layout.${item.name}`)}
                    </span>
                  </Link>
                );
              })}

              <div className={`mt-2 mb-2 w-full flex flex-col ${!isExpanded ? 'items-center' : ''}`}>
                <button 
                  onClick={() => setIsAdminReportingExpanded(!isAdminReportingExpanded)}
                  title={!isExpanded ? t('layout.reportingManagement') : undefined}
                  className={`flex items-center justify-between rounded-lg transition-colors overflow-hidden
                    ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0 hidden'}
                    text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50
                  `}
                >
                  <span className={`whitespace-nowrap font-bold text-[11px] tracking-wider transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {t('layout.reporting')}
                  </span>
                  {isExpanded && <ChevronDown size={14} className={`transform transition-transform ${isAdminReportingExpanded ? 'rotate-180' : ''}`} />}
                </button>
                
                {(isAdminReportingExpanded || !isExpanded) && (
                  <div className={`flex flex-col gap-2 w-full ${isExpanded ? 'mt-1' : ''} ${!isExpanded ? 'items-center' : ''}`}>
                    {adminReportingItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          title={!isExpanded ? t(`layout.${item.name}`) : undefined}
                          className={`
                            flex items-center rounded-lg transition-colors overflow-hidden
                            ${isExpanded ? 'w-full px-3 py-2.5 h-10 gap-3' : 'w-10 h-10 justify-center shrink-0'}
                            ${isActive 
                              ? 'bg-[#2d3548] text-white' 
                              : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                          `}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                          <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                            {t(`layout.${item.name}`)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`mt-2 mb-2 w-full flex flex-col ${!isExpanded ? 'items-center' : ''}`}>
                <button 
                  onClick={() => setIsAdminConfigExpanded(!isAdminConfigExpanded)}
                  title={!isExpanded ? t('layout.configAdmin') : undefined}
                  className={`flex items-center justify-between rounded-lg transition-colors overflow-hidden
                    ${isExpanded ? 'w-full px-3 py-2.5 h-10' : 'w-10 h-10 justify-center shrink-0 hidden'}
                    text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50
                  `}
                >
                  <span className={`whitespace-nowrap font-bold text-[11px] tracking-wider transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {t('layout.configuration')}
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
                          title={!isExpanded ? t(`layout.${item.name}`) : undefined}
                          className={`
                            flex items-center rounded-lg transition-colors overflow-hidden
                            ${isExpanded ? 'w-full px-3 py-2.5 h-10 gap-3' : 'w-10 h-10 justify-center shrink-0'}
                            ${isActive 
                              ? 'bg-[#2d3548] text-white' 
                              : 'text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50'}
                          `}
                        >
                          <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                          <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                            {t(`layout.${item.name}`)}
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
            title={!isExpanded ? t('layout.signOut') : undefined}
            className={`flex items-center rounded-lg text-[#8892a4] hover:text-red-400 hover:bg-red-900/20 transition-colors overflow-hidden
              ${isExpanded ? 'w-full px-3 py-2.5 h-10 gap-3' : 'w-10 h-10 justify-center shrink-0'}
            `}
          >
            <LogOut size={20} className="shrink-0" />
            <span className={`whitespace-nowrap font-medium text-[14px] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
              {t('layout.signOut')}
            </span>
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? t('layout.collapseSidebar') : t('layout.expandSidebar')}
            className={`hidden md:flex items-center justify-center rounded-lg text-[#8892a4] hover:text-[#cdd3e0] hover:bg-slate-800/50 transition-colors overflow-hidden mt-2
              w-10 h-10 shrink-0 ${isExpanded ? 'ml-2' : ''}
            `}
          >
            {isExpanded ? <ChevronLeft size={20} className="shrink-0 rtl:rotate-180" /> : <ChevronRight size={20} className="shrink-0 rtl:rotate-180" />}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top bar */}
        {!location.pathname.match(/^\/tickets\/[a-zA-Z0-9-]+/) && (
        <header className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 shrink-0 z-30">
          <div className="flex items-center text-sm min-w-0">
            <button
              onClick={() => { setIsExpanded(true); setIsMobileMenuOpen(true); }}
              className="md:hidden mr-2 p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
              title={t('layout.expandSidebar')}
            >
              <Menu size={20} />
            </button>
            <span className="text-slate-400 font-medium hidden sm:inline">{t('layout.home')}</span>
            <span className="mx-2 text-slate-300 rtl:rotate-180 hidden sm:inline">›</span>
            <span className="text-slate-800 font-medium capitalize truncate">{getBreadcrumbTitle(location.pathname, i18n.t)}</span>
          </div>

          <div className="flex items-center gap-2 md:gap-5">
            <button 
              onClick={toggleLanguage}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              {i18n.language?.startsWith('ar') ? 'EN' : 'عربي'}
            </button>
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-lg transition-colors ${isNotifOpen ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {isNotifOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 flex flex-col max-h-[28rem]">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="font-semibold text-slate-800">{t('layout.notifications')}</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); markAllReadMutation.mutate(); }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        disabled={markAllReadMutation.isPending}
                      >
                        {t('layout.markAllRead')}
                      </button>
                    )}
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        {t('layout.noNotifications')}
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div 
                          key={notif.id}
                          onClick={() => {
                            if (!notif.is_read) markReadMutation.mutate(notif.id);
                            setIsNotifOpen(false);
                            if (notif.link_ticket_id) {
                              navigate(`/tickets/${notif.link_ticket_id}`);
                            }
                          }}
                          className={`
                            px-4 py-3 cursor-pointer rounded-lg mb-1 mx-1 transition-colors
                            ${notif.is_read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/50 hover:bg-indigo-50'}
                          `}
                        >
                          <div className="flex gap-3">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notif.is_read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                                {notif.content}
                              </p>
                              <div className="mt-1 text-xs text-slate-400">
                                {timeAgo(notif.created_at)}
                              </div>
                            </div>
                            {!notif.is_read && (
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-end hidden sm:block">
                <div className="text-sm font-medium text-slate-900 leading-tight">{user?.full_name || 'User'}</div>
                <div className="text-xs text-slate-500 leading-tight">{user?.role_name ? t(`roles.${user.role_name}`, { defaultValue: user.role_name }) : t('roles.Guest', { defaultValue: 'Guest' })}</div>
              </div>
              <img 
                src={(user?.avatar_url && !user.avatar_url.includes('unsplash.com')) ? user.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=f97316&color=fff&bold=true`} 
                alt={user?.full_name} 
                className="w-9 h-9 rounded-full object-cover border border-slate-200"
              />
            </div>
          </div>
        </header>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 px-3 md:px-6">
          {children}
        </main>

      </div>
    </div>
  );
};
