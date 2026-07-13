import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setMsg(null);
    const normalized = email.trim().toLowerCase();
    if (!/@mrpay\.com\.br$/i.test(normalized)) {
      setErr("Somente e-mails @mrpay.com.br são permitidos.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Se o e-mail existir, um link de recuperação foi enviado.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <h1 className="font-display text-xl font-bold mb-2">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enviaremos um link seguro para redefinir sua senha.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail corporativo</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {err && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          {msg && <div className="rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-success-foreground">{msg}</div>}
          <Button type="submit" disabled={loading} className="w-full font-semibold">
            Enviar link
          </Button>
          <div className="text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">Voltar ao login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
