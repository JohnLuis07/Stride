/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import WorkspaceLoading from './components/WorkspaceLoading';
import type { Profile } from './types';
import { supabase } from './supabaseClient';
const SessionProfile = createContext<Profile | null>(null);
export function useSessionProfile() {
  return useContext(SessionProfile);
}
export async function resolveProfile() {
  const { data, error } = await supabase.rpc('resolve_profile');
  if (error) throw error;
  if (!data?.id) throw new Error('Profile unavailable. Check account provisioning.');
  localStorage.setItem('userEmail', data.email);
  return data;
}
export function SessionGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        window.location.replace('/login');
        return;
      }
      try {
        const user = await resolveProfile();
        if (live) setProfile(user);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('userEmail');
        window.location.replace('/login');
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  return profile ? (
    <SessionProfile.Provider value={profile}>{children}</SessionProfile.Provider>
  ) : (
    <WorkspaceLoading error={error} />
  );
}
