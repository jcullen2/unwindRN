import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Profile, supabase } from '@/lib/supabase';

type AuthState = {
  /** Session + first profile fetch have both resolved. */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (uid: string | null) => {
    if (!uid) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (!error) setProfile(data);
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    setProfileReady(false);
    loadProfile(userId);
  }, [sessionReady, userId, loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Never let one account's cached data survive into the next sign-in
    // (shared devices are the norm on a unit).
    queryClient.clear();
    setProfile(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        ready: sessionReady && profileReady,
        session,
        profile,
        refreshProfile,
        signOut,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
