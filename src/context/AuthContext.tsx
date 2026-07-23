import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api, getDatabaseMode } from '../lib/api';
import { Profile, UserRole } from '../types';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  dbMode: 'local' | 'supabase';
  signIn: (email: string, password?: string) => Promise<Profile>;
  signUp: (email: string, fullName: string, role: UserRole, tenantId: string | null) => Promise<Profile>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<Profile>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<'local' | 'supabase'>(getDatabaseMode());

  // Listen to forced db mode changes
  useEffect(() => {
    const handleDbModeChange = () => {
      setDbMode(getDatabaseMode());
      // Re-evaluate current logged-in profile in the new mode
      const sessionUser = sessionStorage.getItem('pio_tech_session_user');
      if (sessionUser) {
        try {
          const parsed = JSON.parse(sessionUser);
          api.getProfile(parsed.id).then(prof => {
            if (prof) {
              setUser(prof);
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.addEventListener('db_mode_changed', handleDbModeChange);
    return () => {
      window.removeEventListener('db_mode_changed', handleDbModeChange);
    };
  }, []);

  // Try to load user logic
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // 1. Check Supabase Auth first
        if (getDatabaseMode() === 'supabase') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            let profile = await api.getProfile(session.user.id);
            
            if (!profile) {
              try {
                const metadata = session.user.user_metadata || {};
                const metadataRole = metadata.role_code || metadata.role_name || metadata.role || 'BANK_USER';
                const { data: roleData } = await supabase
                  .from('roles')
                  .select('id')
                  .eq('role_code', metadataRole)
                  .maybeSingle();

                const roleId = roleData?.id || null;

                const { error: insertErr } = await supabase.from('users').insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: metadata.full_name || session.user.email?.split('@')[0] || 'User',
                  role_id: roleId,
                  customer_id: metadata.tenant_id || null,
                  created_at: new Date().toISOString()
                });

                if (!insertErr) {
                  profile = await api.getProfile(session.user.id);
                } else {
                  console.warn("Failed to insert profile row during initializeAuth, signing out auth session to stay anonymous:", insertErr);
                  await supabase.auth.signOut();
                }
              } catch (profileErr) {
                console.warn("Error auto-creating profile during initializeAuth, signing out:", profileErr);
                await supabase.auth.signOut();
              }
            }

            if (profile) {
              const metadata = session.user.user_metadata || {};
              const finalRole = profile.role_name || metadata.role_name || metadata.role || 'client';
              const finalRoleCode = profile.role_code || metadata.role_code || metadata.role || 'client';
              const updatedProfile = {
                ...profile,
                role_name: finalRole,
                role_code: finalRoleCode,
                tenant_id: profile.customer_id || profile.tenant_id,
                customer_id: profile.customer_id || profile.tenant_id
              };
              setUser(updatedProfile);
              setLoading(false);
              return;
            }
          }
        }

        // 2. Fallback check standard mock session storage for easy persistence
        const sessionUser = sessionStorage.getItem('pio_tech_session_user');
        if (sessionUser) {
          const parsed = JSON.parse(sessionUser);
          const profile = await api.getProfile(parsed.id);
          if (profile) {
            setUser(profile);
          } else {
            // Profile not found in standard but stored, set parsed directly
            setUser(parsed);
          }
        }
      } catch (err) {
        console.warn("Auth initialization warning, using offline fallback profiles", err);
      } finally {
        setLoading(false);
      }
    };

    // Supabase's getSession()/lock handling can occasionally hang forever
    // (stale refresh token + tab backgrounded, or a stuck navigator lock),
    // leaving the app stuck on "Validating secure workspace session..."
    // with no way out except a hard refresh. If init hasn't finished in a
    // few seconds, fall back to whatever session we have cached and stop
    // blocking the UI - the auth listener below will still correct things
    // once/if the real session check eventually resolves.
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization is taking too long, falling back to cached session.');
      const sessionUser = sessionStorage.getItem('pio_tech_session_user');
      if (sessionUser) {
        try {
          setUser(JSON.parse(sessionUser));
        } catch (e) {
          console.error('Failed to parse cached session user:', e);
        }
      }
      setLoading(false);
    }, 8000);

    initializeAuth().finally(() => clearTimeout(timeoutId));

    // Setup Supabase auth trigger if applicable
    let authSubscription: any;
    if (getDatabaseMode() === 'supabase') {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          let profile = await api.getProfile(session.user.id);
          if (!profile) {
            try {
              const metadata = session.user.user_metadata || {};
              const metadataRole = metadata.role_code || metadata.role_name || metadata.role || 'BANK_USER';
              const { data: roleData } = await supabase
                .from('roles')
                .select('id')
                .eq('role_code', metadataRole)
                .maybeSingle();

              const roleId = roleData?.id || null;

              const { error: insertErr } = await supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email,
                full_name: metadata.full_name || session.user.email?.split('@')[0] || 'User',
                role_id: roleId,
                customer_id: metadata.tenant_id || null,
                created_at: new Date().toISOString()
              });

              if (!insertErr) {
                profile = await api.getProfile(session.user.id);
              } else {
                console.warn("Failed to insert profile during auth change, signing out:", insertErr);
                await supabase.auth.signOut();
              }
            } catch (profileErr) {
              console.warn("Error auto-creating profile during auth change, signing out:", profileErr);
              await supabase.auth.signOut();
            }
          }

          if (profile) {
            const metadata = session.user.user_metadata || {};
            const finalRole = profile.role_name || metadata.role_name || metadata.role || 'client';
            const finalRoleCode = profile.role_code || metadata.role_code || metadata.role || 'client';
            const updatedProfile = {
              ...profile,
              role_name: finalRole,
              role_code: finalRoleCode,
              tenant_id: profile.customer_id || profile.tenant_id,
              customer_id: profile.customer_id || profile.tenant_id
            };
            setUser(updatedProfile);
            sessionStorage.setItem('pio_tech_session_user', JSON.stringify(updatedProfile));
          }
        } else {
          setUser(null);
          sessionStorage.removeItem('pio_tech_session_user');
        }
      });
      authSubscription = subscription;
    }

    return () => {
      clearTimeout(timeoutId);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password = 'password'): Promise<Profile> => {
    setLoading(true);
    try {
      const mode = getDatabaseMode();

      // If we attempt Supabase, try signing in first
      if (mode === 'supabase') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        } else if (data.user) {
          let profile = await api.getProfile(data.user.id);
          
          if (!profile) {
            // Auto-create missing profile
            const metadata = data.user.user_metadata || {};
            const metadataRole = metadata.role_code || metadata.role_name || metadata.role || 'BANK_USER';
            
            // Query roles table for the role UUID dynamically
            const { data: roleData } = await supabase
              .from('roles')
              .select('id')
              .eq('role_code', metadataRole)
              .maybeSingle();

            const roleId = roleData?.id || null;

            const { error: insertErr } = await supabase.from('users').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: metadata.full_name || email.split('@')[0],
              role_id: roleId,
              customer_id: metadata.tenant_id || null,
              created_at: new Date().toISOString()
            });
            if (insertErr) {
              console.error('Failed to auto-create missing user profile:', insertErr);
              throw new Error(`Authentication mismatch: User profile not found for auth.user.id ${data.user.id}. Make sure the user exists in the public.users table.`);
            }
            profile = await api.getProfile(data.user.id);
          }

          if (profile) {
            if (profile.id !== data.user.id) {
              throw new Error(`Authentication mismatch: profile.id (${profile.id}) does not match auth.user.id (${data.user.id}).`);
            }
            const finalProfile: Profile = {
              ...profile,
              role_name: profile.role_name,
              customer_id: profile.customer_id || profile.tenant_id,
              tenant_id: profile.customer_id || profile.tenant_id,
              name: profile.name || profile.full_name
            };
            setUser(finalProfile);
            sessionStorage.setItem('pio_tech_session_user', JSON.stringify(finalProfile));
            setLoading(false);
            return finalProfile;
          } else {
            throw new Error(`Authentication mismatch: User profile not found for auth.user.id ${data.user.id}. Make sure the user exists in the public.users table.`);
          }
        }
      }

      // Local / Mock / Custom matching flow (only for local mode)
      const profiles = JSON.parse(localStorage.getItem('pio_tech_users') || '[]');
      const foundIdx = profiles.findIndex((p: Profile) => (p.email || '').toLowerCase() === (email || '').toLowerCase());

      if (foundIdx !== -1) {
        const p = profiles[foundIdx];
        const finalProfile: Profile = {
          ...p,
          role_name: p.role_name,
          customer_id: p.customer_id || p.tenant_id,
          tenant_id: p.customer_id || p.tenant_id,
          name: p.name || p.full_name
        };
        setUser(finalProfile);
        sessionStorage.setItem('pio_tech_session_user', JSON.stringify(finalProfile));
        setLoading(false);
        return finalProfile;
      }

      // If user does not exist in mock, auto-determine role by company email or create standard
      let determinedRole: UserRole = 'cab_user';
      let determinedTenantId: string | null = 't-jotelecom';

      const emailDomain = email.split('@')[1];
      if (email.toLowerCase().includes('piotech.com') || email.toLowerCase().includes('pio-tech.com')) {
        determinedRole = email.toLowerCase().startsWith('admin') ? 'administrator' : 'agent';
        determinedTenantId = null;
      } else if (emailDomain?.includes('riyadhbank')) {
        determinedTenantId = 't-riyadh';
      } else if (emailDomain?.includes('globalfintech')) {
        determinedTenantId = 't-global';
      }

      const generatedName = email.split('@')[0]
        .split(/[._-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const newProf: Profile = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase(),
        full_name: generatedName,
        name: generatedName,
        role_name: determinedRole,
        tenant_id: determinedTenantId,
        customer_id: determinedTenantId,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(generatedName)}&background=0D8B95&color=fff&bold=true`,
        created_at: new Date().toISOString()
      };

      const updatedProfiles = [...profiles, newProf];
      localStorage.setItem('pio_tech_users', JSON.stringify(updatedProfiles));

      setUser(newProf);
      sessionStorage.setItem('pio_tech_session_user', JSON.stringify(newProf));
      setLoading(false);
      return newProf;

    } catch (err: any) {
      console.error("Sign in failed", err);
      setLoading(false);
      throw err;
    }
  };

  const signUp = async (email: string, fullName: string, role: UserRole, tenantId: string | null): Promise<Profile> => {
    setLoading(true);
    try {
      const mode = getDatabaseMode();

      if (mode === 'supabase') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: 'password', // standard test password
          options: {
            data: {
              full_name: fullName,
              role,
              tenant_id: tenantId
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          let profile = await api.getProfile(data.user.id);
          
          if (!profile) {
            const { data: roleData } = await supabase
              .from('roles')
              .select('id')
              .eq('role_code', role)
              .maybeSingle();

            const roleId = roleData?.id || null;

            const { error: insertErr } = await supabase.from('users').insert({
              id: data.user.id,
              email: data.user.email,
              full_name: fullName,
              role_id: roleId,
              customer_id: tenantId,
              created_at: new Date().toISOString()
            });
            if (insertErr) {
              console.error('Failed to auto-create new user profile:', insertErr);
              throw new Error(`Profile was not auto-created for new user ${data.user.id}`);
            }
            profile = await api.getProfile(data.user.id);
          }

          if (profile) {
            const finalProfile = {
              ...profile,
              tenant_id: profile.customer_id || profile.tenant_id,
              customer_id: profile.customer_id || profile.tenant_id
            };
            setUser(finalProfile);
            sessionStorage.setItem('pio_tech_session_user', JSON.stringify(finalProfile));
            setLoading(false);
            return finalProfile;
          } else {
             throw new Error(`Profile was not auto-created for new user ${data.user.id}`);
          }
        }
        throw new Error('Sign up failed: no user data returned');
      }

      // Local storage fallback for local mode
      const profiles = JSON.parse(localStorage.getItem('pio_tech_users') || '[]');
      const newProf: Profile = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        email: email.toLowerCase(),
        full_name: fullName,
        name: fullName,
        role_name: role,
        tenant_id: tenantId,
        customer_id: tenantId,
        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0D8B95&color=fff&bold=true`,
        created_at: new Date().toISOString()
      };

      const updatedProfiles = [...profiles, newProf];
      localStorage.setItem('pio_tech_users', JSON.stringify(updatedProfiles));

      setUser(newProf);
      sessionStorage.setItem('pio_tech_session_user', JSON.stringify(newProf));
      setLoading(false);
      return newProf;

    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (getDatabaseMode() === 'supabase') {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Supabase forced signout error status ignored", err);
    } finally {
      setUser(null);
      sessionStorage.removeItem('pio_tech_session_user');
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<Profile> => {
    if (!user) throw new Error("No active user");
    const updated = await api.updateProfile(user.id, updates);
    setUser(updated);
    sessionStorage.setItem('pio_tech_session_user', JSON.stringify(updated));
    return updated;
  };

  return (
    <AuthContext.Provider value={{ user, loading, dbMode, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
