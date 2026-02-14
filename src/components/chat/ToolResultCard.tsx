"use client";

import type { ToolResult } from "@/types/chat";
import {
  Users,
  Plus,
  UserPlus,
  Receipt,
  DollarSign,
  ArrowRightLeft,
  Search,
  Activity,
  AlertCircle,
  Info,
  Check,
} from "lucide-react";

const TOOL_CONFIG: Record<
  string,
  { label: string; icon: typeof Users; color: string }
> = {
  get_my_groups: { label: "Groups", icon: Users, color: "text-blue-400" },
  create_group: { label: "New Group", icon: Plus, color: "text-green-400" },
  add_group_member: {
    label: "Add Member",
    icon: UserPlus,
    color: "text-purple-400",
  },
  get_group_details: {
    label: "Group Details",
    icon: Info,
    color: "text-blue-400",
  },
  add_expense: {
    label: "Add Expense",
    icon: DollarSign,
    color: "text-green-400",
  },
  get_balances: {
    label: "Balances",
    icon: DollarSign,
    color: "text-yellow-400",
  },
  get_settlement_plan: {
    label: "Settlement Plan",
    icon: ArrowRightLeft,
    color: "text-orange-400",
  },
  parse_receipt_image: {
    label: "Parse Receipt",
    icon: Receipt,
    color: "text-pink-400",
  },
  search_user: { label: "Search User", icon: Search, color: "text-blue-400" },
  get_activity: {
    label: "Activity",
    icon: Activity,
    color: "text-purple-400",
  },
};

export function ToolResultCard({ toolResult }: { toolResult: ToolResult }) {
  const config = TOOL_CONFIG[toolResult.toolName] ?? {
    label: toolResult.toolName,
    icon: Info,
    color: "text-muted-foreground",
  };
  const Icon = config.icon;
  const result = toolResult.result;

  if (toolResult.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 my-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">{config.label} failed</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {(result as { error?: string }).error ?? "Unknown error"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3 my-2">
      <div className="flex items-center gap-2 text-sm mb-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className="font-medium">{config.label}</span>
        <Check className="h-3 w-3 text-green-400 ml-auto" />
      </div>
      <div className="text-xs text-muted-foreground">
        {renderResult(toolResult.toolName, result)}
      </div>
    </div>
  );
}

function renderResult(toolName: string, result: Record<string, unknown>) {
  switch (toolName) {
    case "get_my_groups": {
      const grps = (result.groups ?? []) as {
        name: string;
        member_count: number;
      }[];
      if (grps.length === 0) return <p>No groups found.</p>;
      return (
        <ul className="space-y-1">
          {grps.map((g, i) => (
            <li key={i} className="flex justify-between">
              <span>{g.name}</span>
              <span className="text-muted-foreground">
                {g.member_count} members
              </span>
            </li>
          ))}
        </ul>
      );
    }

    case "create_group": {
      const group = result.group as { name: string } | undefined;
      return <p>Created &quot;{group?.name}&quot;</p>;
    }

    case "add_group_member": {
      const user = result.user as { name: string; identifier: string } | undefined;
      return (
        <p>
          Added {user?.name ?? user?.identifier ?? "member"}
        </p>
      );
    }

    case "add_expense": {
      const expense = result.expense as {
        title: string;
        total: number;
        split_count: number;
        per_person: number;
      } | undefined;
      if (!expense) return <p>Expense added.</p>;
      return (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{expense.title}</p>
          <p>
            ${expense.total.toFixed(2)} split {expense.split_count} ways ($
            {expense.per_person.toFixed(2)} each)
          </p>
        </div>
      );
    }

    case "get_balances": {
      const balances = (result.balances ?? []) as {
        name: string;
        status: string;
      }[];
      return (
        <ul className="space-y-1">
          {balances.map((b, i) => (
            <li key={i} className="flex justify-between">
              <span>{b.name}</span>
              <span>{b.status}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "get_settlement_plan": {
      const transfers = (result.transfers ?? []) as {
        from: string;
        to: string;
        amount: string;
      }[];
      if (transfers.length === 0) return <p>Everyone is settled up!</p>;
      return (
        <ul className="space-y-1">
          {transfers.map((t, i) => (
            <li key={i}>
              {t.from} → {t.to}: {t.amount}
            </li>
          ))}
        </ul>
      );
    }

    case "parse_receipt_image": {
      const receipt = result.receipt as {
        merchant?: string;
        items?: { name: string; price: number }[];
        total?: number;
      } | undefined;
      if (!receipt) return <p>Receipt parsed.</p>;
      return (
        <div className="space-y-1">
          {receipt.merchant && (
            <p className="font-medium text-foreground">{receipt.merchant}</p>
          )}
          {receipt.items && (
            <ul>
              {receipt.items.slice(0, 5).map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </li>
              ))}
              {receipt.items.length > 5 && (
                <li className="text-muted-foreground">
                  +{receipt.items.length - 5} more items
                </li>
              )}
            </ul>
          )}
          {receipt.total != null && (
            <p className="font-medium text-foreground border-t border-border/50 pt-1 mt-1">
              Total: ${receipt.total.toFixed(2)}
            </p>
          )}
        </div>
      );
    }

    case "search_user": {
      if (!(result.found as boolean)) return <p>User not found.</p>;
      const user = result.user as { name: string; email?: string } | undefined;
      return <p>Found: {user?.name ?? user?.email ?? "user"}</p>;
    }

    case "get_activity": {
      const activities = (result.activities ?? []) as {
        description: string;
        group: string;
      }[];
      if (activities.length === 0) return <p>No recent activity.</p>;
      return (
        <ul className="space-y-1">
          {activities.slice(0, 5).map((a, i) => (
            <li key={i}>
              <span>{a.description}</span>
              <span className="text-muted-foreground ml-1">in {a.group}</span>
            </li>
          ))}
        </ul>
      );
    }

    default:
      return <p>Done.</p>;
  }
}
