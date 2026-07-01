import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

// TODO: Remove this stub entirely once all pages stop calling useAuth().
// Authentication has been removed from the project — every route is public.
// Dev-only skip flag now comes from an env var instead of localStorage.
// Set VITE_DEV_SKIP_LOGIN=true in your local .env if you need to simulate
// an authenticated admin session during development. TODO: remove after cleanup.
const DEV_SKIP_LOGIN =
  (import.meta.env.VITE_DEV_SKIP_LOGIN ?? "true") === "true";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  role: DEV_SKIP_LOGIN ? "admin" : null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: React.ReactNode;
}

// Pass-through provider kept for backwards compatibility with existing imports.
export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        loading: false,
        role: DEV_SKIP_LOGIN ? "admin" : null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
