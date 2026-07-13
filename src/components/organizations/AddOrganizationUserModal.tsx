import React, { useState } from 'react';
import { X, UserPlus, Copy, Check, Building2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Tenant } from '../../types';

interface AddOrganizationUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Tenant;
  onSuccess: () => void;
}

export const AddOrganizationUserModal: React.FC<AddOrganizationUserModalProps> = ({
  isOpen,
  onClose,
  organization,
  onSuccess
}) => {
  const { user: currentUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: organization.is_internal ? 'SUPPORT_ENGINEER' : 'BANK_USER',
    team_id: '',
    department: '',
    jobTitle: '',
    phone: '',
    notes: ''
  });
  
  const [availableRoles, setAvailableRoles] = useState<{ id: string, role_code: string, role_name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string, team_name: string }[]>([]);

  React.useEffect(() => {
    // Determine the default role when modal opens based on org type
    setFormData(prev => ({
      ...prev,
      role: organization.is_internal ? 'SUPPORT_ENGINEER' : 'BANK_USER'
    }));

    // Fetch roles
    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('id, role_code, role_name');
        
        if (error) throw error;
        
        if (data) {
          // Filter based on is_internal
          const filtered = data.filter(r => {
            if (organization.is_internal) {
              return ['SUPPORT_ENGINEER', 'SUPPORT_MANAGER', 'ADMIN', 'TEAM_MEMBER'].includes(r.role_code);
            } else {
              return ['BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'].includes(r.role_code);
            }
          });
          setAvailableRoles(filtered);
        }
      } catch (err) {
        console.error("Failed to fetch roles:", err);
      }
    };

    const fetchTeams = async () => {
      if (!organization.is_internal) return;
      try {
        const { data, error } = await supabase.from('teams').select('id, team_name').order('team_name');
        if (error) throw error;
        if (data) setTeams(data);
      } catch (err) {
        console.error("Failed to fetch teams:", err);
      }
    };

    if (isOpen) {
      fetchRoles();
      fetchTeams();
    }
  }, [isOpen, organization.is_internal]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state matching exact UX spec
  const [successData, setSuccessData] = useState<{
    email: string;
    temporaryPassword?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.name || !formData.email || !formData.role) {
        throw new Error('Please fill in all required fields.');
      }

      if (formData.role === 'TEAM_MEMBER' && !formData.team_id) {
        throw new Error('Please select a team for this Team Member.');
      }

      const internalRoles = ['SUPPORT_ENGINEER', 'SUPPORT_MANAGER', 'ADMIN', 'TEAM_MEMBER'];
      const externalRoles = ['BANK_USER', 'BANK_MANAGER', 'BANK_ADMIN'];
      
      if (organization.is_internal && !internalRoles.includes(formData.role)) {
        throw new Error('Invalid role selected for an internal organization.');
      }
      if (!organization.is_internal && !externalRoles.includes(formData.role)) {
        throw new Error('Invalid role selected for an external organization.');
      }

      // Call existing API (extra UI fields are dropped since Edge Function modification is forbidden)
      const result = await api.inviteUser({
        email: formData.email,
        name: formData.name,
        role: formData.role as any,
        customer_id: organization.id,
        createdBy: currentUser ? { id: currentUser.id, name: currentUser.name || (currentUser as any).full_name || 'Admin' } : { id: '0', name: 'System' }
      });
      console.log("[DEBUG] result after inviteUser:", result);

      if (formData.role === 'TEAM_MEMBER' && formData.team_id) {
        const { error: teamErr } = await supabase.from('team_members').insert({
          user_id: result.profile?.id || result.id,
          team_id: formData.team_id
        });
        if (teamErr) {
          console.error("[DEBUG] Error inserting into team_members:", teamErr);
        }
      }

      // Send welcome email (fire and forget)
      try {
        const loginUrl = window.location.origin + '/login';
        supabase.functions.invoke('send-email', {
          body: {
            to: formData.email,
            subject: "Welcome to Pio-Tech Support Portal - Your Account Details",
            body: `Hello ${formData.name},\n\nWelcome to the Pio-Tech Support Portal.\nYour account has been created successfully.\n\nYour login email: ${formData.email}\nYour temporary password: ${result.temporaryPassword}\n\nPlease login at: ${loginUrl}\nMake sure to change your password after your first login.`
          }
        }).catch(err => console.error("Failed to send welcome email:", err));
      } catch (emailErr) {
        console.error("Error invoking send-email for welcome:", emailErr);
      }

      // 2. Set success state to show password
      setSuccessData({
        email: result.profile?.email || formData.email,
        temporaryPassword: result.temporaryPassword
      });

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the user.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!successData?.temporaryPassword) return;
    const credText = `Portal:\nhttps://support.pio-tech.com\n\nUsername: ${successData.email}\n\nTemporary Password: ${successData.temporaryPassword}\n\nPlease change your password after first login.\nDo not save the password anywhere.`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = () => {
    setSuccessData(null);
    setFormData({
      name: '', email: '', role: 'BANK_USER', team_id: '', department: '', jobTitle: '', phone: '', notes: ''
    });
    setCopied(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
              <UserPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {successData ? 'User Created Successfully' : 'Create User'}
            </h2>
          </div>
          {!successData && (
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {successData ? (
            /* SUCCESS STATE EXACTLY MATCHING UX SPEC */
            <div className="flex flex-col items-center justify-center text-center space-y-6 py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <Check size={32} strokeWidth={3} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-800">User Created Successfully</h3>
                <p className="text-slate-500 font-medium">The account has been provisioned.</p>
              </div>

              <div className="w-full max-w-sm bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-left">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Organization</div>
                  <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Building2 size={14} className="text-slate-400" />
                    {organization.name}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Email</div>
                  <div className="text-sm font-bold text-slate-800">{successData.email}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Temporary Password</div>
                  <div className="font-mono text-lg font-bold text-indigo-700 tracking-wider">
                    {successData.temporaryPassword || 'Password reset link sent'}
                  </div>
                </div>
              </div>

              {successData.temporaryPassword && (
                <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                  <div className="text-[10px] uppercase font-bold text-amber-600 flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 w-full justify-center">
                    <AlertCircle size={12} /> This temporary password will never be shown again
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                      copied 
                        ? 'bg-emerald-600 text-white shadow-emerald-500/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-white shadow-slate-900/10'
                    }`}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleDone}
                className="w-full max-w-sm px-4 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* CREATION FORM */
            <form id="add-user-form" onSubmit={handleSubmit} className="space-y-5">
              
              {/* Read Only Organization Field */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Organization</label>
                <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-500 font-medium flex items-center gap-2 cursor-not-allowed">
                  <Building2 size={16} />
                  {organization.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-medium text-slate-700"
                  >
                    {availableRoles.length > 0 ? (
                      availableRoles.map(r => (
                        <option key={r.id} value={r.role_code}>{r.role_name}</option>
                      ))
                    ) : organization.is_internal ? (
                      <>
                        <option value="SUPPORT_ENGINEER">Support Engineer</option>
                        <option value="SUPPORT_MANAGER">Support Manager</option>
                        <option value="ADMIN">System Administrator</option>
                        <option value="TEAM_MEMBER">Team Member</option>
                      </>
                    ) : (
                      <>
                        <option value="BANK_USER">Bank User</option>
                        <option value="BANK_MANAGER">Bank Manager</option>
                        <option value="BANK_ADMIN">Bank Administrator</option>
                      </>
                    )}
                  </select>
                </div>

                {formData.role === 'TEAM_MEMBER' && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Team <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.team_id}
                      onChange={(e) => setFormData({...formData, team_id: e.target.value})}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors font-medium text-slate-700"
                    >
                      <option value="">Select a team...</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.team_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                    placeholder="e.g. IT Operations"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Title</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                    placeholder="e.g. Systems Analyst"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors resize-none"
                    placeholder="Any administrative notes..."
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!successData && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-user-form"
              disabled={loading}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
