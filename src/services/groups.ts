import { supabase } from "@/lib/supabase";
import type { Group, GroupMember, User } from "@/types";

export interface GroupWithMembers extends Group {
  members: (GroupMember & { user: User })[];
  member_count: number;
}

export async function createGroup(params: {
  name: string;
  description?: string;
  createdBy: string; // user id
}): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name: params.name,
      description: params.description ?? null,
      created_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create group: ${error.message}`);

  // Add creator as a member with owner role
  await addMember(data.id, params.createdBy, "owner");

  // Log activity
  await supabase.from("activity_feed").insert({
    group_id: data.id,
    actor_id: params.createdBy,
    type: "group_created",
    metadata: { group_name: params.name },
  });

  return data as Group;
}

export async function getGroupsForUser(
  userId: string
): Promise<GroupWithMembers[]> {
  // Get group IDs the user belongs to
  const { data: memberships, error: memberError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (memberError)
    throw new Error(`Failed to fetch memberships: ${memberError.message}`);
  if (!memberships || memberships.length === 0) return [];

  const groupIds = memberships.map((m) => m.group_id);

  // Fetch groups
  const { data: groups, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .in("id", groupIds)
    .order("updated_at", { ascending: false });

  if (groupError)
    throw new Error(`Failed to fetch groups: ${groupError.message}`);

  // Fetch all members for these groups with user details
  const { data: allMembers, error: allMemberError } = await supabase
    .from("group_members")
    .select("*, user:users(*)")
    .in("group_id", groupIds);

  if (allMemberError)
    throw new Error(`Failed to fetch members: ${allMemberError.message}`);

  // Combine
  return (groups ?? []).map((group) => {
    const members = (allMembers ?? []).filter(
      (m) => m.group_id === group.id
    ) as (GroupMember & { user: User })[];

    return {
      ...group,
      members,
      member_count: members.length,
    } as GroupWithMembers;
  });
}

export async function getGroupById(
  groupId: string
): Promise<GroupWithMembers | null> {
  const { data: group, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error || !group) return null;

  const { data: members } = await supabase
    .from("group_members")
    .select("*, user:users(*)")
    .eq("group_id", groupId);

  return {
    ...group,
    members: (members ?? []) as (GroupMember & { user: User })[],
    member_count: members?.length ?? 0,
  } as GroupWithMembers;
}

export async function addMember(
  groupId: string,
  userId: string,
  role: "owner" | "member" = "member"
): Promise<void> {
  const { error } = await supabase.from("group_members").upsert(
    {
      group_id: groupId,
      user_id: userId,
      role,
    },
    { onConflict: "group_id,user_id" }
  );

  if (error) throw new Error(`Failed to add member: ${error.message}`);
}

export async function addMemberByIdentifier(
  groupId: string,
  identifier: string
): Promise<{ user: User; isNew: boolean }> {
  // Check if user exists in our DB
  let query;
  if (identifier.includes("@")) {
    query = supabase.from("users").select("*").eq("email", identifier);
  } else if (identifier.startsWith("+") || /^\d+$/.test(identifier)) {
    query = supabase.from("users").select("*").eq("phone", identifier);
  } else {
    // Wallet address
    query = supabase
      .from("users")
      .select("*")
      .eq("wallet_address", identifier.toLowerCase());
  }

  const { data: existingUsers } = await query;
  const existing = existingUsers?.[0] as User | undefined;

  if (existing) {
    await addMember(groupId, existing.id);
    return { user: existing, isNew: false };
  }

  // Use Privy to create/find the user, then add to group
  // Call our API endpoint which handles Privy user creation
  const findRes = await fetch("/api/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });

  if (!findRes.ok) throw new Error("Failed to find or create user via Privy");

  const findData = await findRes.json();

  // Create user in our DB
  const { data: newUser, error } = await supabase
    .from("users")
    .upsert(
      {
        privy_id: findData.userId ?? `privy-${Date.now()}`,
        wallet_address: findData.address,
        email: identifier.includes("@") ? identifier : null,
        phone:
          identifier.startsWith("+") || /^\d+$/.test(identifier)
            ? identifier
            : null,
        display_name: identifier,
      },
      { onConflict: "wallet_address" }
    )
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);

  await addMember(groupId, newUser.id);
  return { user: newUser as User, isNew: true };
}

export async function removeMember(
  groupId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}
