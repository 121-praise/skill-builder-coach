import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { reference } = await req.json();
    const SECRET = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!SECRET) return j({ error: "PAYSTACK_SECRET_KEY not configured. Add it in Cloud → Secrets." }, 500);

    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const data = await r.json();
    const ok = data?.data?.status === "success";

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pay } = await sb.from("payments").update({
      status: ok ? "success" : "failed", raw: data,
    }).eq("reference", reference).select().single();
    if (ok && pay?.resume_id) await sb.from("resumes").update({ paid: true }).eq("id", pay.resume_id);

    return j({ ok, payment: pay });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); }
