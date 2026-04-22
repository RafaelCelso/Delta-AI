"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getSupabaseClient(): SupabaseClient | null {
  try {
    return createClient();
  } catch {
    // Supabase env vars not available (e.g. during build/prerender)
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get the initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch {
        // Session retrieval failed — user stays unauthenticated
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { error: new Error("Supabase client not available") };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return {
          error: new Error("Supabase client not available"),
          needsConfirmation: false,
        };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { error: new Error(error.message), needsConfirmation: false };
      }

      // If identities array is empty, the email is already registered
      if (
        data.user &&
        data.user.identities &&
        data.user.identities.length === 0
      ) {
        return {
          error: new Error("Email já cadastrado."),
          needsConfirmation: false,
        };
      }

      // If there's no session, email confirmation is required
      const needsConfirmation = !data.session;

      return { error: null, needsConfirmation };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, [supabase]);

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
