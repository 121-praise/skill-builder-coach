import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mic, MicOff, Send, Square, Volume2 } from "lucide-react";

export const Route = createFileRoute("/interview")({ component: Interview });

type Msg = { role: "user" | "assistant"; content: string };

function Interview() {
  const nav = useNavigate();
  const { user, loading } = useAuth();

  const [started, setStarted] = useState(false);
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [difficulty, setDifficulty] = useState("medium");

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [report, setReport] = useState<{ score: number; feedback: string } | null>(null);

  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function start() {
    if (!role.trim()) return toast.error("Please enter the target role");

    setStarted(true);
    setBusy(true);
    setMessages([]);

    try {
      const { data, error } = await supabase.functions.invoke("ai-interview", {
        body: { role, country, difficulty, messages: [] }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setMessages([{ role: "assistant", content: data.text }]);
      if (voice) speak(data.text);
    } catch (e: any) {
      toast.error(e.message);
      setStarted(false);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;

    const userMsg: Msg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-interview", {
        body: { role, country, difficulty, messages: nextMessages }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setMessages([...nextMessages, { role: "assistant", content: data.text }]);
      if (voice) speak(data.text);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (messages.length < 2) return toast.error("Please answer at least one question");

    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-interview", {
        body: { role, country, difficulty, end: true, messages }
      });

      if (error) throw error;

      const reportData = typeof data === "string" ? JSON.parse(data) : data;
      setReport(reportData);

      // Optional: Save to database
      if (user) {
        await supabase.from("interview_sessions").insert({
          user_id: user.id,
          role,
          country,
          difficulty,
          messages: messages as any,
          score: reportData.score,
          feedback: reportData.feedback,
        });
      }

      toast.success(`Interview ended! Score: ${reportData.score}/100`);
    } catch (e: any) {
      toast.error(e.message || "Failed to get score");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice input not supported");

    if (listening) {
      recRef.current?.stop();
      return;
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => send(e.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.start();

    recRef.current = recognition;
    setListening(true);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  function resetInterview() {
    setReport(null);
    setMessages([]);
    setStarted(false);
    setInput("");
  }

  // Setup Screen
  if (!started) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-xl mx-auto px-4 py-16">
          <h1 className="text-5xl font-serif mb-3">Mock Interview</h1>
          <p className="text-muted-foreground mb-10">Practice with Groq AI interviewer</p>

          <div className="glass rounded-2xl p-8 space-y-6">
            <div>
              <Label>Target Role</Label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Backend Engineer" className="mt-1" />
            </div>

            <div>
              <Label>Country</Label>
              <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1" value={country} onChange={e => setCountry(e.target.value)}>
                {["Nigeria", "Canada", "United Kingdom", "United States"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <Label>Difficulty</Label>
              <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={voice} onChange={e => setVoice(e.target.checked)} />
              Enable Voice Mode
            </label>

            <Button className="w-full" onClick={start} disabled={busy || !role.trim()}>
              {busy ? "Starting..." : "Start Interview"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Interview Screen
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-serif">{role}</h1>
            <p className="text-xs text-muted-foreground">{country} • {difficulty}</p>
          </div>
          <Button variant="outline" onClick={finish} disabled={busy || messages.length < 2}>
            <Square className="mr-2 h-4 w-4" /> End & Score
          </Button>
        </div>

        {report ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-7xl font-serif text-[color:var(--gold)] mb-2">{report.score}</div>
            <p className="mb-6 text-sm text-muted-foreground">out of 100</p>
            <div className="text-left bg-secondary/50 p-6 rounded-xl whitespace-pre-wrap leading-relaxed">
              {report.feedback}
            </div>
            <div className="flex gap-3 justify-center mt-8">
              <Button onClick={resetInterview}>Practice Again</Button>
              <Button variant="outline" onClick={() => nav({ to: "/dashboard" })}>Back to Dashboard</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl p-6 h-[520px] overflow-y-auto space-y-4 mb-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {m.content}
                    {m.role === "assistant" && voice && (
                      <button onClick={() => speak(m.content)} className="ml-2">
                        <Volume2 className="w-4 h-4 inline" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <p className="text-xs text-muted-foreground italic pl-4">AI is thinking...</p>}
              <div ref={endRef} />
            </div>

            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Type your answer... (Enter to send)"
                disabled={busy}
              />
              <div className="flex flex-col gap-2">
                <Button onClick={() => send(input)} disabled={busy || !input.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
                <Button variant="outline" onClick={toggleMic}>
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}