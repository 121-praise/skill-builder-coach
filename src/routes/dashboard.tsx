import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

const COUNTRIES = ["Nigeria", "Canada", "United Kingdom", "United States"];

type Resume = { id: string; title: string; country: string; target_role: string | null; ats_score: number | null; paid: boolean; updated_at: string };

function Dashboard() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [country, setCountry] = useState("Nigeria"); const [role, setRole] = useState("");

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("resumes").select("*").order("updated_at", { ascending: false });
    setResumes((data ?? []) as Resume[]);
  }

  async function create() {
    if (!user) return;
    const { data, error } = await supabase.from("resumes").insert({
      user_id: user.id, title: title || "Untitled Resume", country, target_role: role,
      data: { personal: { name: "", email: user.email, phone: "", location: "", summary: "" }, experience: [], education: [], skills: [] },
    }).select().single();
    if (error) return toast.error(error.message);
    setOpen(false); nav({ to: "/builder/$id", params: { id: data.id } });
  }

  async function remove(id: string) {
    if (!confirm("Delete this resume?")) return;
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h1 className="text-5xl mb-2">Your resumes</h1>
            <p className="text-muted-foreground">Build, score, and download — one click each.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/interview"><Button variant="outline" className="bg-transparent">Mock interview</Button></Link>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button className="btn-hero border-0"><Plus className="w-4 h-4 mr-1"/> New resume</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New resume</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Title</Label><Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Frontend Engineer — UK"/></div>
                  <div><Label>Target country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Target role</Label><Input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Senior Product Designer"/></div>
                  <Button onClick={create} className="w-full btn-hero border-0">Create & start building</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {resumes.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4"/>
            <h3 className="text-2xl mb-2">No resumes yet</h3>
            <p className="text-muted-foreground mb-6">Create your first AI-powered resume in under a minute.</p>
            <Button onClick={()=>setOpen(true)} className="btn-hero border-0">Create resume</Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map(r => (
              <div key={r.id} className="glass rounded-2xl p-6 hover:border-primary/40 transition group">
                <div className="flex items-start justify-between mb-3">
                  <FileText className="w-8 h-8 text-primary"/>
                  {r.paid && <span className="text-xs px-2 py-1 rounded-full bg-[color:var(--gold)]/20 text-[color:var(--gold)] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>Paid</span>}
                </div>
                <Link to="/builder/$id" params={{ id: r.id }}>
                  <h3 className="text-xl mb-1 group-hover:text-primary transition">{r.title}</h3>
                </Link>
                <p className="text-sm text-muted-foreground mb-3">{r.country} · {r.target_role || "Any role"}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">{r.ats_score != null ? `ATS ${r.ats_score}/100` : "Not scored"}</span>
                  <button onClick={()=>remove(r.id)} className="text-muted-foreground hover:text-destructive transition"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
