import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { authService, type SignUpResult } from "../../services/auth.service";

type AuthContextValue = {
  session: Session | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  userEmail: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setIsBootstrapping(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      void authService.syncBackendSession(session.access_token);
    }
  }, [session?.access_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isBootstrapping,
      isAuthenticated: Boolean(session?.access_token),
      userEmail: session?.user?.email ?? null,
      signIn: async (email, password) => {
        await authService.signIn(email, password);
      },
      signUp: async (email, password) => authService.signUp(email, password),
      signOut: async () => {
        await authService.signOut();
      }
    }),
    [session, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
