import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import {
  Sparkles,
  FileText,
  BarChart3,
  Building2,
  Calendar,
  HandCoins,
  Loader2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { downloadStrategicPlanDocx, downloadStrategicPlanXlsx } from "@/lib/exports/strategic-plan";
import { downloadBoardPacketDocx, downloadBoardPacketXlsx } from "@/lib/exports/board-packet";
import { downloadFunderReportDocx, downloadFunderReportXlsx } from "@/lib/exports/funder-report";
import {
  downloadAnnualOperatingPlanDocx,
  downloadAnnualOperatingPlanXlsx,
} from "@/lib/exports/annual-operating-plan";
import { downloadLogicModelDocx, downloadLogicModelXlsx } from "@/lib/exports/logic-model";

type Report = {
  icon: any;
  title: string;
  desc: string;
  printRoute?: string;
  docx?: (orgId: string) => Promise<void>;
  xlsx?: (orgId: string) => Promise<void>;
  comingSoon?: boolean;
};

const REPORTS: Report[] = [
  {
    icon: FileText,
    title: "Executive Summary",
    desc: "One-page plain-language overview for board chair, funders, partners.",
    printRoute: "/report/print/strategic-plan",
    docx: downloadStrategicPlanDocx,
  },
  {
    icon: BarChart3,
    title: "Strategic Plan",
    desc: "Full strategic plan with priorities, objectives, KPIs, owners, milestones.",
    printRoute: "/report/print/strategic-plan",
    docx: downloadStrategicPlanDocx,
    xlsx: downloadStrategicPlanXlsx,
  },
  {
    icon: Building2,
    title: "Board Report",
    desc: "Quarterly board deck — health scores, financials, milestone status, risks.",
    printRoute: "/report/print/board-packet",
    docx: (id) => downloadBoardPacketDocx(id),
    xlsx: (id) => downloadBoardPacketXlsx(id),
  },
  {
    icon: HandCoins,
    title: "Funder Report",
    desc: "Organization overview, program outcomes, financial summary, and grant pipeline.",
    printRoute: "/report/print/funder-report",
    docx: downloadFunderReportDocx,
    xlsx: downloadFunderReportXlsx,
  },
  {
    icon: Calendar,
    title: "Annual Operating Plan",
    desc: "Year-1 detail with quarterly work plans, programs, calendar, budget.",
    printRoute: "/report/print/annual-operating-plan",
    docx: downloadAnnualOperatingPlanDocx,
    xlsx: downloadAnnualOperatingPlanXlsx,
  },
  {
    icon: Sparkles,
    title: "Logic Model & Theory of Change",
    desc: "Auto-built from program data and impact assessment answers.",
    printRoute: "/report/print/logic-model",
    docx: downloadLogicModelDocx,
    xlsx: downloadLogicModelXlsx,
  },
];

export const Route = createFileRoute("/_authenticated/report/insights")({
  head: () => ({ meta: [{ title: "Reports & AI Insights — NMM Navigator" }] }),
  component: InsightsPage,
});

function InsightsPage() {
  const { orgId, loading } = useCurrentOrg();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateAll() {
    if (!orgId) {
      toast.error("Set up your organization first");
      return;
    }
    setBusy("all");
    try {
      for (const r of REPORTS) {
        if (r.docx) await r.docx(orgId);
      }
      toast.success("Generated all available reports");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate reports");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      title="Reports & AI Insights"
      subtitle="Every report is generated from your live assessments, plan, programs, and budget — no copy-paste."
      actions={
        <PrimaryButton onClick={generateAll} disabled={busy !== null || loading || !orgId}>
          {busy === "all" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate all
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORTS.map((r) => {
          const dKey = `${r.title}-docx`;
          const xKey = `${r.title}-xlsx`;
          const gKey = `${r.title}-gen`;
          return (
            <SectionCard key={r.title} padding="p-6">
              <div className="size-10 rounded-lg bg-brand-deep/5 grid place-items-center mb-4">
                <r.icon className="size-5 text-brand-deep" />
              </div>
              <h3 className="text-lg font-serif italic">{r.title}</h3>
              <p className="text-sm text-slate-500 mt-2">{r.desc}</p>
              {r.comingSoon && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 inline-block px-1.5 py-0.5 rounded">
                  Coming soon
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
                <button
                  disabled={busy !== null || loading || !orgId || r.comingSoon || !r.docx}
                  onClick={() => r.docx && orgId && run(gKey, () => r.docx!(orgId))}
                  className="px-3 py-1.5 text-xs font-medium bg-brand-deep text-white rounded-md disabled:opacity-40 inline-flex items-center gap-1"
                >
                  {busy === gKey ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Sparkles className="size-3" />
                  )}
                  Generate
                </button>
                {r.printRoute ? (
                  <Link
                    to={r.printRoute}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <Printer className="size-3 text-rose-600" /> PDF
                  </Link>
                ) : (
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md opacity-40"
                  >
                    PDF
                  </button>
                )}
                {r.docx ? (
                  <button
                    disabled={busy !== null || loading || !orgId}
                    onClick={() => orgId && run(dKey, () => r.docx!(orgId))}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    {busy === dKey ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileText className="size-3 text-blue-600" />
                    )}
                    Word
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md opacity-40"
                  >
                    Word
                  </button>
                )}
                {r.xlsx && (
                  <button
                    disabled={busy !== null || loading || !orgId}
                    onClick={() => orgId && run(xKey, () => r.xlsx!(orgId))}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1"
                  >
                    {busy === xKey ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileText className="size-3 text-emerald-600" />
                    )}
                    Excel
                  </button>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </AppShell>
  );
}
