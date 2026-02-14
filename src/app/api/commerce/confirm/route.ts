import { NextRequest } from "next/server";
import * as commerce from "@/services/commerce";
import * as agentTransfers from "@/services/agentTransfers";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { orderId, txHash, userId } = await request.json();

    if (!orderId || !txHash) {
      return new Response(
        JSON.stringify({ error: "orderId and txHash are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update order status to paid
    await commerce.updateOrderStatus(orderId, "paid", txHash);

    // Get order details for the transfer record
    const { data: order } = await supabase
      .from("commerce_orders")
      .select("*, agent:agents(*)")
      .eq("id", orderId)
      .single();

    if (order) {
      // Record the agent transfer
      await agentTransfers.recordTransfer({
        fromUserId: userId ?? order.user_id,
        toAgentId: order.agent_id,
        amount: order.total,
        txHash,
        memo: `Order ${orderId}`,
        transferType: "user_to_agent",
        referenceId: orderId,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        status: "paid",
        tx_hash: txHash,
        estimated_delivery: "~45 minutes",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Commerce confirm error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Failed to confirm order",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
