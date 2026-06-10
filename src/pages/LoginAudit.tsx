import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Search, Smartphone, Monitor, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

interface LoginAttempt {
  id: string;
  email: string;
  created_at: string;
  success: boolean;
  user_agent: string;
}

const ITEMS_PER_PAGE = 20;

const LoginAudit = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (role && role !== "admin") {
      navigate("/");
      return;
    }
    fetchAttempts();
  }, [role, navigate, currentPage, filter]);

  const fetchAttempts = async () => {
    setLoading(true);
    
    let query = supabase
      .from("login_attempts")
      .select("*", { count: "exact" });

    if (filter) {
      query = query.or(`email.ilike.%${filter}%,user_agent.ilike.%${filter}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

    if (!error && data) {
      setAttempts(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const exportToCSV = () => {
    if (attempts.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["ID", "E-mail", "Data/Hora", "Sucesso", "User Agent"];
    const csvRows = attempts.map(a => [
      a.id,
      a.email,
      new Date(a.created_at).toLocaleString("pt-BR"),
      a.success ? "Sim" : "Não",
      `"${a.user_agent.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-logins-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso");
  };

  const getDeviceIcon = (ua: string) => {
    if (/mobile|android|iphone|ipad|tablet/i.test(ua)) {
      return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    }
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const formatUA = (ua: string) => {
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Outro";
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Auditoria de Logins</h1>
              <p className="text-muted-foreground">Histórico de tentativas de acesso ao sistema</p>
            </div>
          </div>
          <Button 
            onClick={exportToCSV}
            className="bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <Card className="border-[#2a2a2a] bg-[#1a1a1a]">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-xl text-white">Tentativas Recentes ({totalCount})</CardTitle>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por e-mail ou navegador..."
                  className="pl-9 bg-[#262626] border-[#333333]"
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-[#2a2a2a]">
              <Table>
                <TableHeader className="bg-[#262626]">
                  <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                    <TableHead className="text-muted-foreground">E-mail</TableHead>
                    <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Dispositivo/Navegador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Carregando registros...
                      </TableCell>
                    </TableRow>
                  ) : attempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attempts.map((attempt) => (
                      <TableRow key={attempt.id} className="border-[#2a2a2a] hover:bg-white/5">
                        <TableCell className="font-medium text-white">{attempt.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(attempt.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {attempt.success ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1.5 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1.5 font-medium">
                              <XCircle className="h-3 w-3" />
                              Falha
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {getDeviceIcon(attempt.user_agent)}
                            <span>{formatUA(attempt.user_agent)}</span>
                            <span className="text-[10px] opacity-40 truncate max-w-[150px]" title={attempt.user_agent}>
                              ({attempt.user_agent})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages} ({totalCount} registros)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="border-[#2a2a2a] bg-[#262626]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="border-[#2a2a2a] bg-[#262626]"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginAudit;