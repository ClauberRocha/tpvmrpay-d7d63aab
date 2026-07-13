import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "./admin/AdminLayout";

export default function ProfilePage() {
  const { profile, refresh } = useAuth();
  const [first, setFirst] = useState(profile?.first_name ?? "");
  const [last, setLast] = useState(profile?.last_name ?? "");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    await supabase.from("profiles").update({ first_name: first, last_name: last }).eq("id", profile.id);
    if (pwd) {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) toast({ title: "Erro na senha", description: error.message, variant: "destructive" });
      else {
        await supabase.rpc("log_audit", { _action: "password_changed", _description: "Alteração via perfil", _result: "success", _metadata: {} });
        setPwd("");
      }
    }
    await refresh();
    setLoading(false);
    toast({ title: "Perfil atualizado" });
  };

  return (
    <AdminLayout title="Meu perfil">
      <form onSubmit={save} className="max-w-lg space-y-4">
        <div><Label>E-mail</Label><Input value={profile?.email ?? ""} disabled /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Nome</Label><Input value={first} onChange={(e) => setFirst(e.target.value)} /></div>
          <div><Label>Sobrenome</Label><Input value={last} onChange={(e) => setLast(e.target.value)} /></div>
        </div>
        <div><Label>Nova senha (opcional)</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
        <Button type="submit" disabled={loading}>Salvar</Button>
      </form>
    </AdminLayout>
  );
}
