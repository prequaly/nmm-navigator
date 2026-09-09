import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Upload,
  Pencil,
  Loader2,
  Sparkles,
  AlertTriangle,
  Trash2,
  FileText,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { extract990, type TaxFormType } from "@/lib/finance/extract-990.functions";
import {
  REVENUE_LINE_FIELDS,
  blankRevenueLines,
  deleteTaxFiling,
  extractedToRevenueLines,
  loadTaxFilings,
  saveTaxFiling,
  sumRevenueLines,
  taxIntakeRequirement,
  type RevenueLines,
  type TaxFiling,
} from "@/lib/finance/tax-filings";

const FORM_TYPES: { value: TaxFormType; label: string }[] = [
  { value: "990", label: "Form 990" },
  { value: "990-EZ", label: "Form 990-EZ" },
  { value: "990-N", label: "Form 990-N (e-Postcard)" },
  { value: "1099", label: "Form 1099" },
  { value: "other", label: "Other / financial statement" },
];

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

type Mode = "idle" | "review";

export function TaxFormIntake({
  orgId,
  yearFounded,
  onSaved,
}: {
  orgId: string | null;
  yearFounded: number | null;
  onSaved?: (filing: TaxFiling) => void;
}) {
  const extract = useServerFn(extract990);
  const fileRef = useRef<HTMLInputElement>(null);

  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");

  // Draft under review — either AI-extracted or blank for manual entry.
  const [draft, setDraft] = useState<RevenueLines>(blankRevenueLines);
  const [draftSource, setDraftSource] = useState<"upload" | "manual">("manual");
  const [draftFormType, setDraftFormType] = useState<TaxFormType>("990");
  const [draftYear, setDraftYear] = useState<number>(new Date().getFullYear() - 1);
  const [draftFilename, setDraftFilename] = useState<string | null>(null);
  const [draftEin, setDraftEin] = useState<string | null>(null);
  const [draftOrgName, setDraftOrgName] = useState<string | null>(null);
  const [draftFyEnd, setDraftFyEnd] = useState<string | null>(null);

  const requirement = useMemo(() => taxIntakeRequirement(yearFounded), [yearFounded]);

  const refresh = async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setFilings(await loadTaxFilings(orgId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load tax filings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Max 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const result = await extract({
        data: { filename: file.name, fileDataBase64: btoa(binary) },
      });
      setDraft(extractedToRevenueLines(result));
      setDraftSource("upload");
      setDraftFormType(result.detected_form_type);
      setDraftYear(
        result.tax_year ??
          (result.fiscal_year_end
            ? new Date(result.fiscal_year_end).getFullYear()
            : new Date().getFullYear() - 1),
      );
      setDraftFilename(file.name);
      setDraftEin(result.ein);
      setDraftOrgName(result.organization_name);
      setDraftFyEnd(result.fiscal_year_end);
      setMode("review");
      toast.success("Form read. Check the numbers before saving.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that PDF.");
    } finally {
      setUploading(false);
    }
  };

  const startManual = () => {
    setDraft(blankRevenueLines());
    setDraftSource("manual");
    setDraftFormType("990");
    setDraftYear(new Date().getFullYear() - 1);
    setDraftFilename(null);
    setDraftEin(null);
    setDraftOrgName(null);
    setDraftFyEnd(null);
    setMode("review");
  };

  const saveDraft = async () => {
    if (!orgId) {
      toast.error("Save your organization profile first.");
      return;
    }
    setSaving(true);
    try {
      const filing = await saveTaxFiling(orgId, {
        form_type: draftFormType,
        tax_year: draftYear,
        fiscal_year_end: draftFyEnd,
        source: draftSource,
        source_filename: draftFilename,
        filed_organization_name: draftOrgName,
        filed_ein: draftEin,
        revenue_lines: draft,
      });
      toast.success(`Saved ${draftFormType} figures for ${draftYear}.`);
      setMode("idle");
      await refresh();
      onSaved?.(filing);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save these figures.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (filing: TaxFiling) => {
    if (!confirm(`Remove the ${filing.form_type} figures for ${filing.tax_year}?`)) return;
    try {
      await deleteTaxFiling(filing.id);
      await refresh();
      toast.success("Removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove that filing.");
    }
  };

  const draftTotal = sumRevenueLines(draft);

  // ---------------------------------------------------------------- review --
  if (mode === "review") {
    return (
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h4 className="font-serif italic text-lg text-brand-deep">
              {draftSource === "upload" ? "Check what we read" : "Enter your revenue lines"}
            </h4>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              {draftSource === "upload"
                ? "AI extraction is a best-effort read. Correct anything that looks wrong — nothing is saved until you confirm."
                : "Use your most recent filed return or audited financials. Leave a line at 0 if it doesn't apply."}
            </p>
          </div>
          {draftFilename && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
              <FileText className="size-3.5" /> {draftFilename}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Form
            </span>
            <select
              value={draftFormType}
              onChange={(e) => setDraftFormType(e.target.value as TaxFormType)}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {FORM_TYPES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tax year
            </span>
            <input
              type="number"
              value={draftYear}
              onChange={(e) => setDraftYear(Number(e.target.value))}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fiscal year end
            </span>
            <input
              type="date"
              value={draftFyEnd ?? ""}
              onChange={(e) => setDraftFyEnd(e.target.value || null)}
              className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          {REVENUE_LINE_FIELDS.map((f, i) => (
            <div
              key={f.key}
              className={`grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3 ${
                i % 2 ? "bg-slate-50/60" : "bg-white"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{f.label}</p>
                {f.helper && <p className="text-[11px] text-slate-400 italic">{f.helper}</p>}
              </div>
              <input
                type="number"
                value={draft[f.key] || ""}
                onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-40 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right tabular-nums"
              />
            </div>
          ))}
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center px-4 py-3 bg-brand-deep text-white">
            <p className="text-sm font-medium">Total revenue</p>
            <p className="w-40 text-right font-serif text-lg tabular-nums pr-3">
              {money(draftTotal)}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic mt-2">
          Government grants are reported inside the contributions total, so they're not added twice.
        </p>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={saveDraft}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save these figures
          </button>
          <button
            onClick={() => setMode("idle")}
            disabled={saving}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ idle --
  return (
    <div>
      {requirement === "required" && filings.length === 0 && (
        <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 mb-5">
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-600" />
          <span>
            Your organization was founded in {yearFounded}, so you've filed at least one return.
            Upload it and we'll prefill your revenue mix, funding gap, and scenario models from real
            numbers instead of asking you to retype them.
          </span>
        </div>
      )}
      {requirement === "optional" && filings.length === 0 && (
        <p className="text-sm text-slate-500 mb-5 max-w-2xl">
          You're new enough that you may not have filed a return yet. Upload one if you have it —
          otherwise enter your revenue by hand and you can always add the form later.
        </p>
      )}
      {requirement === "unknown" && filings.length === 0 && (
        <p className="text-sm text-slate-500 mb-5 max-w-2xl">
          Add your year founded above and we'll tell you which tax forms to bring. You can also add
          figures now either way.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400 py-4">Loading filings…</p>
      ) : (
        filings.length > 0 && (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 mb-5">
            {filings.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {f.form_type} · {f.tax_year}
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {f.source === "upload" ? "Uploaded" : "Manual"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {money(f.total_revenue)} total revenue
                    {f.source_filename ? ` · ${f.source_filename}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => remove(f)}
                  className="text-slate-400 hover:text-rose-600 shrink-0"
                  aria-label={`Remove ${f.form_type} ${f.tax_year}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !orgId}
          className="text-left rounded-xl border border-slate-200 hover:border-brand-primary/50 hover:bg-slate-50 transition-all p-5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="size-10 rounded-lg bg-brand-deep text-white flex items-center justify-center">
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-full inline-flex items-center gap-1">
              <Sparkles className="size-3" /> Recommended
            </span>
          </div>
          <h4 className="font-serif italic text-lg">Upload a tax form (PDF)</h4>
          <p className="text-sm text-slate-500 mt-1.5">
            Form 990, 990-EZ, or 1099. We read the revenue lines and you confirm them before
            anything is saved.
          </p>
          <p className="text-[11px] text-slate-400 mt-3">
            PDF · up to 10 MB · the file is read and discarded, never stored
          </p>
        </button>

        <button
          onClick={startManual}
          disabled={!orgId}
          className="text-left rounded-xl border border-slate-200 hover:border-brand-primary/50 hover:bg-slate-50 transition-all p-5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="size-10 rounded-lg bg-white border border-slate-200 text-brand-deep flex items-center justify-center mb-4">
            <Pencil className="size-4" />
          </div>
          <h4 className="font-serif italic text-lg">Enter the numbers manually</h4>
          <p className="text-sm text-slate-500 mt-1.5">
            Use your audited financials or P&amp;L. Ten lines, about five minutes.
          </p>
          <p className="text-[11px] text-slate-400 mt-3">No file required</p>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
