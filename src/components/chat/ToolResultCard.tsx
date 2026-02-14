"use client";

import { useState } from "react";
import type { ToolResult } from "@/types/chat";
import { QRCodeSVG } from "qrcode.react";
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
  Send,
  QrCode,
  HandCoins,
  Loader2,
  Inbox,
  Bot,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  RefreshCw,
  Zap,
} from "lucide-react";

interface ToolResultCardProps {
  toolResult: ToolResult;
  onPaymentConfirm?: (to: string, amount: string, memo: string) => Promise<string | null>;
}

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
  prepare_payment: {
    label: "Send Payment",
    icon: Send,
    color: "text-green-400",
  },
  request_payment: {
    label: "Payment Request",
    icon: HandCoins,
    color: "text-orange-400",
  },
  get_wallet_info: {
    label: "Wallet QR",
    icon: QrCode,
    color: "text-blue-400",
  },
  get_payment_requests: {
    label: "Payment Requests",
    icon: Inbox,
    color: "text-purple-400",
  },
  browse_agents: {
    label: "Agent Marketplace",
    icon: Bot,
    color: "text-blue-400",
  },
  browse_products: {
    label: "Products",
    icon: ShoppingCart,
    color: "text-green-400",
  },
  create_order: {
    label: "New Order",
    icon: ShoppingCart,
    color: "text-green-400",
  },
  get_my_orders: {
    label: "Orders",
    icon: ClipboardList,
    color: "text-blue-400",
  },
  browse_subscriptions: {
    label: "Subscriptions",
    icon: CreditCard,
    color: "text-purple-400",
  },
  manage_subscription: {
    label: "Subscription",
    icon: RefreshCw,
    color: "text-purple-400",
  },
  get_agent_activity: {
    label: "Agent Activity",
    icon: Zap,
    color: "text-yellow-400",
  },
};

export function ToolResultCard({ toolResult, onPaymentConfirm }: ToolResultCardProps) {
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

  // Special card for prepare_payment — needs confirm button
  if (toolResult.toolName === "prepare_payment" && result.ready) {
    return (
      <PaymentConfirmCard
        result={result}
        onConfirm={onPaymentConfirm}
      />
    );
  }

  // Special card for wallet QR
  if (toolResult.toolName === "get_wallet_info" && result.wallet_address) {
    return <WalletQRCard walletAddress={result.wallet_address as string} />;
  }

  // Special card for order confirmation
  if (toolResult.toolName === "create_order" && result.action === "confirm_order") {
    return <OrderConfirmCard result={result} onConfirm={onPaymentConfirm} />;
  }

  // Special card for subscription confirmation
  if (toolResult.toolName === "manage_subscription" && result.action === "confirm_subscription") {
    return <SubscriptionConfirmCard result={result} onConfirm={onPaymentConfirm} />;
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

function PaymentConfirmCard({
  result,
  onConfirm,
}: {
  result: Record<string, unknown>;
  onConfirm?: (to: string, amount: string, memo: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<"ready" | "sending" | "sent" | "error">("ready");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!onConfirm || status !== "ready") return;
    setStatus("sending");
    try {
      const hash = await onConfirm(
        result.recipient_address as string,
        result.amount as string,
        (result.memo as string) ?? ""
      );
      if (hash) {
        setTxHash(hash);
        setStatus("sent");
      } else {
        setError("Transaction failed");
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 my-2">
      <div className="flex items-center gap-2 text-sm mb-2">
        <Send className="h-4 w-4 text-green-400" />
        <span className="font-medium">Send Payment</span>
        {status === "sent" && <Check className="h-3 w-3 text-green-400 ml-auto" />}
      </div>

      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">To</span>
          <span className="font-medium text-foreground">
            {result.recipient_name as string}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-medium text-foreground">
            ${parseFloat(result.amount as string).toFixed(2)}
          </span>
        </div>
        {(result.memo as string) && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Memo</span>
            <span className="text-foreground">{result.memo as string}</span>
          </div>
        )}
      </div>

      {status === "ready" && (
        <button
          onClick={handleConfirm}
          className="w-full mt-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
        >
          Confirm & Send
        </button>
      )}
      {status === "sending" && (
        <div className="flex items-center justify-center gap-2 mt-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Sending...
        </div>
      )}
      {status === "sent" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-green-400 font-medium">Payment sent!</p>
          {txHash && (
            <p className="text-[10px] text-muted-foreground font-mono mt-1">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
        </div>
      )}
      {status === "error" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => { setStatus("ready"); setError(null); }}
            className="text-xs text-primary mt-1 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function WalletQRCard({ walletAddress }: { walletAddress: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 my-2">
      <div className="flex items-center gap-2 text-sm mb-3">
        <QrCode className="h-4 w-4 text-blue-400" />
        <span className="font-medium">Your Wallet</span>
      </div>
      <div className="flex justify-center mb-3">
        <div className="p-3 rounded-lg bg-white">
          <QRCodeSVG value={walletAddress} size={140} level="H" />
        </div>
      </div>
      <button
        onClick={() => {
          navigator.clipboard.writeText(walletAddress);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="w-full py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors text-center"
      >
        {copied ? "Copied!" : `${walletAddress.slice(0, 12)}...${walletAddress.slice(-8)}`}
      </button>
    </div>
  );
}

function OrderConfirmCard({
  result,
  onConfirm,
}: {
  result: Record<string, unknown>;
  onConfirm?: (to: string, amount: string, memo: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<"ready" | "sending" | "sent" | "error">("ready");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = (result.items ?? []) as { name: string; price: number; quantity: number }[];
  const total = result.total as number;
  const subtotal = result.subtotal as number;
  const fees = result.fees as number;
  const orderId = result.order_id as string;

  const handleConfirm = async () => {
    if (!onConfirm || status !== "ready") return;
    setStatus("sending");
    try {
      const hash = await onConfirm(
        result.agent_wallet as string,
        total.toString(),
        `order:${orderId}`
      );
      if (hash) {
        setTxHash(hash);
        setStatus("sent");
        // Confirm the order on the backend
        fetch("/api/commerce/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, txHash: hash }),
        }).catch(() => {});
      } else {
        setError("Transaction failed");
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 my-2">
      <div className="flex items-center gap-2 text-sm mb-2">
        <ShoppingCart className="h-4 w-4 text-green-400" />
        <span className="font-medium">New Order</span>
        {status === "sent" && <Check className="h-3 w-3 text-green-400 ml-auto" />}
      </div>

      <div className="text-xs space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span className="text-foreground">
              {item.name} x{item.quantity}
            </span>
            <span className="font-medium text-foreground">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
        <div className="border-t border-border/50 pt-1 mt-1 space-y-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Agent Fee (2%)</span>
            <span>${fees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium text-foreground">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-muted-foreground">Paying</span>
          <span className="text-foreground">{result.agent_name as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network</span>
          <span className="text-foreground">Tempo (on-chain)</span>
        </div>
      </div>

      {status === "ready" && (
        <button
          onClick={handleConfirm}
          className="w-full mt-3 py-2 rounded-lg bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors"
        >
          Confirm & Pay ${total.toFixed(2)}
        </button>
      )}
      {status === "sending" && (
        <div className="flex items-center justify-center gap-2 mt-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processing payment...
        </div>
      )}
      {status === "sent" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-green-400 font-medium">Order Confirmed!</p>
          {txHash && (
            <p className="text-[10px] text-muted-foreground font-mono mt-1">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Estimated delivery: ~45 min
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => { setStatus("ready"); setError(null); }}
            className="text-xs text-primary mt-1 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function SubscriptionConfirmCard({
  result,
  onConfirm,
}: {
  result: Record<string, unknown>;
  onConfirm?: (to: string, amount: string, memo: string) => Promise<string | null>;
}) {
  const [status, setStatus] = useState<"ready" | "sending" | "sent" | "error">("ready");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = result.amount as number;
  const subscriptionId = result.subscription_id as string;

  const handleConfirm = async () => {
    if (!onConfirm || status !== "ready") return;
    setStatus("sending");
    try {
      const hash = await onConfirm(
        result.agent_wallet as string,
        amount.toString(),
        `subscription:${subscriptionId}`
      );
      if (hash) {
        setTxHash(hash);
        setStatus("sent");
        fetch("/api/subscriptions/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId, txHash: hash }),
        }).catch(() => {});
      } else {
        setError("Transaction failed");
        setStatus("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 my-2">
      <div className="flex items-center gap-2 text-sm mb-2">
        <CreditCard className="h-4 w-4 text-purple-400" />
        <span className="font-medium">Subscribe</span>
        {status === "sent" && <Check className="h-3 w-3 text-green-400 ml-auto" />}
      </div>

      <div className="text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Plan</span>
          <span className="font-medium text-foreground">{result.plan_name as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-medium text-foreground">
            ${amount.toFixed(2)}/{result.interval as string}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Paying</span>
          <span className="text-foreground">{result.agent_name as string}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Network</span>
          <span className="text-foreground">Tempo (on-chain)</span>
        </div>
      </div>

      {status === "ready" && (
        <button
          onClick={handleConfirm}
          className="w-full mt-3 py-2 rounded-lg bg-purple-500 text-white text-xs font-medium hover:bg-purple-600 transition-colors"
        >
          Confirm & Pay ${amount.toFixed(2)}
        </button>
      )}
      {status === "sending" && (
        <div className="flex items-center justify-center gap-2 mt-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Processing payment...
        </div>
      )}
      {status === "sent" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-purple-400 font-medium">Subscribed!</p>
          {txHash && (
            <p className="text-[10px] text-muted-foreground font-mono mt-1">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            Next payment: {new Date(result.next_payment_at as string).toLocaleDateString()}
          </p>
        </div>
      )}
      {status === "error" && (
        <div className="mt-3 py-2 text-center">
          <p className="text-xs text-destructive">{error}</p>
          <button
            onClick={() => { setStatus("ready"); setError(null); }}
            className="text-xs text-primary mt-1 underline"
          >
            Try again
          </button>
        </div>
      )}
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
              {t.from} &rarr; {t.to}: {t.amount}
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

    case "request_payment": {
      const req = result.request as {
        from_name: string;
        amount: string;
        memo?: string | null;
      } | undefined;
      if (!req) return <p>Payment request sent.</p>;
      return (
        <p>
          Requested {req.amount} from {req.from_name}
          {req.memo ? ` - "${req.memo}"` : ""}
        </p>
      );
    }

    case "get_payment_requests": {
      const reqs = (result.requests ?? []) as {
        type: string;
        from: string;
        to: string;
        amount: string;
        memo?: string | null;
      }[];
      if (reqs.length === 0) return <p>No pending payment requests.</p>;
      return (
        <ul className="space-y-1">
          {reqs.map((r, i) => (
            <li key={i}>
              {r.type === "incoming"
                ? `${r.from} owes you ${r.amount}`
                : `You owe ${r.to} ${r.amount}`}
              {r.memo ? ` - "${r.memo}"` : ""}
            </li>
          ))}
        </ul>
      );
    }

    case "browse_agents": {
      const agentList = (result.agents ?? []) as {
        name: string;
        description: string;
        status: string;
        capabilities: string[];
      }[];
      if (agentList.length === 0) return <p>No agents available.</p>;
      const active = agentList.filter((a) => a.status === "active");
      const comingSoon = agentList.filter((a) => a.status === "coming_soon");
      return (
        <div className="space-y-2">
          {active.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1">Active Agents</p>
              <ul className="space-y-1">
                {active.map((a, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">{a.name}</span>
                    <span className="text-muted-foreground ml-1">— {a.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {comingSoon.length > 0 && (
            <div>
              <p className="font-medium text-muted-foreground mb-1">Coming Soon</p>
              <ul className="space-y-1">
                {comingSoon.map((a, i) => (
                  <li key={i} className="text-muted-foreground">
                    {a.name} — {a.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case "browse_products": {
      const products = (result.products ?? []) as {
        name: string;
        price: number;
        category: string;
        emoji: string;
        id: string;
      }[];
      if (products.length === 0) return <p>No products found.</p>;
      return (
        <ul className="space-y-1">
          {products.map((p, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {p.emoji} {p.name}
              </span>
              <span className="font-medium text-foreground">${p.price.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      );
    }

    case "get_my_orders": {
      const orders = (result.orders ?? []) as {
        id: string;
        total: number;
        status: string;
        agent_name: string;
        created_at: string;
        items: { name: string }[];
      }[];
      if (orders.length === 0) return <p>No orders yet.</p>;
      return (
        <ul className="space-y-2">
          {orders.map((o, i) => (
            <li key={i} className="border-b border-border/30 pb-1 last:border-0">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">
                  {o.items.map((it) => it.name).join(", ").slice(0, 40)}
                </span>
                <span className="font-medium text-foreground">${o.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{o.agent_name}</span>
                <span className={
                  o.status === "paid" ? "text-green-400" :
                  o.status === "delivered" ? "text-blue-400" :
                  "text-yellow-400"
                }>{o.status}</span>
              </div>
            </li>
          ))}
        </ul>
      );
    }

    case "browse_subscriptions": {
      const plans = (result.plans ?? []) as {
        id: string;
        name: string;
        amount: number;
        interval: string;
        description: string;
        features: string[];
      }[];
      const activeSubs = (result.active_subscriptions ?? []) as {
        plan_name: string;
        amount: number;
        interval: string;
        status: string;
      }[];
      return (
        <div className="space-y-2">
          {activeSubs.length > 0 && (
            <div>
              <p className="font-medium text-foreground mb-1">Your Subscriptions</p>
              <ul className="space-y-1">
                {activeSubs.map((s, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-foreground">{s.plan_name}</span>
                    <span className="text-green-400">${s.amount.toFixed(2)}/{s.interval}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="font-medium text-foreground mb-1">Available Plans</p>
            <ul className="space-y-1">
              {plans.map((p, i) => (
                <li key={i}>
                  <div className="flex justify-between">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-foreground">${p.amount.toFixed(2)}/{p.interval}</span>
                  </div>
                  <p className="text-muted-foreground">{p.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }

    case "manage_subscription": {
      if (result.success) {
        return (
          <p>
            Subscription {result.action as string}
            {(result.action as string) === "cancel" ? "led" : "d"} successfully.
          </p>
        );
      }
      return <p>Done.</p>;
    }

    case "get_agent_activity": {
      const transfers = (result.transfers ?? []) as {
        type: string;
        amount: number;
        tx_hash: string | null;
        memo: string | null;
        from_agent: string | null;
        to_agent: string | null;
        created_at: string;
      }[];
      if (transfers.length === 0) return <p>No agent activity yet.</p>;
      return (
        <ul className="space-y-1">
          {transfers.map((t, i) => (
            <li key={i} className="flex justify-between">
              <span>
                {t.memo ?? t.type}
                {t.to_agent ? ` → ${t.to_agent}` : ""}
              </span>
              <span className="font-medium text-foreground">${t.amount.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      );
    }

    default:
      return <p>Done.</p>;
  }
}
