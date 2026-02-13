"use client";

import { createContext, useContext } from "react";
import { useUser } from "@/hooks/useUser";
import type { User } from "@/types";
import type { User as PrivyUserType } from "@privy-io/react-auth";

interface UserContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isReady: boolean;
  walletAddress: string | null;
  privyUser: PrivyUserType | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isReady: false,
  walletAddress: null,
  privyUser: null,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const userState = useUser();

  return (
    <UserContext.Provider value={userState}>{children}</UserContext.Provider>
  );
}

export function useCurrentUser() {
  return useContext(UserContext);
}
