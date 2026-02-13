import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Receipt, Zap, Users } from "lucide-react";

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-background"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="flex flex-col items-center space-y-8 px-6 max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Receipt className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            SplitPay
          </h1>
          <p className="text-center text-sm text-muted-foreground leading-relaxed">
            Split bills with friends. Settle up instantly.
            <br />
            No crypto knowledge needed.
          </p>
        </div>

        {/* Features */}
        <div className="w-full space-y-3">
          <Feature
            icon={<Users className="w-4 h-4" />}
            text="Add friends by email or phone"
          />
          <Feature
            icon={<Receipt className="w-4 h-4" />}
            text="AI scans receipts and splits bills"
          />
          <Feature
            icon={<Zap className="w-4 h-4" />}
            text="Settle up in under 1 second"
          />
        </div>

        {/* Login Button */}
        <Button
          onClick={onLogin}
          size="lg"
          className="w-full py-6 text-base font-semibold"
        >
          Get Started
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Powered by Tempo &middot; Instant stablecoin payments
        </p>
      </motion.div>
    </motion.div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}
