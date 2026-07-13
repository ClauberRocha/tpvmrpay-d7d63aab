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
  "Access-Control-Expose-Headers": "content-encoding, content-length, etag",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Pre-serialize once at cold start — avoids re-stringifying ~850KB per request.
const PAYLOAD_JSON = JSON.stringify({ tpv: tpvData, owners: ownersData });
const PAYLOAD_BYTES = new TextEncoder().encode(PAYLOAD_JSON);
const ETAG = `W/"tpv-${PAYLOAD_BYTES.length}"`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("missing auth header");
      return json({ error: "missing_auth" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      console.log("getUser failed", userErr?.message);
      return json({ error: "unauthorized" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const [{ data: profile, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      admin.from("profiles").select("is_active").eq("id", userData.user.id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userData.user.id),
    ]);
    if (pErr) console.log("profiles error", pErr.message);
    if (rErr) console.log("user_roles error", rErr.message);

    if (!profile?.is_active) {
      console.log("inactive or missing profile", userData.user.id);
      return json({ error: "inactive" }, 403);
    }
    if (!roles || roles.length === 0) {
      console.log("no role", userData.user.id);
      return json({ error: "no_role" }, 403);
    }

    if (req.headers.get("if-none-match") === ETAG) {
      return new Response(null, { status: 304, headers: { ...corsHeaders, ETag: ETAG } });
    }

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=300",
      ETag: ETAG,
    };

    // Compress on-the-fly when the client accepts gzip; stream avoids
    // allocating the compressed buffer entirely in memory.
    const acceptsGzip = (req.headers.get("accept-encoding") ?? "").includes("gzip");
    if (acceptsGzip) {
      headers["Content-Encoding"] = "gzip";
      const stream = new Blob([PAYLOAD_BYTES]).stream().pipeThrough(new CompressionStream("gzip"));
      return new Response(stream, { status: 200, headers });
    }
    return new Response(PAYLOAD_BYTES, { status: 200, headers });
  } catch (e) {
    console.error("get-tpv-data crashed", (e as Error)?.message, (e as Error)?.stack);
    return json({ error: "internal", message: (e as Error)?.message }, 500);
  }
});
