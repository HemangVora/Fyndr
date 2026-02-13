"use client";

import { useState, useEffect, useCallback } from "react";
import { getGroupById, addMemberByIdentifier, type GroupWithMembers } from "@/services/groups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Plus,
  Receipt,
  UserPlus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface GroupDetailProps {
  groupId: string;
  currentUserId: string;
  onBack: () => void;
  onAddExpense: () => void;
}

export function GroupDetail({
  groupId,
  currentUserId,
  onBack,
  onAddExpense,
}: GroupDetailProps) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const data = await getGroupById(groupId);
      setGroup(data);
    } catch (err) {
      console.error("Failed to fetch group:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleInvite = async () => {
    const trimmed = inviteInput.trim();
    if (!trimmed) return;

    setInviting(true);
    try {
      const { user, isNew } = await addMemberByIdentifier(groupId, trimmed);
      toast.success(
        isNew
          ? `Invited ${trimmed} — they'll see the group when they sign up`
          : `Added ${user.display_name ?? trimmed} to the group`
      );
      setInviteInput("");
      setShowInvite(false);
      fetchGroup();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Group not found</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{group.name}</h2>
          {group.description && (
            <p className="text-xs text-muted-foreground">{group.description}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={onAddExpense} className="gap-2">
          <Receipt className="h-4 w-4" />
          Add Expense
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowInvite(!showInvite)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </div>

      {/* Invite Section */}
      {showInvite && (
        <div className="flex gap-2">
          <Input
            placeholder="Email or phone number"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInvite();
              }
            }}
            className="bg-background border-border"
          />
          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteInput.trim()}
            size="icon"
            className="shrink-0"
          >
            {inviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}

      {/* Members */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Members ({group.member_count})
          </h3>
        </div>
        <div className="space-y-2">
          {group.members.map((member) => {
            const user = member.user;
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
              >
                <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">
                  {(user?.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.display_name ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email ?? user?.phone ?? ""}
                  </p>
                </div>
                {member.role === "owner" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Owner
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Balances placeholder — will be filled in Phase 3 */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Balances
        </h3>
        <div className="p-6 rounded-xl border border-dashed border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            No expenses yet — add one to see balances
          </p>
        </div>
      </div>
    </div>
  );
}
