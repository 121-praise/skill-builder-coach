export default function InterviewComingSoon() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '24px' }}>
      <h1>Mock Interview</h1>
      <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)' }}>Coming soon</p>
      <a href="/dashboard" style={{ padding: '12px 24px', backgroundColor: 'var(--color-text-info)', color: 'white', borderRadius: '8px', textDecoration: 'none' }}>
        Back to dashboard
      </a>
    </div>
  );
}

/*import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  const [role, setRole] = useState(""); const [country, setCountry] = useState("Nigeria"); const [difficulty, setDifficulty] = useState("medium");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(false); const [listening, setListening] = useState(false);
  const [report, setReport] = useState<{ score: number; feedback: string } | null>(null);
  const recRef = useRef<any>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function start() {
    if (!role.trim()) return toast.error("Tell us the role you're practicing for.");
    setStarted(true); setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-interview", { body: { role, country, difficulty, messages: [] } });
    setBusy(false);
    if (error || data?.error) return toast.error(error?.message || data.error);
    setMessages([{ role: "assistant", content: data.text }]);
    if (voice) speak(data.text);
  }

  async function send(text: string) {
    if (!text.trim()) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next); setInput(""); setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-interview", { body: { role, country, difficulty, messages: next } });
    setBusy(false);
    if (error || data?.error) return toast.error(error?.message || data.error);
    setMessages([...next, { role: "assistant", content: data.text }]);
    if (voice) speak(data.text);
  }

  async function finish() {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("ai-interview", { body: { role, country, end: true, messages } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setReport(data);
    if (user) await supabase.from("interview_sessions").insert({ user_id: user.id, role, country, difficulty, messages: messages as any, score: data.score, feedback: data.feedback });
  }

  function toggleMic() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice input not supported in this browser");
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR(); r.lang = "en-US"; r.interimResults = false;
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; send(t); };
    r.onend = () => setListening(false);
    r.start(); recRef.current = r; setListening(true);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1; u.pitch = 1; window.speechSynthesis.speak(u);
  }

  if (!started) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-xl mx-auto px-4 py-16">
          <h1 className="text-5xl mb-3">Mock Interview</h1>
          <p className="text-muted-foreground mb-8">Practice with an AI interviewer tailored to your role and market. Voice input optional.</p>
          <div className="glass rounded-2xl p-6 space-y-4">
            <div><Label>Target role</Label><Input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Product Manager"/></div>
            <div><Label>Country</Label>
              <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1 text-sm" value={country} onChange={e=>setCountry(e.target.value)}>
                {["Nigeria","Canada","United Kingdom","United States"].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Difficulty</Label>
              <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1 text-sm" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={voice} onChange={e=>setVoice(e.target.checked)}/> Enable voice (interviewer speaks; you can answer by mic)
            </label>
            <Button className="w-full btn-hero border-0" onClick={start} disabled={busy}>{busy?"Starting...":"Start interview"}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-3xl font-serif">{role}</h1><p className="text-xs text-muted-foreground">{country} · {difficulty}</p></div>
          <Button variant="outline" className="bg-transparent" onClick={finish} disabled={busy || messages.length<2}><Square className="w-4 h-4 mr-1"/>End & score</Button>
        </div>

        {report ? (
          <div className="glass rounded-2xl p-8 text-center">
            <div className="text-7xl font-serif text-[color:var(--gold)] mb-2">{report.score}</div>
            <p className="text-sm text-muted-foreground mb-4">out of 100</p>
            <p className="text-left whitespace-pre-wrap leading-relaxed">{report.feedback}</p>
            <div className="flex gap-2 justify-center mt-6">
              <Button onClick={()=>{ setReport(null); setMessages([]); setStarted(false); }}>Practice again</Button>
              <Button variant="outline" className="bg-transparent" onClick={()=>nav({to:"/dashboard"})}>Back to dashboard</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="glass rounded-2xl p-4 h-[520px] overflow-y-auto space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role==="user"?"bg-primary text-primary-foreground":"bg-secondary"}`}>
                    {m.content}
                    {m.role==="assistant" && voice && (
                      <button onClick={()=>speak(m.content)} className="ml-2 opacity-60 hover:opacity-100 inline-block align-middle"><Volume2 className="w-3 h-3 inline"/></button>
                    )}
                  </div>
                </div>
              ))}
              {busy && <div className="text-xs text-muted-foreground italic">Interviewer is thinking…</div>}
              <div ref={endRef}/>
            </div>
            <div className="mt-4 flex gap-2">
              <Textarea rows={2} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(input); } }} placeholder="Type your answer (Enter to send, Shift+Enter for newline)"/>
              <div className="flex flex-col gap-2">
                <Button onClick={()=>send(input)} disabled={busy} className="btn-hero border-0"><Send className="w-4 h-4"/></Button>
                <Button onClick={toggleMic} variant="outline" className="bg-transparent">{listening?<MicOff className="w-4 h-4"/>:<Mic className="w-4 h-4"/>}</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
*/