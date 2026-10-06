const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { mode, payload } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")?.trim();
    if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

    if (!mode || !payload) throw new Error("Mode and payload are required");

    let systemPrompt = "";
    let userPrompt = "";

    switch (mode) {
      case "rewrite_summary":
        systemPrompt = `You are an expert resume writer. Rewrite the professional summary to be powerful, concise, and impactful.`;
        userPrompt = `Rewrite this summary for a ${payload.target_role} role in ${payload.country || "Nigeria"}:\n\n${payload.what_i_do}`;
        break;

      case "rewrite_bullets":
        systemPrompt = `You are an expert resume bullet point writer. Turn responsibilities into strong achievement statements using action verbs.`;
        userPrompt = `Role: ${payload.role}\nTarget: ${payload.target_role}\n\nOriginal bullets:\n${payload.raw}`;
        break;

      case "suggest_skills":
        systemPrompt = `You are a skills optimization expert for resumes.`;
        userPrompt = `Suggest 12-18 relevant skills for a ${payload.target_role} role. Return only comma-separated skills.`;
        break;

      case "score":
        systemPrompt = `You are an ATS resume scoring expert. Score the resume out of 100 and give brief strengths and improvements.`;
        userPrompt = `Score this resume for ${payload.target_role} role:\n\n${JSON.stringify(payload.resume, null, 2)}`;
        break;

      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: mode === "score" ? 800 : 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const data = await r.json().catch(() => null);

    if (!r.ok) {
      console.error("Groq error:", r.status, JSON.stringify(data));
      throw new Error(data?.error?.message || `Groq request failed (${r.status})`);
    }

    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) {
      console.error("Empty Groq response:", JSON.stringify(data));
      throw new Error("Groq returned an empty response");
    }

    return json({ text });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || "Internal error" }, 500);
  }
});