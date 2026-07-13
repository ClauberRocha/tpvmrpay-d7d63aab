import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Users, ScrollText, Home, User } from "lucide-react";

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const { signOut, profile, role } = useAuth();
  const loc = useLocation();

  const nav = [
    { to: "/", label: "Dashboard", icon: Home, show: true },
    { to: "/admin/users", label: "Usuários", icon: Users, show: role === "admin" },
    { to: "/admin/audit", label: "Auditoria", icon: ScrollText, show: role === "admin" },
    { to: "/profile", label: "Meu perfil", icon: User, show: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-[#F9C730] font-bold uppercase tracking-[0.25em] text-sm">MR PAY</div>
            <nav className="flex gap-1">
              {nav.filter((n) => n.show).map((n) => {
                const Icon = n.icon;
                const active = loc.pathname === n.to;
                return (
                  <Link key={n.to} to={n.to}
                    className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-right">
              <div className="font-medium">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-muted-foreground">{role === "admin" ? "Administrador" : role === "manager" ? "Gestor" : "Usuário"}</div>
            </div>
            <Button size="sm" variant="outline" onClick={signOut} className="gap-2"><LogOut className="h-4 w-4" /> Sair do sistema</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-6 py-8">
        <h1 className="font-display text-2xl font-bold mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}
