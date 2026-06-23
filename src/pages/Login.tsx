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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        if (event === 'PASSWORD_RECOVERY') {
          // You could redirect to a specific password reset page if needed
          // For now we just let them in if it's recovery
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
          .select("is_active, role")
          .ilike("email", emailLower)
          .maybeSingle();

        if (authError || !authorized || !authorized.is_active) {
          await supabase.auth.signOut();
          setErrorMessage("Seu usuário não está autorizado ou está desativado. Entre em contato com o administrador.");
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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "E-mail necessário",
        description: "Digite seu e-mail para recuperar a senha.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir a senha.",
      });
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