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
  console.log("[admin-users] auth header present:", !!authHeader, "len:", authHeader?.length ?? 0);
  if (!authHeader) return json({ error: "missing_auth" }, 401);

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const tokenPreview = token.length > 20 ? `${token.slice(0, 12)}…${token.slice(-6)}` : "(too short)";
  console.log("[admin-users] token preview:", tokenPreview);

  const anonClient = createClient(SUPABASE_URL, ANON);
  const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    console.log("[admin-users] getClaims FAILED:", claimsErr?.message, "code:", (claimsErr as { code?: string })?.code);
    return json({ error: "unauthorized", detail: claimsErr?.message }, 401);
  }
  const callerId = claimsData.claims.sub as string;
  const callerEmail = (claimsData.claims.email as string | undefined) ?? "";
  const callerRoleClaim = (claimsData.claims.role as string | undefined) ?? "";
  const caller = { id: callerId, email: callerEmail };
  console.log("[admin-users] claims OK:", { sub: callerId, email: callerEmail, role: callerRoleClaim, exp: claimsData.claims.exp });

  const { data: roles, error: rolesErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);
  console.log("[admin-users] user_roles lookup:", { rows: roles?.length ?? 0, roles, err: rolesErr?.message });
  const isAdmin = roles?.some((r) => r.role === "admin");
  if (!isAdmin) {
    console.log("[admin-users] not admin, denying:", caller.email);
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
        console.log("[create] start", { email, role: payload.role });
        if (!EMAIL_DOMAIN.test(email)) {
          console.log("[create] invalid_domain", email);
          return json({ error: "invalid_domain" }, 400);
        }
        const role = String(payload.role ?? "user");
        if (!["admin", "manager", "user"].includes(role)) {
          console.log("[create] invalid_role", role);
          return json({ error: "invalid_role" }, 400);
        }

        let userId: string;
        let mode: "invited" | "recovery" = "invited";
        const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { first_name: payload.first_name ?? "", last_name: payload.last_name ?? "" },
          redirectTo: `${payload.origin ?? ""}/set-password`,
        });
        console.log("[create] invite result:", { ok: !invErr, id: invited?.user?.id, err: invErr?.message, code: (invErr as { code?: string })?.code });

        if (invErr) {
          const code = (invErr as { code?: string }).code;
          const msg = invErr.message || "";
          if (code === "email_exists" || /already been registered/i.test(msg)) {
            mode = "recovery";
            const { data: list, error: listErr } = await admin.auth.admin.listUsers();
            if (listErr) { console.log("[create] listUsers err", listErr.message); throw listErr; }
            const existing = list.users.find((u) => u.email?.toLowerCase() === email);
            if (!existing) return json({ error: "Usuário já existe mas não foi possível localizá-lo." }, 409);
            userId = existing.id;
            console.log("[create] user exists in auth:", userId);
            const { error: recErr } = await admin.auth.resetPasswordForEmail(email, {
              redirectTo: `${payload.origin ?? ""}/set-password`,
            });
            console.log("[create] recovery email:", { err: recErr?.message });
          } else {
            throw invErr;
          }
        } else {
          userId = invited.user!.id;
        }

        // UPSERT do profile — o trigger handle_new_user pode não ter rodado
        // para usuários antigos, e UPDATE puro é no-op quando a linha não existe.
        const { error: upErr } = await admin.from("profiles").upsert({
          id: userId,
          email,
          first_name: payload.first_name ?? "",
          last_name: payload.last_name ?? "",
          department: payload.department ?? "",
          is_active: payload.is_active ?? true,
          must_change_password: true,
        }, { onConflict: "id" });
        console.log("[create] profile upsert:", { err: upErr?.message });
        if (upErr) throw upErr;

        const { error: delRoleErr } = await admin.from("user_roles").delete().eq("user_id", userId);
        const { error: insRoleErr } = await admin.from("user_roles").insert({ user_id: userId, role });
        console.log("[create] role set:", { role, delErr: delRoleErr?.message, insErr: insRoleErr?.message });
        if (insRoleErr) throw insRoleErr;

        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "user_created", description: `${mode === "recovery" ? "Recuperou" : "Convidou"} ${email} como ${role}`,
          metadata: { mode, target_user_id: userId },
        });
        console.log("[create] done", { userId, mode });
        return json({ ok: true, user_id: userId, mode });
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
        const origin = String(payload.origin ?? "");
        console.log("[reset_password] start", { id, origin });
        const { data: prof, error: profErr } = await admin
          .from("profiles").select("email").eq("id", id).single();
        if (profErr || !prof) {
          console.log("[reset_password] profile not found", profErr?.message);
          return json({ error: "not_found" }, 404);
        }
        console.log("[reset_password] target email", prof.email);

        // O envio efetivo do e-mail passa pelo fluxo público do GoTrue.
        // Chamar com o service_role NÃO dispara e-mail — precisa ser via anon.
        const anon = createClient(SUPABASE_URL, ANON);
        const { error: sendErr } = await anon.auth.resetPasswordForEmail(prof.email, {
          redirectTo: `${origin}/set-password`,
        });
        console.log("[reset_password] send result:", {
          err: sendErr?.message,
          code: (sendErr as { code?: string })?.code,
          status: (sendErr as { status?: number })?.status,
        });
        if (sendErr) {
          await admin.from("audit_logs").insert({
            user_id: caller.id, user_email: caller.email, user_role: "admin",
            action: "password_reset_failed", result: "failure",
            description: `Falha ao enviar reset para ${prof.email}: ${sendErr.message}`,
          });
          return json({ error: sendErr.message }, 500);
        }

        await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
        await admin.from("audit_logs").insert({
          user_id: caller.id, user_email: caller.email, user_role: "admin",
          action: "password_reset_sent", description: `Reset enviado para ${prof.email}`,
        });
        console.log("[reset_password] done");
        return json({ ok: true, email: prof.email });
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
