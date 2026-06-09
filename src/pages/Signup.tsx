import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import mrpayLogo from "@/assets/mrpay-logo.png";
import { supabase } from "@/integrations/supabase/client";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith("@mrpay.com.br")) {
        toast({
          title: "E-mail inválido",
          description: "Apenas e-mails corporativos @mrpay.com.br são permitidos.",
          variant: "destructive",
        });
        return;
      }

      // We check if the user is already authorized
      const { data: authorized, error: authError } = await supabase
        .from("authorized_users")
        .select("id")
        .eq("email", emailLower)
        .single();

      if (authError || !authorized) {
        toast({
          title: "Acesso pendente",
          description: "Seu e-mail ainda não foi autorizado pelo administrador. Por favor, solicite a autorização.",
          variant: "destructive",
        });
        return;
      }

      // If authorized, we trigger an invite to set the password
      const { error } = await supabase.functions.invoke('invite-user', {
        body: { email: emailLower }
      });

      if (error) throw error;

      toast({
        title: "Convite enviado",
        description: "Um e-mail foi enviado para você configurar sua senha.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao processar sua solicitação.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] p-4 font-sans text-white">
      <div className="mb-8">
        <img src={mrpayLogo} alt="MRPay Logo" className="h-16 w-auto" />
      </div>

      <div className="w-full max-w-[400px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/login")} className="mr-2 text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Solicitar Acesso</h1>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">E-mail Corporativo</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@mrpay.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#262626] border-[#333333] text-white placeholder:text-gray-600 h-12 rounded-lg"
            />
            <p className="text-[10px] text-gray-500">
              Certifique-se de que seu administrador já autorizou este e-mail.
            </p>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black font-bold h-12 rounded-xl"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Enviar Convite"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
