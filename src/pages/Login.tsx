import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Building, User, Mail, Database, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, dbMode } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide a valid corporate email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const loggedUser = await signIn(email, password);
      
      // Redirect based on role:
      const roleUp = loggedUser.role_name?.toUpperCase() || '';
      if (['ADMIN', 'ADMINISTRATOR', 'SYS_ADMIN', 'CEO', 'SUPPORT_MANAGER'].includes(roleUp)) {
        navigate('/admin/dashboard');
      } else if (loggedUser.role_name === 'agent') {
        navigate('/agent/dashboard');
      } else if (loggedUser.role_name === 'cab_user' || loggedUser.role_name === 'client') {
        navigate('/portal/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Sign-in process failed:", err);
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Simple Brand Placeholder Above Content */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            {dbMode === 'supabase' ? 'Supabase Secure Access' : 'Simulated DB Sync Active'}
          </span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Container White Card with Dark Navy Header */}
        <div className="bg-white shadow-xl sm:rounded-2xl overflow-hidden border border-slate-200">
          
          {/* Dark Navy Header with PIO-TECH logo text */}
          <div className="bg-slate-950 px-8 py-7 border-b border-teal-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-400 flex items-center justify-center font-black text-slate-950 text-lg shadow-md shadow-teal-400/20">
                PT
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  PIO-TECH
                </h1>
                <p className="text-[10px] text-teal-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                  Support Portal
                </p>
              </div>
            </div>
          </div>

          <div className="py-8 px-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-2">
              Sign In to Your Secure Portal
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
                  Email Address
                </label>
                <div className="mt-2 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                    placeholder="email@example.com"
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs uppercase font-bold tracking-wider text-slate-500">
                  Password
                </label>
                <div className="mt-2 relative rounded-md shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound size={15} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 text-slate-900 rounded-lg border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-sm transition"
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
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Secure Login</span>
                      <ArrowRight size={15} />
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
