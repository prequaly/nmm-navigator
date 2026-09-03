import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, SectionCard, PrimaryButton } from "@/components/app-shell/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { ORG } from "@/lib/mock/riverside";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Organization Profile — NMM Navigator" }] }),
  component: ProfilePage,
});

const STAGE_OPTIONS = [
  { value: "exploring", label: "Exploring or planning a new nonprofit" },
  { value: "new_launch", label: "Recently launched, building our foundation" },
  { value: "early_stage", label: "Operating, but still early-stage" },
  { value: "established", label: "Established organization" },
  {
    value: "established_transforming",
    label: "Established, preparing for significant growth or transformation",
  },
] as const;

type OrgRow = {
  id?: string;
  name: string;
  mission: string;
  vision: string;
  values: string;
  annual_budget: number | "";
  staff_count: number | "";
  volunteer_count: number | "";
  geographic_area: string;
  beneficiaries: string;
  long_term_goals: string;
  stage: string;
  ein: string;
  tax_status: string;
  fiscal_sponsor_name: string;
  year_founded: number | "";
};

function ProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<OrgRow>({
    name: ORG.name,
    mission: ORG.mission,
    vision: ORG.vision,
    values: ORG.values.join(", "),
    annual_budget: ORG.annualBudget,
    staff_count: ORG.staff,
    volunteer_count: ORG.volunteers,
    geographic_area: ORG.geo,
    beneficiaries: ORG.beneficiaries,
    long_term_goals: ORG.longTermGoals.join("\n"),
    stage: "",
    ein: "",
    tax_status: "",
    fiscal_sponsor_name: "",
    year_founded: "",
  });
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Load the user's first org if it exists.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .limit(1);
      const orgIdLocal = memberships?.[0]?.organization_id;
      if (!orgIdLocal) return;
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgIdLocal)
        .maybeSingle();
      if (!org) return;
      setOrgId(org.id);
      setForm({
        name: org.name,
        mission: org.mission ?? "",
        vision: org.vision ?? "",
        values: org.values ?? "",
        annual_budget: org.annual_budget ?? "",
        staff_count: org.staff_count ?? "",
        volunteer_count: org.volunteer_count ?? "",
        geographic_area: org.geographic_area ?? "",
        beneficiaries: org.beneficiaries ?? "",
        long_term_goals: org.long_term_goals ?? "",
        stage: org.stage ?? "",
        ein: org.ein ?? "",
        tax_status: org.tax_status ?? "",
        fiscal_sponsor_name: org.fiscal_sponsor_name ?? "",
        year_founded: org.year_founded ?? "",
      });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const payload = {
        name: form.name,
        mission: form.mission || null,
        vision: form.vision || null,
        values: form.values || null,
        annual_budget: form.annual_budget === "" ? null : Number(form.annual_budget),
        staff_count: form.staff_count === "" ? null : Number(form.staff_count),
        volunteer_count: form.volunteer_count === "" ? null : Number(form.volunteer_count),
        geographic_area: form.geographic_area || null,
        beneficiaries: form.beneficiaries || null,
        long_term_goals: form.long_term_goals || null,
        stage: form.stage || null,
        ein: form.ein || null,
        tax_status: form.tax_status || null,
        fiscal_sponsor_name: form.fiscal_sponsor_name || null,
        year_founded: form.year_founded === "" ? null : Number(form.year_founded),
      };
      if (orgId) {
        const { error } = await supabase.from("organizations").update(payload).eq("id", orgId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("organizations")
          .insert({ ...payload, created_by: user.id })
          .select()
          .single();
        if (error) throw error;
        // Owner membership is created server-side by the
        // ensure_organization_creator_owner trigger (SECURITY DEFINER) —
        // no client-side insert into organization_members is needed, and
        // the RLS policy that allowed it was removed as a security fix.
        setOrgId(created.id);
      }
      toast.success("Organization profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof OrgRow,
    type: "text" | "textarea" | "number" = "text",
  ) => (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      {type === "textarea" ? (
        <textarea
          rows={3}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
      ) : (
        <input
          type={type}
          value={form[key] as string | number}
          onChange={(e) =>
            setForm({
              ...form,
              [key]:
                type === "number"
                  ? e.target.value === ""
                    ? ""
                    : Number(e.target.value)
                  : e.target.value,
            })
          }
          className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
        />
      )}
    </label>
  );

  return (
    <AppShell
      title="Organization Profile"
      subtitle="The single source of truth for every other module — mission, capacity, audience, and long-term goals."
      actions={
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </PrimaryButton>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Identity" subtitle="What you do and why" className="lg:col-span-2">
          <div className="grid gap-5">
            {field("Organization name", "name")}
            {field("Mission", "mission", "textarea")}
            {field("Vision", "vision", "textarea")}
            {field("Core values (comma-separated)", "values")}
          </div>
        </SectionCard>

        <SectionCard title="Capacity" subtitle="Size & financial scale">
          <div className="grid gap-5">
            {field("Annual budget ($)", "annual_budget", "number")}
            {field("Staff (FTE)", "staff_count", "number")}
            {field("Active volunteers", "volunteer_count", "number")}
          </div>
        </SectionCard>

        <SectionCard
          title="Reach"
          subtitle="Where you operate and who you serve"
          className="lg:col-span-2"
        >
          <div className="grid gap-5">
            {field("Geographic service area", "geographic_area")}
            {field("Beneficiaries", "beneficiaries", "textarea")}
          </div>
        </SectionCard>

        <SectionCard title="Direction" subtitle="3–5 year goals">
          {field("Long-term goals (one per line)", "long_term_goals", "textarea")}
        </SectionCard>

        <SectionCard
          title="Legal & Registration"
          subtitle="Drives which assessment questions and defaults apply"
          className="lg:col-span-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Organizational stage
              </span>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              >
                <option value="">Not set</option>
                {STAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {field("Year founded", "year_founded", "number")}
            {field("EIN", "ein")}
            {field("Tax status", "tax_status")}
            {field("Fiscal sponsor (if applicable)", "fiscal_sponsor_name")}
          </div>
        </SectionCard>

        <SectionCard
          title="Setup wizard"
          subtitle="Re-run the guided onboarding flow"
          className="lg:col-span-3"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-600 max-w-xl">
              Walk through the 4-step welcome wizard again — organization basics, core values,
              health check, and your first strategic priority. Your existing data won't be deleted.
            </p>
            <button
              onClick={async () => {
                if (!orgId) {
                  toast.error("Save your org profile first");
                  return;
                }
                if (!confirm("Re-run the setup wizard?")) return;
                const { error } = await supabase
                  .from("organizations")
                  .update({ onboarded_at: null })
                  .eq("id", orgId);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                navigate({ to: "/onboarding" });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 shrink-0"
            >
              <Sparkles className="size-4" /> Re-run setup
            </button>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
