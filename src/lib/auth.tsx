import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Profile, supabase } from '@/lib/supabase';

const ONBOARDING_KEY = 'unwindrn_onboarding_seen';

type AuthState = {
  /** Session + onboarding flag + first profile fetch have all resolved. */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  onboardingSeen: boolean;
  completeOnboarding: () => void;
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
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [onboardingReady, setOnboardingReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY)
      .then((v) => setOnboardingSeen(v === 'true'))
      .catch(() => {})
      .finally(() => setOnboardingReady(true));

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

  const completeOnboarding = useCallback(() => {
    setOnboardingSeen(true);
    SecureStore.setItemAsync(ONBOARDING_KEY, 'true').catch(() => {});
  }, []);

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
        ready: sessionReady && profileReady && onboardingReady,
        session,
        profile,
        onboardingSeen,
        completeOnboarding,
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
