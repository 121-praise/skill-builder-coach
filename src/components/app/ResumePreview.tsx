import { forwardRef } from "react";

export type ResumeData = {
  personal: { name: string; email: string; phone: string; location: string; summary: string; links?: string };
  experience: Array<{ company: string; role: string; start: string; end: string; bullets: string }>;
  education: Array<{ school: string; degree: string; year: string }>;
  skills: string[];
};

export const ResumePreview = forwardRef<HTMLDivElement, { data: ResumeData; country: string }>(({ data, country }, ref) => {
  return (
    <div ref={ref} className="bg-white text-neutral-900 p-10 rounded-xl shadow-2xl" style={{ fontFamily: "Georgia, serif", minHeight: 1000 }}>
      <header className="border-b-2 border-neutral-900 pb-4 mb-6">
        <h1 className="text-4xl font-bold tracking-tight">{data.personal.name || "Your Name"}</h1>
        <p className="text-sm mt-2 text-neutral-700">
          {[data.personal.email, data.personal.phone, data.personal.location].filter(Boolean).join("  ·  ")}
        </p>
        {data.personal.links && <p className="text-sm text-neutral-700 mt-1">{data.personal.links}</p>}
      </header>
      {data.personal.summary && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-2">Summary</h2>
          <p className="text-sm leading-relaxed">{data.personal.summary}</p>
        </section>
      )}
      {data.experience?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3">Experience</h2>
          {data.experience.map((e, i) => (
            <div key={i} className="mb-4">
              <div className="flex justify-between items-baseline">
                <p className="font-bold text-sm">{e.role || "Role"} <span className="font-normal">— {e.company}</span></p>
                <p className="text-xs text-neutral-600">{e.start} – {e.end || "Present"}</p>
              </div>
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-sm">
                {(e.bullets || "").split("\n").filter(Boolean).map((b, j) => <li key={j}>{b.replace(/^[-•]\s*/, "")}</li>)}
              </ul>
            </div>
          ))}
        </section>
      )}
      {data.education?.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-2">Education</h2>
          {data.education.map((ed, i) => (
            <div key={i} className="flex justify-between text-sm mb-1">
              <span><span className="font-bold">{ed.degree}</span> — {ed.school}</span>
              <span className="text-neutral-600 text-xs">{ed.year}</span>
            </div>
          ))}
        </section>
      )}
      {data.skills?.length > 0 && (
        <section className="mb-2">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-2">Skills</h2>
          <p className="text-sm">{data.skills.join(" · ")}</p>
        </section>
      )}
      <p className="text-[10px] text-neutral-400 mt-8 text-right">Optimized for {country} — built with Reslyn</p>
    </div>
  );
});
ResumePreview.displayName = "ResumePreview";
