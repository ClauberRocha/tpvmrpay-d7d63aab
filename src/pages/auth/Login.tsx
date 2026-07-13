import { Loader2, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { signIn, session, loading } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/";
    return <Navigate to={from} replace />;
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
          <div className="text-[#F9C730] font-bold uppercase tracking-[0.25em] text-sm mb-2">MR PAY</div>
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
            <Input
              id="password" type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
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

          <div className="text-center text-sm">
            <Link to="/forgot-password" className="text-primary hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
