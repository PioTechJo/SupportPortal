import React, { useState } from 'react';
import { Profile } from '../../types';
import { supabase } from '../../lib/supabase';
import { api } from '../../lib/api';
import { 
  ArrowLeft, Shield, Clock, Mail, CheckCircle2, AlertCircle, 
  Key, LogOut, Trash2, Ban, Lock, Fingerprint, Calendar, Building2, UserCircle2, Ticket, History, Settings
} from 'lucide-react';

interface UserDetailsProps {
  user: Profile;
  onBack: () => void;
  onRefresh: () => void;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'tickets' | 'audit' | 'settings'>('overview');
  
  // Security Tab States
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [forceChange, setForceChange] = useState(true);
  
  const isActive = user.status === 'active';

  // --- Handlers ---
  const handleGenerateTempPassword = () => {
    if (!window.confirm("Generate a new temporary password? You will need to securely share this with the user.")) return;
    const pwd = crypto.randomUUID().replace(/-/g, '').substring(0, 12) + 'A1!';
    setTempPassword(pwd);
  };

  const copyCredentials = () => {
    if (!tempPassword) return;
    const credText = `Portal:\nhttps://support.pio-tech.com\n\nUsername: ${user.email}\n\nTemporary Password: ${tempPassword}\n\nPlease change your password after first login.\nDo not save the password anywhere.`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetPassword = async () => {
    if (!window.confirm(`Send password reset email to ${user.email}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      alert('Password reset email sent successfully.');
    } catch (error: any) {
      alert(`Failed to send reset email: ${error.message}`);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = isActive ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to mark this user as ${newStatus}?`)) return;
    try {
      await api.updateProfile(user.id, { status: newStatus });
      onRefresh();
    } catch (error: any) {
      alert(`Failed to update status: ${error.message}`);
    }
  };

  const handleSignOutSessions = () => {
    alert("Sign out all sessions: Backend placeholder. (Requires Service Role to invalidate refresh tokens)");
  };

  const handleDeleteUser = () => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action is irreversible.`)) return;
    alert("Delete User: Backend placeholder. (Requires soft-delete logic or Auth deletion)");
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'N/A';
    return new Date(isoStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const roleDisplay = 
    user.role_name === 'ADMIN' ? 'System Administrator' :
    user.role_name === 'SUPPORT_ENGINEER' ? 'Support Engineer' :
    'Bank User';

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Directory</span>
        </button>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-3xl font-bold shadow-sm">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.name ? user.name.charAt(0).toUpperCase() : 'U'
                )}
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 leading-tight">
                  {user.name || user.full_name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm font-medium text-slate-500">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Shield size={14} className={user.role_name === 'ADMIN' ? 'text-purple-500' : 'text-blue-500'} />
                    {roleDisplay}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Building2 size={14} className="text-slate-400" />
                    {user.customer_name || user.customer_id || 'Internal'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Mail size={14} className="text-slate-400" />
                    {user.email}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                    isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Email Verified
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" />
                MFA Disabled
              </div>
            </div>
          </div>
        </div>

        {/* Tabs & Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="flex border-b border-slate-200 px-2 pt-2 bg-slate-50/50 overflow-x-auto">
            {['overview', 'security', 'tickets', 'audit', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors capitalize whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'border-indigo-500 text-indigo-700 bg-white' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                }`}
              >
                {tab === 'overview' && <UserCircle2 size={16} />}
                {tab === 'security' && <Shield size={16} />}
                {tab === 'tickets' && <Ticket size={16} />}
                {tab === 'audit' && <History size={16} />}
                {tab === 'settings' && <Settings size={16} />}
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8 flex-1 bg-white">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Identity Details</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Full Name</div>
                        <div className="text-sm text-slate-800 font-medium">{user.name || user.full_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Corporate Email</div>
                        <div className="text-sm text-slate-800 font-medium">{user.email}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Organization</div>
                        <div className="text-sm text-slate-800 font-medium">{user.customer_name || user.customer_id || 'Internal'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Role</div>
                        <div className="text-sm text-slate-800 font-medium">{roleDisplay}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Activity & Organizational</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Created</div>
                          <div className="text-sm text-slate-800 font-medium">{formatDate(user.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Last Login</div>
                          <div className="text-sm text-slate-800 font-medium">{formatDate(user.last_login)}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Department</div>
                        <div className="text-sm text-slate-400 italic font-medium">Not specified</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Job Title</div>
                        <div className="text-sm text-slate-400 italic font-medium">Not specified</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="max-w-4xl space-y-8">
                
                {/* Authentication Controls */}
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Lock size={20} className="text-slate-400" /> Authentication
                  </h3>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    {/* Generate Temp Password */}
                    <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">Generate Temporary Password</div>
                        <div className="text-sm text-slate-500">Create a secure temporary password for this user. Useful for initial onboarding or recovery.</div>
                      </div>
                      <div className="shrink-0 w-full md:w-auto">
                        {!tempPassword ? (
                          <button 
                            onClick={handleGenerateTempPassword}
                            className="w-full md:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                          >
                            <Key size={16} /> Generate Password
                          </button>
                        ) : (
                          <div className="w-full md:w-auto bg-white border border-emerald-200 rounded-lg p-3 shadow-sm">
                            <div className="font-mono font-bold text-lg text-emerald-700 text-center tracking-wider mb-2">{tempPassword}</div>
                            <div className="text-[10px] uppercase font-bold text-amber-600 text-center mb-3 flex items-center justify-center gap-1">
                              <AlertCircle size={12} /> This will never be shown again
                            </div>
                            <button
                              onClick={copyCredentials}
                              className={`w-full px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                                copied ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-800 text-white hover:bg-slate-700'
                              }`}
                            >
                              {copied ? <CheckCircle2 size={16} /> : <Key size={16} />}
                              {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reset Password */}
                    <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">Send Password Reset</div>
                        <div className="text-sm text-slate-500">Trigger the standard Supabase email flow containing a secure reset link.</div>
                      </div>
                      <button 
                        onClick={handleResetPassword}
                        className="shrink-0 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                      >
                        <Mail size={16} /> Send Reset Email
                      </button>
                    </div>

                    {/* Force Change Toggle */}
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">Force Password Change</div>
                        <div className="text-sm text-slate-500">Require the user to change their password on their next successful login.</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={forceChange}
                          onChange={(e) => setForceChange(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Session & Access Controls */}
                <section>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Fingerprint size={20} className="text-slate-400" /> Access Controls
                  </h3>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">Account Status</div>
                        <div className="text-sm text-slate-500">Temporarily disable login access without deleting the user data.</div>
                      </div>
                      <button 
                        onClick={handleToggleStatus}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 ${
                          isActive 
                            ? 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-50' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isActive ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        {isActive ? 'Deactivate User' : 'Activate User'}
                      </button>
                    </div>

                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
                      <div>
                        <div className="font-bold text-slate-800 mb-1">Active Sessions</div>
                        <div className="text-sm text-slate-500">Invalidate all existing refresh tokens, forcing the user to log in again on all devices.</div>
                      </div>
                      <button 
                        onClick={handleSignOutSessions}
                        className="shrink-0 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                      >
                        <LogOut size={16} /> Sign Out All Sessions
                      </button>
                    </div>
                  </div>
                </section>

                {/* Danger Zone */}
                <section>
                  <h3 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h3>
                  <div className="border border-red-200 bg-red-50 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-red-800 mb-1">Delete User</div>
                      <div className="text-sm text-red-600">Permanently remove this user. This action cannot be undone.</div>
                    </div>
                    <button 
                      onClick={handleDeleteUser}
                      className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete User
                    </button>
                  </div>
                </section>

              </div>
            )}

            {/* TICKETS TAB */}
            {activeTab === 'tickets' && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 py-12">
                <Ticket size={48} className="text-slate-200" />
                <h3 className="text-xl font-bold text-slate-700">Support Tickets</h3>
                <p className="max-w-md text-center text-sm">
                  Tickets assigned to or created by this user will appear here once the Tickets module is implemented.
                </p>
              </div>
            )}

            {/* AUDIT TAB */}
            {activeTab === 'audit' && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 py-12">
                <History size={48} className="text-slate-200" />
                <h3 className="text-xl font-bold text-slate-700">Audit Trail</h3>
                <p className="max-w-md text-center text-sm">
                  A comprehensive log of all lifecycle events (logins, role changes, password resets) for this user will appear here.
                </p>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 py-12">
                <Settings size={48} className="text-slate-200" />
                <h3 className="text-xl font-bold text-slate-700">User Settings</h3>
                <p className="max-w-md text-center text-sm">
                  Advanced preferences, notification toggles, and feature flags specific to this user.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
