import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { loadTpvData } from "@/data/tpv";

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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = "mrpay:audit_session_id";

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function logAudit(action: string, description?: string, result: "success" | "failure" = "success") {
  try {
    await supabase.rpc("log_audit", {
      _action: action,
      _description: description ?? undefined,
      _result: result,
      _metadata: {
        user_agent: navigator.userAgent,
        platform: navigator.platform,
      },
      _session_id: getSessionId(),
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

  // ==== Configuração de sessão ====
  // Tempo de inatividade antes do logout automático (30 min)
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

  // Auto-logout por inatividade
  useEffect(() => {
    if (!session) return;
    let timer: number;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void logAudit("session_timeout", "Logout automático por inatividade", "success");
        void supabase.auth.signOut();
      }, IDLE_TIMEOUT_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [session]);

  // Auto-logout quando o token da sessão expira
  useEffect(() => {
    if (!session?.expires_at) return;
    const msUntilExpiry = session.expires_at * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      void supabase.auth.signOut();
      return;
    }
    const t = window.setTimeout(() => {
      void logAudit("session_expired", "Sessão expirada", "success");
      void supabase.auth.signOut();
    }, msUntilExpiry);
    return () => window.clearTimeout(t);
  }, [session]);

  // Mapeia mensagens do provedor para mensagens seguras (sem detalhes sensíveis)
  const humanizeAuthError = (raw: string): string => {
    const msg = (raw || "").toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
      return "E-mail ou senha incorretos.";
    }
    if (msg.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar.";
    }
    if (msg.includes("too many requests") || msg.includes("rate limit")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
    }
    if (msg.includes("network")) {
      return "Falha de conexão. Verifique sua internet e tente novamente.";
    }
    return "Não foi possível entrar. Verifique suas credenciais e tente novamente.";
  };

  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    if (!/@mrpay\.com\.br$/i.test(normalized)) {
      await logAudit("login_failed", `Domínio inválido: ${normalized}`, "failure");
      return { error: "Somente e-mails @mrpay.com.br são permitidos." };
    }

    // Bloqueio por tentativas
    const { data: gate } = await supabase.rpc("check_login_allowed", { _email: normalized });
    const gateRow = Array.isArray(gate) ? gate[0] : gate;
    if (gateRow && !gateRow.allowed) {
      const mins = Math.ceil((gateRow.remaining_seconds ?? 0) / 60);
      await logAudit("login_blocked", `${normalized} bloqueado por excesso de tentativas`, "failure");
      return { error: `Muitas tentativas malsucedidas. Tente novamente em ${mins} minuto(s).` };
    }

    const { error, data } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) {
      await supabase.rpc("record_login_attempt", { _email: normalized, _success: false, _user_agent: navigator.userAgent });
      await logAudit("login_failed", `Falha em ${normalized}: ${error.message}`, "failure");
      return { error: humanizeAuthError(error.message) };
    }
    // Verifica se conta está ativa
    if (data.user) {
      const { data: prof } = await supabase.from("profiles").select("is_active").eq("id", data.user.id).maybeSingle();
      if (prof && !prof.is_active) {
        await supabase.auth.signOut();
        return { error: "Conta desativada. Contate o administrador." };
      }
    }
    // Nova sessão de auditoria
    sessionStorage.removeItem(SESSION_KEY);
    await supabase.rpc("record_login_attempt", { _email: normalized, _success: true, _user_agent: navigator.userAgent });
    await logAudit("login_success", `Login OK: ${normalized}`);
    return {};
  };


  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const normalized = email.trim().toLowerCase();
    if (!/@mrpay\.com\.br$/i.test(normalized)) {
      return { error: "Somente e-mails @mrpay.com.br são permitidos." };
    }
    if (password.length < 8) {
      return { error: "A senha deve ter pelo menos 8 caracteres." };
    }
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      },
    });
    if (error) return { error: error.message };
    return { needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await logAudit("logout", "Usuário fez logout");
    sessionStorage.removeItem(SESSION_KEY);
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
        signUp,
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
