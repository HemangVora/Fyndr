import { supabase } from "@/lib/supabase";
import type { AgentTransfer } from "@/types";

export async function recordTransfer(params: {
  fromAgentId?: string;
  toAgentId?: string;
  fromUserId?: string;
  toUserId?: string;
  amount: number;
  txHash?: string;
  memo?: string;
  transferType: AgentTransfer["transfer_type"];
  referenceId?: string;
}): Promise<AgentTransfer> {
  const { data, error } = await supabase
    .from("agent_transfers")
    .insert({
      from_agent_id: params.fromAgentId ?? null,
      to_agent_id: params.toAgentId ?? null,
      from_user_id: params.fromUserId ?? null,
      to_user_id: params.toUserId ?? null,
      amount: params.amount,
      tx_hash: params.txHash ?? null,
      memo: params.memo ?? null,
      transfer_type: params.transferType,
      reference_id: params.referenceId ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to record transfer: ${error.message}`);
  return data as AgentTransfer;
}

export async function getRecentTransfers(limit: number = 20): Promise<AgentTransfer[]> {
  const { data, error } = await supabase
    .from("agent_transfers")
    .select("*, from_agent:agents!from_agent_id(*), to_agent:agents!to_agent_id(*)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch agent transfers:", error);
    return [];
  }

  return (data ?? []) as AgentTransfer[];
}

export async function getUserTransfers(userId: string, limit: number = 20): Promise<AgentTransfer[]> {
  const { data, error } = await supabase
    .from("agent_transfers")
    .select("*, from_agent:agents!from_agent_id(*), to_agent:agents!to_agent_id(*)")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch user transfers:", error);
    return [];
  }

  return (data ?? []) as AgentTransfer[];
}
