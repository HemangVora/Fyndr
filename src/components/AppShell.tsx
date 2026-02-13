"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useBalance } from "@/hooks/useBalance";
import { useGroups } from "@/hooks/useGroups";
import type { User } from "@/types";
import {
  Users,
  Activity,
  LogOut,
  Wallet,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupList } from "@/components/GroupList";
import { GroupDetail } from "@/components/GroupDetail";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";

type Tab = "groups" | "feed" | "wallet";

interface AppShellProps {
  user: User | null;
  loading: boolean;
}

export function AppShell({ user, loading }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { logout } = usePrivy();
  const walletAddress = user?.wallet_address ?? "";
  const { balance, loading: balanceLoading } = useBalance(walletAddress);
  const { groups, loading: groupsLoading, refetch: refetchGroups } = useGroups(user?.id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">SplitPay</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            {balanceLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <p className="text-sm font-medium">${balance}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-4">
        {activeTab === "groups" && (
          <>
            {selectedGroupId ? (
              <GroupDetail
                groupId={selectedGroupId}
                currentUserId={user?.id ?? ""}
                onBack={() => setSelectedGroupId(null)}
                onAddExpense={() => {
                  // Phase 3 will implement this
                }}
              />
            ) : (
              <GroupList
                groups={groups}
                loading={groupsLoading}
                onGroupClick={setSelectedGroupId}
                onCreateClick={() => setShowCreateGroup(true)}
                userName={user?.display_name ?? "there"}
              />
            )}
          </>
        )}
        {activeTab === "feed" && <FeedPlaceholder />}
        {activeTab === "wallet" && (
          <WalletView
            walletAddress={walletAddress}
            balance={balance}
            user={user}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 flex items-center justify-around border-t border-border/50 px-2 py-2 bg-background/80 backdrop-blur-xl">
        <NavButton
          icon={<Users className="h-5 w-5" />}
          label="Groups"
          active={activeTab === "groups"}
          onClick={() => {
            setActiveTab("groups");
            setSelectedGroupId(null);
          }}
        />
        <NavButton
          icon={<Activity className="h-5 w-5" />}
          label="Feed"
          active={activeTab === "feed"}
          onClick={() => setActiveTab("feed")}
        />
        <NavButton
          icon={<Wallet className="h-5 w-5" />}
          label="Wallet"
          active={activeTab === "wallet"}
          onClick={() => setActiveTab("wallet")}
        />
      </nav>

      {/* Create Group Dialog */}
      {user && (
        <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          userId={user.id}
          onCreated={refetchGroups}
        />
      )}
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function FeedPlaceholder() {
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

function WalletView({
  walletAddress,
  balance,
  user,
}: {
  walletAddress: string;
  balance: string;
  user: User | null;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Your Balance</p>
        <p className="text-4xl font-bold mt-1">${balance}</p>
        <p className="text-xs text-muted-foreground mt-2">
          alphaUSD on Tempo Testnet
        </p>
      </div>
      <div className="space-y-3 mt-8">
        <InfoRow label="Name" value={user?.display_name ?? "—"} />
        <InfoRow label="Email" value={user?.email ?? "—"} />
        <InfoRow label="Phone" value={user?.phone ?? "—"} />
        <InfoRow
          label="Wallet"
          value={
            walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
