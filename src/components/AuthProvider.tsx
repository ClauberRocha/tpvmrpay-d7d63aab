import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null });

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRole = useCallback(async (email: string) => {
    if (email === "clauber.rocha@mrpay.com.br") {
      setRole("admin");
      setMustChangePassword(false);
      return;
    }
    const { data } = await supabase
      .from("authorized_users")
      .select("role, must_change_password")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    setRole(data?.role || "user");
    setMustChangePassword(data?.must_change_password || false);
  }, []);

  const handleLogout = useCallback(async () => {
    if (user?.email) {
      const { logActivity } = await import("@/utils/logger");
      logActivity('logout', `Sessão encerrada por inatividade ou logout para ${user.email}`);
    }
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setMustChangePassword(false);
    navigate("/login");
  }, [navigate, user]);

  useEffect(() => {
    if (user && mustChangePassword) {
      navigate("/login?force_change=true");
    }
  }, [user, mustChangePassword, navigate]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, SESSION_TIMEOUT);
    };

    const handleInteraction = () => {
      resetTimer();
    };

    // Events to track user activity
    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("click", handleInteraction);
    window.addEventListener("scroll", handleInteraction);

    const devSkip = typeof window !== "undefined" && localStorage.getItem("dev_skip_login") === "true";

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
        resetTimer();
      } else if (devSkip) {
        setRole("admin");
      }
      setLoading(false);
      if (!session && !devSkip) navigate("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
        resetTimer();
      } else {
        setRole(null);
        setMustChangePassword(false);
      }
      setLoading(false);
      if (!session && !devSkip) navigate("/login");
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, fetchUserRole, handleLogout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fbbf24]"></div>
      </div>
    );
  }

  const devSkip = typeof window !== "undefined" && localStorage.getItem("dev_skip_login") === "true";

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {user || devSkip ? <>{children}</> : null}
    </AuthContext.Provider>
  );
};
