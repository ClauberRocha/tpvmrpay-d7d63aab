import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import mrpayLogo from "@/assets/mrpay-logo.png.asset.json";


export default function Login() {
  const { signIn, session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && session) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
    return <Navigate to={from && from !== "/" ? from : "/dashboard"} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img
            src={mrpayLogo.url}
            alt="MR Pay"
            className="mx-auto mb-4 h-14 w-auto"
          />
          <h1 className="font-display text-2xl font-bold text-foreground">Acesso corporativo</h1>
          <p className="text-sm text-muted-foreground mt-1">Somente e-mails @mrpay.com.br</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email" type="email" autoComplete="email" required
              placeholder="voce@mrpay.com.br"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                className="pr-10"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full gap-2 font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Entrar
          </Button>

          <div className="flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Esqueci minha senha
            </Link>
            <Link to="/signup" className="text-primary hover:underline">
              Criar conta
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}
