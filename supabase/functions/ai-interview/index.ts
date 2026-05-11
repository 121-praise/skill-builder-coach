const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { messages = [], role, country, difficulty, end } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    if (!role) throw new Error("Role is required");

    // === END INTERVIEW & EVALUATE ===
    if (end === true) {
      const transcript = messages
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const evalPrompt = `You are a strict but fair technical interviewer.

Candidate is interviewing for: ${role} in ${country || "Nigeria"}.
Difficulty: ${difficulty || "medium"}.

Full interview transcript:
${transcript}

Evaluate the candidate and return **ONLY** valid JSON in this exact format (no extra text):

{
  "score": 85,
  "feedback": "Detailed feedback covering technical knowledge, communication, strengths, weaknesses, and improvement suggestions."
}`;

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 1200,
          messages: [
            { role: "system", content: "You are an expert interview evaluator." },
            { role: "user", content: evalPrompt }
          ],
        }),
      });

      const data = await r.json();
      let text = data.choices?.[0]?.message?.content?.trim() || '{"score":0,"feedback":"Evaluation failed"}';

      // Extract JSON safely
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) text = jsonMatch[0];

      return new Response(text, {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // === CONTINUE INTERVIEW ===
    const systemPrompt = `You are a professional, friendly but rigorous interviewer for a ${role} position in ${country || "Nigeria"}.
Difficulty level: ${difficulty || "medium"}.

Rules:
- Ask only ONE question at a time.
- After the candidate answers, give a short 1-sentence reaction, then ask the next question.
- Mix behavioral and technical questions.
- Keep responses concise (maximum 3-4 sentences).
- Do not give answers or be too easy.`;

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.8,
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
      }),
    });

    const data = await r.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? "Sorry, I could not generate a response.";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );

  } catch (e: any) {
    console.error("AI Interview Error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});