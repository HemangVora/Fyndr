"use client";

import { useState, useEffect, useCallback } from "react";
import { useSend } from "@/hooks/useSend";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { supabase } from "@/lib/supabase";
import type { PaymentRequest } from "@/services/payments";
import { QRCodeSVG } from "qrcode.react";
import {
  Send,
  QrCode,
  HandCoins,
  Check,
  Copy,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ScanLine,
  ExternalLink,
} from "lucide-react";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";

type PaymentView = "home" | "send" | "receive" | "request";

interface PaymentAppProps {
  userId: string;
  walletAddress: string;
  balance: string;
}

export function PaymentApp({ userId, walletAddress, balance }: PaymentAppProps) {
  const [view, setView] = useState<PaymentView>("home");

  return (
    <div>
      {view === "home" && (
        <PaymentHome
          userId={userId}
          walletAddress={walletAddress}
          balance={balance}
          onNavigate={setView}
        />
      )}
      {view === "send" && (
        <SendView onBack={() => setView("home")} />
      )}
      {view === "receive" && (
        <ReceiveView
          walletAddress={walletAddress}
          onBack={() => setView("home")}
        />
      )}
      {view === "request" && (
        <RequestView userId={userId} onBack={() => setView("home")} />
      )}
    </div>
  );
}

function PaymentHome({
  userId,
  walletAddress,
  balance,
  onNavigate,
}: {
  userId: string;
  walletAddress: string;
  balance: string;
  onNavigate: (view: PaymentView) => void;
}) {
  const { transactions, loading: txLoading } = useTransactionHistory(walletAddress);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payment_requests")
        .select("*, from_user:users!from_user_id(*), to_user:users!to_user_id(*)")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (data) setRequests(data as PaymentRequest[]);
    })();
  }, [userId]);

  return (
    <div className="space-y-6">
      {/* Balance */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Balance</p>
        <p className="text-3xl font-bold mt-1">${balance}</p>
        <p className="text-[10px] text-muted-foreground mt-1">USDC on Tempo</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate("send")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 hover:bg-green-500/15 border border-green-500/20 transition-colors"
        >
          <Send className="h-5 w-5 text-green-400" />
          <span className="text-xs font-medium">Send</span>
        </button>
        <button
          onClick={() => onNavigate("receive")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 transition-colors"
        >
          <QrCode className="h-5 w-5 text-blue-400" />
          <span className="text-xs font-medium">Receive</span>
        </button>
        <button
          onClick={() => onNavigate("request")}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/20 transition-colors"
        >
          <HandCoins className="h-5 w-5 text-orange-400" />
          <span className="text-xs font-medium">Request</span>
        </button>
      </div>

      {/* Pending Requests */}
      {requests.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Pending Requests</h3>
          <div className="space-y-2">
            {requests.map((req) => {
              const isIncoming = req.from_user_id === userId;
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {isIncoming
                        ? `${req.to_user?.display_name ?? "Someone"} requests`
                        : `You requested from ${req.from_user?.display_name ?? "Someone"}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${req.amount.toFixed(2)}
                      {req.memo ? ` - ${req.memo}` : ""}
                    </p>
                  </div>
                  {isIncoming && (
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      Pay
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div>
        <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
        {txLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No transactions yet
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.slice(0, 8).map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      tx.type === "send"
                        ? "bg-primary/10"
                        : "bg-green-500/10"
                    }`}
                  >
                    {tx.type === "send" ? (
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm">
                      {tx.type === "send" ? "Sent" : "Received"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.formattedTimestamp}
                      {tx.memo ? ` - ${tx.memo}` : ""}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    tx.type === "send"
                      ? "text-muted-foreground"
                      : "text-green-400"
                  }`}
                >
                  {tx.type === "send" ? "-" : "+"}${tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SendView({ onBack }: { onBack: () => void }) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const { send, isSending, error, txHash, reset } = useSend();

  const handleSend = async () => {
    if (!recipient || !amount) return;
    try {
      await send(recipient, amount, memo);
    } catch {
      // error is handled by useSend
    }
  };

  if (txHash) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <div>
          <p className="text-sm font-medium">Payment Sent!</p>
          <a
            href={`https://explore.moderato.tempo.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono mt-2"
          >
            {txHash.slice(0, 12)}...{txHash.slice(-8)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Button
          onClick={() => { reset(); onBack(); }}
          variant="outline"
          className="w-full"
        >
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Send Payment</h3>

      {showScanner && (
        <QRScanner
          onScan={(value) => {
            setRecipient(value);
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Recipient
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Email, phone, or 0x address"
              className="flex-1 bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary/50 hover:bg-secondary/80 border border-border/30 transition-colors"
              title="Scan QR code"
            >
              <ScanLine className="h-4.5 w-4.5 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Memo (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="What's this for?"
            className="w-full bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={isSending || !recipient || !amount}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send"
          )}
        </Button>
      </div>
    </div>
  );
}

function ReceiveView({
  walletAddress,
  onBack,
}: {
  walletAddress: string;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [walletAddress]);

  return (
    <div className="space-y-6 text-center">
      <h3 className="text-base font-semibold">Receive Payment</h3>

      <div className="flex justify-center">
        <div className="p-4 rounded-xl bg-white">
          <QRCodeSVG value={walletAddress} size={180} level="H" />
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Your Wallet Address</p>
        <button
          onClick={copyAddress}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
        >
          <span className="text-xs font-mono text-muted-foreground">
            {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
          </span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      <Button variant="outline" onClick={onBack} className="w-full">
        Done
      </Button>
    </div>
  );
}

function RequestView({
  userId,
  onBack,
}: {
  userId: string;
  onBack: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    if (!identifier || !amount) return;
    setSending(true);
    setError(null);

    try {
      // Find user
      const column = identifier.includes("@") ? "email" : "phone";
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .eq(column, identifier)
        .limit(1);
      let targetUser = users?.[0];

      if (!targetUser) {
        // Try by name
        const { data: nameResults } = await supabase
          .from("users")
          .select("*")
          .ilike("display_name", `%${identifier}%`)
          .limit(1);
        targetUser = nameResults?.[0];
      }

      if (!targetUser) {
        setError(`Could not find user "${identifier}"`);
        setSending(false);
        return;
      }

      await supabase.from("payment_requests").insert({
        from_user_id: targetUser.id,
        to_user_id: userId,
        amount: parseFloat(amount),
        memo: memo || null,
      });

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center py-8">
        <div className="h-16 w-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-medium">Payment Request Sent!</p>
          <p className="text-xs text-muted-foreground mt-1">
            Requested ${parseFloat(amount).toFixed(2)} from {identifier}
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="w-full">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Request Payment</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Request From
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Name, email, or phone"
            className="w-full bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Memo (optional)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="What's this for?"
            className="w-full bg-secondary/50 rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleRequest}
          disabled={sending || !identifier || !amount}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Request"
          )}
        </Button>
      </div>
    </div>
  );
}
