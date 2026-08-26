import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AppShell, SectionCard, PrimaryButton, GhostButton } from "@/components/app-shell/AppShell";
import { BookOpen, Sparkles, Loader2, Copy, ChevronDown, ChevronRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { toast } from "sonner";
import { GRANT_QUESTIONS, type GrantQuestion, type GrantVariant } from "@/lib/grants/questions";
import { draftGrantResponse } from "@/lib/grants/draft.functions";

type Row = { question_id: string; variant: string; content: string };

export const Route = createFileRoute("/_authenticated/fund/grant-bank")({
  head: () => ({ meta: [{ title: "Grant Response Bank — NMM Navigator" }] }),
  component: GrantBankPage,
});

function GrantBankPage() {
  const { orgId, loading: orgLoading } = useCurrentOrg();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("grant_responses")
      .select("question_id,variant,content")
      .eq("organization_id", orgId);
    if (error) toast.error(error.message);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!orgId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const byQuestion = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const r of rows) {
      if (!map.has(r.question_id)) map.set(r.question_id, new Map());
      map.get(r.question_id)!.set(r.variant, r.content);
    }
    return map;
  }, [rows]);

  function countVariants(qid: string) {
    return Array.from(byQuestion.get(qid)?.values() ?? []).filter((c) => c.trim().length > 0).length;
  }

  const core = GRANT_QUESTIONS.filter((q) => q.category === "core");
  const bonus = GRANT_QUESTIONS.filter((q) => q.category === "bonus");

  if (orgLoading || loading) {
    return (
      <AppShell title="Grant Response Bank" subtitle="Pre-written, length-tagged narrative blocks so the next grant takes a fraction of the time.">
        <SectionCard>
          <div className="flex items-center gap-3 text-slate-500 text-sm py-8 justify-center">
            <Loader2 className="size-4 animate-spin" /> Loading your saved responses…
          </div>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Grant Response Bank"
      subtitle="Pre-written, length-tagged narrative blocks so the next grant takes a fraction of the time."
      actions={
        <span className="text-xs italic text-slate-500 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-brand-accent" /> AI assist powered by Lovable AI
        </span>
      }
    >
      <Section title="Top 20 Grant Application Questions">
        <div className="space-y-3">
          {core.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              orgId={orgId!}
              variantsContent={byQuestion.get(q.id) ?? new Map()}
              completed={countVariants(q.id)}
              isOpen={expanded === q.id}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onSaved={refresh}
            />
          ))}
        </div>
      </Section>

      <div className="mt-10" />
      <Section title="Bonus Questions Frequently Seen">
        <div className="space-y-3">
          {bonus.map((q) => (
            <QuestionRow
              key={q.id}
              question={q}
              orgId={orgId!}
              variantsContent={byQuestion.get(q.id) ?? new Map()}
              completed={countVariants(q.id)}
              isOpen={expanded === q.id}
              onToggle={() => setExpanded(expanded === q.id ? null : q.id)}
              onSaved={refresh}
            />
          ))}
        </div>
      </Section>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">{title}</h2>
      {children}
    </>
  );
}

function QuestionRow({
  question,
  orgId,
  variantsContent,
  completed,
  isOpen,
  onToggle,
  onSaved,
}: {
  question: GrantQuestion;
  orgId: string;
  variantsContent: Map<string, string>;
  completed: number;
  isOpen: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  return (
    <SectionCard padding="p-0">
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex items-start gap-4 hover:bg-slate-50/60 transition-colors"
      >
        <BookOpen className="size-4 text-brand-primary mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            {question.number !== null && (
              <span className="text-xs font-bold text-slate-400 tabular-nums">{question.number}.</span>
            )}
            <h3 className="font-medium text-slate-900">{question.question}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">{question.purpose}</p>
          {question.include && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {question.include.map((i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                  {i}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 tabular-nums">
            {completed}/{question.variants.length} drafted
          </span>
          {isOpen ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50/40">
          {question.variants.map((v) => (
            <VariantEditor
              key={v.id}
              question={question}
              variant={v}
              orgId={orgId}
              initial={variantsContent.get(v.id) ?? ""}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function VariantEditor({
  question,
  variant,
  orgId,
  initial,
  onSaved,
}: {
  question: GrantQuestion;
  variant: GrantVariant;
  orgId: string;
  initial: string;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setContent(initial), [initial]);

  const draftFn = useServerFn(draftGrantResponse);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const limit = variant.target;
  const over =
    limit.type === "chars" ? charCount > limit.value : wordCount > Math.round(limit.value * 1.15);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("grant_responses")
      .upsert(
        {
          organization_id: orgId,
          question_id: question.id,
          variant: variant.id,
          content,
          created_by: u.user?.id ?? null,
        },
        { onConflict: "organization_id,question_id,variant" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${variant.label.toLowerCase()}`);
    onSaved();
  }

  async function draftWithAi() {
    setDrafting(true);
    try {
      const res = await draftFn({
        data: {
          questionId: question.id,
          variantId: variant.id,
          organizationId: orgId,
        },
      });
      setContent(res.text);
      toast.success("Draft generated — review and save when ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setDrafting(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary">
            {variant.label}
          </span>
          <span className={`text-[11px] tabular-nums ${over ? "text-rose-600" : "text-slate-400"}`}>
            {limit.type === "chars"
              ? `${charCount}/${limit.value} chars`
              : `${wordCount} / ~${limit.value} words`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copy}
            disabled={!content}
            className="text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
            title="Copy"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Draft a ${variant.label.toLowerCase()} response, or click "Draft with AI" to generate one from your org context.`}
        className="w-full min-h-[120px] text-sm text-slate-800 bg-transparent border-0 focus:ring-0 focus:outline-none resize-y leading-relaxed"
      />
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <GhostButton onClick={draftWithAi} disabled={drafting}>
          {drafting ? (
            <>
              <Loader2 className="size-3.5 inline -mt-0.5 mr-1 animate-spin" />
              Drafting…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 inline -mt-0.5 mr-1 text-brand-accent" />
              Draft with AI
            </>
          )}
        </GhostButton>
        <PrimaryButton onClick={save} disabled={saving || !content.trim()}>
          {saving ? "Saving…" : "Save"}
        </PrimaryButton>
      </div>
    </div>
  );
}
