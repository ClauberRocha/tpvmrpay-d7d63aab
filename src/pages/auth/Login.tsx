import { Eye, EyeOff, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { perfMark, perfReset } from "@/lib/perfMetrics";
import mrpayLogo from "@/assets/mrpay-logo.png";

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
    perfReset();
    perfMark("login_submit");
    const { error: err } = await signIn(email, password);
    setSubmitting(false);
    if (err) setError(err);
  };


  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-10 overflow-hidden">
      {/* Ambient glow matching dashboard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% -10%, hsl(45 100% 55% / 0.14), transparent 45%), radial-gradient(circle at 90% 10%, hsl(195 92% 55% / 0.10), transparent 50%)",
        }}
      />

      <div
        className="relative w-full max-w-md rounded-2xl border border-border/60 p-8 lg:p-10"
        style={{
          background: "var(--gradient-card)",
          boxShadow: "var(--shadow-card), var(--shadow-glow)",
        }}
      >
        <div className="mb-8 text-center">
          <img
            src={mrpayLogo}
            alt="Mr Pay"
            className="mx-auto mb-6 h-14 w-auto lg:h-16"
          />
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Acesso <span className="text-primary">corporativo</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Painel executivo TPV · uso restrito
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              E-mail
            </Label>
            <Input
              id="email" type="email" autoComplete="email" required
              placeholder="voce@mrpay.com.br"
              className="h-11 bg-background/40 border-border/60 focus-visible:ring-primary/40"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                className="h-11 pr-10 bg-background/40 border-border/60 focus-visible:ring-primary/40"
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
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-11 gap-2 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Entrar
          </Button>

          <div className="flex items-center justify-between text-sm pt-1">
            <Link to="/forgot-password" className="text-primary/90 hover:text-primary hover:underline">
              Esqueci minha senha
            </Link>
            <Link to="/signup" className="text-muted-foreground hover:text-foreground hover:underline">
              Criar conta
            </Link>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Sessão criptografada · acesso auditado
        </div>
      </div>
    </div>
  );
}
