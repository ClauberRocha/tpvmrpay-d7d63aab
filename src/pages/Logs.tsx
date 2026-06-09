import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Search, Filter, History, UserX, UserCheck, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Log {
  id: string;
  email: string;
  action: string;
  details: string;
  created_at: string;
  metadata?: any;
}

interface LoginAttempt {
  id: string;
  email: string;
  success: boolean;
  created_at: string;
  user_agent: string;
}

const Logs = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const isAdmin = role === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, attemptsRes] = await Promise.all([
        supabase.from("user_logs").select("*").order("created_at", { ascending: false }),
        supabase.from("login_attempts").select("*").order("created_at", { ascending: false }).limit(100)
      ]);

      if (logsRes.error) throw logsRes.error;
      if (attemptsRes.error) throw attemptsRes.error;

      setLogs(logsRes.data || []);
      setLoginAttempts(attemptsRes.data || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error.message);
    }
    setIsLoading(false);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      
      let matchesDate = true;
      if (dateFilter !== "all") {
        const logDate = new Date(log.created_at);
        const today = new Date();
        if (dateFilter === "today") {
          matchesDate = logDate.toDateString() === today.toDateString();
        } else if (dateFilter === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          matchesDate = logDate >= weekAgo;
        }
      }

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, searchTerm, actionFilter, dateFilter]);

  const userStats = useMemo(() => {
    const stats: Record<string, { lastSeen: string, totalActions: number, failures: number, changes: number }> = {};
    
    logs.forEach(log => {
      const email = log.email || "Sistema";
      if (!stats[email]) stats[email] = { lastSeen: log.created_at, totalActions: 0, failures: 0, changes: 0 };
      stats[email].totalActions++;
      if (['permission_change', 'status_change', 'password_change'].includes(log.action)) {
        stats[email].changes++;
      }
    });

    loginAttempts.forEach(attempt => {
      const email = attempt.email;
      if (!stats[email]) stats[email] = { lastSeen: attempt.created_at, totalActions: 0, failures: 0, changes: 0 };
      if (!attempt.success) stats[email].failures++;
    });

    return Object.entries(stats).sort((a, b) => b[1].totalActions - a[1].totalActions);
  }, [logs, loginAttempts]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login': return <Badge className="bg-green-500">Login</Badge>;
      case 'logout': return <Badge variant="secondary">Logout</Badge>;
      case 'user_creation': return <Badge className="bg-blue-500">Criação</Badge>;
      case 'user_deletion': return <Badge className="bg-red-500">Exclusão</Badge>;
      case 'permission_change': return <Badge className="bg-purple-500">Permissão</Badge>;
      case 'password_change': return <Badge className="bg-orange-500">Senha</Badge>;
      case 'status_change': return <Badge className="bg-amber-500">Status</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-destructive">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">Você não tem permissão para acessar os logs do sistema.</p>
          <Button onClick={() => navigate("/")} className="mt-6">Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10 text-foreground">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/users")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Audit de Logs e Segurança</h1>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="activity" className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="activity" className="gap-2">
              <History className="h-4 w-4" /> Atividade Geral
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <UserCheck className="h-4 w-4" /> Auditoria por Usuário
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <UserX className="h-4 w-4" /> Tentativas de Login
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-lg">Registros de Atividade</CardTitle>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Pesquisar..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-40">
                        <Filter className="h-3 w-3 mr-2" />
                        <SelectValue placeholder="Ação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Ações</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="logout">Logout</SelectItem>
                        <SelectItem value="user_creation">Criação</SelectItem>
                        <SelectItem value="permission_change">Permissão</SelectItem>
                        <SelectItem value="password_change">Senha</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Data" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo Período</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Última Semana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-48">Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                          </TableCell>
                        </TableRow>
                      ) : filteredLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                            Nenhum registro encontrado com os filtros atuais.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLogs.map((log) => (
                          <TableRow key={log.id} className="group">
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </TableCell>
                            <TableCell className="font-medium text-xs">{log.email || "Sistema"}</TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                              {log.details}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo por Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userStats.map(([email, stats]) => (
                      <div key={email} className="flex flex-col p-3 rounded-lg border bg-card/50">
                        <span className="font-medium text-sm truncate">{email}</span>
                        <div className="flex gap-4 mt-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase">Ações</span>
                            <span className="text-sm font-bold">{stats.totalActions}</span>
                          </div>
                          <div className="flex flex-col text-red-400">
                            <span className="text-[10px] uppercase">Falhas</span>
                            <span className="text-sm font-bold">{stats.failures}</span>
                          </div>
                          <div className="flex flex-col text-blue-400">
                            <span className="text-[10px] uppercase">Alterações</span>
                            <span className="text-sm font-bold">{stats.changes}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Linha do Tempo de Auditoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {logs.slice(0, 15).map((log, i) => (
                      <div key={log.id} className="relative pl-6 pb-6 border-l last:pb-0 border-primary/20">
                        <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{log.email || "Sistema"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <p className="text-sm">{log.details}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico de Tentativas de Login</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dispositivo/Navegador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="text-xs">
                          {new Date(attempt.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium text-xs">{attempt.email}</TableCell>
                        <TableCell>
                          <Badge variant={attempt.success ? "default" : "destructive"}>
                            {attempt.success ? "Sucesso" : "Falha"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground truncate max-w-xs">
                          {attempt.user_agent}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Logs;