"use client";

import { useState, useEffect } from "react";
import { getAllAgents } from "@/services/agents";
import { getRecentTransfers } from "@/services/agentTransfers";
import type { Agent, AgentTransfer } from "@/types";
import {
  Bot,
  ShoppingCart,
  RefreshCw,
  BarChart3,
  Package,
  Truck,
  MessageCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP: Record<string, typeof Bot> = {
  Bot,
  ShoppingCart,
  RefreshCw,
  BarChart3,
  Package,
  Truck,
};

interface AgentMarketplaceProps {
  onChatWithAgent?: () => void;
}

export function AgentMarketplace({ onChatWithAgent }: AgentMarketplaceProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transfers, setTransfers] = useState<AgentTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [agentData, transferData] = await Promise.all([
          getAllAgents(),
          getRecentTransfers(5),
        ]);
        setAgents(agentData);
        setTransfers(transferData);
      } catch (err) {
        console.error("Failed to load agent marketplace:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold">Agent Marketplace</h3>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const activeAgents = agents.filter((a) => a.status === "active");
  const comingSoonAgents = agents.filter((a) => a.status === "coming_soon");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold mb-3">Active Agents</h3>
        <div className="space-y-3">
          {activeAgents.map((agent) => {
            const IconComponent = ICON_MAP[agent.icon] ?? Bot;
            return (
              <div
                key={agent.id}
                className="p-4 rounded-xl bg-secondary/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center`}>
                    <IconComponent className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {agent.description}
                    </p>
                  </div>
                  {onChatWithAgent && (
                    <button
                      onClick={() => onChatWithAgent()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-medium text-primary"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Chat
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {comingSoonAgents.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 text-muted-foreground">Coming Soon</h3>
          <div className="space-y-3">
            {comingSoonAgents.map((agent) => {
              const IconComponent = ICON_MAP[agent.icon] ?? Bot;
              return (
                <div
                  key={agent.id}
                  className="p-4 rounded-xl bg-secondary/10 border border-border/20 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center">
                      <IconComponent className={`h-5 w-5 ${agent.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{agent.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {agent.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {transfers.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3">Recent Agent Activity</h3>
          <div className="space-y-2">
            {transfers.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-secondary/20"
              >
                <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">
                    {t.memo ?? t.transfer_type}
                    {t.to_agent ? ` → ${t.to_agent.name}` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}
                  </p>
                </div>
                <span className="text-xs font-medium shrink-0">${t.amount.toFixed(2)}</span>
                {t.tx_hash && (
                  <a
                    href={`https://explore.tempo.xyz/tx/${t.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
