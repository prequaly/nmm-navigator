import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, EmptyState } from "@/components/app-shell/AppShell";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { FileText, FileSpreadsheet, Printer, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadStrategicPlanDocx, downloadStrategicPlanXlsx } from "@/lib/exports/strategic-plan";
import { downloadBoardPacketDocx, downloadBoardPacketXlsx } from "@/lib/exports/board-packet";
import { downloadFunderReportDocx, downloadFunderReportXlsx } from "@/lib/exports/funder-report";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/report/exports")({
  head: () => ({ meta: [{ title: "Reports & Exports — NMM Navigator" }] }),
  component: ExportsPage,
});

type Template = {
  key: string;
  title: string;
  description: string;
  printRoute: string;
  docx: (orgId: string) => Promise<void>;
  xlsx: (orgId: string) => Promise<void>;
};

const TEMPLATES: Template[] = [
  {
    key: "strategic-plan",
    title: "Strategic Plan",
    description:
      "Mission, vision, values, strategic pillars, KPIs, and risk register — your formal planning document.",
    printRoute: "/report/print/strategic-plan",
    docx: downloadStrategicPlanDocx,
    xlsx: downloadStrategicPlanXlsx,
  },
  {
    key: "board-packet",
    title: "Board Packet",
    description:
      "Agenda, attendees, decisions, action items, and summary from your most recent meeting. Ready to email to the board.",
    printRoute: "/report/print/board-packet",
    docx: (orgId) => downloadBoardPacketDocx(orgId),
    xlsx: (orgId) => downloadBoardPacketXlsx(orgId),
  },
  {
    key: "funder-report",
    title: "Funder Report",
    description:
      "Organization overview, program outcomes, financial summary, and grant pipeline — the report a funder expects to see.",
    printRoute: "/report/print/funder-report",
    docx: downloadFunderReportDocx,
    xlsx: downloadFunderReportXlsx,
  },
];

function ExportsPage() {
  const { orgId, loading } = useCurrentOrg();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
      toast.success("Export downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell
      title="Reports & Exports"
      subtitle="Generate professional documents from your data. PDF (print-friendly), DOCX (editable), or XLSX (data-heavy)."
    >
      {loading ? (
        <SectionCard padding="p-10">
          <div className="text-center text-sm text-slate-500">Loading…</div>
        </SectionCard>
      ) : !orgId ? (
        <EmptyState title="No organization found" description="Set up your organization profile first." />
      ) : (
        <div className="space-y-4">
          {TEMPLATES.map((t) => {
            const docxKey = `${t.key}-docx`;
            const xlsxKey = `${t.key}-xlsx`;
            return (
              <SectionCard key={t.key}>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
                  <div className="min-w-0">
                    <h3 className="font-serif italic text-xl text-brand-deep">{t.title}</h3>
                    <p className="text-sm text-slate-600 mt-1.5 max-w-xl">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Link
                      to={t.printRoute}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
                    >
                      <Printer className="size-4 text-rose-600" /> PDF
                    </Link>
                    <button
                      disabled={busy === docxKey}
                      onClick={() => run(docxKey, () => t.docx(orgId))}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busy === docxKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileText className="size-4 text-blue-600" />
                      )}
                      DOCX
                    </button>
                    <button
                      disabled={busy === xlsxKey}
                      onClick={() => run(xlsxKey, () => t.xlsx(orgId))}
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      {busy === xlsxKey ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="size-4 text-emerald-600" />
                      )}
                      XLSX
                    </button>
                  </div>
                </div>
              </SectionCard>
            );
          })}

          <div className="text-xs text-slate-500 flex items-center gap-2 pt-2">
            <Download className="size-3.5" />
            All exports are generated locally in your browser — your data never leaves the page.
          </div>
        </div>
      )}
    </AppShell>
  );
}
