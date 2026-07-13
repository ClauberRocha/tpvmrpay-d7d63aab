import { Loader2, Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/utils/exportCsv";
import { AdminLayout } from "./AdminLayout";

interface Log {
  id: string; created_at: string; user_email: string | null; user_role: string | null;
  action: string; description: string | null; result: string;
  ip_address: string | null; user_agent: string | null; session_id: string | null;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("audit_logs").select("*")
        .order("created_at", { ascending: false }).limit(500);
      setLogs((data as Log[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return logs.filter((l) =>
      !s || [l.user_email, l.action, l.description, l.result].some((v) => v?.toLowerCase().includes(s))
    );
  }, [logs, q]);

  const exportCsv = () => {
    exportToCsv(
      filtered.map((l) => [l.created_at, l.user_email ?? "", l.user_role ?? "", l.action, l.description ?? "", l.result, l.session_id ?? "", l.ip_address ?? "", l.user_agent ?? ""]),
      `auditoria-${Date.now()}.csv`,
      ["Data/Hora", "Usuário", "Perfil", "Ação", "Descrição", "Resultado", "Session ID", "IP", "User Agent"],
    );
  };

  return (
    <AdminLayout title="Auditoria">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por usuário, ação, descrição..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" /> CSV</Button>
      </div>
      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto max-h-[70vh]">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-2 text-left">Data/Hora</th><th className="p-2 text-left">Usuário</th>
                <th className="p-2 text-left">Perfil</th><th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Descrição</th><th className="p-2 text-left">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-2">{l.user_email ?? "—"}</td>
                  <td className="p-2">{l.user_role ?? "—"}</td>
                  <td className="p-2 font-mono">{l.action}</td>
                  <td className="p-2">{l.description}</td>
                  <td className="p-2">
                    <span className={l.result === "success" ? "text-success" : "text-destructive"}>{l.result}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum registro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
