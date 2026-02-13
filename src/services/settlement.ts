import { supabase } from "@/lib/supabase";
import { simplifyDebts, type BalanceInput, type DebtEdge } from "./debtSimplifier";

export interface SettlementPlan {
  transfers: DebtEdge[];
  totalAmount: number;
  transactionCount: number;
}

/**
 * Compute a settlement plan from group balances.
 * Uses the debt simplification algorithm to minimize transfers.
 */
export function computeSettlementPlan(
  balances: BalanceInput[]
): SettlementPlan {
  const transfers = simplifyDebts(balances);
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);

  return {
    transfers,
    totalAmount,
    transactionCount: transfers.length,
  };
}

/**
 * Build structured memo for a settlement transaction.
 * Format: "splitpay|settle|<groupId>|<description>"
 * Max 32 bytes for Tempo memo.
 */
export function buildSettlementMemo(
  groupId: string,
  description: string
): string {
  // Keep memo under 31 chars (stringToHex adds padding to 32 bytes)
  const prefix = "sp|";
  const shortGroupId = groupId.slice(0, 8);
  const maxDescLen = 31 - prefix.length - shortGroupId.length - 1;
  const shortDesc = description.slice(0, maxDescLen);
  return `${prefix}${shortGroupId}|${shortDesc}`;
}

/**
 * Record a completed settlement in the database.
 */
export async function recordSettlement(params: {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  txHash: string;
  memo: string;
}): Promise<void> {
  const { error } = await supabase.from("settlements").insert({
    group_id: params.groupId,
    from_user: params.fromUserId,
    to_user: params.toUserId,
    amount: params.amount,
    tx_hash: params.txHash,
    memo: params.memo,
    status: "completed",
  });

  if (error)
    throw new Error(`Failed to record settlement: ${error.message}`);

  // Log activity
  await supabase.from("activity_feed").insert({
    group_id: params.groupId,
    actor_id: params.fromUserId,
    type: "settlement",
    metadata: {
      to_user_id: params.toUserId,
      amount: params.amount,
      tx_hash: params.txHash,
    },
  });
}

/**
 * Mark expense splits as settled after a successful batch settlement.
 */
export async function markSplitsSettled(
  groupId: string,
  fromUserId: string,
  txHash: string
): Promise<void> {
  // Get all unsettled expense splits where this user owes money
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId);

  if (!expenses || expenses.length === 0) return;

  const expenseIds = expenses.map((e) => e.id);

  await supabase
    .from("expense_splits")
    .update({
      is_settled: true,
      settled_tx_hash: txHash,
      settled_at: new Date().toISOString(),
    })
    .in("expense_id", expenseIds)
    .eq("user_id", fromUserId)
    .eq("is_settled", false);
}
