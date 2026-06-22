import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Power, PowerOff, Loader2, Edit2, Check, X, Mail, ClipboardList, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AuthorizedUser {
  id: string;
  email: string;
  is_active: boolean;
  role: string;
  created_at: string;
  invited_at?: string | null;
  invitation_status?: string | null;
  invitation_error?: string | null;
  invitation_sent_at?: string | null;
  invitation_type?: string | null;
  invitation_expires_at?: string | null;
  invitation_count?: number | null;
  auth_user_id?: string | null;
  auth_confirmed_at?: string | null;
  auth_last_sign_in_at?: string | null;
}

const COOLDOWN_SECONDS = 60;

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const UserManagement = () => {
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AuthorizedUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");
  const [isInviting, setIsInviting] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const isAdmin = role === "admin";

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  // Tick para atualizar contadores de cooldown/expiração
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_users_access_status");
    if (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsers((data as AuthorizedUser[]) || []);
    }
    setIsLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.endsWith("@mrpay.com.br")) {
      toast({ title: "Domínio inválido", description: "Apenas e-mails @mrpay.com.br são permitidos.", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    const { error } = await supabase.from("authorized_users").insert([{ email: newEmail.toLowerCase(), is_active: true, role: newRole }]);
    if (error) {
      toast({ title: "Erro ao adicionar usuário", description: error.message, variant: "destructive" });
    } else {
      import("@/utils/logger").then(({ logActivity }) => logActivity('user_creation', `Usuário ${newEmail} criado com função ${newRole}`));
      toast({ title: "Usuário adicionado", description: `Autorizado como ${newRole}.` });
      setNewEmail(""); setNewRole("user"); fetchUsers();
    }
    setIsAdding(false);
  };

  const handleUpdateRole = async (id: string) => {
    const { error } = await supabase.from("authorized_users").update({ role: editRole }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar função", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Função atualizada" });
      setEditingId(null); fetchUsers();
    }
  };

  const handleInviteUser = async (email: string) => {
    setIsInviting(email);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', { body: { email } });
      if (error) {
        // Tenta extrair mensagem de cooldown
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          const body = ctx && (await ctx.json?.());
          if (body?.error) msg = body.error;
        } catch {}
        toast({ title: "Não foi possível reenviar", description: msg, variant: "destructive" });
      } else {
        toast({
          title: data?.invitation_type === 'recovery' ? "Redefinição de senha enviada" : "Convite enviado",
          description: data?.message || `E-mail enviado para ${email}.`,
        });
      }
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro ao enviar convite", description: err.message, variant: "destructive" });
    } finally {
      setIsInviting(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from("authorized_users").update({ is_active: !currentStatus }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    const { error } = await supabase.from("authorized_users").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Usuário excluído" }); fetchUsers(); }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "admin": return <Badge className="bg-red-500 hover:bg-red-600">Administrador</Badge>;
      case "manager": return <Badge className="bg-blue-500 hover:bg-blue-600">Gestor</Badge>;
      default: return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  // Status detalhado de acesso e convite
  const getAccessCell = (u: AuthorizedUser) => {
    // Acessou o dashboard?
    if (u.auth_last_sign_in_at) {
      return (
        <div className="flex flex-col gap-0.5">
          <Badge className="bg-green-600 hover:bg-green-700 w-fit gap-1">
            <CheckCircle2 className="h-3 w-3" /> Acessou
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            Último: {formatDateTime(u.auth_last_sign_in_at)}
          </span>
        </div>
      );
    }
    if (u.auth_confirmed_at) {
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className="text-blue-500 border-blue-500/50 w-fit">Confirmado</Badge>
          <span className="text-[10px] text-muted-foreground">Sem login ainda</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-0.5">
        <Badge variant="outline" className="text-orange-500 border-orange-500/50 w-fit gap-1">
          <Clock className="h-3 w-3" /> Aguardando
        </Badge>
        <span className="text-[10px] text-muted-foreground">Não acessou</span>
      </div>
    );
  };

  const getInvitationCell = (u: AuthorizedUser) => {
    const status = u.invitation_status || (u.invited_at ? "sent" : "pending");
    const expiresAt = u.invitation_expires_at ? new Date(u.invitation_expires_at).getTime() : null;
    const isExpired = expiresAt && expiresAt < now;
    const typeLabel = u.invitation_type === 'recovery' ? 'Redefinição' : u.invitation_type === 'invite' ? 'Convite' : null;

    if (status === "failed") {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 cursor-help">
                <Badge variant="destructive" className="w-fit gap-1">
                  <AlertCircle className="h-3 w-3" /> Falhou
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {formatDateTime(u.invitation_sent_at)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{u.invitation_error || "Erro desconhecido"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (status === "sent") {
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={isExpired ? "text-orange-500 border-orange-500/50" : "text-green-500 border-green-500/50"}
            >
              {isExpired ? "Expirado" : "Enviado"}
            </Badge>
            {typeLabel && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {typeLabel}
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            Envio: {formatDateTime(u.invitation_sent_at)}
          </span>
          {expiresAt && (
            <span className="text-[10px] text-muted-foreground">
              {isExpired ? "Expirou em " : "Expira em "}
              {formatDateTime(u.invitation_expires_at)}
            </span>
          )}
          {(u.invitation_count ?? 0) > 1 && (
            <span className="text-[10px] text-muted-foreground">
              {u.invitation_count} envios
            </span>
          )}
        </div>
      );
    }

    return <Badge variant="outline" className="text-orange-500 border-orange-500/50">Pendente</Badge>;
  };

  const getCooldownRemaining = (u: AuthorizedUser) => {
    if (!u.invitation_sent_at) return 0;
    const elapsed = (now - new Date(u.invitation_sent_at).getTime()) / 1000;
    return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fbbf24]"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <Card className="max-w-md w-full border-red-900/50 bg-red-900/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center justify-center gap-2">
              <X className="h-6 w-6" /> Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Apenas administradores podem acessar esta página.</p>
            <Button onClick={() => navigate("/")} className="mt-6 w-full">Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          </div>
          <Button variant="outline" onClick={() => navigate("/logs")}>
            <ClipboardList className="mr-2 h-4 w-4" /> Logs de Atividade
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Autorizar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4">
              <Input placeholder="usuario@mrpay.com.br" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className="max-w-sm" />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={isAdding}>
                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Autorizar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usuários Autorizados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Convite</TableHead>
                  <TableHead>Acesso ao Dashboard</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>
                ) : (
                  users.map((u) => {
                    const cooldown = getCooldownRemaining(u);
                    const canInvite = cooldown === 0;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {editingId === u.id ? (
                            <div className="flex items-center gap-2">
                              <Select value={editRole} onValueChange={setEditRole}>
                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="manager">Gestor</SelectItem>
                                  <SelectItem value="user">Usuário</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleUpdateRole(u.id)}>
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ) : getRoleBadge(u.role)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "default" : "secondary"}>
                            {u.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getInvitationCell(u)}</TableCell>
                        <TableCell>{getAccessCell(u)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => { setEditingId(u.id); setEditRole(u.role); }} title="Editar Função" className="h-8 w-8">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleInviteUser(u.email)}
                                      disabled={isInviting === u.email || !canInvite}
                                      title={canInvite ? "Enviar/Reenviar Convite" : `Aguarde ${cooldown}s`}
                                      className="h-8 w-8"
                                    >
                                      {isInviting === u.email ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : canInvite ? (
                                        <Mail className="h-4 w-4 text-blue-500" />
                                      ) : (
                                        <span className="text-[10px] font-semibold text-muted-foreground">{cooldown}s</span>
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {canInvite
                                    ? "Enviar/Reenviar convite"
                                    : `Aguardando cooldown: ${cooldown}s para liberar reenvio`}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button variant="outline" size="icon" onClick={() => toggleStatus(u.id, u.is_active)} title={u.is_active ? "Desabilitar" : "Habilitar"} className="h-8 w-8">
                              {u.is_active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => deleteUser(u.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <footer className="mt-12 border-t border-border/40 pt-6 pb-4 text-center">
          <p className="text-[#F9C730] text-[12px] font-bold uppercase tracking-[0.2em] opacity-90">
            GERTEC/CONSULTI
          </p>
        </footer>
      </div>
    </div>
  );
};

export default UserManagement;
