import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
} from "@/components/app-shell/AppShell";
import {
  FileText,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  Info,
} from "lucide-react";
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { loadLatestTaxFiling, type RevenueLines, type TaxFiling } from "@/lib/finance/tax-filings";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assess/revenue-hhi")({
  head: () => ({ meta: [{ title: "Revenue Diversity — NMM Navigator" }] }),
  component: HhiAssessment,
});

// --- Revenue category + subcategory model ------------------------------------

type CategoryKey =
  | "contributions"
  | "government"
  | "program_service"
  | "investment"
  | "rental"
  | "fundraising"
  | "sales_inventory"
  | "other";

type SubCategory = { key: string; label: string; helper?: string };
type Category = {
  key: CategoryKey;
  label: string;
  helper: string;
  color: string;
  subs: SubCategory[];
};

// Sub keys are namespaced as `${categoryKey}.${subKey}` to keep the flat map unambiguous.
const CATEGORIES: Category[] = [
  {
    key: "contributions",
    label: "Contributions, Gifts & Grants (non-gov)",
    helper: "Foundation, individual, corporate giving",
    color: "#2563eb",
    subs: [
      { key: "individual_major", label: "Individual — major gifts ($1k+)" },
      { key: "individual_small", label: "Individual — small / recurring donors" },
      { key: "foundation", label: "Foundation grants (non-government)" },
      { key: "corporate", label: "Corporate giving & sponsorships" },
      { key: "daf", label: "Donor-advised funds" },
      { key: "bequests", label: "Bequests & planned gifts" },
      { key: "unallocated", label: "Unallocated contributions", helper: "Split into the lines above when you can" },
    ],
  },
  {
    key: "government",
    label: "Government Grants & Contracts",
    helper: "Federal, state, local, county",
    color: "#10b981",
    subs: [
      { key: "federal", label: "Federal grants & contracts" },
      { key: "state", label: "State grants & contracts" },
      { key: "local", label: "Local / county / municipal" },
      { key: "unallocated", label: "Unallocated government" },
    ],
  },
  {
    key: "program_service",
    label: "Program Service Revenue",
    helper: "Tuition, fees-for-service, earned program income",
    color: "#0f172a",
    subs: [
      { key: "tuition_fees", label: "Tuition & class fees" },
      { key: "contracts", label: "Fee-for-service contracts" },
      { key: "tickets", label: "Tickets, admissions, performance fees" },
      { key: "memberships", label: "Memberships & subscriptions" },
      { key: "unallocated", label: "Other program service" },
    ],
  },
  {
    key: "investment",
    label: "Investment Income & Royalties",
    helper: "Interest, dividends, royalties",
    color: "#8b5cf6",
    subs: [
      { key: "interest_dividends", label: "Interest & dividends" },
      { key: "royalties", label: "Royalties" },
    ],
  },
  {
    key: "rental",
    label: "Rental Income (net)",
    helper: "Net rental from real or personal property",
    color: "#f59e0b",
    subs: [{ key: "rental", label: "Rental income (net)" }],
  },
  {
    key: "fundraising",
    label: "Special Events (net) & Gaming",
    helper: "Galas, auctions, bingo net of expenses",
    color: "#ec4899",
    subs: [
      { key: "special_events", label: "Special events — galas, auctions, benefits (net)" },
      { key: "gaming", label: "Gaming — bingo, raffles (net)" },
    ],
  },
  {
    key: "sales_inventory",
    label: "Sales of Inventory (net)",
    helper: "Merchandise, publications, etc.",
    color: "#06b6d4",
    subs: [{ key: "sales_inventory", label: "Sales of inventory (net)" }],
  },
  {
    key: "other",
    label: "Other Revenue",
    helper: "Anything not captured above",
    color: "#94a3b8",
    subs: [{ key: "other", label: "Other revenue" }],
  },
];

// Flat map keyed by `${categoryKey}.${subKey}`.
type Revenue = Record<string, number>;

function subId(cat: CategoryKey, sub: string) {
  return `${cat}.${sub}`;
}
function parseSubId(id: string): { cat: CategoryKey; sub: string } {
  const [cat, sub] = id.split(".") as [CategoryKey, string];
  return { cat, sub };
}

const ALL_SUB_IDS: string[] = CATEGORIES.flatMap((c) => c.subs.map((s) => subId(c.key, s.key)));

const blankRevenue = (): Revenue =>
  Object.fromEntries(ALL_SUB_IDS.map((id) => [id, 0])) as Revenue;

/** Map filed 990 revenue lines onto this worksheet's category/sub-source grid. */
function fromRevenueLines(r: RevenueLines): Revenue {
  const rev = blankRevenue();
  // Part VIII has no breakdown of contribution sub-sources — drop into "unallocated".
  const nonGov = Math.max(0, r.contributions_gifts_grants - r.government_grants);
  rev[subId("contributions", "unallocated")] = nonGov;
  rev[subId("government", "unallocated")] = r.government_grants;
  rev[subId("program_service", "unallocated")] = r.program_service_revenue;
  rev[subId("investment", "interest_dividends")] = r.investment_income;
  rev[subId("investment", "royalties")] = r.royalties;
  rev[subId("rental", "rental")] = r.rental_income_net;
  rev[subId("fundraising", "special_events")] = r.net_fundraising;
  rev[subId("fundraising", "gaming")] = r.net_gaming;
  rev[subId("sales_inventory", "sales_inventory")] = r.net_sales_inventory;
  rev[subId("other", "other")] = r.other_revenue;
  return rev;
}

// --- Follow-up questions (data-aware) ----------------------------------------

const FOLLOWUPS = [
  { id: "f1", prompt: "We can name our top 3 funders and the renewal date of each grant." },
  { id: "f2", prompt: "We have multi-year (2+ year) commitments from at least 3 funders." },
  { id: "f3", prompt: "We have a written revenue diversification plan with concrete targets." },
  { id: "f4", prompt: "We model revenue scenarios (best/base/worst) at least annually." },
  { id: "f5", prompt: "We could weather the loss of our largest funder for 12 months without cutting programs." },
  { id: "f6", prompt: "We have grown earned/program-service revenue year over year." },
  { id: "f7", prompt: "Individual giving has grown faster than expense growth over the last 3 years." },
  { id: "f8", prompt: "Our board is actively engaged in opening doors to new funding relationships." },
];

// --- HHI math ---------------------------------------------------------------

type SubShare = { id: string; cat: CategoryKey; sub: string; amount: number; share: number };
type CatShare = { key: CategoryKey; amount: number; share: number };

function computeHhi(rev: Revenue) {
  const total = Object.values(rev).reduce((a, b) => a + b, 0);
  if (total <= 0) {
    return {
      total: 0,
      subHhi: 0,
      catHhi: 0,
      subShares: [] as SubShare[],
      catShares: [] as CatShare[],
      top3: 0,
    };
  }

  const subShares: SubShare[] = ALL_SUB_IDS.map((id) => {
    const { cat, sub } = parseSubId(id);
    const amount = rev[id] || 0;
    return { id, cat, sub, amount, share: amount / total };
  }).sort((a, b) => b.amount - a.amount);

  const subHhi = subShares.reduce((acc, s) => acc + s.share * s.share, 0);

  const catShares: CatShare[] = CATEGORIES.map((c) => {
    const amount = c.subs.reduce((acc, s) => acc + (rev[subId(c.key, s.key)] || 0), 0);
    return { key: c.key, amount, share: amount / total };
  }).sort((a, b) => b.amount - a.amount);

  const catHhi = catShares.reduce((acc, s) => acc + s.share * s.share, 0);
  const top3 = catShares.slice(0, 3).reduce((a, b) => a + b.share, 0);

  return { total, subHhi, catHhi, subShares, catShares, top3 };
}

function hhiBand(hhi: number) {
  if (hhi < 0.15) return { label: "Highly Diversified", tone: "Excellent — no single source dominates.", color: "#10b981" };
  if (hhi < 0.25) return { label: "Well Diversified", tone: "Healthy mix. Maintain and deepen relationships.", color: "#10b981" };
  if (hhi < 0.40) return { label: "Moderately Concentrated", tone: "Acceptable but watch top 2 funders closely.", color: "#f59e0b" };
  if (hhi < 0.60) return { label: "Highly Concentrated", tone: "Material risk if a top funder churns. Diversify within 12 months.", color: "#f97316" };
  return { label: "Critical Concentration", tone: "Existential risk. Prioritize diversification immediately.", color: "#dc2626" };
}

// --- Component --------------------------------------------------------------

type Phase = "intake" | "review" | "questions" | "results";

function HhiAssessment() {
  const { orgId } = useCurrentOrg();
  const [phase, setPhase] = useState<Phase>("intake");
  // Revenue figures now arrive from the tax filing captured once in
  // Legal & Registration, rather than being re-entered here.
  const [filing, setFiling] = useState<TaxFiling | null>(null);
  const [filingLoading, setFilingLoading] = useState(true);
  const [revenue, setRevenue] = useState<Revenue>(blankRevenue);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState<Record<CategoryKey, boolean>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.key, true])) as Record<CategoryKey, boolean>,
  );

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setFilingLoading(true);
    loadLatestTaxFiling(orgId)
      .then((f) => {
        if (!cancelled) setFiling(f);
      })
      .catch(() => {
        /* the page still works without a filing */
      })
      .finally(() => {
        if (!cancelled) setFilingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const calc = useMemo(() => computeHhi(revenue), [revenue]);
  const band = hhiBand(calc.subHhi);
  const catBand = hhiBand(calc.catHhi);

  // Helpers
  const catTotal = (cat: CategoryKey) =>
    CATEGORIES.find((c) => c.key === cat)!.subs.reduce(
      (acc, s) => acc + (revenue[subId(cat, s.key)] || 0),
      0,
    );

  const prefillFromFiling = (f: TaxFiling) => {
    setRevenue(fromRevenueLines(f.revenue_lines));
    setPhase("review");
    toast.success(`Loaded your ${f.tax_year} ${f.form_type}. Split the unallocated lines for a sharper HHI.`);
  };

  // ---------- PHASE 1: Intake ----------
  if (phase === "intake") {
    return (
      <AppShell
        title="Revenue Diversity"
        subtitle="Score your concentration risk using the Herfindahl-Hirschman Index. Lower is better."
        actions={<span className="text-xs italic text-slate-400">~12 min • Save & resume anytime</span>}
      >
        <SectionCard padding="p-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Step 1 of 3 · Bring your numbers</span>
          <h2 className="text-3xl font-serif italic mt-3 leading-tight max-w-2xl">
            HHI is only as honest as the numbers behind it.
          </h2>
          <p className="text-sm text-slate-500 mt-3 max-w-xl">
            Your revenue figures live in Legal &amp; Registration on the Organization Profile —
            entered once from a tax form or by hand, then reused by every module that needs them.
          </p>

          {filingLoading ? (
            <p className="text-sm text-slate-400 mt-8">Looking for your filed figures…</p>
          ) : filing ? (
            <div className="mt-8 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-7">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <div className="size-11 rounded-xl bg-brand-deep text-white flex items-center justify-center">
                  <FileText className="size-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="size-3" /> On file
                </span>
              </div>
              <h3 className="font-serif italic text-xl">
                Your {filing.tax_year} {filing.form_type}
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(filing.total_revenue)}{" "}
                in total revenue. We'll prefill the worksheet — you then split contributions,
                government, and program revenue into sub-sources.
              </p>
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <PrimaryButton onClick={() => prefillFromFiling(filing)}>
                  Use these figures <ChevronRight className="size-3.5 inline -mt-0.5" />
                </PrimaryButton>
                <Link
                  to="/profile"
                  className="text-sm font-medium text-brand-primary hover:underline"
                >
                  Update the filing
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-slate-200 p-7">
              <div className="size-11 rounded-xl bg-white border border-slate-200 text-brand-deep flex items-center justify-center mb-5">
                <FileText className="size-5" />
              </div>
              <h3 className="font-serif italic text-xl">No revenue figures on file yet</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-xl">
                Add your most recent Form 990 (or type the categories in by hand) under Legal &amp;
                Registration. It takes about five minutes and prefills Funding Gap, Scenario
                Modeling, and Program Cost Allocation at the same time.
              </p>
              <div className="flex items-center gap-3 mt-6 flex-wrap">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90"
                >
                  Go to Legal &amp; Registration <ChevronRight className="size-3.5" />
                </Link>
                <button
                  onClick={() => {
                    setRevenue(blankRevenue());
                    setPhase("review");
                  }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Start from a blank worksheet instead
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-100">
            <AlertTriangle className="size-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span>
              Sub-source breakdowns (individual vs. corporate, federal vs. state) aren't reported on
              the 990 — you'll split those yourself in the next step.
            </span>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  // ---------- PHASE 2: Review revenue ----------
  if (phase === "review") {
    return (
      <AppShell
        title="Revenue Diversity"
        subtitle="Step 2 · Confirm your revenue mix and split each category into sub-sources"
        actions={
          <GhostButton onClick={() => setPhase("intake")}>
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Back
          </GhostButton>
        }
      >
        {filing && (
          <div className="bg-brand-deep text-white rounded-xl p-5 mb-6 flex items-center gap-4">
            <div className="size-9 rounded-lg bg-brand-accent/20 text-brand-accent flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Prefilled from your {filing.tax_year} {filing.form_type}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {[
                  filing.filed_organization_name,
                  filing.filed_ein && `EIN ${filing.filed_ein}`,
                  filing.fiscal_year_end && `FY end ${filing.fiscal_year_end}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Edit any numbers that look off below."}
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Editable</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SectionCard
              title="Revenue by source"
              subtitle="Expand a category to break it into sub-sources. Granular splits = more accurate HHI."
            >
              <div className="space-y-3">
                {CATEGORIES.map((c) => {
                  const total = catTotal(c.key);
                  const pctOfRev = calc.total > 0 ? (total / calc.total) * 100 : 0;
                  const unallocSub = c.subs.find((s) => s.key === "unallocated");
                  const unallocAmt = unallocSub ? revenue[subId(c.key, "unallocated")] || 0 : 0;
                  const isOpen = expanded[c.key];
                  return (
                    <div key={c.key} className="rounded-xl border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => setExpanded({ ...expanded, [c.key]: !isOpen })}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-slate-50/60 hover:bg-slate-50 transition-colors text-left"
                      >
                        <ChevronDown
                          className={`size-4 text-slate-400 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        />
                        <span className="size-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{c.label}</p>
                          <p className="text-xs text-slate-400">{c.helper}</p>
                        </div>
                        {unallocAmt > 0 && c.subs.length > 1 && (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                            <Info className="size-3" /> Needs split
                          </span>
                        )}
                        <span className="text-xs text-slate-400 tabular-nums w-12 text-right">
                          {pctOfRev > 0 ? `${pctOfRev.toFixed(0)}%` : "—"}
                        </span>
                        <span className="text-sm font-medium text-slate-700 tabular-nums w-28 text-right">
                          ${total.toLocaleString()}
                        </span>
                      </button>

                      {isOpen && (
                        <ul className="divide-y divide-slate-100 px-4">
                          {c.subs.map((s) => {
                            const id = subId(c.key, s.key);
                            const isUnalloc = s.key === "unallocated";
                            return (
                              <li key={s.key} className="py-2.5 flex items-center gap-3 pl-8">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm ${isUnalloc ? "text-amber-700" : "text-slate-700"}`}>
                                    {s.label}
                                  </p>
                                  {s.helper && <p className="text-[11px] text-slate-400">{s.helper}</p>}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 text-sm">$</span>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={revenue[id] || ""}
                                    onChange={(e) =>
                                      setRevenue({
                                        ...revenue,
                                        [id]: Math.max(0, Number(e.target.value) || 0),
                                      })
                                    }
                                    placeholder="0"
                                    className={`w-32 text-right tabular-nums px-3 py-1.5 rounded-lg border outline-none text-sm focus:ring-1 ${
                                      isUnalloc && (revenue[id] || 0) > 0
                                        ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-500"
                                        : "border-slate-200 focus:border-brand-primary focus:ring-brand-primary"
                                    }`}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}

                <div className="flex items-center justify-between pt-2 border-t-2 border-slate-200">
                  <span className="text-sm font-bold text-slate-700">Total revenue</span>
                  <span className="text-lg font-serif tabular-nums">${calc.total.toLocaleString()}</span>
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <div className="bg-brand-deep text-white rounded-2xl p-6 relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">Live HHI · sub-source</span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-5xl font-serif">{calc.total > 0 ? calc.subHhi.toFixed(2) : "—"}</span>
              </div>
              <p className="text-sm font-serif italic mt-2" style={{ color: band.color }}>
                {calc.total > 0 ? band.label : "Enter your revenue"}
              </p>
              <p className="text-xs text-slate-400 mt-2">{calc.total > 0 ? band.tone : "HHI updates as you type."}</p>
              <div className="mt-5 pt-4 border-t border-white/10 text-xs text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Category-level HHI</span>
                  <span className="text-white tabular-nums">{calc.total > 0 ? calc.catHhi.toFixed(2) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Top 3 categories</span>
                  <span className="text-white tabular-nums">{calc.total > 0 ? `${(calc.top3 * 100).toFixed(0)}%` : "—"}</span>
                </div>
              </div>
            </div>

            {calc.total > 0 && (
              <SectionCard title="Revenue mix">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie
                        data={calc.catShares.filter((s) => s.amount > 0)}
                        dataKey="amount"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {calc.catShares.map((s) => (
                          <Cell key={s.key} fill={CATEGORIES.find((c) => c.key === s.key)?.color} />
                        ))}
                      </Pie>
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="text-xs space-y-1.5 mt-3">
                  {calc.subShares
                    .filter((s) => s.amount > 0)
                    .slice(0, 5)
                    .map((s) => {
                      const cat = CATEGORIES.find((c) => c.key === s.cat)!;
                      const sub = cat.subs.find((x) => x.key === s.sub)!;
                      return (
                        <li key={s.id} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-slate-600 truncate">
                            <span className="size-2 rounded-full shrink-0" style={{ background: cat.color }} />
                            <span className="truncate">{sub.label}</span>
                          </span>
                          <span className="tabular-nums text-slate-500">{(s.share * 100).toFixed(0)}%</span>
                        </li>
                      );
                    })}
                </ul>
              </SectionCard>
            )}
          </div>
        </div>

        {filing && filing.top_contributors.length > 0 && (
          <SectionCard title="Top contributors (from Schedule B)" subtitle="Helpful context — not used directly in HHI.">
            <ul className="divide-y divide-slate-100">
              {filing.top_contributors.map((c, i) => (
                <li key={i} className="py-2 flex justify-between text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="tabular-nums text-slate-500">${c.amount.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <div className="flex justify-end mt-6">
          <PrimaryButton
            onClick={() => {
              if (calc.total <= 0) {
                toast.error("Enter at least one revenue line to continue.");
                return;
              }
              setPhase("questions");
              setStep(0);
            }}
          >
            Continue to questions <ChevronRight className="size-3.5 inline -mt-0.5" />
          </PrimaryButton>
        </div>
      </AppShell>
    );
  }

  // ---------- PHASE 3: Follow-up questions ----------
  if (phase === "questions") {
    const total = FOLLOWUPS.length;
    const q = FOLLOWUPS[step];
    const value = answers[q.id];
    const pct = Math.round((Object.keys(answers).length / total) * 100);

    return (
      <AppShell
        title="Revenue Diversity"
        subtitle="Step 3 · Diversification practices"
        actions={
          <GhostButton onClick={() => setPhase("review")}>
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Edit numbers
          </GhostButton>
        }
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6 flex items-center gap-4 text-xs flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your data</span>
          <span className="text-slate-600">Total revenue <span className="font-medium text-slate-800 tabular-nums">${calc.total.toLocaleString()}</span></span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600">Sub HHI <span className="font-medium" style={{ color: band.color }}>{calc.subHhi.toFixed(2)} ({band.label})</span></span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-600">Top source <span className="font-medium text-slate-800 tabular-nums">{(calc.subShares[0]?.share * 100 || 0).toFixed(0)}%</span></span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-medium text-slate-600 italic">Question {step + 1} of {total}</span>
            <span className="font-medium text-slate-500">{pct}% complete</span>
          </div>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <SectionCard padding="p-10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">Follow-up</span>
          <h2 className="text-3xl font-serif italic mt-3 leading-tight max-w-2xl">{q.prompt}</h2>

          <div className="mt-10">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              <span>Strongly disagree</span>
              <span>Strongly agree</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setAnswers({ ...answers, [q.id]: n })}
                  className={`py-6 rounded-xl border text-2xl font-serif transition-all ${
                    value === n
                      ? "bg-brand-deep text-white border-brand-deep shadow-md"
                      : "border-slate-200 text-slate-600 hover:border-brand-primary/40 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-10">
            <GhostButton onClick={() => setStep(Math.max(0, step - 1))}>
              <ChevronLeft className="size-3.5 inline -mt-0.5" /> Previous
            </GhostButton>
            {step === total - 1 ? (
              <PrimaryButton onClick={() => setPhase("results")}>Finish & view results</PrimaryButton>
            ) : (
              <PrimaryButton onClick={() => setStep(Math.min(total - 1, step + 1))}>
                Next <ChevronRight className="size-3.5 inline -mt-0.5" />
              </PrimaryButton>
            )}
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  // ---------- PHASE 4: Results ----------
  const practiceScore = Math.round(
    (Object.values(answers).reduce((a, b) => a + b, 0) / (FOLLOWUPS.length * 5)) * 100,
  );
  // Composite uses sub-level HHI (the more honest read).
  const structural = Math.round((1 - Math.min(calc.subHhi, 1)) * 100);
  const composite = Math.round(structural * 0.6 + practiceScore * 0.4);

  const topSub = calc.subShares[0];
  const topCat = calc.catShares[0];
  const topSubCat = topSub ? CATEGORIES.find((c) => c.key === topSub.cat)! : null;
  const topSubLabel = topSub && topSubCat
    ? topSubCat.subs.find((s) => s.key === topSub.sub)?.label
    : null;

  const advice: string[] = [];
  if (calc.subHhi >= 0.4) advice.push("Set a 24-month target to drop sub-source HHI below 0.30 — make diversification a board priority.");
  if (topSub && topSub.share > 0.3 && topSubLabel) advice.push(`Reduce dependency on ${topSubLabel} — currently ${(topSub.share * 100).toFixed(0)}% of revenue.`);
  // Detect a single sub-source dominating its category (concentration WITHIN a category)
  for (const c of CATEGORIES) {
    const total = catTotal(c.key);
    if (total <= 0 || c.subs.length < 2) continue;
    const subs = c.subs
      .map((s) => ({ s, amt: revenue[subId(c.key, s.key)] || 0 }))
      .filter((x) => x.amt > 0)
      .sort((a, b) => b.amt - a.amt);
    if (subs.length > 0 && subs[0].amt / total > 0.8 && subs[0].s.key !== "unallocated") {
      advice.push(`Within ${c.label}, ${subs[0].s.label} is ${((subs[0].amt / total) * 100).toFixed(0)}% — broaden the mix inside this category.`);
    }
  }
  const psTotal = catTotal("program_service");
  if (psTotal / Math.max(calc.total, 1) < 0.15) advice.push("Earned/program revenue is under 15% — explore fee-for-service or contract lines.");
  if ((answers.f5 ?? 0) <= 2) advice.push("Build an operating reserve sufficient to absorb 12 months of your largest funder's exit.");
  if ((answers.f3 ?? 0) <= 2) advice.push("Codify a written diversification plan with named owners and quarterly check-ins.");
  // Unallocated buckets nag
  const unallocCats = CATEGORIES.filter(
    (c) => c.subs.some((s) => s.key === "unallocated") && (revenue[subId(c.key, "unallocated")] || 0) > 0,
  );
  if (unallocCats.length > 0) {
    advice.push(`Split unallocated lines in ${unallocCats.map((c) => c.label.split(" ")[0]).join(", ")} for a more accurate HHI.`);
  }
  if (advice.length === 0) advice.push("Maintain discipline. Stress-test annually and mentor a peer organization on what's working.");

  if (calc.total <= 0) {
    return (
      <AppShell title="Revenue Diversity — Results" subtitle="HHI needs revenue to score.">
        <SectionCard padding="p-10">
          <div className="text-center">
            <h3 className="text-xl font-serif italic text-slate-800">No revenue entered yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              HHI is computed from your revenue mix. Go back to step 2 and enter the dollar amounts for at least one category — you don't need a Form 990 or a full year of data to begin.
            </p>
            <PrimaryButton onClick={() => setPhase("review")} className="mt-5">
              ← Enter revenue
            </PrimaryButton>
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell title="Revenue Diversity — Results" subtitle="Composite score across structure and practices.">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-brand-deep text-white rounded-2xl p-8 lg:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-brand-primary/20 to-transparent pointer-events-none" />
          <div className="relative">
            <span className="bg-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">HHI</span>
            <div className="grid grid-cols-3 gap-6 mt-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sub-source HHI</p>
                <p className="text-5xl font-serif mt-1" style={{ color: band.color }}>{calc.subHhi.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1 font-serif italic">{band.label}</p>
                <p className="text-[10px] text-slate-500 mt-2">Category HHI <span className="tabular-nums text-slate-300">{calc.catHhi.toFixed(2)}</span> · <span style={{ color: catBand.color }}>{catBand.label}</span></p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Top sub-source</p>
                <p className="text-5xl font-serif mt-1">{(topSub?.share * 100 || 0).toFixed(0)}<span className="text-2xl text-slate-400">%</span></p>
                <p className="text-xs text-slate-400 mt-1 truncate">{topSubLabel ?? "—"}</p>
                <p className="text-[10px] text-slate-500 mt-2">Top category <span className="tabular-nums text-slate-300">{((topCat?.share ?? 0) * 100).toFixed(0)}%</span> · {CATEGORIES.find((c) => c.key === topCat?.key)?.label}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Composite</p>
                <p className="text-5xl font-serif mt-1">{composite}<span className="text-2xl text-slate-400">/100</span></p>
                <p className="text-xs text-slate-400 mt-1">Structure 60% · Practices 40%</p>
              </div>
            </div>
            <p className="text-slate-400 mt-6 max-w-md text-sm">{band.tone}</p>
          </div>
        </div>
        <SectionCard title="Recommended next steps">
          <ul className="space-y-3">
            {advice.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-slate-700">
                <CheckCircle2 className="size-4 text-brand-accent shrink-0 mt-0.5" /> {a}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Revenue mix"
        subtitle={`Total: $${calc.total.toLocaleString()} · ${calc.subShares.filter((s) => s.amount > 0).length} active sub-sources across ${calc.catShares.filter((s) => s.amount > 0).length} categories`}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RPieChart>
                <Pie data={calc.catShares.filter((s) => s.amount > 0)} dataKey="amount" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {calc.catShares.map((s) => (
                    <Cell key={s.key} fill={CATEGORIES.find((c) => c.key === s.key)?.color} />
                  ))}
                </Pie>
              </RPieChart>
            </ResponsiveContainer>
          </div>
          <ul className="text-sm space-y-3">
            {calc.catShares.filter((s) => s.amount > 0).map((s) => {
              const cat = CATEGORIES.find((c) => c.key === s.key)!;
              const pct = s.share * 100;
              const subs = cat.subs
                .map((sb) => ({ sb, amt: revenue[subId(cat.key, sb.key)] || 0 }))
                .filter((x) => x.amt > 0)
                .sort((a, b) => b.amt - a.amt);
              return (
                <li key={s.key}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: cat.color }} />
                      {cat.label}
                    </span>
                    <span className="text-slate-500 tabular-nums">{pct.toFixed(0)}% · ${(s.amount / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full" style={{ width: `${pct}%`, background: cat.color }} />
                  </div>
                  {subs.length > 1 && (
                    <ul className="ml-4 mt-1 space-y-0.5">
                      {subs.map(({ sb, amt }) => {
                        const subPct = (amt / s.amount) * 100;
                        return (
                          <li key={sb.key} className="flex items-baseline justify-between text-[11px] text-slate-500">
                            <span className="truncate pr-2">↳ {sb.label}</span>
                            <span className="tabular-nums shrink-0">{subPct.toFixed(0)}% · ${(amt / 1000).toFixed(0)}k</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </SectionCard>

      <SectionCard title="Practice answers">
        <ul className="divide-y divide-slate-100">
          {FOLLOWUPS.map((q, i) => (
            <li key={q.id} className="py-3 flex items-start gap-4">
              <span className="text-xs font-bold text-slate-400 w-6 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <p className="text-sm text-slate-700 flex-1">{q.prompt}</p>
              <span className="text-sm font-medium text-brand-primary tabular-nums w-8 text-right">{answers[q.id] ?? "—"}/5</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            setPhase("intake");
            setRevenue(blankRevenue());
            setAnswers({});
            setStep(0);
          }}
          className="mt-6 text-xs font-medium text-brand-primary hover:underline"
        >
          Retake assessment
        </button>
      </SectionCard>
    </AppShell>
  );
}
