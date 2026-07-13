// Edge function para gerenciamento administrativo de usuários.
// Só executa se o chamador for administrador. Usa service role internamente.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const EMAIL_DOMAIN = /@mrpay\.com\.br$/i;

interface Body {
  action: "list" | "create" | "update" | "delete" | "reset_password" | "set_role" | "set_active";
  payload?: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // --- Bootstrap: convida admin inicial se ainda não houver nenhum admin ---
  let bodyPeek: Body | null = null;
  try { bodyPeek = await req.clone().json(); } catch { /* ignore */ }

  if (bodyPeek?.action === "bootstrap_admin") {
    // Guarded by a shared secret so unauthenticated callers cannot spam invite/
    // recovery emails to the admin address or probe whether the account exists.
    const expected = Deno.env.get("BOOTSTRAP_SECRET");
    const provided = req.headers.get("x-bootstrap-secret") ?? "";
    if (!expected || provided.length === 0 || provided !== expected) {
      return json({ error: "forbidden" }, 403);
    }
    const email = "clauber.rocha@mrpay.com.br";
    const origin = String((bodyPeek.payload as Record<string, unknown> | undefined)?.origin ?? "");
    // Se ainda não existir na auth, convida; senão apenas envia recovery
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email?.toLowerCase() === email);
    if (!found) {
      const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { first_name: "Clauber", last_name: "Rocha" },
        redirectTo: `${origin}/set-password`,
      });
      if (invErr) return json({ error: invErr.message }, 500);
      await admin.from("audit_logs").insert({
        action: "admin_bootstrapped",
        description: `Convite inicial enviado para ${email}`,
        user_email: email, user_role: "admin",
      });
      return json({ ok: true, user_id: invited.user?.id, mode: "invited" });
    }
    // Já existe — envia recovery
    const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/set-password`,
    });
    if (resetErr) return json({ error: resetErr.message }, 500);
    await admin.from("audit_logs").insert({
      action: "admin_bootstrapped",
      description: `Recovery link enviado para admin existente ${email}`,
      user_email: email, user_role: "admin",
    });
    return json({ ok: true, user_id: found.id, mode: "recovery" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing_auth" }, 401);

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const anonClient = createClient(SUPABASE_URL, ANON);
  const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    console.log("getClaims failed", claimsErr?.message);
    return json({ error: "unauthorized", detail: claimsErr?.message }, 401);
  }
  const callerId = claimsData.claims.sub as string;
  const callerEmail = (claimsData.claims.email as string | undefined) ?? "";
  const caller = { id: callerId, email: callerEmail };

  // Verifica se é admin
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);
  const isAdmin = roles?.some((r) => r.role === "admin");
  if (!isAdmin) {
    await admin.from("audit_logs").insert({
      user_id: caller.id,
      user_email: caller.email,
      action: "admin_access_denied",
      description: "Tentativa de acesso admin sem permissão",
      result: "failure",
    });
    return json({ error: "forbidden" }, 403);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { action, payload = {} } = body;

  try {
    switch (action) {
      case "list": {
        const { data: profiles, error } = await admin
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        const { data: rolesAll } = await admin.from("user_roles").select("user_id, role");
        const roleMap = new Map<string, string>();
        rolesAll?.forEach((r) => roleMap.set(r.user_id, r.role));
        return json({
          users: profiles?.map((p) => ({ ...p, role: roleMap.get(p.id) ?? "user" })),
        });
      }

      case "create": {
        const email = String(payload.email ?? "").toLowerCase().trim();
        if (!EMAIL_DOMAIN.test(email)) return json({ error: "invalid_domain" }, 400);
        const role = String(payload.role ?? "user");
        if (!["admin", "manager", "user"].includes(role)) return json({ error: "invalid_role" }, 400);

        // Invite: Supabase envia e-mail com link para definir senha
        let userId: string;
        const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: {
            first_name: payload.first_name ?? "",
            last_name: payload.last_name ?? "",
          },
          redirectTo: `${payload.origin ?? ""}/set-password`,
        });

        if (invErr) {
          // Se o e-mail já existe, localiza o usuário e envia recovery
          const code = (invErr as { code?: string }).code;
          const msg = invErr.message || "";
          if (code === "email_exists" || /already been registered/i.test(msg)) {
            const { data: list, error: listErr } = await admin.auth.admin.listUsers();
            if (listErr) throw listErr;
            const existing = list.users.find((u) => u.email?.toLowerCase() === email);
            if (!existing) return json({ error: "Usuário já existe mas não foi possível localizá-lo." }, 409);
            userId = existing.id;
            await admin.auth.resetPasswordForEmail(email, {
              redirectTo: `${payload.origin ?? ""}/set-password`,
            });
          } else {
            throw invErr;
          }
        } else {
          userId = invited.user!.id;
        }

        // Atualiza profile
        await admin.from("profiles").update({
          first_name: payload.first_name ?? "",
          last_name: payload.last_name ?? "",
          department: payload.department ?? "",
          is_active: payload.is_active ?? true,
          must_change_password: true,
        }).eq("id", userId);

        // Define role: remove padrão e insere pedido
        await admin.from("user_roles").delete().eq("user_id", userId);
        await admin.from("user_roles").insert({ user_id: userId, role });

        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "user_created", description: `Convidou ${email} como ${role}`,
        });
        return json({ ok: true, user_id: userId });
      }

      case "update": {
        const id = String(payload.id);
        const updates: Record<string, unknown> = {};
        if (payload.first_name !== undefined) updates.first_name = payload.first_name;
        if (payload.last_name !== undefined) updates.last_name = payload.last_name;
        if (payload.department !== undefined) updates.department = payload.department;
        if (payload.is_active !== undefined) updates.is_active = Boolean(payload.is_active);
        if (Object.keys(updates).length > 0) {
          await admin.from("profiles").update(updates).eq("id", id);
        }
        if (payload.is_active !== undefined) {
          await admin.auth.admin.updateUserById(id, {
            ban_duration: payload.is_active ? "none" : "876000h",
          });
        }
        if (payload.role !== undefined && id !== caller.id) {
          const role = String(payload.role);
          if (!["admin", "manager", "user"].includes(role)) return json({ error: "invalid_role" }, 400);
          await admin.from("user_roles").delete().eq("user_id", id);
          await admin.from("user_roles").insert({ user_id: id, role });
        }
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "user_updated", description: `Editou perfil ${id}`,
          metadata: updates as Record<string, unknown>,
        });
        return json({ ok: true });
      }
      case "set_role": {
        const id = String(payload.id);
        const role = String(payload.role);
        if (!["admin", "manager", "user"].includes(role)) return json({ error: "invalid_role" }, 400);
        if (id === caller.id) return json({ error: "cannot_change_own_role" }, 400);
        await admin.from("user_roles").delete().eq("user_id", id);
        await admin.from("user_roles").insert({ user_id: id, role });
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "role_changed", description: `Perfil de ${id} alterado para ${role}`,
        });
        return json({ ok: true });
      }

      case "set_active": {
        const id = String(payload.id);
        const active = Boolean(payload.is_active);
        await admin.from("profiles").update({ is_active: active }).eq("id", id);
        // Banir na auth para bloquear efetivamente
        await admin.auth.admin.updateUserById(id, {
          ban_duration: active ? "none" : "876000h",
        });
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: active ? "user_activated" : "user_deactivated",
          description: `Usuário ${id} ${active ? "ativado" : "desativado"}`,
        });
        return json({ ok: true });
      }

      case "reset_password": {
        const id = String(payload.id);
        const { data: prof } = await admin.from("profiles").select("email").eq("id", id).single();
        if (!prof) return json({ error: "not_found" }, 404);
        await admin.auth.admin.updateUserById(id, {}); // no-op safety
        const { error } = await admin.auth.admin.generateLink({
          type: "recovery",
          email: prof.email,
        });
        if (error) throw error;
        // Enviar e-mail: usa resetPasswordForEmail via user client (mais simples)
        await admin.auth.resetPasswordForEmail(prof.email, {
          redirectTo: `${payload.origin ?? ""}/set-password`,
        });
        await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "password_reset_sent", description: `Reset enviado para ${prof.email}`,
        });
        return json({ ok: true });
      }

      case "delete": {
        const id = String(payload.id);
        if (id === caller.id) return json({ error: "cannot_delete_self" }, 400);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "user_deleted", description: `Usuário ${id} excluído`,
        });
        return json({ ok: true });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
