import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/types";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  amount: number;
  interval: "daily" | "weekly" | "monthly";
  features: string[];
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_basic",
    name: "Fyndr Basic",
    description: "Essential AI payment assistant features",
    amount: 2.99,
    interval: "monthly",
    features: ["Unlimited chat", "Basic analytics", "5 groups"],
  },
  {
    id: "plan_pro",
    name: "Fyndr Pro",
    description: "Advanced features for power users",
    amount: 9.99,
    interval: "monthly",
    features: ["Everything in Basic", "Priority support", "Unlimited groups", "Receipt OCR", "Agent marketplace access"],
  },
  {
    id: "plan_market_data",
    name: "Market Data",
    description: "Real-time market data and DeFi analytics",
    amount: 0.50,
    interval: "daily",
    features: ["Live price feeds", "Portfolio tracking", "DeFi yield data"],
  },
  {
    id: "plan_defi_newsletter",
    name: "DeFi Newsletter",
    description: "Weekly curated DeFi insights and opportunities",
    amount: 1.99,
    interval: "weekly",
    features: ["Weekly digest", "Yield opportunities", "Risk analysis"],
  },
];

export function getPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS;
}

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

function getNextPaymentDate(interval: "daily" | "weekly" | "monthly"): string {
  const now = new Date();
  switch (interval) {
    case "daily":
      now.setDate(now.getDate() + 1);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
  }
  return now.toISOString();
}

export async function createSubscription(params: {
  userId: string;
  agentId: string;
  planId: string;
}): Promise<Subscription> {
  const plan = getPlanById(params.planId);
  if (!plan) throw new Error(`Plan not found: ${params.planId}`);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: params.userId,
      agent_id: params.agentId,
      plan_name: plan.name,
      amount: plan.amount,
      interval: plan.interval,
      status: "active",
      next_payment_at: getNextPaymentDate(plan.interval),
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create subscription: ${error.message}`);
  return data as Subscription;
}

export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, agent:agents(*)")
    .eq("user_id", userId)
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }

  return (data ?? []) as Subscription[];
}

export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: "active" | "paused" | "cancelled"
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status })
    .eq("id", subscriptionId);

  if (error) throw new Error(`Failed to update subscription: ${error.message}`);
}

export async function recordSubscriptionPayment(
  subscriptionId: string,
  txHash: string
): Promise<void> {
  // Get current subscription to determine next date
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();

  if (!sub) throw new Error("Subscription not found");

  const nextPayment = getNextPaymentDate(sub.interval);

  const { error } = await supabase
    .from("subscriptions")
    .update({
      last_payment_at: new Date().toISOString(),
      last_tx_hash: txHash,
      next_payment_at: nextPayment,
    })
    .eq("id", subscriptionId);

  if (error) throw new Error(`Failed to record payment: ${error.message}`);
}
