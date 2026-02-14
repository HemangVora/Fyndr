"use client";

import { useRef, useEffect, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useSend } from "@/hooks/useSend";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import {
  Receipt,
  Users,
  DollarSign,
  ArrowRightLeft,
  Sparkles,
  Loader2,
  Send,
  QrCode,
} from "lucide-react";

interface ChatInterfaceProps {
  userId: string;
  userName: string;
  onSwitchToGroups?: () => void;
  onSwitchToPayment?: () => void;
}

const QUICK_ACTIONS = [
  {
    icon: Send,
    label: "Send Money",
    message: "I want to send money to someone",
    color: "text-green-400",
  },
  {
    icon: Receipt,
    label: "Scan Receipt",
    message: "I want to scan a receipt and split it",
    color: "text-pink-400",
  },
  {
    icon: DollarSign,
    label: "Check Balances",
    message: "Show me my balances across all groups",
    color: "text-yellow-400",
  },
  {
    icon: QrCode,
    label: "My QR Code",
    message: "Show my wallet QR code for receiving payments",
    color: "text-blue-400",
  },
];

export function ChatInterface({
  userId,
  userName,
  onSwitchToGroups,
  onSwitchToPayment,
}: ChatInterfaceProps) {
  const { messages, isStreaming, loaded, sendMessage } = useChat(userId);
  const { send } = useSend();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Payment confirmation callback — called from ToolResultCard
  const handlePaymentConfirm = useCallback(
    async (to: string, amount: string, memo: string): Promise<string | null> => {
      try {
        await send(to, amount, memo);
        // useSend sets txHash internally, but we need to return it
        // Since send throws on error, reaching here means success
        // We'll return a placeholder — the actual hash is shown by useSend
        return "confirmed";
      } catch {
        return null;
      }
    },
    [send]
  );

  const hasMessages = messages.length > 0;

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!hasMessages ? (
          <EmptyState
            userName={userName}
            onQuickAction={sendMessage}
            onSwitchToGroups={onSwitchToGroups}
            onSwitchToPayment={onSwitchToPayment}
          />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onPaymentConfirm={handlePaymentConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}

function EmptyState({
  userName,
  onQuickAction,
  onSwitchToGroups,
  onSwitchToPayment,
}: {
  userName: string;
  onQuickAction: (text: string) => void;
  onSwitchToGroups?: () => void;
  onSwitchToPayment?: () => void;
}) {
  const firstName = userName.split(/[@\s]/)[0];

  return (
    <div className="flex flex-col items-center pt-8 pb-4">
      {/* Greeting */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Hey {firstName}!</h2>
      </div>
      <p className="text-sm text-muted-foreground text-center mb-6">
        I can help you send payments, split bills, manage groups, and more.
      </p>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.message)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors border border-border/30"
            >
              <Icon className={`h-6 w-6 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* App cards */}
      <div className="w-full max-w-sm space-y-3">
        {onSwitchToGroups && (
          <button
            onClick={onSwitchToGroups}
            className="w-full p-4 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/20 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">SplitPay</p>
                <p className="text-xs text-muted-foreground">
                  Split bills and manage expense groups
                </p>
              </div>
            </div>
          </button>
        )}
        {onSwitchToPayment && (
          <button
            onClick={onSwitchToPayment}
            className="w-full p-4 rounded-xl bg-green-500/10 hover:bg-green-500/15 transition-colors border border-green-500/20 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">Payments</p>
                <p className="text-xs text-muted-foreground">
                  Send, receive, and request payments
                </p>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
