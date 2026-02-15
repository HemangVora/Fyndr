"use client";

import { useState, useEffect, useCallback } from "react";
import { getActivityFeed } from "@/services/activity";
import type { ActivityItem } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Receipt,
  Scale,
  Users,
  UserPlus,
  ExternalLink,
  ShoppingCart,
  CreditCard,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await getActivityFeed(userId);
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold mb-4">Activity</h2>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Activity className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Activity Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payments and expenses will show up here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold mb-4">Activity</h2>
      {items.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function FeedItem({ item }: { item: ActivityItem }) {
  const icon = getIcon(item.type);
  const timeAgo = formatDistanceToNow(new Date(item.created_at), {
    addSuffix: true,
  });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 hover:bg-secondary/30 transition-colors">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{item.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground truncate">
            {item.group_name}
          </span>
          {item.tx_hash && (
            <a
              href={`https://explore.moderato.tempo.xyz/tx/${item.tx_hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
            >
              tx
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
      {item.amount && (
        <span className="text-sm font-semibold text-primary shrink-0">
          ${item.amount.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function getIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "expense_added":
      return <Receipt className="h-4 w-4 text-primary" />;
    case "settlement":
      return <Scale className="h-4 w-4 text-primary" />;
    case "group_created":
      return <Users className="h-4 w-4 text-primary" />;
    case "member_joined":
      return <UserPlus className="h-4 w-4 text-primary" />;
    case "agent_order":
      return <ShoppingCart className="h-4 w-4 text-green-400" />;
    case "subscription_payment":
      return <CreditCard className="h-4 w-4 text-purple-400" />;
  }
}
