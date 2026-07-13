import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "user";

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string | null;
  is_active: boolean;
  must_change_password: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function logAudit(action: string, description?: string, result: "success" | "failure" = "success") {
  try {
    await supabase.rpc("log_audit", {
      _action: action,
      _description: description ?? null,
      _result: result,
      _metadata: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
      },
    });
  } catch (e) {
    console.warn("audit failed", e);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setProfile((prof as Profile) ?? null);
    const r = roles?.[0]?.role as AppRole | undefined;
    setRole(r ?? null);
  }, []);

  useEffect(() => {
    // Listener PRIMEIRO
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });
    // Depois busca sessão existente
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Auto-logout por inatividade (30 min)
  useEffect(() => {
    if (!session) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void supabase.auth.signOut();
      }, 30 * 60 * 1000);
    };
    ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
      window.addEventListener(ev, reset, { passive: true }),
    );
    reset();
    return () => {
      window.clearTimeout(timer);
      ["mousemove", "keydown", "click", "scroll"].forEach((ev) =>
        window.removeEventListener(ev, reset),
      );
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!/@mrpay\.com\.br$/i.test(normalized)) {
      await logAudit("login_failed", `Domínio inválido: ${normalized}`, "failure");
      return { error: "Somente e-mails @mrpay.com.br são permitidos." };
    }
    const { error, data } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) {
      await logAudit("login_failed", `Falha em ${normalized}: ${error.message}`, "failure");
      return { error: error.message };
    }
    // Verifica se conta está ativa
    if (data.user) {
      const { data: prof } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
      if (prof && !prof.is_active) {
        await supabase.auth.signOut();
        return { error: "Conta desativada. Contate o administrador." };
      }
    }
    await logAudit("login_success", `Login OK: ${normalized}`);
    return {};
  };

  const signOut = async () => {
    await logAudit("logout", "Usuário fez logout");
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        loading,
        signIn,
        signOut,
        refresh,
        isAdmin: role === "admin",
        isManager: role === "manager",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
