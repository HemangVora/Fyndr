import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

interface UpsertUserParams {
  privyId: string;
  walletAddress: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
}

export async function upsertUser(params: UpsertUserParams): Promise<User> {
  const { privyId, walletAddress, email, phone, displayName } = params;
  const lowerWallet = walletAddress.toLowerCase();

  // First, check if a user already exists by email or phone.
  // This handles the case where a user was added to a group (creating a Supabase
  // record with one privy_id) and later logs in (possibly with a different privy_id).
  // By matching on email/phone first, we preserve the same UUID and group memberships.
  let existing: User | null = null;
  if (email) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    existing = data as User | null;
  }
  if (!existing && phone) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("phone", phone)
      .single();
    existing = data as User | null;
  }

  if (existing) {
    // Update the existing record with current privy_id and wallet
    const { data, error } = await supabase
      .from("users")
      .update({
        privy_id: privyId,
        wallet_address: lowerWallet,
        display_name: displayName ?? existing.display_name,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update user: ${error.message}`);
    return data as User;
  }

  // No existing user by email/phone — upsert by privy_id
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        privy_id: privyId,
        wallet_address: lowerWallet,
        email: email ?? null,
        phone: phone ?? null,
        display_name: displayName ?? email ?? phone ?? walletAddress.slice(0, 8),
      },
      { onConflict: "privy_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert user: ${error.message}`);
  return data as User;
}

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();

  if (error) return null;
  return data as User;
}

export async function getUserByPrivyId(privyId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("privy_id", privyId)
    .single();

  if (error) return null;
  return data as User;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .in("id", userIds);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  return (data ?? []) as User[];
}

export async function searchUserByIdentifier(identifier: string): Promise<User | null> {
  const column = identifier.includes("@") ? "email" : "phone";
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq(column, identifier)
    .single();

  if (error) return null;
  return data as User;
}
