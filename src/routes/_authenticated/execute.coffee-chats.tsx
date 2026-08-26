import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AppShell,
  SectionCard,
  PrimaryButton,
  GhostButton,
  EmptyState,
} from "@/components/app-shell/AppShell";
import { Coffee, Plus, Trash2, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/execute/coffee-chats")({
  head: () => ({
    meta: [
      { title: "Coffee Chat Tracker — NMM Navigator" },
      {
        name: "description",
        content:
          "Track relationship-building coffee chats with volunteers, donors, and strategic partners. Aim for 5–10 per month.",
      },
    ],
  }),
  component: CoffeeChatTracker,
});

type ContactType = "volunteer" | "donor" | "partner" | "board" | "other";

type Chat = {
  id: string;
  contact_name: string;
  contact_type: ContactType;
  contact_org: string | null;
  chat_date: string;
  notes: string | null;
  next_step: string | null;
  follow_up_date: string | null;
  outcome: string | null;
};

const TYPE_TONE: Record<ContactType, string> = {
  volunteer: "bg-emerald-100 text-emerald-700",
  donor: "bg-rose-100 text-rose-700",
  partner: "bg-brand-primary/15 text-brand-primary",
  board: "bg-violet-100 text-violet-700",
  other: "bg-slate-100 text-slate-700",
};

const GOAL_MIN = 5;
const GOAL_MAX = 10;

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function CoffeeChatTracker() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState<ContactType>("donor");
  const [org, setOrg] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [followUp, setFollowUp] = useState("");

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("coffee_chats")
      .select(
        "id,contact_name,contact_type,contact_org,chat_date,notes,next_step,follow_up_date,outcome"
      )
      .eq("organization_id", orgId)
      .order("chat_date", { ascending: false });
    if (error) toast.error(error.message);
    setChats((data as Chat[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function addChat() {
    if (!orgId) return;
    if (!name.trim()) return toast.error("Add a contact name");
    const { data: session } = await supabase.auth.getUser();
    const { error } = await supabase.from("coffee_chats").insert({
      organization_id: orgId,
      created_by: session.user?.id ?? null,
      contact_name: name.trim(),
      contact_type: type,
      contact_org: org.trim() || null,
      chat_date: date,
      notes: notes.trim() || null,
      next_step: nextStep.trim() || null,
      follow_up_date: followUp || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Coffee chat logged ☕");
    setName("");
    setOrg("");
    setNotes("");
    setNextStep("");
    setFollowUp("");
    setShowForm(false);
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("coffee_chats").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setChats((prev) => prev.filter((c) => c.id !== id));
  }

  const thisMonth = currentMonthKey();
  const thisMonthChats = useMemo(
    () => chats.filter((c) => monthKey(c.chat_date) === thisMonth),
    [chats, thisMonth]
  );
  const count = thisMonthChats.length;
  const goalReached = count >= GOAL_MIN;
  const stretchReached = count >= GOAL_MAX;

  const followUps = useMemo(
    () =>
      chats
        .filter((c) => c.follow_up_date && new Date(c.follow_up_date) >= new Date(new Date().toDateString()))
        .sort((a, b) => (a.follow_up_date! < b.follow_up_date! ? -1 : 1))
        .slice(0, 5),
    [chats]
  );

  return (
    <AppShell title="Coffee Chat Tracker" subtitle="Aim for 5–10 relationship-building chats per month">
      <div className="space-y-6">
        <SectionCard>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-primary">
                <Coffee className="h-5 w-5" />
                <h1 className="text-2xl font-serif">Coffee Chat Tracker</h1>
              </div>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Relationships are the fuel of small nonprofits. Aim for{" "}
                <strong>{GOAL_MIN}–{GOAL_MAX} coffee chats per month</strong> with potential volunteers,
                donors, or strategic partners. One conversation at a time compounds into a durable network.
              </p>
            </div>
            <PrimaryButton onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4" /> Log coffee chat
            </PrimaryButton>
          </div>
        </SectionCard>

        {/* Coffee cup progress */}
        <SectionCard>
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-serif text-lg">This month's chats</h2>
            <div className="text-sm text-slate-500">
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: GOAL_MAX }).map((_, i) => {
              const filled = i < count;
              const isStretch = i >= GOAL_MIN;
              return (
                <CoffeeCup
                  key={i}
                  filled={filled}
                  stretch={isStretch}
                  index={i + 1}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-slate-700">
              {count} of {GOAL_MIN}–{GOAL_MAX} goal
            </span>
            {stretchReached ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                🏆 Stretch goal reached — legendary networker
              </span>
            ) : goalReached ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                ✅ Monthly goal reached — keep the momentum
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {GOAL_MIN - count} more to hit this month's goal
              </span>
            )}
          </div>
        </SectionCard>

        {showForm && (
          <SectionCard>
            <h2 className="font-serif text-lg mb-3">Log a coffee chat</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Contact name *">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Chen"
                />
              </Field>
              <Field label="Their organization">
                <input
                  className="input"
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Type">
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value as ContactType)}
                >
                  <option value="donor">Donor / Prospect</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="partner">Strategic partner</option>
                  <option value="board">Board candidate</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Chat date">
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Notes" full>
                <textarea
                  className="input min-h-[80px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What did you learn? What matters to them?"
                />
              </Field>
              <Field label="Next step">
                <input
                  className="input"
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  placeholder="e.g. Send program brief, invite to site visit"
                />
              </Field>
              <Field label="Follow-up date">
                <input
                  type="date"
                  className="input"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4 flex gap-2">
              <PrimaryButton onClick={addChat}>Save chat</PrimaryButton>
              <GhostButton onClick={() => setShowForm(false)}>Cancel</GhostButton>
            </div>
          </SectionCard>
        )}

        {/* Upcoming follow-ups */}
        {followUps.length > 0 && (
          <SectionCard>
            <div className="flex items-center gap-2 mb-3 text-brand-primary">
              <Calendar className="h-4 w-4" />
              <h2 className="font-serif text-lg">Upcoming follow-ups</h2>
            </div>
            <ul className="divide-y">
              {followUps.map((c) => (
                <li key={c.id} className="py-2 flex justify-between text-sm">
                  <span>
                    <strong>{c.contact_name}</strong>
                    {c.next_step ? <span className="text-slate-600"> — {c.next_step}</span> : null}
                  </span>
                  <span className="text-slate-500">
                    {new Date(c.follow_up_date!).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        {/* All chats */}
        <SectionCard>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-brand-primary" />
            <h2 className="font-serif text-lg">All coffee chats</h2>
            <span className="text-sm text-slate-500">({chats.length})</span>
          </div>

          {orgLoading || loading ? (
            <div className="py-8 text-center text-slate-500 text-sm">Loading…</div>
          ) : chats.length === 0 ? (
            <EmptyState
              icon={Coffee}
              title="No coffee chats yet"
              description="Log your first relationship-building conversation. Even 5 chats a month can transform a small org's network."
              action={
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4" /> Log first chat
                </PrimaryButton>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Next step</th>
                    <th className="py-2 pr-3">Follow-up</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {chats.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {new Date(c.chat_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{c.contact_name}</div>
                        {c.contact_org && (
                          <div className="text-xs text-slate-500">{c.contact_org}</div>
                        )}
                        {c.notes && (
                          <div className="text-xs text-slate-600 mt-1 max-w-md">{c.notes}</div>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs capitalize ${TYPE_TONE[c.contact_type] ?? TYPE_TONE.other}`}
                        >
                          {c.contact_type}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-700">{c.next_step ?? "—"}</td>
                      <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                        {c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => remove(c.id)}
                          className="text-slate-400 hover:text-rose-600"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus { outline: 2px solid rgb(23 52 54); outline-offset: -1px; }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

// --- Coffee cup SVG ---------------------------------------------------------

function CoffeeCup({
  filled,
  stretch,
  index,
}: {
  filled: boolean;
  stretch: boolean;
  index: number;
}) {
  const fillColor = filled ? (stretch ? "#d97706" : "#173436") : "transparent";
  const strokeColor = filled ? (stretch ? "#d97706" : "#173436") : "#cbd5e1";
  const steamOpacity = filled ? 0.7 : 0;

  return (
    <div className="flex flex-col items-center" title={`Chat ${index}`}>
      <svg viewBox="0 0 48 56" className="h-14 w-14">
        {/* steam */}
        <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity={steamOpacity}>
          <path d="M18 6 C 16 10, 20 12, 18 16" />
          <path d="M24 4 C 22 8, 26 10, 24 14" />
          <path d="M30 6 C 28 10, 32 12, 30 16" />
        </g>
        {/* cup body */}
        <path
          d="M8 22 L40 22 L36 48 C 35 52, 32 54, 28 54 L20 54 C 16 54, 13 52, 12 48 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="2"
        />
        {/* handle */}
        <path
          d="M40 26 C 46 26, 46 38, 40 40"
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
        />
        {/* saucer */}
        <ellipse cx="24" cy="54" rx="18" ry="2" fill={strokeColor} opacity="0.25" />
      </svg>
      <span className="text-[10px] text-slate-500 -mt-1">{index}</span>
    </div>
  );
}
