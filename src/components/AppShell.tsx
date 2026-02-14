"use client";

import { useState, useCallback } from "react";
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
  Loader2,
  RefreshCw,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupList } from "@/components/GroupList";
import { GroupDetail } from "@/components/GroupDetail";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";
import { ActivityFeed } from "@/components/ActivityFeed";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useCurrentUser } from "@/providers/UserProvider";

type Tab = "chat" | "groups" | "feed" | "wallet";

interface AppShellProps {
  user: User | null;
  loading: boolean;
}

export function AppShell({ user, loading }: AppShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { logout } = usePrivy();
  const { refreshUser } = useCurrentUser();
  const walletAddress = user?.wallet_address ?? "";
  const { balance, loading: balanceLoading } = useBalance(walletAddress);
  const { groups, loading: groupsLoading, refetch: refetchGroups } = useGroups(user?.id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up your wallet...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Could not load your account. Please try again.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={refreshUser} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="ghost" onClick={logout}>
            Log Out
          </Button>
        </div>
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
      <main className={`flex-1 ${activeTab === "chat" ? "" : "p-4"} overflow-hidden`}>
        {activeTab === "chat" && (
          <ChatInterface
            userId={user.id}
            userName={user.display_name ?? user.email ?? "there"}
            onSwitchToGroups={() => {
              setActiveTab("groups");
              setSelectedGroupId(null);
            }}
          />
        )}
        {activeTab === "groups" && (
          <>
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
          </>
        )}
        {activeTab === "feed" && <ActivityFeed userId={user.id} />}
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
          icon={<MessageCircle className="h-5 w-5" />}
          label="Chat"
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
        />
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
      <CreateGroupDialog
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
        userId={user.id}
        onCreated={refetchGroups}
      />
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

function WalletView({
  walletAddress,
  balance,
  user,
}: {
  walletAddress: string;
  balance: string;
  user: User | null;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

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
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50">
          <span className="text-sm text-muted-foreground">Wallet</span>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
          >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : "—"}
            {walletAddress && (
              copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )
            )}
          </button>
        </div>
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
