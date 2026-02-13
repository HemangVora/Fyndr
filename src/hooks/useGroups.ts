"use client";

import { useState, useEffect, useCallback } from "react";
import { getGroupsForUser, type GroupWithMembers } from "@/services/groups";

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getGroupsForUser(userId);
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}
