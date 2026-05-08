const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { to, subject, html } = await req.json();
    const RESEND = Deno.env.get("RESEND_API_KEY");
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND || !LOVABLE) return j({ skipped: true, reason: "Email not configured (need RESEND_API_KEY)" }, 200);
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE}`,
        "X-Connection-Api-Key": RESEND,
      },
      body: JSON.stringify({ from: "Reslyn <onboarding@resend.dev>", to: [to], subject, html }),
    });
    const data = await r.json();
    return j({ ok: r.ok, data });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); }
