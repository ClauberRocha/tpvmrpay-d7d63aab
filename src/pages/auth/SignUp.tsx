import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function SignUp() {
  const { signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    const { error: err, needsConfirmation } = await signUp(email, password, firstName, lastName);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    if (needsConfirmation) {
      setInfo("Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.");
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="text-[#F9C730] font-bold uppercase tracking-[0.25em] text-sm mb-2">MR PAY</div>
          <h1 className="font-display text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-1">Somente e-mails @mrpay.com.br</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">Nome</Label>
              <Input id="first_name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="last_name">Sobrenome</Label>
              <Input id="last_name" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">E-mail corporativo</Label>
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
                id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8}
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
            <p className="text-xs text-muted-foreground mt-1">Mínimo de 8 caracteres.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-foreground">
              {info}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full gap-2 font-semibold">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Criar conta
          </Button>

          <div className="text-center text-sm">
            Já possui conta?{" "}
            <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
