import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import mrpayLogo from "@/assets/mrpay-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [forceChangePassword, setForceChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("force_change") === "true") {
      setForceChangePassword(true);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const emailLower = session.user.email?.toLowerCase();
        if (emailLower && emailLower !== "clauber.rocha@mrpay.com.br") {
          const { data: authorized } = await supabase
            .from("authorized_users")
            .select("must_change_password")
            .ilike("email", emailLower)
            .maybeSingle();
            
          if (authorized?.must_change_password) {
            setForceChangePassword(true);
            return;
          }
        }

        if (event === 'PASSWORD_RECOVERY') {
          setForceChangePassword(true);
          return;
        }
        navigate("/");
      }

      if (event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        const email = session?.user?.email;
        if (email) {
          const { logActivity } = await import("@/utils/logger");
          logActivity('password_change', `Senha alterada com sucesso para ${email}`, { email });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const emailLower = email.toLowerCase().trim();
      if (!emailLower.endsWith("@mrpay.com.br")) {
        setErrorMessage("Acesso permitido apenas para usuários corporativos MRPay.");
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      // After successful sign-in, verify authorization (RLS allows authenticated reads)
      if (!error && emailLower !== "clauber.rocha@mrpay.com.br") {
        const { data: authorized, error: authError } = await supabase
          .from("authorized_users")
          .select("is_active, role, must_change_password")
          .ilike("email", emailLower)
          .maybeSingle();

        if (authError || !authorized || !authorized.is_active) {
          await supabase.auth.signOut();
          setErrorMessage("Seu usuário não está autorizado ou está desativado. Entre em contato com o administrador.");
          setIsLoading(false);
          return;
        }

        if (authorized.must_change_password) {
          setForceChangePassword(true);
          setIsLoading(false);
          return;
        }
      }

      if (!error) {
        // Log success and send WhatsApp notification
        const { logActivity } = await import("@/utils/logger");
        logActivity('login', `Login realizado com sucesso por ${emailLower}`);

        supabase.functions.invoke('whatsapp-notification', {
          body: { email: emailLower }
        }).catch(err => console.error("WhatsApp error:", err));
      }

      // Log attempt to database
      await supabase.from("login_attempts").insert([{
        email: emailLower,
        success: !error,
        user_agent: navigator.userAgent
      }]);

      if (error) {
        setErrorMessage(error.message === "Invalid login credentials" 
          ? "Credenciais inválidas. Verifique seu e-mail e senha." 
          : error.message);
      }
    } catch (error: any) {
      setErrorMessage("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("As senhas não coincidem.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) throw authError;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) throw new Error("Usuário não identificado.");

      const { error: dbError } = await supabase
        .from("authorized_users")
        .update({
          temp_password: null,
          must_change_password: false,
        })
        .eq("email", currentUser.email.toLowerCase());

      if (dbError) throw dbError;

      const { logActivity } = await import("@/utils/logger");
      logActivity('password_change', `Senha temporária alterada com sucesso por ${currentUser.email}`, { email: currentUser.email });

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso! Bem-vindo.",
      });

      setForceChangePassword(false);
      navigate("/");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao atualizar a senha. Tente novamente.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "E-mail necessário",
        description: "Digite seu e-mail para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const emailLower = email.toLowerCase().trim();
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: emailLower, force: true }
      });

      if (error) {
        const ctx: any = (error as any).context;
        let msg = error.message;
        try {
          const body = ctx && (await ctx.json?.());
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }

      toast({
        title: "Senha Temporária Gerada",
        description: data?.message || "Uma nova senha temporária foi gerada e vinculada à sua conta.",
      });
      
      if (data?.temp_password) {
        toast({
          title: "[Ambiente de Teste]",
          description: `Senha temporária gerada: ${data.temp_password}`,
          duration: 15000,
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao resetar senha",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 font-sans text-white">
      {/* Logo no centro e na parte de cima */}
      <div className="mb-8">
        <img 
          src={mrpayLogo} 
          alt="MRPay Logo" 
          className="h-16 w-auto"
        />
      </div>

      <div className="w-full max-w-[400px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
        {forceChangePassword ? (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Alterar Senha</h1>
              <p className="text-gray-400 text-sm">Você está acessando com uma senha temporária. Defina sua nova senha de acesso.</p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-900/50 text-red-200">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="bg-[#262626] border-[#333333] text-white h-12 pr-10 rounded-lg focus:ring-[#fbbf24] focus:border-[#fbbf24]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirme a nova senha"
                  className="bg-[#262626] border-[#333333] text-white h-12 rounded-lg focus:ring-[#fbbf24] focus:border-[#fbbf24]"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isUpdatingPassword}
                className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold h-12 rounded-xl transition-all duration-300 mt-2 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:-translate-y-1"
              >
                {isUpdatingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Alterar e Acessar"
                )}
              </Button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setForceChangePassword(false);
                    setErrorMessage("");
                  }}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
              <p className="text-gray-400 text-sm">Entre com suas credenciais corporativas</p>
            </div>

            {errorMessage && (
              <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-900/50 text-red-200">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@mrpay.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#262626] border-[#333333] text-white placeholder:text-gray-600 h-12 rounded-lg focus:ring-[#fbbf24] focus:border-[#fbbf24]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-xs text-[#fbbf24] hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#262626] border-[#333333] text-white h-12 pr-10 rounded-lg focus:ring-[#fbbf24] focus:border-[#fbbf24]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold h-12 rounded-xl transition-all duration-300 mt-2 hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:-translate-y-1"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Acessar Painel"
                )}
              </Button>

              <div className="text-center">
                <button 
                  type="button"
                  onClick={() => navigate("/signup")}
                  className="text-sm text-[#fbbf24] hover:underline transition-colors"
                >
                  Não tem uma conta? Solicitar acesso
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-8 space-y-2 text-center">
          <p className="text-[10px] text-white leading-relaxed uppercase tracking-wider opacity-80">
            Ao acessar, você concorda com nossos termos de segurança corporativa.
          </p>
          <p className="text-[12px] text-white font-bold uppercase tracking-[0.2em]">
            GERTEC/CONSULTI
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;