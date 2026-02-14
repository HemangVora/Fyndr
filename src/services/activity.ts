import { supabase } from "@/lib/supabase";
import type { ActivityItem } from "@/types";

export async function getActivityFeed(
  userId: string,
  limit: number = 20
): Promise<ActivityItem[]> {
  // Get groups the user belongs to
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (!memberships || memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.group_id);

  // Fetch activity for those groups
  const { data: activities, error } = await supabase
    .from("activity_feed")
    .select("*, actor:users!actor_id(display_name), group:groups!group_id(name)")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch activity feed:", error);
    return [];
  }

  return (activities ?? []).map((a): ActivityItem => {
    const metadata = (a.metadata ?? {}) as Record<string, unknown>;
    return {
      id: a.id,
      type: a.type as ActivityItem["type"],
      group_id: a.group_id ?? "",
      group_name: (a.group as { name: string } | null)?.name ?? "Unknown",
      actor_id: a.actor_id,
      actor_name:
        (a.actor as { display_name: string } | null)?.display_name ?? "Someone",
      description: buildDescription(
        a.type,
        (a.actor as { display_name: string } | null)?.display_name ?? "Someone",
        metadata
      ),
      amount: (metadata.amount as number) ?? null,
      tx_hash: (metadata.tx_hash as string) ?? null,
      created_at: a.created_at,
    };
  });
}

function buildDescription(
  type: string,
  actorName: string,
  metadata: Record<string, unknown>
): string {
  switch (type) {
    case "expense_added":
      return `${actorName} added "${metadata.title ?? "expense"}" — $${(metadata.amount as number)?.toFixed(2) ?? "0.00"}`;
    case "settlement":
      return `${actorName} settled up — $${(metadata.amount as number)?.toFixed(2) ?? "0.00"}`;
    case "group_created":
      return `${actorName} created group "${metadata.group_name ?? ""}"`;
    case "member_joined":
      return `${actorName} joined the group`;
    case "agent_order":
      return `${actorName} placed an order — $${(metadata.amount as number)?.toFixed(2) ?? "0.00"}`;
    case "subscription_payment":
      return `${actorName} subscribed to ${metadata.plan_name ?? "a plan"} — $${(metadata.amount as number)?.toFixed(2) ?? "0.00"}`;
    default:
      return `${actorName} did something`;
  }
}
