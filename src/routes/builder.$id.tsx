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
import { Wand2, Sparkles, Plus, Trash2, Download, Save, Target } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const Route = createFileRoute("/builder/$id")({ component: Builder });

const empty: ResumeData = { 
  personal: { name: "", email: "", phone: "", location: "", summary: "" }, 
  experience: [], 
  education: [], 
  skills: [] 
};

function Builder() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  
  const [data, setData] = useState<ResumeData>(empty);
  const [meta, setMeta] = useState({ 
    title: "", 
    country: "Nigeria", 
    target_role: "", 
    paid: false, 
    ats_score: null as number | null 
  });
  
  const [busy, setBusy] = useState<string | null>(null);
  const [skillsInput, setSkillsInput] = useState("");
  const [scoreReport, setScoreReport] = useState<{ 
    score: number; 
    strengths: string[]; 
    improvements: string[] 
  } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => { if (user) load(); }, [user, id]);

  async function load() {
    const { data: r, error } = await supabase.from("resumes").select("*").eq("id", id).single();
    if (error) return toast.error(error.message);
    
    setData((r.data as any) || empty);
    setMeta({ 
      title: r.title, 
      country: r.country, 
      target_role: r.target_role || "", 
      paid: r.paid, 
      ats_score: r.ats_score 
    });
    setSkillsInput(((r.data as any)?.skills || []).join(", "));
  }

  async function save() {
    setBusy("save");
    const skills = skillsInput.split(",").map(s => s.trim()).filter(Boolean);
    const next = { ...data, skills };
    
    const { error } = await supabase.from("resumes").update({ 
      data: next as any, 
      title: meta.title, 
      country: meta.country, 
      target_role: meta.target_role 
    }).eq("id", id);
    
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Resume saved successfully");
  }

  async function callAI(mode: string, payload: any) {
    const { data: r, error } = await supabase.functions.invoke("ai-resume", { 
      body: { mode, payload } 
    });
    if (error) throw new Error(error.message);
    if (r?.error) throw new Error(r.error);
    return r;
  }

  async function score() {
    if (!meta.target_role) {
      return toast.error("Please set your target role first");
    }

    setBusy("score");
    try {
      const resumeToScore = {
        ...data,
        skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean)
      };

      const r = await callAI("score", { 
        resume: resumeToScore, 
        target_role: meta.target_role, 
        country: meta.country 
      });

      setScoreReport(r);
      
      // Save score to database
      await supabase.from("resumes").update({ 
        ats_score: r.score 
      }).eq("id", id);

      setMeta(m => ({ ...m, ats_score: r.score }));
      toast.success(`ATS Score: ${r.score}/100`);
    } catch (e: any) {
      toast.error(e.message || "Failed to score resume");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    if (!previewRef.current) return;
    if (!meta.paid) {
      nav({ to: "/payment/$id", params: { id } });
      return;
    }
    
    setBusy("pdf");
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = (canvas.height * pw) / canvas.width;
      
      pdf.addImage(img, "PNG", 0, 0, pw, ph);
      pdf.save(`${meta.title || "resume"}.pdf`);
      toast.success("PDF downloaded");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  // AI Functions
  async function aiSummary() { /* ... keep your existing code */ 
    if (!data.personal.summary && !meta.target_role) return toast.error("Add what you do in the summary box first.");
    setBusy("summary");
    try {
      const r = await callAI("rewrite_summary", { 
        what_i_do: data.personal.summary || "experienced professional", 
        target_role: meta.target_role, 
        country: meta.country 
      });
      setData(d => ({ ...d, personal: { ...d.personal, summary: r.text } }));
      toast.success("Summary rewritten by AI");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function aiBullets(idx: number) { /* ... keep your existing code */ 
    const exp = data.experience[idx];
    if (!exp.bullets && !exp.role) return toast.error("Add the role and what you did first.");
    setBusy(`bul-${idx}`);
    try {
      const r = await callAI("rewrite_bullets", { 
        raw: exp.bullets, 
        role: exp.role, 
        target_role: meta.target_role, 
        country: meta.country 
      });
      setData(d => { 
        const next = [...d.experience]; 
        next[idx] = { ...next[idx], bullets: r.text }; 
        return { ...d, experience: next }; 
      });
      toast.success("Bullets rewritten");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function aiSkills() { /* ... keep your existing code */ 
    setBusy("skills");
    try {
      const r = await callAI("suggest_skills", { 
        target_role: meta.target_role, 
        experience: data.experience.map(e=>e.role).join(", "), 
        country: meta.country 
      });
      setSkillsInput(r.text);
      toast.success("Skills suggested");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  // Helper functions (addExp, rmExp, etc.)
  const addExp = () => setData(d => ({ ...d, experience: [...d.experience, { company: "", role: "", start: "", end: "", bullets: "" }] }));
  const rmExp = (i: number) => setData(d => ({ ...d, experience: d.experience.filter((_, j) => j !== i) }));
  const upExp = (i: number, k: string, v: string) => setData(d => { 
    const n = [...d.experience]; 
    n[i] = { ...n[i], [k]: v }; 
    return { ...d, experience: n }; 
  });
  const addEdu = () => setData(d => ({ ...d, education: [...d.education, { school: "", degree: "", year: "" }] }));
  const rmEdu = (i: number) => setData(d => ({ ...d, education: d.education.filter((_, j) => j !== i) }));
  const upEdu = (i: number, k: string, v: string) => setData(d => { 
    const n = [...d.education]; 
    n[i] = { ...n[i], [k]: v }; 
    return { ...d, education: n }; 
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Header with Save, Score, Download buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <Input 
              value={meta.title} 
              onChange={e => setMeta(m => ({...m, title: e.target.value}))} 
              className="text-2xl font-serif h-auto py-2 bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {meta.country} · {meta.target_role || "Set target role below"} 
              {meta.ats_score != null && ` · ATS ${meta.ats_score}/100`}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="bg-transparent" onClick={save} disabled={!!busy}>
              <Save className="w-4 h-4 mr-1"/> Save
            </Button>

            {/* New Score Button - Placed in the middle */}
            <Button 
              variant="outline" 
              className="bg-transparent" 
              onClick={score} 
              disabled={!!busy || !meta.target_role}
            >
              <Target className="w-4 h-4 mr-1"/>
              {busy === "score" ? "Scoring..." : "Score"}
            </Button>

            <Button className="btn-hero border-0" onClick={downloadPdf} disabled={!!busy}>
              <Download className="w-4 h-4 mr-1"/>
              {meta.paid ? "Download PDF" : "Pay & Download"}
            </Button>
          </div>
        </div>

        {/* Rest of your form and preview (unchanged) */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Target, Personal, Experience, Education, Skills sections remain the same */}
            {/* ... your existing sections ... */}

            {scoreReport && (
              <div className="glass rounded-2xl p-5 border-[color:var(--gold)]/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-5xl font-serif text-[color:var(--gold)]">{scoreReport.score}</div>
                  <div>
                    <h3 className="font-serif text-xl">ATS Score</h3>
                    <p className="text-xs text-muted-foreground">
                      For {meta.target_role} in {meta.country}
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Strengths</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {scoreReport.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Improvements</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {scoreReport.improvements.map((s, i) => <li key={i}>→ {s}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="text-xs text-muted-foreground mb-2">Live preview</div>
            <ResumePreview 
              ref={previewRef} 
              data={{ ...data, skills: skillsInput.split(",").map(s => s.trim()).filter(Boolean) }} 
              country={meta.country}
            />
          </div>
        </div>
      </div>
    </div>
  );
}