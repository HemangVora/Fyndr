import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, User } from "@/types";

export interface ExpenseWithSplits extends Expense {
  splits: (ExpenseSplit & { user?: User })[];
  paid_by_user?: User;
}

export interface BalanceEntry {
  userId: string;
  userName: string;
  amount: number; // positive = is owed money, negative = owes money
}

export async function createExpense(params: {
  groupId: string;
  paidBy: string;
  title: string;
  description?: string;
  totalAmount: number;
  splits: { userId: string; amount: number }[];
}): Promise<Expense> {
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: params.groupId,
      paid_by: params.paidBy,
      title: params.title,
      description: params.description ?? null,
      total_amount: params.totalAmount,
      currency: "USD",
    })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create expense: ${error.message}`);

  // Insert splits
  const splitInserts = params.splits.map((s) => ({
    expense_id: expense.id,
    user_id: s.userId,
    amount: s.amount,
  }));

  const { error: splitError } = await supabase
    .from("expense_splits")
    .insert(splitInserts);

  if (splitError)
    throw new Error(`Failed to create splits: ${splitError.message}`);

  // Log activity
  await supabase.from("activity_feed").insert({
    group_id: params.groupId,
    actor_id: params.paidBy,
    type: "expense_added",
    metadata: {
      title: params.title,
      amount: params.totalAmount,
      expense_id: expense.id,
    },
  });

  // Update group's updated_at
  await supabase
    .from("groups")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.groupId);

  return expense as Expense;
}

export async function getExpensesForGroup(
  groupId: string
): Promise<ExpenseWithSplits[]> {
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("*, paid_by_user:users!paid_by(*)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch expenses: ${error.message}`);
  if (!expenses || expenses.length === 0) return [];

  const expenseIds = expenses.map((e) => e.id);

  const { data: splits } = await supabase
    .from("expense_splits")
    .select("*, user:users(*)")
    .in("expense_id", expenseIds);

  return expenses.map((expense) => ({
    ...expense,
    splits: (splits ?? []).filter(
      (s) => s.expense_id === expense.id
    ) as (ExpenseSplit & { user?: User })[],
  })) as ExpenseWithSplits[];
}

export function calculateGroupBalances(
  expenses: ExpenseWithSplits[],
  members: { user_id: string; user: User }[]
): BalanceEntry[] {
  // Net balance per user: positive means they're owed, negative means they owe
  const netBalances = new Map<string, number>();

  // Initialize all members
  for (const member of members) {
    netBalances.set(member.user_id, 0);
  }

  for (const expense of expenses) {
    const payerId = expense.paid_by;

    // The payer paid the full amount
    netBalances.set(
      payerId,
      (netBalances.get(payerId) ?? 0) + expense.total_amount
    );

    // Each split represents what that person owes
    for (const split of expense.splits) {
      // Only count unsettled splits
      if (!split.is_settled) {
        netBalances.set(
          split.user_id,
          (netBalances.get(split.user_id) ?? 0) - split.amount
        );
      }
    }
  }

  // Build entries with user names
  const memberMap = new Map(
    members.map((m) => [m.user_id, m.user])
  );

  return Array.from(netBalances.entries())
    .map(([userId, amount]) => ({
      userId,
      userName: memberMap.get(userId)?.display_name ?? "Unknown",
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
    }))
    .sort((a, b) => a.amount - b.amount); // Most owes first
}
