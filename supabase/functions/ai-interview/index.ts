const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { messages, role, country, difficulty, end } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Convert messages to Anthropic format (remove 'system' role from messages array)
    const anthropicMessages = (messages || []).filter((m: any) => m.role !== "system");

    if (end) {
      // Evaluate the interview and return score + feedback
      const transcript = (messages || [])
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n");

      const evalPrompt = `You are an expert interview evaluator. Score this candidate 0-100 for a ${role} role in ${country}. Be fair and constructive.

Transcript:
${transcript}

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{"score": <integer 0-100>, "feedback": "<constructive feedback string>"}`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: evalPrompt }],
        }),
      });

      const data = await r.json();
      const text = data.content?.[0]?.text ?? '{"score":0,"feedback":""}';

      return new Response(text, {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Continue the interview conversation
    const systemPrompt = `You are a friendly but rigorous interviewer for a ${role} position in ${country}. Difficulty: ${difficulty}. Ask one focused question at a time. After the candidate answers, give a brief reaction (1 sentence) and ask the next question. Cover both behavioral and role-specific questions. Keep responses concise.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: anthropicMessages.length > 0 ? anthropicMessages : [
          { role: "user", content: "Please start the interview." }
        ],
      }),
    });

    if (r.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please try again shortly." }),
        { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const data = await r.json();
    const text = data.content?.[0]?.text ?? "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});