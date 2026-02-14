"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import {
  Receipt,
  Users,
  DollarSign,
  ArrowRightLeft,
  Sparkles,
  Loader2,
} from "lucide-react";

interface ChatInterfaceProps {
  userId: string;
  userName: string;
  onSwitchToGroups?: () => void;
}

const QUICK_ACTIONS = [
  {
    icon: Receipt,
    label: "Scan Receipt",
    message: "I want to scan a receipt and split it",
    color: "text-pink-400",
  },
  {
    icon: Users,
    label: "Create Group",
    message: "Help me create a new group",
    color: "text-blue-400",
  },
  {
    icon: DollarSign,
    label: "Check Balances",
    message: "Show me my balances across all groups",
    color: "text-green-400",
  },
  {
    icon: ArrowRightLeft,
    label: "Settle Up",
    message: "Help me settle up with my groups",
    color: "text-orange-400",
  },
];

export function ChatInterface({
  userId,
  userName,
  onSwitchToGroups,
}: ChatInterfaceProps) {
  const { messages, isStreaming, loaded, sendMessage } = useChat(userId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
          />
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
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
}: {
  userName: string;
  onQuickAction: (text: string) => void;
  onSwitchToGroups?: () => void;
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
        I&apos;m your SplitPay AI assistant. I can help you split bills, manage
        groups, and more.
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

      {/* SplitPay feature card */}
      {onSwitchToGroups && (
        <button
          onClick={onSwitchToGroups}
          className="w-full max-w-sm p-4 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/20 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">My Groups</p>
              <p className="text-xs text-muted-foreground">
                View and manage your expense groups
              </p>
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
