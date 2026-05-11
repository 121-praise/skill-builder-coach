const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { messages, resumeData, action } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GROQ_API_KEY" }),
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

    // Convert messages to Groq format
    const groqMessages = (messages || []).filter((m: any) => m.role !== "system");

    // If resume data is provided, include it as context
    if (resumeData && groqMessages.length > 0) {
      const lastMessage = groqMessages[groqMessages.length - 1];
      groqMessages[groqMessages.length - 1] = {
        ...lastMessage,
        content: `Resume data:\n${JSON.stringify(resumeData, null, 2)}\n\nUser request: ${lastMessage.content}`,
      };
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        max_tokens: 1000,
        system: systemPrompt,
        messages: groqMessages.length > 0 ? groqMessages : [
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
    const text = data.choices?.[0]?.message?.content ?? "";

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