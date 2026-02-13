"use client";

import { type GroupWithMembers } from "@/services/groups";
import { Users, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GroupListProps {
  groups: GroupWithMembers[];
  loading: boolean;
  onGroupClick: (groupId: string) => void;
  onCreateClick: () => void;
  userName: string;
}

export function GroupList({
  groups,
  loading,
  onGroupClick,
  onCreateClick,
  userName,
}: GroupListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Hey, {userName}!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create a group to start splitting expenses
          </p>
        </div>
        <Button onClick={onCreateClick} className="gap-2 mt-2">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Groups</h2>
        <Button onClick={onCreateClick} size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onGroupClick(group.id)}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 hover:border-border hover:bg-card/80 transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.member_count} member{group.member_count !== 1 ? "s" : ""}
              {group.description ? ` · ${group.description}` : ""}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
