import { useState, useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
      if (event === "SIGNED_OUT") {
        setErrorMessage("");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <CardHeader>
          <div className="flex justify-center">
            <img 
              src="/lovable-uploads/6027376a-5433-40a2-9743-f6615b1ca54b.png" 
              alt="MRPay Logo" 
              className="h-12 w-auto"
              onError={(e) => {
                // Fallback if logo doesn't exist yet
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <CardTitle className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Painel TPV MRPay
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#000000',
                    brandAccent: '#333333',
                  }
                }
              }
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: "E-mail",
                  password_label: "Senha",
                  button_label: "Entrar",
                  loading_button_label: "Entrando...",
                  email_input_placeholder: "Seu e-mail",
                  password_input_placeholder: "Sua senha",
                  link_text: "Já tem uma conta? Entre",
                },
                sign_up: {
                  email_label: "E-mail",
                  password_label: "Senha",
                  button_label: "Cadastrar",
                  loading_button_label: "Cadastrando...",
                  email_input_placeholder: "Seu e-mail",
                  password_input_placeholder: "Sua senha",
                  link_text: "Não tem uma conta? Cadastre-se",
                },
                forgotten_password: {
                  link_text: "Esqueceu sua senha?",
                  button_label: "Enviar instruções",
                  loading_button_label: "Enviando...",
                  email_label: "E-mail",
                  email_input_placeholder: "Seu e-mail",
                }
              }
            }}
            providers={[]}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
