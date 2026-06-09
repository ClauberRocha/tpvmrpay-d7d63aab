import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Power, PowerOff, Loader2, Edit2, Check, X, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuthorizedUser {
  id: string;
  email: string;
  is_active: boolean;
  role: string;
  created_at: string;
  invited_at?: string;
}

const UserManagement = () => {
  const { user, role } = useAuth();
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

  // Only admins can manage users
  const isAdmin = role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("authorized_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.endsWith("@mrpay.com.br")) {
      toast({
        title: "Domínio inválido",
        description: "Apenas e-mails @mrpay.com.br são permitidos.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    const { error } = await supabase
      .from("authorized_users")
      .insert([{ 
        email: newEmail.toLowerCase(), 
        is_active: true,
        role: newRole 
      }]);

    if (error) {
      toast({
        title: "Erro ao adicionar usuário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Usuário adicionado",
        description: `O e-mail foi autorizado como ${newRole} com sucesso.`,
      });
      setNewEmail("");
      setNewRole("user");
      fetchUsers();
    }
    setIsAdding(false);
  };

  const handleUpdateRole = async (id: string) => {
    const { error } = await supabase
      .from("authorized_users")
      .update({ role: editRole })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar função",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Função atualizada",
        description: "A função do usuário foi alterada com sucesso.",
      });
      setEditingId(null);
      fetchUsers();
    }
  };

  const handleInviteUser = async (email: string) => {
    setIsInviting(email);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email }
      });

      if (error) throw error;

      toast({
        title: "Convite enviado",
        description: `Um e-mail de convite foi enviado para ${email}.`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar convite",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsInviting(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("authorized_users")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchUsers();
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    const { error } = await supabase
      .from("authorized_users")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Usuário excluído",
        description: "O acesso foi removido com sucesso.",
      });
      fetchUsers();
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge className="bg-red-500 hover:bg-red-600">Administrador</Badge>;
      case "manager": return <Badge className="bg-blue-500 hover:bg-blue-600">Gestor</Badge>;
      default: return <Badge variant="secondary">Usuário</Badge>;
    }
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
              <X className="h-6 w-6" />
              Acesso Negado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Você não tem permissão para gerenciar usuários. Apenas administradores autorizados podem acessar esta página e suas funcionalidades.</p>
            <Button onClick={() => navigate("/")} className="mt-6 w-full bg-primary hover:bg-primary/90">Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Autorizar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="usuario@mrpay.com.br"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="max-w-sm"
              />
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
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
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum usuário autorizado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        {editingId === u.id ? (
                          <div className="flex items-center gap-2">
                            <Select value={editRole} onValueChange={setEditRole}>
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
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
                        ) : (
                          <div className="flex items-center gap-2">
                            {getRoleBadge(u.role)}
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingId(u.id);
                                setEditRole(u.role);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? "default" : "secondary"}>
                          {u.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.invited_at ? (
                          <span className="text-xs text-muted-foreground">
                            Enviado em {new Date(u.invited_at).toLocaleDateString("pt-BR")}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-orange-500 border-orange-500/50">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingId(u.id);
                              setEditRole(u.role);
                            }}
                            title="Editar Função"
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleInviteUser(u.email)}
                            disabled={isInviting === u.email}
                            title="Enviar/Reenviar Convite"
                            className="h-8 w-8"
                          >
                            {isInviting === u.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4 text-blue-500" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleStatus(u.id, u.is_active)}
                            title={u.is_active ? "Desabilitar" : "Habilitar"}
                            className="h-8 w-8"
                          >
                            {u.is_active ? <PowerOff className="h-4 w-4 text-orange-500" /> : <Power className="h-4 w-4 text-green-500" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteUser(u.id)}
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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