import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { setPreferredOrgId } from "@/hooks/use-current-org";
import { toast } from "sonner";
import { Users, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invite — NMM Navigator" }] }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{ orgName: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const accept = async () => {
    setAccepting(true);
    setErrorMsg(null);
    const { data, error } = await supabase.rpc("accept_org_invite", { _token: token });
    setAccepting(false);

    if (error) {
      // Postgres RAISE EXCEPTION messages are user-facing by design here.
      setErrorMsg(error.message);
      return;
    }

    const row = data?.[0];
    if (!row) {
      setErrorMsg("Something went wrong accepting this invite. Please try again.");
      return;
    }

    // Make the newly joined organization the active one and refresh
    // all org-scoped data across the app.
    setPreferredOrgId(row.org_id);
    await queryClient.invalidateQueries();
    setAccepted({ orgName: row.org_name });
    toast.success(`Welcome to ${row.org_name}!`);
    setTimeout(() => navigate({ to: "/dashboard" }), 1200);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/70 shadow-sm p-8 text-center">
        {accepted ? (
          <>
            <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center mx-auto mb-4">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="text-xl font-semibold text-teal-deep mb-1">
              You've joined {accepted.orgName}
            </h1>
            <p className="text-sm text-muted-foreground">Taking you to the dashboard…</p>
          </>
        ) : (
          <>
            <div className="size-12 rounded-full bg-teal-primary/10 text-teal-deep grid place-items-center mx-auto mb-4">
              <Users className="size-6" />
            </div>
            <h1 className="text-xl font-semibold text-teal-deep mb-1">
              You've been invited to a team
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Accept this invite to join the organization's strategic planning workspace on NMM
              Navigator. The invite only works for the email address it was sent to.
            </p>
            {errorMsg && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 mb-4">
                {errorMsg}
              </p>
            )}
            <button
              type="button"
              onClick={accept}
              disabled={accepting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-teal-primary text-white rounded-full hover:bg-teal-deep transition-colors disabled:opacity-50"
            >
              {accepting ? "Joining…" : "Accept invite"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
