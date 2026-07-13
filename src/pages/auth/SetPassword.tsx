import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function SetPassword() {
  const { session, refresh } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  useEffect(() => {
    // Se veio via link (hash com access_token), supabase-js já processa detectSessionInUrl
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (pwd.length < 8) return setErr("Senha deve ter no mínimo 8 caracteres.");
    if (pwd !== pwd2) return setErr("As senhas não conferem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) { setLoading(false); return setErr(error.message); }
    if (session?.user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", session.user.id);
      await supabase.rpc("log_audit", { _action: "password_changed", _description: "Senha alterada", _result: "success", _metadata: {} });
    }
    await refresh();
    setLoading(false);
    navigate("/", { replace: true });
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center text-muted-foreground">
          Link inválido ou expirado. Solicite um novo link de recuperação.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <h1 className="font-display text-xl font-bold mb-2">Definir nova senha</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Mínimo 8 caracteres. Escolha uma senha forte e única.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pwd">Nova senha</Label>
            <div className="relative">
              <Input id="pwd" type={show1 ? "text" : "password"} required className="pr-10" value={pwd} onChange={(e) => setPwd(e.target.value)} />
              <button
                type="button"
                onClick={() => setShow1((v) => !v)}
                aria-label={show1 ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="pwd2">Confirmar senha</Label>
            <div className="relative">
              <Input id="pwd2" type={show2 ? "text" : "password"} required className="pr-10" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
              <button
                type="button"
                onClick={() => setShow2((v) => !v)}
                aria-label={show2 ? "Ocultar senha" : "Mostrar senha"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus:outline-none"
                tabIndex={-1}
              >
                {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {err && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}
          <Button type="submit" disabled={loading} className="w-full font-semibold">Salvar senha</Button>
        </form>
      </div>
    </div>
  );
}
