import { Activity, Download, LogOut, ScrollText, User, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { useDashboardFilter } from "./DashboardFilterContext";

import mrpayLogo from "@/assets/mrpay-logo.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { exportDashboardPdf } from "@/utils/exportPdf";

export function DashboardHeader() {
  const { filtros } = useDashboardFilter();
  const { profile, role, isAdmin, signOut } = useAuth();
  const lastUpdate = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex items-center gap-4">
        <img src={mrpayLogo} alt="Mr Pay" className="h-12 w-auto lg:h-14" />
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight lg:text-4xl">
              <span className="text-primary">TPV</span>
            </h1>
          </div>
          <div className="flex flex-col">
            <p className="mt-1 text-sm text-white font-medium">
              Dashboard Executivo
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {isAdmin && (
          <>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/admin/users"><Users className="h-4 w-4" /> Usuários</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/admin/audit"><ScrollText className="h-4 w-4" /> Auditoria</Link>
            </Button>
          </>
        )}
        <Button asChild size="sm" variant="ghost" className="gap-2">
          <Link to="/profile"><User className="h-4 w-4" /> {profile?.first_name || "Perfil"}</Link>
        </Button>
        <Button
          onClick={() => exportDashboardPdf(filtros)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          <Download className="h-4 w-4" />
          Baixar PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={signOut} title="Sair"><LogOut className="h-4 w-4" /></Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          {role === "admin" ? "Admin" : role === "manager" ? "Gestor" : "Usuário"} · {lastUpdate}
        </div>
      </div>
    </header>
  );
}
