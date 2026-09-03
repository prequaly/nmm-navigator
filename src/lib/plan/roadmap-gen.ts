// Rule-based roadmap auto-generation (FR Section 18): once a strategic
// priority exists, translate it into a first roadmap item and a starter set
// of action items instead of leaving the user to invent structure from
// nothing. Deliberately simple/deterministic (no AI) — it's meant to be a
// scaffold the user immediately edits, not a finished plan.

import { supabase } from "@/integrations/supabase/client";

export type PillarForRoadmap = { id: string; name: string };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateRoadmapForPillar(
  orgId: string,
  planId: string,
  pillar: PillarForRoadmap,
): Promise<{ roadmapItemId: string; taskCount: number }> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 90);

  const { data: item, error: itemErr } = await supabase
    .from("roadmap_items")
    .insert({
      organization_id: orgId,
      plan_id: planId,
      pillar_id: pillar.id,
      title: `Advance: ${pillar.name}`,
      description: `Auto-generated 90-day roadmap item for the "${pillar.name}" priority — edit freely, this is a starting scaffold.`,
      start_date: isoDate(start),
      end_date: isoDate(end),
      status: "planned",
    })
    .select("id")
    .single();
  if (itemErr) throw itemErr;

  const taskTitles = [
    `Define what success looks like for "${pillar.name}"`,
    `Identify an owner and key stakeholders for "${pillar.name}"`,
    `Draft the first 30-day milestone for "${pillar.name}"`,
  ];

  const { error: taskErr } = await supabase.from("action_items").insert(
    taskTitles.map((title, i) => ({
      organization_id: orgId,
      plan_id: planId,
      pillar_id: pillar.id,
      roadmap_item_id: item.id,
      title,
      status: "not_started" as const,
      priority: "medium" as const,
      sort_order: i,
    })),
  );
  if (taskErr) throw taskErr;

  return { roadmapItemId: item.id, taskCount: taskTitles.length };
}
