import { Loader2 } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth, AppRole } from "@/contexts/AuthContext";

interface Props {
  children: ReactNode;
  requireRole?: AppRole | AppRole[];
}

export function ProtectedRoute({ children, requireRole }: Props) {
  const { loading, session, profile, role, signOut } = useAuth();
  const location = useLocation();

  // Conta desativada por admin: encerra sessão imediatamente
  useEffect(() => {
    if (session && profile && profile.is_active === false) {
      void signOut();
    }
  }, [session, profile, signOut]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Aguarda o carregamento do perfil antes de decidir permissões
  if (!profile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-primary">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (profile.is_active === false) {
    return <Navigate to="/login" replace />;
  }

  // Se a senha ainda é provisória, força a troca antes de qualquer área protegida.
  if (profile.must_change_password && location.pathname !== "/set-password") {
    return <Navigate to="/set-password" replace />;
  }




  // Exige que exista uma role atribuída para acessar áreas protegidas
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full rounded-2xl border border-border/60 bg-card p-8 text-center shadow-xl">
          <h2 className="font-display text-xl font-bold mb-2">Acesso pendente</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sua conta ainda não possui permissões atribuídas. Solicite ao administrador liberação de acesso.
          </p>
          <button
            onClick={() => void signOut()}
            className="text-sm text-primary hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (requireRole) {
    const allowed = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!allowed.includes(role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

