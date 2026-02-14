import { supabase } from "@/lib/supabase";
import type { Agent } from "@/types";

export async function getAllAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .in("status", ["active", "coming_soon"])
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch agents:", error);
    return [];
  }

  return (data ?? []).map((a) => ({
    ...a,
    capabilities: Array.isArray(a.capabilities) ? a.capabilities : [],
  })) as Agent[];
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
  } as Agent;
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
  } as Agent;
}
