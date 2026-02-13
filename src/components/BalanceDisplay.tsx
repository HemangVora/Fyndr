"use client";

import { type BalanceEntry } from "@/services/expenses";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

interface BalanceDisplayProps {
  balances: BalanceEntry[];
  currentUserId: string;
}

export function BalanceDisplay({
  balances,
  currentUserId,
}: BalanceDisplayProps) {
  if (balances.length === 0) {
    return (
      <div className="p-6 rounded-xl border border-dashed border-border/50 text-center">
        <p className="text-sm text-muted-foreground">
          No expenses yet — add one to see balances
        </p>
      </div>
    );
  }

  const allZero = balances.every((b) => b.amount === 0);
  if (allZero) {
    return (
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <p className="text-sm text-primary font-medium">All settled up!</p>
      </div>
    );
  }

  const currentUserBalance = balances.find((b) => b.userId === currentUserId);

  return (
    <div className="space-y-3">
      {/* Your summary */}
      {currentUserBalance && currentUserBalance.amount !== 0 && (
        <div
          className={`p-4 rounded-xl border ${
            currentUserBalance.amount > 0
              ? "bg-primary/5 border-primary/20"
              : "bg-destructive/5 border-destructive/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {currentUserBalance.amount > 0 ? (
              <TrendingUp className="h-4 w-4 text-primary" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <p className="text-sm font-medium">
              {currentUserBalance.amount > 0 ? (
                <span className="text-primary">
                  You are owed ${currentUserBalance.amount.toFixed(2)}
                </span>
              ) : (
                <span className="text-destructive">
                  You owe ${Math.abs(currentUserBalance.amount).toFixed(2)}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* All members */}
      <div className="space-y-1.5">
        {balances
          .filter((b) => b.amount !== 0)
          .map((balance) => {
            const isCurrentUser = balance.userId === currentUserId;
            return (
              <div
                key={balance.userId}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
              >
                <span className="text-sm truncate">
                  {isCurrentUser ? "You" : balance.userName}
                </span>
                <span
                  className={`text-sm font-medium ${
                    balance.amount > 0
                      ? "text-primary"
                      : "text-destructive"
                  }`}
                >
                  {balance.amount > 0 ? "+" : ""}
                  {balance.amount.toFixed(2)}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
