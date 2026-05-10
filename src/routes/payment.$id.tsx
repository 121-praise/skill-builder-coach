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

const AMOUNT_NGN = 2000;
const FLW_PUBLIC_KEY = "FLWPUBK-d16e41ff264c992a0d018b997b77173c-X";

function Payment() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [resume, setResume] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/login" }); }, [user, loading, nav]);
  useEffect(() => {
    if (user) {
      supabase.from("resumes").select("*").eq("id", id).single().then(({ data }) => setResume(data));
      setEmail(user.email || "");
    }
  }, [user, id]);
  useEffect(() => {
    if (document.getElementById("flw-inline")) return;
    const s = document.createElement("script"); s.id = "flw-inline"; s.src = "https://checkout.flutterwave.com/v3.js"; document.body.appendChild(s);
  }, []);

  async function payWithFlutterwave() {
    if (!email) return toast.error("Email required");
    const FlutterwaveCheckout = (window as any).FlutterwaveCheckout;
    if (!FlutterwaveCheckout) return toast.error("Flutterwave not loaded — refresh and try again.");
    setBusy(true);
    const tx_ref = `RES-${id.slice(0,8)}-${Date.now()}`;
    const { error } = await supabase.from("payments").insert({
      user_id: user!.id, resume_id: id, provider: "flutterwave", reference: tx_ref,
      amount_kobo: AMOUNT_NGN * 100, currency: "NGN", email, status: "pending",
    });
    if (error) { setBusy(false); return toast.error(error.message); }

    FlutterwaveCheckout({
      public_key: FLW_PUBLIC_KEY,
      tx_ref,
      amount: AMOUNT_NGN,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: { email, name: name || email },
      customizations: {
        title: "TalentAI",
        description: `Unlock resume: ${resume?.title || ""}`,
      },
      callback: async (response: any) => {
        if (response?.status === "successful" || response?.status === "completed") {
          await verify(response.transaction_id, tx_ref);
        } else {
          setBusy(false); toast.error("Payment was not completed");
        }
      },
      onclose: () => { setBusy(false); },
    });
  }

  async function verify(transaction_id: string | number, tx_ref: string) {
    const { data, error } = await supabase.functions.invoke("flutterwave-verify", {
      body: { transaction_id, tx_ref, expected_amount: AMOUNT_NGN },
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error("Could not verify payment. Contact support."); return; }
    await supabase.from("payments").update({ status: "success", raw: data.raw }).eq("reference", tx_ref);
    await supabase.from("resumes").update({ paid: true }).eq("id", id);
    toast.success("Payment confirmed!");
    supabase.functions.invoke("send-resume-email", { body: {
      to: email, subject: "Your TalentAI resume is unlocked",
      html: `<p>Hi,</p><p>Your payment of ₦${AMOUNT_NGN.toLocaleString()} for "<b>${resume?.title||"your resume"}</b>" was successful.</p><p>You can now download your resume as a PDF: <a href="${window.location.origin}/builder/${id}">Open in TalentAI</a>.</p><p>— TalentAI</p>`,
    }}).catch(()=>{});
    nav({ to: "/builder/$id", params: { id } });
  }

  if (!resume) return <div className="min-h-screen"><Nav/><div className="p-10 text-center text-muted-foreground">Loading…</div></div>;

  if (resume.paid) return (
    <div className="min-h-screen"><Nav/>
      <div className="max-w-md mx-auto py-16 px-4 text-center glass rounded-2xl mt-10 p-8">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3"/>
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
          <Lock className="w-8 h-8 text-primary mb-4"/>
          <h1 className="text-3xl font-serif mb-1">Unlock your resume</h1>
          <p className="text-sm text-muted-foreground mb-6">One-time payment to download "{resume.title}".</p>

          <div className="bg-secondary rounded-xl p-4 mb-6 flex items-baseline justify-between">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-3xl font-serif">₦{AMOUNT_NGN.toLocaleString()}</span>
          </div>

          <Label className="text-sm">Full name</Label>
          <Input value={name} onChange={e=>setName(e.target.value)} className="mb-3" placeholder="Jane Doe" />
          <Label className="text-sm">Email for receipt</Label>
          <Input value={email} onChange={e=>setEmail(e.target.value)} className="mb-6" />

          <div className="rounded-xl border border-border p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f5a623] flex items-center justify-center text-white font-bold">F</div>
            <div>
              <div className="text-sm font-medium">Flutterwave</div>
              <div className="text-xs text-muted-foreground">Card · Bank Transfer · USSD · Mobile Money</div>
            </div>
          </div>

          <Button className="w-full btn-hero border-0 h-12" onClick={payWithFlutterwave} disabled={busy}>
            {busy ? "Processing..." : `Pay ₦${AMOUNT_NGN.toLocaleString()} with Flutterwave`}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-4">Payments are encrypted and processed securely. PDF unlocks instantly and is emailed to you.</p>
        </div>
      </div>
    </div>
  );
}
