import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search.next === "string" ? { next: search.next } : {},
  head: () => ({
    meta: [
      { title: "Sign in — NMM Navigator" },
      {
        name: "description",
        content: "Sign in to your NMM Navigator strategic planning workspace.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  // Only allow same-origin relative destinations (prevents open redirects).
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const goToDestination = () => {
    if (safeNext) {
      // Full navigation is fine post-auth (session persists in localStorage)
      // and avoids typed-route constraints on dynamic hrefs.
      window.location.assign(safeNext);
    } else {
      navigate({ to: "/dashboard" });
    }
  };
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/dashboard",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
        goToDestination();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goToDestination();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    goToDestination();
  };

  return (
    <div className="min-h-screen bg-brand-surface flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex w-1/2 bg-brand-deep text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-brand-primary/30 to-transparent pointer-events-none" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="size-8 bg-white rounded-lg flex items-center justify-center">
            <div className="size-3 bg-brand-deep rounded-full" />
          </div>
          <span className="font-serif italic text-xl">NMM Navigator</span>
        </Link>
        <div className="relative max-w-md">
          <span className="bg-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
            Strategic Operating System
          </span>
          <h1 className="text-5xl font-serif italic mt-6 leading-[1.05]">
            From a strategic plan that sits on a shelf — to one your team runs every week.
          </h1>
          <p className="text-slate-400 mt-6 text-base leading-relaxed">
            Built for nonprofits under $1M revenue. Twenty integrated modules powered by the IMPACT
            & 4Rs frameworks.
          </p>
        </div>
        <p className="relative text-xs text-slate-400 italic">
          © 2026 NMM Navigator™ — Nonprofit Management Methodology.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-8 bg-brand-deep rounded-lg flex items-center justify-center">
              <div className="size-3 bg-white rounded-full" />
            </div>
            <span className="font-serif italic text-xl">NMM Navigator</span>
          </Link>

          <h2 className="text-3xl font-serif italic">
            {mode === "signin" ? "Welcome back." : "Create your workspace."}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {mode === "signin"
              ? "Continue your organization's strategic plan."
              : "Start with the Organization Intake — about 8 minutes."}
          </p>

          <button
            onClick={google}
            disabled={loading}
            className="w-full mt-8 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200" /> OR{" "}
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-deep text-white rounded-lg text-sm font-medium hover:bg-brand-deep/90 transition-colors disabled:opacity-50"
            >
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-center text-slate-500 mt-6">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-brand-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
