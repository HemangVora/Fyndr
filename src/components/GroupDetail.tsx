"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getGroupById,
  addMemberByIdentifier,
  type GroupWithMembers,
} from "@/services/groups";
import {
  getExpensesForGroup,
  calculateGroupBalances,
  type ExpenseWithSplits,
  type BalanceEntry,
} from "@/services/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ExpenseList } from "@/components/ExpenseList";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import {
  ArrowLeft,
  Users,
  Plus,
  Receipt,
  UserPlus,
  Loader2,
  Scale,
} from "lucide-react";
import { toast } from "sonner";

interface GroupDetailProps {
  groupId: string;
  currentUserId: string;
  onBack: () => void;
  onSettleUp?: (balances: BalanceEntry[]) => void;
}

export function GroupDetail({
  groupId,
  currentUserId,
  onBack,
  onSettleUp,
}: GroupDetailProps) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [groupData, expenseData] = await Promise.all([
        getGroupById(groupId),
        getExpensesForGroup(groupId),
      ]);

      setGroup(groupData);
      setExpenses(expenseData);

      if (groupData) {
        const computedBalances = calculateGroupBalances(
          expenseData,
          groupData.members
        );
        setBalances(computedBalances);
      }
    } catch (err) {
      console.error("Failed to fetch group data:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInvite = async () => {
    const trimmed = inviteInput.trim();
    if (!trimmed) return;

    setInviting(true);
    try {
      const { user, isNew } = await addMemberByIdentifier(groupId, trimmed);
      toast.success(
        isNew
          ? `Invited ${trimmed}`
          : `Added ${user.display_name ?? trimmed}`
      );
      setInviteInput("");
      setShowInvite(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const hasUnsettledDebts = balances.some((b) => b.amount !== 0);

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
            <p className="text-xs text-muted-foreground">
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => setShowAddExpense(true)}
          className="gap-2"
        >
          <Receipt className="h-4 w-4" />
          Add Expense
        </Button>
        {hasUnsettledDebts && onSettleUp ? (
          <Button
            variant="outline"
            onClick={() => onSettleUp(balances)}
            className="gap-2"
          >
            <Scale className="h-4 w-4" />
            Settle Up
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowInvite(!showInvite)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        )}
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

      {/* Balances */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Scale className="h-3.5 w-3.5" />
          Balances
        </h3>
        <BalanceDisplay
          balances={balances}
          currentUserId={currentUserId}
        />
      </div>

      <Separator className="opacity-50" />

      {/* Expenses */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5" />
          Expenses ({expenses.length})
        </h3>
        {expenses.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              No expenses yet — add one to get started
            </p>
          </div>
        ) : (
          <ExpenseList
            expenses={expenses}
            currentUserId={currentUserId}
          />
        )}
      </div>

      <Separator className="opacity-50" />

      {/* Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Members ({group.member_count})
          </h3>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="text-xs text-primary hover:underline"
          >
            + Invite
          </button>
        </div>
        <div className="space-y-2">
          {group.members.map((member) => {
            const user = member.user;
            const isCurrentUser = member.user_id === currentUserId;
            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30"
              >
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">
                  {(user?.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {user?.display_name ?? "Unknown"}
                    {isCurrentUser && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
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

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        open={showAddExpense}
        onOpenChange={setShowAddExpense}
        groupId={groupId}
        currentUserId={currentUserId}
        members={group.members.map((m) => ({
          user_id: m.user_id,
          user: m.user,
        }))}
        onCreated={fetchData}
      />
    </div>
  );
}
