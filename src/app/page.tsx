"use client";

import { LoginView } from "@/components/LoginView";
import { SkeletonView } from "@/components/SkeletonView";
import { AppShell } from "@/components/AppShell";
import { useCurrentUser } from "@/providers/UserProvider";
import { usePrivy } from "@privy-io/react-auth";
import { AnimatePresence, motion } from "motion/react";

export default function Home() {
  const { ready, authenticated, login } = usePrivy();
  const { user, loading } = useCurrentUser();

  return (
    <>
      {!authenticated && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <SkeletonView />
        </div>
      )}
      <AnimatePresence>
        {ready && !authenticated && <LoginView onLogin={login} />}
      </AnimatePresence>
      <AnimatePresence>
        {authenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 w-full min-h-screen"
          >
            <AppShell user={user} loading={loading} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
