import { useState, type ReactNode } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AiDraftButton({
  onDraft,
  label = "Draft with AI",
  className = "",
  variant = "ghost",
}: {
  onDraft: () => Promise<{ text: string }>;
  onResult?: (text: string) => void;
  label?: string;
  className?: string;
  variant?: "ghost" | "primary";
  children?: ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    try {
      await onDraft();
    } catch (e) {
      toast.error((e as Error).message ?? "AI request failed");
    } finally {
      setLoading(false);
    }
  }
  const base =
    "inline-flex items-center gap-1.5 text-xs font-medium rounded-md px-3 py-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const tone =
    variant === "primary"
      ? "bg-brand-primary text-white hover:bg-brand-primary/90"
      : "text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/5";
  return (
    <button onClick={go} disabled={loading} className={`${base} ${tone} ${className}`}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
      {loading ? "Drafting…" : label}
    </button>
  );
}
