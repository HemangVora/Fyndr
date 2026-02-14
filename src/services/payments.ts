import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

export interface PaymentRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  memo: string | null;
  status: "pending" | "completed" | "declined";
  created_at: string;
  from_user?: User;
  to_user?: User;
}

export async function createPaymentRequest(params: {
  fromUserId: string;
  toUserId: string;
  amount: number;
  memo?: string;
}): Promise<PaymentRequest> {
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      from_user_id: params.fromUserId,
      to_user_id: params.toUserId,
      amount: params.amount,
      memo: params.memo ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create payment request: ${error.message}`);
  return data as PaymentRequest;
}

export async function getPaymentRequests(
  userId: string
): Promise<PaymentRequest[]> {
  const { data, error } = await supabase
    .from("payment_requests")
    .select("*, from_user:users!from_user_id(*), to_user:users!to_user_id(*)")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch payment requests: ${error.message}`);
  return (data ?? []) as PaymentRequest[];
}

export async function updatePaymentRequestStatus(
  requestId: string,
  status: "completed" | "declined"
): Promise<void> {
  const { error } = await supabase
    .from("payment_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw new Error(`Failed to update payment request: ${error.message}`);
}
