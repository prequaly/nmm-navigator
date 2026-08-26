import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { MessageCircle, Send, Trash2, Loader2, Pencil, X, Check } from "lucide-react";
import { toast } from "sonner";

type EntityType = "pillar" | "kpi" | "risk";

type CommentRow = {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  edited_at: string | null;
  author_name?: string | null;
  author_avatar?: string | null;
};

export function Comments({
  entityType,
  entityId,
  defaultOpen = false,
  compact = false,
}: {
  entityType: EntityType;
  entityId: string;
  defaultOpen?: boolean;
  compact?: boolean;
}) {
  const { orgId } = useCurrentOrg();
  const [open, setOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  // Always fetch the count (cheap) so the toggle shows a badge
  useEffect(() => {
    if (!entityId) return;
    let cancelled = false;
    (async () => {
      const { count: c } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (!cancelled) setCount(c ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  async function load() {
    if (!entityId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("comments")
      .select("id, body, author_id, created_at, edited_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    // Enrich with author profile
    const authorIds = Array.from(new Set((data ?? []).map((c) => c.author_id)));
    let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (authorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", authorIds);
      profileMap = new Map((profs ?? []).map((p) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]));
    }
    setComments(
      (data ?? []).map((c) => ({
        ...c,
        author_name: profileMap.get(c.author_id)?.full_name ?? "Member",
        author_avatar: profileMap.get(c.author_id)?.avatar_url ?? null,
      })),
    );
    setCount(data?.length ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entityType, entityId]);

  async function post() {
    const body = draft.trim();
    if (!body || !orgId || !me) return;
    setPosting(true);
    const { error } = await supabase.from("comments").insert({
      organization_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      author_id: me,
      body,
    });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
    load();
  }

  async function saveEdit(id: string) {
    const body = editDraft.trim();
    if (!body) return;
    const { error } = await supabase
      .from("comments")
      .update({ body, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    setEditDraft("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  }

  return (
    <div className={`${compact ? "" : "mt-4"} border-t border-slate-100 pt-3`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <MessageCircle className="size-3.5" />
        {open ? "Hide discussion" : "Discussion"}
        {count !== null && count > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="size-3 animate-spin" /> Loading…
            </div>
          )}

          {!loading && comments.length === 0 && (
            <p className="text-xs text-slate-400 italic">No comments yet — start the conversation.</p>
          )}

          {!loading &&
            comments.map((c) => {
              const isMine = c.author_id === me;
              const isEditing = editingId === c.id;
              return (
                <div key={c.id} className="flex gap-2.5 group">
                  <Avatar name={c.author_name ?? "Member"} url={c.author_avatar ?? null} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-800">{c.author_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {timeAgo(c.created_at)}
                        {c.edited_at && " · edited"}
                      </span>
                    </div>
                    {isEditing ? (
                      <div className="mt-1 space-y-1.5">
                        <textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          rows={2}
                          className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 resize-y"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] bg-brand-deep text-white rounded-md hover:bg-brand-deep/90"
                          >
                            <Check className="size-3" /> Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft("");
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            <X className="size-3" /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5">{c.body}</p>
                    )}
                  </div>
                  {!isEditing && isMine && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingId(c.id);
                          setEditDraft(c.body);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                        aria-label="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Composer */}
          <div className="flex gap-2 pt-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  post();
                }
              }}
              placeholder="Add a comment… (Cmd/Ctrl+Enter to send)"
              rows={2}
              className="flex-1 text-sm border border-slate-200 rounded-md px-2.5 py-1.5 resize-y focus:outline-none focus:ring-2 focus:ring-brand-deep/20 focus:border-brand-deep"
            />
            <button
              onClick={post}
              disabled={!draft.trim() || posting}
              className="self-end flex items-center gap-1.5 px-3 py-2 bg-brand-deep text-white rounded-md text-xs font-medium hover:bg-brand-deep/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    return <img src={url} alt={name} className="size-7 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="size-7 rounded-full bg-brand-deep/10 text-brand-deep text-[10px] font-bold flex items-center justify-center shrink-0">
      {initials || "•"}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
