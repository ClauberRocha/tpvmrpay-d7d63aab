// Serves the TPV dataset and client-owner mapping only to authenticated users.
// The JSON payloads live next to this function (outside the web bundle) so they
// cannot be downloaded as static assets from the public build.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

import tpvData from "./tpv.json" with { type: "json" };
import ownersData from "./clienteProprietario.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing_auth" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);

  // Additional authorization: user must be active AND have a role assigned.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin.from("profiles").select("is_active").eq("id", userData.user.id).maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userData.user.id),
  ]);

  if (!profile?.is_active) return json({ error: "inactive" }, 403);
  if (!roles || roles.length === 0) return json({ error: "no_role" }, 403);

  return json({ tpv: tpvData, owners: ownersData });
});
