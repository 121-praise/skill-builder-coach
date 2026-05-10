import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Nav } from "@/components/app/Nav";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/dashboard" }); }, [user, loading, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — check your email to confirm.");
    nav({ to: "/dashboard" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.error) toast.error(result.error.message || "Google sign-in failed");
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="glass rounded-2xl p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <h1 className="text-4xl mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start building in under a minute.</p>
          <Button onClick={google} variant="outline" className="w-full bg-transparent mb-4">Continue with Google</Button>
          <div className="flex items-center gap-3 my-4 text-xs text-muted-foreground"><div className="flex-1 h-px bg-border" />or<div className="flex-1 h-px bg-border" /></div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={e=>setName(e.target.value)} required/></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div>
            <div><Label>Password</Label><Input type="password" minLength={6} value={pw} onChange={e=>setPw(e.target.value)} required/></div>
            <Button type="submit" disabled={busy} className="w-full btn-hero border-0">{busy?"Creating...":"Create account"}</Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">Already have an account? <Link to="/login" className="text-foreground underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
