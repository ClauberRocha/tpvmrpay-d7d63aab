import { Loader2, Plus, KeyRound, Trash2, Power, Pencil } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AdminLayout } from "./AdminLayout";

interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  department: string | null; is_active: boolean; must_change_password: boolean;
  role: "admin" | "manager" | "user";
}

// URL pública do app — links de e-mail (convite/recuperação) devem apontar
// sempre para o app publicado, nunca para o preview do editor (que exige
// login na Lovable e mostra a tela do editor em vez do login do sistema).
const PUBLIC_APP_URL = "https://tpvmrpay.lovable.app";

function appOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_APP_URL;
  const host = window.location.hostname;
  // Qualquer host lovable.app que não seja o domínio publicado cai no preview
  // do editor — força o domínio público.
  if (host.endsWith("lovable.app") && host !== "tpvmrpay.lovable.app") {
    return PUBLIC_APP_URL;
  }
  return window.location.origin;
}

async function callAdmin(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("admin-users", {
    body: { action, payload: { ...payload, origin: appOrigin() } },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await callAdmin("list");
      setUsers(data.users ?? []);
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const patchUser = (id: string, patch: Partial<UserRow>) =>
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  const removeUser = (id: string) =>
    setUsers((prev) => prev.filter((u) => u.id !== id));

  const handleRoleChange = async (id: string, role: string) => {
    const prev = users.find((u) => u.id === id)?.role;
    patchUser(id, { role: role as UserRow["role"] });
    try { await callAdmin("set_role", { id, role }); toast({ title: "Perfil atualizado" }); }
    catch (e) {
      if (prev) patchUser(id, { role: prev });
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };
  const handleToggleActive = async (u: UserRow) => {
    patchUser(u.id, { is_active: !u.is_active });
    try { await callAdmin("set_active", { id: u.id, is_active: !u.is_active }); }
    catch (e) {
      patchUser(u.id, { is_active: u.is_active });
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };
  const handleReset = async (id: string) => {
    try {
      const res = await callAdmin("reset_password", { id });
      toast({
        title: "Link de recuperação enviado",
        description: res?.email ? `E-mail disparado para ${res.email}. Peça para verificar a caixa de entrada e o spam.` : undefined,
      });
    } catch (e) {
      toast({ title: "Falha ao enviar reset", description: (e as Error).message, variant: "destructive" });
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir usuário permanentemente?")) return;
    const snapshot = users;
    removeUser(id);
    try { await callAdmin("delete", { id }); toast({ title: "Usuário excluído" }); }
    catch (e) {
      setUsers(snapshot);
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    }
  };


  return (
    <AdminLayout title="Usuários">
      <div className="flex justify-between mb-4">
        <div className="text-sm text-muted-foreground">{users.length} usuários</div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar usuário</DialogTitle></DialogHeader>
            <CreateUserForm onDone={() => { setOpen(false); void load(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Nome</th><th className="p-3">E-mail</th>
                <th className="p-3">Departamento</th><th className="p-3">Perfil</th>
                <th className="p-3">Status</th><th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.first_name} {u.last_name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.department || "—"}</td>
                  <td className="p-3">
                    <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gestor</SelectItem>
                        <SelectItem value="user">Usuário</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">
                    <span className={u.is_active ? "text-success" : "text-destructive"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </span>
                    {u.must_change_password && <span className="ml-2 text-xs text-warning">(1º acesso)</span>}
                  </td>
                  <td className="p-3 flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(u)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReset(u.id)} title="Resetar senha"><KeyRound className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u)} title={u.is_active ? "Desativar" : "Ativar"}><Power className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar usuário</DialogTitle></DialogHeader>
          {editing && (
            <EditUserForm
              user={editing}
              onDone={(updated) => {
                if (updated) patchUser(updated.id, updated);
                setEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}

function EditUserForm({ user, onDone }: { user: UserRow; onDone: (updated?: UserRow) => void }) {
  const [form, setForm] = useState({
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    department: user.department ?? "",
    role: user.role,
    is_active: user.is_active,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await callAdmin("update", { id: user.id, ...form });
      toast({ title: "Usuário atualizado" });
      onDone({ ...user, ...form });

    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nome</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
        <div><Label>Sobrenome</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
      </div>
      <div><Label>E-mail</Label><Input value={user.email} disabled /></div>
      <div><Label>Departamento</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
      <div>
        <Label>Perfil</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRow["role"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Status</Label>
        <Select value={form.is_active ? "1" : "0"} onValueChange={(v) => setForm({ ...form, is_active: v === "1" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Ativo</SelectItem>
            <SelectItem value="0">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Salvar alterações"}
      </Button>
    </form>
  );
}

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", department: "", role: "user", is_active: true });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/@mrpay\.com\.br$/i.test(form.email)) { setErr("E-mail deve ser @mrpay.com.br"); return; }
    setLoading(true);
    try { await callAdmin("create", form); toast({ title: "Convite enviado" }); onDone(); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nome</Label><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
        <div><Label>Sobrenome</Label><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
      </div>
      <div><Label>E-mail corporativo</Label><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@mrpay.com.br" /></div>
      <div><Label>Departamento</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
      <div>
        <Label>Perfil</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="manager">Gestor</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {err && <div className="text-sm text-destructive">{err}</div>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Criar e enviar convite"}
      </Button>
    </form>
  );
}
