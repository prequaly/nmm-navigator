import { useState } from "react";
import { Check, X, Pencil, Loader2 } from "lucide-react";

export type SuggestionField = { key: string; label: string; value: string; multiline?: boolean };

/**
 * Generic Accept/Edit/Reject card for AI-generated suggestions (FR: every
 * generated recommendation must support Accept/Edit/Reject; AI must never
 * overwrite user-approved information without permission). Nothing is
 * written anywhere until the user clicks Accept — the edited field values
 * at that moment are what gets persisted, so an edit followed by Accept is
 * exactly "accept my edited version," never a silent overwrite.
 */
export function AiSuggestionCard({
  badge,
  fields: initialFields,
  meta,
  onAccept,
  onReject,
}: {
  badge: string;
  fields: SuggestionField[];
  meta?: string;
  onAccept: (values: Record<string, string>) => void | Promise<void>;
  onReject?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(initialFields.map((f) => [f.key, f.value])),
  );
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("pending");
  const [saving, setSaving] = useState(false);

  async function accept() {
    setSaving(true);
    try {
      await onAccept(values);
      setStatus("accepted");
    } finally {
      setSaving(false);
    }
  }

  function reject() {
    onReject?.();
    setStatus("rejected");
  }

  if (status === "accepted") {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
        <Check className="size-4 shrink-0" /> Added to your plan
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-xs text-slate-400 italic">
        Dismissed
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
          {badge}
        </span>
        {meta && <span className="text-[11px] text-slate-400">{meta}</span>}
      </div>

      <div className="space-y-2">
        {initialFields.map((f) => (
          <div key={f.key}>
            {editing ? (
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {f.label}
                </span>
                {f.multiline ? (
                  <textarea
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    rows={2}
                    className="w-full mt-1 text-sm border border-slate-200 rounded-md px-2 py-1.5"
                  />
                ) : (
                  <input
                    value={values[f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full mt-1 text-sm border border-slate-200 rounded-md px-2 py-1.5"
                  />
                )}
              </label>
            ) : (
              <p className="text-sm text-slate-700">
                {f.label !== "Name" && f.label !== "Title" && f.label !== "Objective" && (
                  <span className="text-slate-400">{f.label}: </span>
                )}
                {values[f.key]}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
        >
          <Pencil className="size-3" /> {editing ? "Done" : "Edit"}
        </button>
        <button
          onClick={accept}
          disabled={saving}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium bg-brand-deep text-white px-3 py-1.5 rounded-md hover:bg-brand-deep/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          Accept
        </button>
        <button
          onClick={reject}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 px-2 py-1.5"
        >
          <X className="size-3" /> Reject
        </button>
      </div>
    </div>
  );
}
