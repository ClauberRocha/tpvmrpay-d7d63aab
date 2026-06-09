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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserRole = useCallback(async (email: string) => {
    if (email === "clauber.rocha@mrpay.com.br") {
      setRole("admin");
      return;
    }
    const { data } = await supabase
      .from("authorized_users")
      .select("role")
      .eq("email", email.toLowerCase())
      .single();
    setRole(data?.role || "user");
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    navigate("/login");
  }, [navigate]);

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

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
        resetTimer();
      }
      setLoading(false);
      if (!session) navigate("/login");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser?.email) {
        fetchUserRole(currentUser.email);
        resetTimer();
      } else {
        setRole(null);
      }
      setLoading(false);
      if (!session) navigate("/login");
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

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {user ? <>{children}</> : null}
    </AuthContext.Provider>
  );
};
