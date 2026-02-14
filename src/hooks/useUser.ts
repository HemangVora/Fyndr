"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { upsertUser } from "@/services/user";
import type { User } from "@/types";

export function useUser() {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncUser = useCallback(async () => {
    if (!ready || !authenticated || !privyUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    const walletAddress = privyUser.wallet?.address;
    if (!walletAddress) {
      // Wallet is still being provisioned by Privy — keep loading and retry
      retryRef.current = setTimeout(() => {
        // Force re-check by calling syncUser again
        syncUser();
      }, 1000);
      return;
    }

    try {
      const email = privyUser.email?.address ?? null;
      const phone = privyUser.phone?.number ?? null;

      const dbUser = await upsertUser({
        privyId: privyUser.id,
        walletAddress,
        email,
        phone,
        displayName: email ?? phone ?? null,
      });

      setUser(dbUser);
    } catch (err) {
      console.error("Failed to sync user:", err);
    } finally {
      setLoading(false);
    }
  }, [ready, authenticated, privyUser]);

  useEffect(() => {
    syncUser();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [syncUser]);

  return {
    user,
    loading,
    isAuthenticated: authenticated,
    isReady: ready,
    walletAddress: privyUser?.wallet?.address ?? null,
    privyUser,
    refreshUser: syncUser,
  };
}
