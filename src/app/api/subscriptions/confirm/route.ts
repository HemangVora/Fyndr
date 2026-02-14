import { NextRequest } from "next/server";
import * as subscriptions from "@/services/subscriptions";
import * as agentTransfers from "@/services/agentTransfers";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, txHash, userId } = await request.json();

    if (!subscriptionId || !txHash) {
      return new Response(
        JSON.stringify({ error: "subscriptionId and txHash are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Record the payment on the subscription
    await subscriptions.recordSubscriptionPayment(subscriptionId, txHash);

    // Get subscription details for the transfer record
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*, agent:agents(*)")
      .eq("id", subscriptionId)
      .single();

    if (sub) {
      // Record the agent transfer
      await agentTransfers.recordTransfer({
        fromUserId: userId ?? sub.user_id,
        toAgentId: sub.agent_id,
        amount: sub.amount,
        txHash,
        memo: `Subscription: ${sub.plan_name}`,
        transferType: "subscription",
        referenceId: subscriptionId,
      });
    }

    // Get updated subscription
    const { data: updated } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscriptionId,
        status: "active",
        tx_hash: txHash,
        next_payment_at: updated?.next_payment_at,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Subscription confirm error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to confirm subscription",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
