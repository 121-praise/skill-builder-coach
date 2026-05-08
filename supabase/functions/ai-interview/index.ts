const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { messages, role, country, difficulty, end } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

    if (end) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: `Score this candidate 0-100 for a ${role} role in ${country}. Be fair and constructive.` },
            { role: "user", content: `Transcript:\n${(messages||[]).map((m:any)=>`${m.role}: ${m.content}`).join("\n")}\n\nReturn the score and feedback.` },
          ],
          tools: [{
            type: "function", function: {
              name: "interview_eval",
              parameters: { type: "object", properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                feedback: { type: "string" },
              }, required: ["score","feedback"] }
            }
          }],
          tool_choice: { type: "function", function: { name: "interview_eval" } },
        }),
      });
      const data = await r.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      return new Response(args || JSON.stringify({ score: 0, feedback: "" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const sys = `You are a friendly but rigorous interviewer for a ${role} position in ${country}. Difficulty: ${difficulty}. Ask one focused question at a time. After the candidate answers, give a brief reaction (1 sentence) and ask the next question. Cover both behavioral and role-specific questions. Keep responses concise.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: [{ role: "system", content: sys }, ...(messages||[])] }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    const data = await r.json();
    return new Response(JSON.stringify({ text: data.choices?.[0]?.message?.content ?? "" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
