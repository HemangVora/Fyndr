"use client";

import { useState } from "react";
import type { User } from "@/types";
import type { GroupWithMembers } from "@/services/groups";
import { GroupList } from "@/components/GroupList";
import { GroupDetail } from "@/components/GroupDetail";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { PaymentApp } from "./PaymentApp";
import {
  Users,
  ArrowRightLeft,
  ChevronLeft,
} from "lucide-react";

type AppView = "home" | "splitpay" | "payment";

interface AppsTabProps {
  user: User;
  groups: GroupWithMembers[];
  groupsLoading: boolean;
  refetchGroups: () => void;
  walletAddress: string;
  balance: string;
}

export function AppsTab({
  user,
  groups,
  groupsLoading,
  refetchGroups,
  walletAddress,
  balance,
}: AppsTabProps) {
  const [view, setView] = useState<AppView>("home");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  if (view === "splitpay") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => { setView("home"); setSelectedGroupId(null); }}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Apps
        </button>
        {selectedGroupId ? (
          <GroupDetail
            groupId={selectedGroupId}
            currentUserId={user.id}
            onBack={() => setSelectedGroupId(null)}
          />
        ) : (
          <GroupList
            groups={groups}
            loading={groupsLoading}
            onGroupClick={setSelectedGroupId}
            onCreateClick={() => setShowCreateGroup(true)}
            userName={user.display_name ?? "there"}
          />
        )}
        <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          userId={user.id}
          onCreated={refetchGroups}
        />
      </div>
    );
  }

  if (view === "payment") {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setView("home")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Apps
        </button>
        <PaymentApp
          userId={user.id}
          walletAddress={walletAddress}
          balance={balance}
        />
      </div>
    );
  }

  // Home view — app cards
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Apps</h2>

      <div className="grid grid-cols-1 gap-3">
        {/* SplitPay App Card */}
        <button
          onClick={() => { setView("splitpay"); refetchGroups(); }}
          className="w-full p-5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors border border-primary/20 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">SplitPay</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Split bills, manage groups, track expenses
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
              {groups.length} groups
            </span>
          </div>
        </button>

        {/* Payment App Card */}
        <button
          onClick={() => setView("payment")}
          className="w-full p-5 rounded-xl bg-green-500/10 hover:bg-green-500/15 transition-colors border border-green-500/20 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <ArrowRightLeft className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold">Payments</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send, receive, and request payments
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-full">
              ${balance}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
