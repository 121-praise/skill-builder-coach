import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { Sparkles, FileText, Mic, Target, Globe2, ShieldCheck, Wand2 } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const COUNTRIES = [
  { flag: "🇳🇬", name: "Nigeria" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇬🇧", name: "United Kingdom" },
  { flag: "🇺🇸", name: "United States" },
];

const FEATURES = [
  { icon: Wand2, title: "AI Resume Builder", desc: "Tell the AI what you do — it crafts each bullet to match your target job in seconds." },
  { icon: Target, title: "ATS Score & Fixes", desc: "Get an instant ATS score with concrete edits to beat applicant tracking systems." },
  { icon: Mic, title: "Mock Interviews", desc: "Practice live with an AI interviewer tuned to your role and country market." },
  { icon: Globe2, title: "Country-Specific", desc: "Optimized formats for Nigeria, UK, US & Canada — the right standard, every time." },
  { icon: FileText, title: "Premium Templates", desc: "Beautiful, recruiter-tested layouts that look as good as they perform." },
  { icon: ShieldCheck, title: "Pay & Download", desc: "Pay ₦2,000 with Paystack or Nomba — your PDF is unlocked and emailed instantly." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-muted-foreground mb-8">
            <Sparkles className="w-3 h-3 text-[color:var(--gold)]" />
            AI-powered for Nigeria · UK · US · Canada
          </div>
          <h1 className="text-5xl sm:text-7xl leading-[1.05] mb-6 text-gradient">
            Your résumé, rewritten by AI<br/>to land the job.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Build a resume tailored to any country, score it against ATS, practice the interview,
            then download in one click. Just <span className="text-foreground font-medium">₦2,000</span> per resume.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <Link to="/signup">
              <Button size="lg" className="btn-hero border-0 text-base px-8 h-12">Build my resume</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="text-base px-8 h-12 bg-transparent">I have an account</Button>
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {COUNTRIES.map(c => (
              <span key={c.name} className="px-4 py-2 rounded-full glass text-sm">
                <span className="mr-2">{c.flag}</span>{c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl mb-4">Everything you need to get hired</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">From a blank page to a job-ready PDF and a confident interview — all powered by AI.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="glass rounded-2xl p-6 hover:border-primary/40 transition group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="glass rounded-3xl p-10 sm:p-16 text-center" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <h2 className="text-4xl mb-10">Three steps to a great resume</h2>
          <div className="grid sm:grid-cols-3 gap-8 text-left">
            {[
              { n: "01", t: "Pick your market", d: "Choose Nigeria, UK, US or Canada — we tailor format & language." },
              { n: "02", t: "Let AI write it", d: "Tell the AI what you do; it rewrites bullets to fit your target role." },
              { n: "03", t: "Pay ₦2,000 & download", d: "Paystack or Nomba. PDF unlocks instantly and lands in your inbox." },
            ].map(s => (
              <div key={s.n}>
                <div className="font-serif text-5xl text-[color:var(--gold)] mb-3">{s.n}</div>
                <h3 className="text-xl mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link to="/signup">
              <Button size="lg" className="btn-hero border-0 text-base px-10 h-12">Start free</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Reslyn · AI Resume & Interview Coach
      </footer>
    </div>
  );
}
