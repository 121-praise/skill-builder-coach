import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Wand2, Target, Mic, Globe2, FileText, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const COUNTRIES = [
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇺🇸", name: "United States" },
];

const FEATURES = [
  { icon: Wand2, title: "AI Resume Builder", desc: "Tell the AI what you do — it crafts each bullet to match your target job." },
  { icon: Target, title: "ATS Score & Fixes", desc: "Instant ATS scoring with specific edits to beat applicant tracking systems." },
  { icon: Mic, title: "Mock Interviews", desc: "Practice live, by voice, with an AI interviewer tuned to your role." },
  { icon: Globe2, title: "Country-Specific", desc: "Optimized for Nigeria, UK, US & Canada — the right standard, every time." },
  { icon: FileText, title: "Premium Templates", desc: "Recruiter-tested layouts that look as good as they perform." },
  { icon: ShieldCheck, title: "Pay & Download", desc: "₦2,000 via Flutterwave — PDF unlocks instantly and lands in your inbox." },
];

function Index() {
  const nav = useNavigate();
  const [role, setRole] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground mb-8">
            <Sparkles className="w-3 h-3 text-primary" />
            New · AI mock interviews are live
          </div>
          <h1 className="font-serif text-5xl sm:text-7xl leading-[1.02] tracking-tight mb-6 text-foreground">
            Get hired faster<br/>with <span className="text-primary italic">TalentAI</span>.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Build an ATS-ready resume tailored to your country in minutes, then practice the interview with AI. One simple price: <span className="text-foreground font-medium">₦2,000</span> per resume.
          </p>

          {/* Search-style CTA */}
          <form
            onSubmit={(e) => { e.preventDefault(); nav({ to: "/signup" }); }}
            className="max-w-xl mx-auto flex items-center gap-2 bg-card border border-border rounded-full p-2 mb-6 shadow-sm"
          >
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="What role are you applying for? e.g. Product Designer"
              className="flex-1 bg-transparent px-4 py-2 outline-none text-sm placeholder:text-muted-foreground"
            />
            <Button type="submit" className="btn-hero border-0 rounded-full h-10 px-5 text-sm">
              Start <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="flex flex-wrap justify-center gap-2">
            {COUNTRIES.map(c => (
              <span key={c.name} className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-muted-foreground">
                <span className="mr-1.5">{c.flag}</span>{c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl sm:text-5xl mb-4 tracking-tight">Everything you need to get hired</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From a blank page to a job-ready PDF and a confident interview — all powered by AI.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-border p-6 bg-card hover:border-primary/40 hover:shadow-sm transition">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-1.5 font-sans">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-3xl bg-secondary border border-border p-10 sm:p-16 text-center">
          <h2 className="font-serif text-4xl mb-10 tracking-tight">Three steps to your dream role</h2>
          <div className="grid sm:grid-cols-3 gap-8 text-left">
            {[
              { n: "01", t: "Pick your market", d: "Nigeria, UK, US or Canada — we tailor format & language." },
              { n: "02", t: "Let AI write it", d: "Tell the AI what you do; it rewrites every bullet to fit your target role." },
              { n: "03", t: "Pay ₦2,000 & download", d: "Flutterwave checkout. PDF unlocks instantly and lands in your inbox." },
            ].map(s => (
              <div key={s.n}>
                <div className="font-serif text-5xl text-primary mb-3">{s.n}</div>
                <h3 className="text-xl mb-2 font-medium font-sans">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link to="/signup">
              <Button size="lg" className="btn-hero border-0 text-base px-10 h-12 rounded-full">Start free</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        TalentAI · AI Resume & Interview Coach
      </footer>
    </div>
  );
}
