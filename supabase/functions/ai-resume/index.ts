const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { messages, resumeData, action } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing ANTHROPIC_API_KEY" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert resume writer and career coach. Help users improve their resumes by:
- Suggesting stronger action verbs and impactful phrasing
- Improving clarity and conciseness
- Tailoring content for specific roles
- Improving ATS (Applicant Tracking System) compatibility
- Highlighting key achievements and skills

Be specific, practical, and constructive in your feedback. Keep responses concise and actionable.`;

    // Convert messages to Anthropic format
    const anthropicMessages = (messages || []).filter((m: any) => m.role !== "system");

    // If resume data is provided, include it as context
    if (resumeData && anthropicMessages.length > 0) {
      const lastMessage = anthropicMessages[anthropicMessages.length - 1];
      anthropicMessages[anthropicMessages.length - 1] = {
        ...lastMessage,
        content: `Resume data:\n${JSON.stringify(resumeData, null, 2)}\n\nUser request: ${lastMessage.content}`,
      };
    }

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
          { role: "user", content: "Hello, I need help with my resume." }
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