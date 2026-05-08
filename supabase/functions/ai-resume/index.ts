const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { mode, payload } = await req.json();
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) return j({ error: "Missing LOVABLE_API_KEY" }, 500);

    let messages: any[] = [];
    let tools: any[] | undefined; let tool_choice: any | undefined;

    if (mode === "rewrite_summary") {
      const { what_i_do, target_role, country } = payload;
      messages = [
        { role: "system", content: `You are a senior career coach. Write resume summaries tailored to the ${country} job market. Keep it 2-3 sentences, confident, results-focused, no fluff.` },
        { role: "user", content: `Target role: ${target_role}\nWhat I do: ${what_i_do}\n\nWrite a polished professional summary in first person without using "I".` },
      ];
    } else if (mode === "rewrite_bullets") {
      const { raw, role, target_role, country } = payload;
      messages = [
        { role: "system", content: `Rewrite job duties into 3-5 strong, ATS-friendly resume bullets for the ${country} market. Use action verbs + measurable impact. Tailor to: ${target_role}.` },
        { role: "user", content: `Role: ${role}\nWhat they did: ${raw}\n\nReturn only bullets, one per line, no leading dashes.` },
      ];
    } else if (mode === "suggest_skills") {
      const { target_role, experience, country } = payload;
      messages = [
        { role: "system", content: `Suggest 8-12 in-demand skills for a ${target_role} in ${country}. Return a comma-separated list. No descriptions.` },
        { role: "user", content: `Background: ${experience}` },
      ];
    } else if (mode === "score") {
      const { resume, target_role, country } = payload;
      messages = [
        { role: "system", content: `You are an ATS expert. Score resumes 0-100 for ${country} markets and target role.` },
        { role: "user", content: `Target: ${target_role} in ${country}\n\nResume JSON:\n${JSON.stringify(resume).slice(0, 8000)}\n\nGive an ATS score and 4-6 specific improvement tips.` },
      ];
      tools = [{
        type: "function",
        function: {
          name: "ats_report",
          parameters: {
            type: "object",
            properties: {
              score: { type: "integer", minimum: 0, maximum: 100 },
              strengths: { type: "array", items: { type: "string" } },
              improvements: { type: "array", items: { type: "string" } },
            },
            required: ["score", "strengths", "improvements"],
          },
        },
      }];
      tool_choice = { type: "function", function: { name: "ats_report" } };
    } else {
      return j({ error: "Unknown mode" }, 400);
    }

    const body: any = { model: "google/gemini-2.5-flash", messages };
    if (tools) { body.tools = tools; body.tool_choice = tool_choice; }

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 429) return j({ error: "Rate limit — try again in a moment." }, 429);
    if (r.status === 402) return j({ error: "AI credits exhausted. Top up in Settings → Workspace → Usage." }, 402);
    if (!r.ok) return j({ error: `AI error ${r.status}` }, 500);
    const data = await r.json();
    const choice = data.choices?.[0];
    if (tools) {
      const args = choice?.message?.tool_calls?.[0]?.function?.arguments;
      return j(args ? JSON.parse(args) : { error: "no tool result" });
    }
    return j({ text: choice?.message?.content ?? "" });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function j(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } }); }
