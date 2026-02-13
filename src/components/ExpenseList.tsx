"use client";

import { type ExpenseWithSplits } from "@/services/expenses";
import { Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExpenseListProps {
  expenses: ExpenseWithSplits[];
  currentUserId: string;
}

export function ExpenseList({ expenses, currentUserId }: ExpenseListProps) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => {
        const isPayer = expense.paid_by === currentUserId;
        const yourSplit = expense.splits.find(
          (s) => s.user_id === currentUserId
        );
        const timeAgo = formatDistanceToNow(new Date(expense.created_at), {
          addSuffix: true,
        });

        return (
          <div
            key={expense.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{expense.title}</p>
              <p className="text-xs text-muted-foreground">
                {isPayer
                  ? "You paid"
                  : `${expense.paid_by_user?.display_name ?? "Someone"} paid`}
                {" · "}
                {timeAgo}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold">
                ${expense.total_amount.toFixed(2)}
              </p>
              {yourSplit && !isPayer && (
                <p className="text-xs text-destructive">
                  you owe ${yourSplit.amount.toFixed(2)}
                </p>
              )}
              {isPayer && yourSplit && (
                <p className="text-xs text-primary">
                  your share ${yourSplit.amount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
