import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 font-sans text-slate-100">
      <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Abstract background highlight */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 animate-pulse">
            <ShieldAlert size={28} />
          </div>

          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-md mb-2">
            HTTP STATUS 403: Forbidden
          </span>

          <h1 className="text-2xl font-black tracking-tight text-white mb-2">
            Restricted System Area
          </h1>
          
          <p className="text-slate-400 text-xs leading-relaxed mb-6">
            Your current assigned role (<span className="font-mono text-amber-400 font-semibold">{user?.role_name || 'Guest'}</span>) is not elevated to access the root System Administration registry. This attempt has been logged for security audit tracing.
          </p>

          {/* ADDED DEBUGGING SECTION AS REQUESTED */}
          <div className="w-full bg-black/50 border border-rose-500/30 rounded-xl p-4 mb-6 text-left overflow-hidden">
            <h3 className="text-rose-400 text-xs font-bold mb-2">RUNTIME DIAGNOSTICS</h3>
            <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto p-2 bg-black rounded">
{`user?.role_name: ${user?.role_name}
user?.role_name: ${user?.role_name}
user?.email: ${user?.email}
user?.id: ${user?.id}

user = ${JSON.stringify(user, null, 2)}`}
            </pre>
            {console.log("UNAUTHORIZED_USER", user)}
            {console.log("user?.role_name", user?.role_name)}
            {console.log("user?.role_name", user?.role_name)}
            {console.log("user?.email", user?.email)}
            {console.log("user?.id", user?.id)}
          </div>

          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8 text-left">
            <div className="flex items-start gap-2.5 text-xs">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-300">Multitenancy RLS Active</p>
                <p className="text-slate-500 mt-1">Contact your PIO-TECH Administrator to elevate credentials to `'administrator'` status if this is an error.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Dashboard</span>
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-600/10"
            >
              <span>Switch Accounts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
