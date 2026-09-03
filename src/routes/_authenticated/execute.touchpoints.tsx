import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  SectionCard,
  GhostButton,
  PrimaryButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import {
  Heart,
  HandHeart,
  Mail,
  Phone,
  Gift,
  Coffee,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execute/touchpoints")({
  head: () => ({ meta: [{ title: "Donor & Volunteer Touchpoints — NMM Navigator" }] }),
  component: TouchpointsCalendar,
});

type Audience = "donor" | "volunteer" | "both";
type Channel = "email" | "call" | "in_person" | "gift" | "event" | "recognition";

type Touchpoint = {
  id: string;
  title: string;
  audience: Audience;
  channel: Channel;
  segment: string | null;
  owner: string | null;
  scheduled_date: string; // YYYY-MM-DD
  note: string | null;
};

const AUDIENCE_STYLE: Record<Audience, { label: string; chip: string; dot: string }> = {
  donor: {
    label: "Donor",
    chip: "bg-brand-accent/15 text-brand-accent border-brand-accent/30",
    dot: "bg-brand-accent",
  },
  volunteer: {
    label: "Volunteer",
    chip: "bg-brand-primary/15 text-brand-primary border-brand-primary/30",
    dot: "bg-brand-primary",
  },
  both: {
    label: "Both",
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
};

const CHANNEL_ICON: Record<Channel, { icon: typeof Mail; label: string }> = {
  email: { icon: Mail, label: "Email" },
  call: { icon: Phone, label: "Call" },
  in_person: { icon: Coffee, label: "In person" },
  gift: { icon: Gift, label: "Gift / handwritten" },
  event: { icon: Users, label: "Event" },
  recognition: { icon: Award, label: "Recognition" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function TouchpointsCalendar() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [items, setItems] = useState<Touchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Audience>("all");
  const [showForm, setShowForm] = useState(false);
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("touchpoints")
      .select("id,title,audience,channel,segment,owner,scheduled_date,note")
      .eq("organization_id", orgId)
      .order("scheduled_date", { ascending: true });
    if (error) toast.error(error.message);
    setItems((data as Touchpoint[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function remove(id: string) {
    const { error } = await supabase.from("touchpoints").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  const monthItems = useMemo(
    () =>
      items.filter((t) => {
        const d = new Date(t.scheduled_date + "T00:00:00");
        return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
      }),
    [items, cursor],
  );
  const filtered = useMemo(
    () =>
      filter === "all"
        ? monthItems
        : monthItems.filter((t) => t.audience === filter || t.audience === "both"),
    [filter, monthItems],
  );
  const byDay = useMemo(() => {
    const m: Record<number, Touchpoint[]> = {};
    for (const t of filtered) {
      const day = new Date(t.scheduled_date + "T00:00:00").getDate();
      (m[day] ||= []).push(t);
    }
    return m;
  }, [filtered]);

  const monthStart = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(monthStart).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const counts = useMemo(() => {
    const c = { donor: 0, volunteer: 0, both: 0 };
    for (const t of monthItems) c[t.audience]++;
    return c;
  }, [monthItems]);

  const upcoming = filtered
    .slice()
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 6);
  const ready = !orgLoading && !loading;

  return (
    <AppShell
      title="Donor & Volunteer Touchpoints"
      subtitle="A deliberate cadence of cultivation, stewardship, and appreciation."
      actions={
        <>
          <GhostButton
            onClick={() =>
              setCursor((c) =>
                c.month === 0
                  ? { year: c.year - 1, month: 11 }
                  : { year: c.year, month: c.month - 1 },
              )
            }
          >
            <ChevronLeft className="size-3.5 inline -mt-0.5" /> Prev
          </GhostButton>
          <GhostButton
            onClick={() =>
              setCursor((c) =>
                c.month === 11
                  ? { year: c.year + 1, month: 0 }
                  : { year: c.year, month: c.month + 1 },
              )
            }
          >
            Next <ChevronRight className="size-3.5 inline -mt-0.5" />
          </GhostButton>
          <PrimaryButton onClick={() => setShowForm((s) => !s)} disabled={!ready}>
            {showForm ? "Close" : "+ Touchpoint"}
          </PrimaryButton>
        </>
      }
    >
      {!ready && <p className="text-sm text-slate-500 py-12 text-center">Loading…</p>}

      {ready && showForm && (
        <NewTouchpointForm
          orgId={orgId!}
          defaultDate={new Date(cursor.year, cursor.month, 1).toISOString().slice(0, 10)}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {ready && !showForm && items.length === 0 && (
        <EmptyState
          icon={Heart}
          title="No touchpoints planned yet"
          description="Design your monthly cadence of donor and volunteer moments — calls, notes, gifts, events, and recognition."
          action={<PrimaryButton onClick={() => setShowForm(true)}>+ Add touchpoint</PrimaryButton>}
        />
      )}

      {ready && !showForm && items.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-slate-700">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-brand-deep text-white rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                This month
              </span>
              <p className="text-4xl font-serif mt-2">{monthItems.length}</p>
              <p className="text-xs text-slate-400 mt-1">Planned touchpoints</p>
            </div>
            <StatCard label="Donor touches" value={counts.donor} tone="accent" icon={Heart} />
            <StatCard
              label="Volunteer touches"
              value={counts.volunteer}
              tone="primary"
              icon={HandHeart}
            />
            <StatCard label="Joint moments" value={counts.both} tone="violet" icon={Users} />
          </div>

          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {(["all", "donor", "volunteer", "both"] as const).map((k) => {
              const active = filter === k;
              const label = k === "all" ? "All audiences" : AUDIENCE_STYLE[k].label;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 rounded-full border font-medium transition-all ${
                    active
                      ? "bg-brand-deep text-white border-brand-deep"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
                  }`}
                >
                  {label}
                  {k !== "all" && (
                    <span
                      className={`ml-2 inline-block size-1.5 rounded-full align-middle ${AUDIENCE_STYLE[k].dot}`}
                    />
                  )}
                </button>
              );
            })}
            <span className="ml-auto text-slate-400 italic self-center">
              {filtered.length} showing
            </span>
          </div>

          <SectionCard padding="p-0">
            <div className="grid grid-cols-7 border-b border-slate-100">
              {DAYS.map((d) => (
                <div
                  key={d}
                  className="px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => (
                <div
                  key={i}
                  className="min-h-[120px] border-r border-b border-slate-100 p-2 last:border-r-0"
                >
                  {day && (
                    <>
                      <div className="text-xs font-medium text-slate-500 mb-1">{day}</div>
                      <div className="space-y-1">
                        {(byDay[day] ?? []).map((t) => {
                          const Icon = CHANNEL_ICON[t.channel].icon;
                          const style = AUDIENCE_STYLE[t.audience];
                          return (
                            <div
                              key={t.id}
                              className={`text-[10px] font-medium px-2 py-1 rounded border flex items-center gap-1 group ${style.chip}`}
                              title={`${t.title} — ${CHANNEL_ICON[t.channel].label} · ${t.segment ?? ""} · ${t.owner ?? ""}`}
                            >
                              <Icon className="size-3 shrink-0" />
                              <span className="truncate flex-1">{t.title}</span>
                              <button
                                onClick={() => remove(t.id)}
                                className="opacity-0 group-hover:opacity-100 shrink-0"
                              >
                                <Trash2 className="size-2.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <SectionCard
              title="Next up"
              subtitle="Top of the queue by date"
              className="lg:col-span-2"
            >
              <ul className="divide-y divide-slate-100">
                {upcoming.map((t) => {
                  const Icon = CHANNEL_ICON[t.channel].icon;
                  const style = AUDIENCE_STYLE[t.audience];
                  const d = new Date(t.scheduled_date + "T00:00:00");
                  return (
                    <li key={t.id} className="py-3 flex items-start gap-4">
                      <div className="text-center w-12 shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                        </div>
                        <div className="text-2xl font-serif text-brand-deep tabular-nums">
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{t.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t.segment ?? "—"} · Owner: {t.owner ?? "—"}
                        </p>
                        {t.note && <p className="text-xs text-slate-400 italic mt-1">{t.note}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded-full ${style.chip}`}
                        >
                          {style.label}
                        </span>
                        <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                          <Icon className="size-3" /> {CHANNEL_ICON[t.channel].label}
                        </span>
                      </div>
                    </li>
                  );
                })}
                {upcoming.length === 0 && (
                  <li className="py-6 text-sm text-slate-400 text-center">
                    Nothing scheduled this month.
                  </li>
                )}
              </ul>
            </SectionCard>

            <SectionCard title="Cadence guidance" subtitle="Per supporter, per year">
              <ul className="space-y-3 text-sm">
                <CadenceRow
                  audience="donor"
                  label="Major donors ($10k+)"
                  target="12–18 touches/yr"
                  detail="At least 2 in-person, 4 calls, 6 personal notes"
                />
                <CadenceRow
                  audience="donor"
                  label="Mid-level ($1k–$10k)"
                  target="8–10 touches/yr"
                  detail="Quarterly call or note + 2 events"
                />
                <CadenceRow
                  audience="donor"
                  label="Sustainers / monthly"
                  target="6 touches/yr"
                  detail="Anniversary, impact moments, year-end"
                />
                <CadenceRow
                  audience="volunteer"
                  label="Active volunteers"
                  target="Monthly"
                  detail="Schedule, recognition, training, debrief"
                />
                <CadenceRow
                  audience="volunteer"
                  label="Team leads"
                  target="2x / month"
                  detail="1:1 + group; visible appreciation quarterly"
                />
                <CadenceRow
                  audience="both"
                  label="Crossover supporters"
                  target="Track in both lanes"
                  detail="Volunteers who give convert at 3x — steward intentionally"
                />
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "accent" | "primary" | "violet";
  icon: typeof Heart;
}) {
  const ring = {
    accent: "bg-brand-accent/10 text-brand-accent",
    primary: "bg-brand-primary/10 text-brand-primary",
    violet: "bg-violet-100 text-violet-600",
  }[tone];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`size-11 rounded-xl flex items-center justify-center ${ring}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-3xl font-serif text-brand-deep tabular-nums">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function CadenceRow({
  audience,
  label,
  target,
  detail,
}: {
  audience: Audience;
  label: string;
  target: string;
  detail: string;
}) {
  const style = AUDIENCE_STYLE[audience];
  return (
    <li className="flex items-start gap-3">
      <span className={`size-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="text-xs font-medium text-brand-primary tabular-nums shrink-0">
            {target}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{detail}</p>
      </div>
    </li>
  );
}

function NewTouchpointForm({
  orgId,
  defaultDate,
  onCreated,
  onCancel,
}: {
  orgId: string;
  defaultDate: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<Audience>("donor");
  const [channel, setChannel] = useState<Channel>("email");
  const [segment, setSegment] = useState("");
  const [owner, setOwner] = useState("");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledDate) return;
    setSaving(true);
    const { error } = await supabase.from("touchpoints").insert({
      organization_id: orgId,
      title: title.trim(),
      audience,
      channel,
      segment: segment.trim() || null,
      owner: owner.trim() || null,
      scheduled_date: scheduledDate,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Touchpoint added");
    onCreated();
  }

  return (
    <SectionCard title="New touchpoint" className="mb-6">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <label className="md:col-span-2 text-xs">
          <span className="block text-slate-500 mb-1">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Audience</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            <option value="donor">Donor</option>
            <option value="volunteer">Volunteer</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Channel</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          >
            {Object.entries(CHANNEL_ICON).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Date</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            required
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Segment</span>
          <input
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            placeholder="e.g. Major donors"
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="text-xs">
          <span className="block text-slate-500 mb-1">Owner</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <label className="md:col-span-6 text-xs">
          <span className="block text-slate-500 mb-1">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2"
          />
        </label>
        <div className="md:col-span-6 flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onCancel}>
            Cancel
          </GhostButton>
          <PrimaryButton type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save touchpoint"}
          </PrimaryButton>
        </div>
      </form>
    </SectionCard>
  );
}
