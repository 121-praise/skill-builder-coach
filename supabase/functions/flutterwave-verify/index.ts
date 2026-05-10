const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { transaction_id, tx_ref, expected_amount } = await req.json();
    const KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
    if (!KEY) return j({ ok: false, error: "Missing FLUTTERWAVE_SECRET_KEY" }, 500);
    if (!transaction_id) return j({ ok: false, error: "transaction_id required" }, 400);

    const r = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    const data = await r.json();
    const tx = data?.data;
    const ok =
      data?.status === "success" &&
      tx?.status === "successful" &&
      (!tx_ref || tx?.tx_ref === tx_ref) &&
      (!expected_amount || Number(tx?.amount) >= Number(expected_amount));

    return j({ ok, raw: data });
  } catch (e) {
    return j({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}