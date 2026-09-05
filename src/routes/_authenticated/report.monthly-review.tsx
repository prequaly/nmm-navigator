import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { generateMonthlyReview } from "@/lib/ai/monthly-review.functions";
import { downloadMonthlyReviewDocx } from "@/lib/exports/monthly-review";
import { Sparkles, Loader2, ArrowLeft, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/report/monthly-review")({
  head: () => ({ meta: [{ title: "Monthly Strategic Review — NMM Navigator" }] }),
  component: MonthlyReview,
});

function currency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function renderMarkdown(md: string) {
  // Minimal markdown → JSX for headings, bullets, paragraphs, bold.
  const blocks: React.ReactNode[] = [];
  const lines = md.split("\n");
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push(<p key={blocks.length} className="text-slate-700 leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: para.join(" ").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />);
      para = [];
    }
    if (list.length) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-6 space-y-1.5 my-3">
          {list.map((li, i) => (
            <li key={i} className="text-slate-700" dangerouslySetInnerHTML={{ __html: li.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("## ")) {
      flush();
      blocks.push(
        <h2 key={blocks.length} className="text-xl font-serif italic text-slate-900 mt-8 mb-2 border-b border-slate-100 pb-2">
          {line.slice(3)}
        </h2>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flush();
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function MonthlyReview() {
  const { orgId, orgs } = useCurrentOrg();
  const runFn = useServerFn(generateMonthlyReview);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [text, setText] = useState<string>("");
  const [monthLabel, setMonthLabel] = useState<string>("");
  const [ctx, setCtx] = useState<any>(null);
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  const download = async () => {
    const orgName =
      orgs.find((o) => o.organizationId === orgId)?.organizationName ?? "Organization";
    setDownloading(true);
    try {
      await downloadMonthlyReviewDocx(orgName, monthLabel, text);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const run = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await runFn({ data: { organizationId: orgId, monthISO: month } });
      setText(res.text);
      setMonthLabel(res.monthLabel);
      setCtx(res.context);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Monthly Strategic Review"
      subtitle="Your AI strategist reads the month's data and tells you what to focus on next."
      actions={
        <>
          <Link to="/dashboard"><GhostButton><ArrowLeft className="size-3.5 inline mr-1" />Command Center</GhostButton></Link>
          {text && (
            <GhostButton onClick={download} disabled={downloading}>
              {downloading ? (
                <Loader2 className="size-3.5 inline mr-1 animate-spin" />
              ) : (
                <FileText className="size-3.5 inline mr-1" />
              )}
              Download Word
            </GhostButton>
          )}
          <PrimaryButton onClick={run} disabled={loading || !orgId}>
            {loading ? <><Loader2 className="size-3.5 inline mr-1 animate-spin" />Generating…</> : <><Sparkles className="size-3.5 inline mr-1" />Generate review</>}
          </PrimaryButton>
        </>
      }
    >
      <SectionCard padding="p-6" className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-1">Review month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <p className="text-sm text-slate-500 max-w-xl">
            The review pulls this month's revenue, expenses, KPI progress, closed action items, grant pipeline movement, and upcoming deadlines — then recommends the next 30 days.
          </p>
        </div>
      </SectionCard>

      {!text && !loading && (
        <SectionCard padding="p-12" className="text-center">
          <Calendar className="size-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Pick a month and click <span className="font-medium">Generate review</span> to see this month's briefing.</p>
        </SectionCard>
      )}

      {loading && (
        <SectionCard padding="p-12" className="text-center">
          <Loader2 className="size-6 text-brand-primary mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-500">Reading your data and drafting the review…</p>
        </SectionCard>
      )}

      {text && (
        <>
          {ctx && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <SnapCard label="Month revenue" value={currency(ctx.finance.monthRevenue)} tone="good" />
              <SnapCard label="Month expenses" value={currency(ctx.finance.monthExpense)} />
              <SnapCard label="Month net" value={currency(ctx.finance.monthNet)} tone={ctx.finance.monthNet >= 0 ? "good" : "bad"} />
              <SnapCard label="Wins closed" value={String(ctx.wins?.length ?? 0)} />
            </div>
          )}
          <SectionCard padding="p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Monthly Strategic Review</p>
            <h1 className="text-3xl font-serif italic mt-1 mb-2">{monthLabel}</h1>
            <div className="prose prose-slate max-w-none">{renderMarkdown(text)}</div>
          </SectionCard>
        </>
      )}
    </AppShell>
  );
}

function SnapCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const t = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-500" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-2xl font-serif tabular-nums mt-2 ${t}`}>{value}</p>
    </div>
  );
}
