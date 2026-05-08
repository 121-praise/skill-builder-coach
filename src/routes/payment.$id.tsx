import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Nav } from "@/components/app/Nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Lock } from "lucide-react";

export const Route = createFileRoute("/payment/$id")({ component: Payment });

const AMOUNT_NGN = 2000; // 2,000 NGN
const PAYSTACK_PUBLIC_KEY = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || "";

function Payment() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [provider, setProvider] = useState<"paystack" | "nomba">("paystack");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => { if (user) { supabase.from("resumes").select("*").eq("id", id).single().then(({ data }) => { setResume(data); }); setEmail(user.email || ""); } }, [user, id]);
  useEffect(() => {
    if (document.getElementById("paystack-inline")) return;
    const s = document.createElement("script"); s.id = "paystack-inline"; s.src = "https://js.paystack.co/v2/inline.js"; document.body.appendChild(s);
  }, []);

  async function payWithPaystack() {
    if (!PAYSTACK_PUBLIC_KEY) return toast.error("Paystack public key not configured. Add VITE_PAYSTACK_PUBLIC_KEY.");
    if (!email) return toast.error("Email required");
    setBusy(true);
    const reference = `RES-${id.slice(0,8)}-${Date.now()}`;
    const { error } = await supabase.from("payments").insert({
      user_id: user!.id, resume_id: id, provider: "paystack", reference, amount_kobo: AMOUNT_NGN * 100, currency: "NGN", email, status: "pending",
    });
    if (error) { setBusy(false); return toast.error(error.message); }

    const PaystackPop = (window as any).PaystackPop;
    if (!PaystackPop) { setBusy(false); return toast.error("Paystack not loaded — refresh and try again."); }
    const popup = new PaystackPop();
    popup.newTransaction({
      key: PAYSTACK_PUBLIC_KEY, email, amount: AMOUNT_NGN * 100, currency: "NGN", reference,
      onSuccess: async (tx: any) => { await verify(tx.reference); },
      onCancel: () => { setBusy(false); toast.error("Payment cancelled"); },
    });
  }

  async function payWithNomba() {
    setBusy(true);
    const reference = `RES-${id.slice(0,8)}-${Date.now()}`;
    await supabase.from("payments").insert({
      user_id: user!.id, resume_id: id, provider: "nomba", reference, amount_kobo: AMOUNT_NGN * 100, currency: "NGN", email, status: "pending",
    });
    toast.message("Nomba integration coming soon", { description: "Add NOMBA_API_KEY to enable. For now please use Paystack." });
    setBusy(false);
  }

  async function verify(reference: string) {
    const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference } });
    setBusy(false);
    if (error || !data?.ok) { toast.error("Could not verify payment. Contact support."); return; }
    toast.success("Payment confirmed!");
    // fire-and-forget email
    supabase.functions.invoke("send-resume-email", { body: {
      to: email, subject: "Your Reslyn resume is unlocked",
      html: `<p>Hi,</p><p>Your payment of ₦${AMOUNT_NGN.toLocaleString()} for "<b>${resume?.title||"your resume"}</b>" was successful.</p><p>You can now download your resume as a PDF: <a href="${window.location.origin}/builder/${id}">Open in Reslyn</a>.</p><p>— Reslyn</p>`,
    }}).catch(()=>{});
    nav({ to: "/builder/$id", params: { id } });
  }

  if (!resume) return <div className="min-h-screen"><Nav/><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  if (resume.paid) return (
    <div className="min-h-screen"><Nav/>
      <div className="max-w-md mx-auto py-16 px-4 text-center glass rounded-2xl mt-10 p-8">
        <CheckCircle2 className="w-12 h-12 text-[color:var(--gold)] mx-auto mb-3"/>
        <h1 className="text-3xl font-serif mb-2">Already paid</h1>
        <p className="text-muted-foreground mb-6">This resume is unlocked — head back and download it.</p>
        <Button className="btn-hero border-0" onClick={()=>nav({to:"/builder/$id", params:{id}})}>Download PDF</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Nav/>
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="glass rounded-2xl p-8" style={{ boxShadow: "var(--shadow-elegant)" }}>
          <Lock className="w-8 h-8 text-[color:var(--gold)] mb-4"/>
          <h1 className="text-3xl font-serif mb-1">Unlock your resume</h1>
          <p className="text-sm text-muted-foreground mb-6">One-time payment to download "{resume.title}".</p>

          <div className="bg-secondary/50 rounded-xl p-4 mb-6 flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-3xl font-serif">₦{AMOUNT_NGN.toLocaleString()}</span>
          </div>

          <Label className="text-sm">Email for receipt</Label>
          <Input value={email} onChange={e=>setEmail(e.target.value)} className="mb-4" />

          <Label className="text-sm mb-2 block">Pay with</Label>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button onClick={()=>setProvider("paystack")} className={`p-4 rounded-xl border text-left transition ${provider==="paystack"?"border-primary bg-primary/10":"border-border"}`}>
              <div className="text-sm font-medium">Paystack</div>
              <div className="text-xs text-muted-foreground">Card · Bank · USSD</div>
            </button>
            <button onClick={()=>setProvider("nomba")} className={`p-4 rounded-xl border text-left transition ${provider==="nomba"?"border-primary bg-primary/10":"border-border"}`}>
              <div className="text-sm font-medium">Nomba</div>
              <div className="text-xs text-muted-foreground">Bank transfer</div>
            </button>
          </div>

          <Button className="w-full btn-hero border-0 h-12" onClick={provider==="paystack"?payWithPaystack:payWithNomba} disabled={busy}>
            {busy ? "Processing..." : `Pay ₦${AMOUNT_NGN.toLocaleString()} with ${provider==="paystack"?"Paystack":"Nomba"}`}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-4">Payments are encrypted and processed securely. PDF unlocks instantly and is emailed to you.</p>
        </div>
      </div>
    </div>
  );
}
