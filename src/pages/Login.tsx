import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Shield, Building, User, Mail, Database, AlertCircle, KeyRound, ArrowRight, Globe } from 'lucide-react';
import logoImg from '../assets/pio-tech-logo.png';

export const Login: React.FC = () => {
  const { signIn, dbMode } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLanguage = async () => {
    const currentLang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    await i18n.changeLanguage(newLang);
    
    localStorage.setItem('appLanguage', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError(t('login.errorValidEmail'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await signIn(email, password);
      
      // Redirect based on role:
      const roleUp = loggedUser.role_code?.toUpperCase() || '';
      if (['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(roleUp)) {
        navigate('/admin/overview');
      } else if (['AGENT', 'SUPPORT_OFFICER', 'SUPPORT_ENGINEER', 'TEAM_LEAD', 'TEAM_MEMBER'].includes(roleUp)) {
        navigate('/agent/dashboard');
      } else if (['CLIENT', 'CAB_USER', 'BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'].includes(roleUp)) {
        navigate('/portal/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Sign-in process failed:", err);
      setError(err?.message || t('login.errorAuthFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <div className="absolute top-6 end-6">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white rounded-lg shadow-sm hover:bg-slate-50 border border-slate-200 transition-colors"
        >
          <Globe size={16} />
          {t('login.language')}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Simple Brand Placeholder Above Content */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            {dbMode === 'supabase' ? t('login.supabaseSecure') : t('login.simulatedDb')}
          </span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Container White Card with Dark Navy Header */}
        <div className="bg-white shadow-xl sm:rounded-2xl overflow-hidden border border-slate-200">
          
          {/* Header with PIO-TECH logo */}
          <div className="bg-white px-8 py-7 border-b border-slate-100 flex justify-center items-center">
            <img 
              src={logoImg} 
              alt="Pio-Tech Logo" 
              className="w-[180px] h-auto object-contain"
            />
          </div>

          <div className="py-8 px-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
              {t('login.signInToPortal')}
            </p>

            <form className="space-y-5" onSubmit={handleLogin}>
              {error && (
                <div id="login-error-alert" className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex flex-col gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs uppercase font-bold tracking-wider text-slate-500">
                  {t('login.emailAddress')}
                </label>
                <div className="mt-2 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={15} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    className="block w-full ps-9 pe-3 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs uppercase font-bold tracking-wider text-slate-500">
                  {t('login.password')}
                </label>
                <div className="mt-2 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 start-0 ps-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={15} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full ps-9 pe-3 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm transition-all shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('login.verifying')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('login.secureLogin')}</span>
                      <ArrowRight size={15} className="rtl:rotate-180" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
