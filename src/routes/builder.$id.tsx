import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResumePreview, type ResumeData } from "@/components/app/ResumePreview";
import { toast } from "sonner";
import { Wand2, Sparkles, Plus, Trash2, Target, Download, Save } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/builder/$id")({ component: Builder });

const empty: ResumeData = { personal: { name: "", email: "", phone: "", location: "", summary: "" }, experience: [], education: [], skills: [] };

function Builder() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData] = useState<ResumeData>(empty);
  const [meta, setMeta] = useState({ title: "", country: "Nigeria", target_role: "", paid: false, ats_score: null as number | null });
  const [busy, setBusy] = useState<string | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [scoreReport, setScoreReport] = useState<{ score: number; strengths: string[]; improvements: string[] } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => { if (user) load(); }, [user, id]);

  async function load() {
    const { data: r, error } = await supabase.from("resumes").select("*").eq("id", id).single();
    if (error) return toast.error(error.message);
    setData((r.data as any) || empty);
    setMeta({ title: r.title, country: r.country, target_role: r.target_role || "", paid: r.paid, ats_score: r.ats_score });
    setSkillsInput(((r.data as any)?.skills || []).join(", "));
  }

  async function save() {
    setBusy("save");
    const skills = skillsInput.split(",").map(s => s.trim()).filter(Boolean);
    const next = { ...data, skills };
    const { error } = await supabase.from("resumes").update({ data: next as any, title: meta.title, country: meta.country, target_role: meta.target_role }).eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  }

  async function callAI(mode: string, payload: any) {
    const { data: r, error } = await supabase.functions.invoke("ai-resume", { body: { mode, payload } });
    if (error) throw new Error(error.message);
    if (r?.error) throw new Error(r.error);
    return r;
  }

  async function aiSummary() {
    if (!data.personal.summary && !meta.target_role) return toast.error("Add what you do in the summary box first.");
    setBusy("summary");
    try {
      const r = await callAI("rewrite_summary", { what_i_do: data.personal.summary || "experienced professional", target_role: meta.target_role, country: meta.country });
      setData(d => ({ ...d, personal: { ...d.personal, summary: r.text } }));
      toast.success("Summary rewritten by AI");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function aiBullets(idx: number) {
    const exp = data.experience[idx];
    if (!exp.bullets && !exp.role) return toast.error("Add the role and what you did first.");
    setBusy(`bul-${idx}`);
    try {
      const r = await callAI("rewrite_bullets", { raw: exp.bullets, role: exp.role, target_role: meta.target_role, country: meta.country });
      setData(d => { const next = [...d.experience]; next[idx] = { ...next[idx], bullets: r.text }; return { ...d, experience: next }; });
      toast.success("Bullets rewritten");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function aiSkills() {
    setBusy("skills");
    try {
      const r = await callAI("suggest_skills", { target_role: meta.target_role, experience: data.experience.map(e=>e.role).join(", "), country: meta.country });
      setSkillsInput(r.text);
      toast.success("Skills suggested");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function score() {
    setBusy("score");
    try {
      const r = await callAI("score", { resume: { ...data, skills: skillsInput.split(",").map(s=>s.trim()).filter(Boolean) }, target_role: meta.target_role, country: meta.country });
      setScoreReport(r);
      await supabase.from("resumes").update({ ats_score: r.score }).eq("id", id);
      setMeta(m => ({ ...m, ats_score: r.score }));
      toast.success(`Scored ${r.score}/100`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function downloadPdf() {
    if (!previewRef.current) return;
    if (!meta.paid) { nav({ to: "/payment/$id", params: { id } }); return; }
    setBusy("pdf");
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = (canvas.height * pw) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, pw, ph);
      pdf.save(`${meta.title || "resume"}.pdf`);
      toast.success("Downloaded");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  const addExp = () => setData(d => ({ ...d, experience: [...d.experience, { company: "", role: "", start: "", end: "", bullets: "" }] }));
  const rmExp = (i: number) => setData(d => ({ ...d, experience: d.experience.filter((_, j) => j !== i) }));
  const upExp = (i: number, k: string, v: string) => setData(d => { const n = [...d.experience]; n[i] = { ...n[i], [k]: v }; return { ...d, experience: n }; });
  const addEdu = () => setData(d => ({ ...d, education: [...d.education, { school: "", degree: "", year: "" }] }));
  const rmEdu = (i: number) => setData(d => ({ ...d, education: d.education.filter((_, j) => j !== i) }));
  const upEdu = (i: number, k: string, v: string) => setData(d => { const n = [...d.education]; n[i] = { ...n[i], [k]: v }; return { ...d, education: n }; });

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <Input value={meta.title} onChange={e=>setMeta(m=>({...m, title: e.target.value}))} className="text-2xl font-serif h-auto py-2 bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0"/>
            <p className="text-xs text-muted-foreground mt-1">{meta.country} · {meta.target_role || "Set target role below"} {meta.ats_score != null && `· ATS ${meta.ats_score}/100`}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="bg-transparent" onClick={save} disabled={!!busy}><Save className="w-4 h-4 mr-1"/>Save</Button>
            <Button variant="outline" className="bg-transparent" onClick={score} disabled={!!busy}><Target className="w-4 h-4 mr-1"/>{busy==="score"?"Scoring...":"Score"}</Button>
            <Button className="btn-hero border-0" onClick={downloadPdf} disabled={!!busy}><Download className="w-4 h-4 mr-1"/>{meta.paid?"Download PDF":"Pay & Download"}</Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-serif text-2xl mb-4">Target</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Country</Label>
                  <select className="w-full bg-input border border-border rounded-md h-10 px-3 mt-1 text-sm" value={meta.country} onChange={e=>setMeta(m=>({...m, country: e.target.value}))}>
                    {["Nigeria","Canada","United Kingdom","United States"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Target role</Label><Input value={meta.target_role} onChange={e=>setMeta(m=>({...m, target_role: e.target.value}))} placeholder="e.g. Backend Engineer"/></div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="font-serif text-2xl mb-4">Personal</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Full name</Label><Input value={data.personal.name} onChange={e=>setData(d=>({...d, personal:{...d.personal, name:e.target.value}}))}/></div>
                <div><Label>Email</Label><Input value={data.personal.email} onChange={e=>setData(d=>({...d, personal:{...d.personal, email:e.target.value}}))}/></div>
                <div><Label>Phone</Label><Input value={data.personal.phone} onChange={e=>setData(d=>({...d, personal:{...d.personal, phone:e.target.value}}))}/></div>
                <div><Label>Location</Label><Input value={data.personal.location} onChange={e=>setData(d=>({...d, personal:{...d.personal, location:e.target.value}}))}/></div>
                <div className="col-span-2"><Label>Links (LinkedIn, portfolio)</Label><Input value={data.personal.links||""} onChange={e=>setData(d=>({...d, personal:{...d.personal, links:e.target.value}}))}/></div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label>Summary <span className="text-muted-foreground">— tell AI what you do</span></Label>
                    <Button size="sm" variant="ghost" onClick={aiSummary} disabled={!!busy}><Wand2 className="w-3 h-3 mr-1"/>{busy==="summary"?"...":"AI rewrite"}</Button>
                  </div>
                  <Textarea rows={4} value={data.personal.summary} onChange={e=>setData(d=>({...d, personal:{...d.personal, summary:e.target.value}}))} placeholder="e.g. I'm a backend dev with 4 years of experience building Django apps for fintechs in Lagos..." />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-2xl">Experience</h3>
                <Button size="sm" variant="ghost" onClick={addExp}><Plus className="w-4 h-4 mr-1"/>Add</Button>
              </div>
              {data.experience.map((e, i) => (
                <div key={i} className="border border-border rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="Role" value={e.role} onChange={ev=>upExp(i,"role",ev.target.value)}/>
                    <Input placeholder="Company" value={e.company} onChange={ev=>upExp(i,"company",ev.target.value)}/>
                    <Input placeholder="Start (e.g. 2022)" value={e.start} onChange={ev=>upExp(i,"start",ev.target.value)}/>
                    <Input placeholder="End or Present" value={e.end} onChange={ev=>upExp(i,"end",ev.target.value)}/>
                  </div>
                  <Textarea placeholder="What you did (one per line — AI will polish them)" rows={3} value={e.bullets} onChange={ev=>upExp(i,"bullets",ev.target.value)}/>
                  <div className="flex justify-between mt-2">
                    <Button size="sm" variant="ghost" onClick={()=>aiBullets(i)} disabled={!!busy}><Sparkles className="w-3 h-3 mr-1"/>{busy===`bul-${i}`?"...":"AI rewrite bullets"}</Button>
                    <Button size="sm" variant="ghost" onClick={()=>rmExp(i)}><Trash2 className="w-3 h-3"/></Button>
                  </div>
                </div>
              ))}
              {data.experience.length===0 && <p className="text-sm text-muted-foreground text-center py-4">Add your first role.</p>}
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-2xl">Education</h3>
                <Button size="sm" variant="ghost" onClick={addEdu}><Plus className="w-4 h-4 mr-1"/>Add</Button>
              </div>
              {data.education.map((ed, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 mb-2">
                  <Input placeholder="School" value={ed.school} onChange={ev=>upEdu(i,"school",ev.target.value)}/>
                  <Input placeholder="Degree" value={ed.degree} onChange={ev=>upEdu(i,"degree",ev.target.value)}/>
                  <Input placeholder="Year" value={ed.year} onChange={ev=>upEdu(i,"year",ev.target.value)}/>
                  <Button size="icon" variant="ghost" onClick={()=>rmEdu(i)}><Trash2 className="w-3 h-3"/></Button>
                </div>
              ))}
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-serif text-2xl">Skills</h3>
                <Button size="sm" variant="ghost" onClick={aiSkills} disabled={!!busy}><Sparkles className="w-3 h-3 mr-1"/>{busy==="skills"?"...":"AI suggest"}</Button>
              </div>
              <Textarea rows={2} value={skillsInput} onChange={e=>setSkillsInput(e.target.value)} placeholder="Comma-separated skills"/>
            </div>

            {scoreReport && (
              <div className="glass rounded-2xl p-5 border-[color:var(--gold)]/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-5xl font-serif text-[color:var(--gold)]">{scoreReport.score}</div>
                  <div><h3 className="font-serif text-xl">ATS Score</h3><p className="text-xs text-muted-foreground">For {meta.target_role || "your target"} in {meta.country}</p></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
                  <div><h4 className="font-medium mb-2">Strengths</h4><ul className="space-y-1 text-muted-foreground">{scoreReport.strengths.map((s,i)=><li key={i}>✓ {s}</li>)}</ul></div>
                  <div><h4 className="font-medium mb-2">Improvements</h4><ul className="space-y-1 text-muted-foreground">{scoreReport.improvements.map((s,i)=><li key={i}>→ {s}</li>)}</ul></div>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="text-xs text-muted-foreground mb-2">Live preview</div>
            <ResumePreview ref={previewRef} data={{ ...data, skills: skillsInput.split(",").map(s=>s.trim()).filter(Boolean) }} country={meta.country}/>
          </div>
        </div>
      </div>
    </div>
  );
}
