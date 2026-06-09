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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold h-12 rounded-xl transition-all duration-200 mt-2"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Acessar Painel"
            )}
          </Button>
        </form>

        <p className="text-center text-[10px] text-gray-500 mt-10 leading-relaxed uppercase tracking-wider">
          Ao acessar, você concorda com nossos termos de segurança corporativa.
        </p>
      </div>
    </div>
  );
};

export default Login;