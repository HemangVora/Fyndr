"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Receipt, Loader2, Check } from "lucide-react";
import { createExpense } from "@/services/expenses";
import { toast } from "sonner";
import type { User } from "@/types";

interface AddExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentUserId: string;
  members: { user_id: string; user: User }[];
  onCreated: () => void;
}

export function AddExpenseDialog({
  open,
  onOpenChange,
  groupId,
  currentUserId,
  members,
  onCreated,
}: AddExpenseDialogProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState<"even" | "custom">("even");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(members.map((m) => m.user_id))
  );
  const [creating, setCreating] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const selectedCount = selectedMembers.size;
  const evenSplitAmount =
    selectedCount > 0
      ? Math.round((parsedAmount / selectedCount) * 100) / 100
      : 0;

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (selectedCount === 0) {
      toast.error("Select at least one member to split with");
      return;
    }

    setCreating(true);
    try {
      let splits: { userId: string; amount: number }[];

      if (splitType === "even") {
        // Even split among selected members
        const perPerson = parsedAmount / selectedCount;
        splits = Array.from(selectedMembers).map((userId) => ({
          userId,
          amount: Math.round(perPerson * 100) / 100,
        }));

        // Adjust rounding difference on first split
        const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
        const diff = Math.round((parsedAmount - totalSplit) * 100) / 100;
        if (diff !== 0 && splits.length > 0) {
          splits[0].amount = Math.round((splits[0].amount + diff) * 100) / 100;
        }
      } else {
        // Custom splits
        splits = Array.from(selectedMembers).map((userId) => ({
          userId,
          amount: parseFloat(customSplits[userId] ?? "0") || 0,
        }));
      }

      await createExpense({
        groupId,
        paidBy: currentUserId,
        title: title.trim(),
        totalAmount: parsedAmount,
        splits,
      });

      toast.success(`Added "${title}" — $${parsedAmount.toFixed(2)}`);
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create expense"
      );
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setAmount("");
    setSplitType("even");
    setCustomSplits({});
    setSelectedMembers(new Set(members.map((m) => m.user_id)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Add Expense
          </DialogTitle>
          <DialogDescription>
            You paid — split it with the group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="expense-title">What&apos;s it for?</Label>
            <Input
              id="expense-title"
              placeholder="e.g., Dinner at Sushi Palace"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Total Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-background border-border pl-7"
              />
            </div>
          </div>

          {/* Split Type */}
          <div className="space-y-2">
            <Label>Split Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSplitType("even")}
                className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                  splitType === "even"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Split Evenly
              </button>
              <button
                onClick={() => setSplitType("custom")}
                className={`p-3 rounded-lg text-sm font-medium border transition-colors ${
                  splitType === "custom"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom Amounts
              </button>
            </div>
          </div>

          {/* Members to split with */}
          <div className="space-y-2">
            <Label>
              Split between ({selectedCount} member
              {selectedCount !== 1 ? "s" : ""})
            </Label>
            <div className="space-y-2">
              {members.map((member) => {
                const isSelected = selectedMembers.has(member.user_id);
                const isCurrentUser = member.user_id === currentUserId;
                return (
                  <div
                    key={member.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-background opacity-50"
                    }`}
                  >
                    <button
                      onClick={() => toggleMember(member.user_id)}
                      className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {member.user?.display_name ?? "Unknown"}
                        {isCurrentUser && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </p>
                    </div>
                    {splitType === "even" && isSelected ? (
                      <span className="text-sm font-medium text-primary">
                        ${evenSplitAmount.toFixed(2)}
                      </span>
                    ) : splitType === "custom" && isSelected ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={customSplits[member.user_id] ?? ""}
                        onChange={(e) =>
                          setCustomSplits((prev) => ({
                            ...prev,
                            [member.user_id]: e.target.value,
                          }))
                        }
                        className="w-24 h-8 text-sm bg-background border-border"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={creating || !title.trim() || parsedAmount <= 0}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Add ${parsedAmount > 0 ? parsedAmount.toFixed(2) : "0.00"}{" "}
                Expense
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
