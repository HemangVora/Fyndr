"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Loader2,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  computeSettlementPlan,
  buildSettlementMemo,
  recordSettlement,
  markSplitsSettled,
  type SettlementPlan,
} from "@/services/settlement";
import type { BalanceInput } from "@/services/debtSimplifier";
import { alphaUsd, tempoModerato } from "@/constants";
import { useWallets } from "@privy-io/react-auth";
import { tempoActions } from "tempo.ts/viem";
import {
  createWalletClient,
  custom,
  parseUnits,
  stringToHex,
  walletActions,
  type Address,
} from "viem";
import { toast } from "sonner";

interface SettleUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  currentUserId: string;
  balances: BalanceInput[];
  memberWallets: Map<string, string>; // userId → walletAddress
  onSettled: () => void;
}

export function SettleUpDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  currentUserId,
  balances,
  memberWallets,
  onSettled,
}: SettleUpDialogProps) {
  const { wallets } = useWallets();
  const [settling, setSettling] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const plan = computeSettlementPlan(balances);

  // Only show transfers where current user is the debtor
  const myTransfers = plan.transfers.filter((t) => t.from === currentUserId);
  const myTotalOwed = myTransfers.reduce((sum, t) => sum + t.amount, 0);

  const handleSettle = async () => {
    if (myTransfers.length === 0) return;

    const wallet = wallets[0];
    if (!wallet?.address) {
      toast.error("No wallet connected");
      return;
    }

    setSettling(true);
    try {
      const provider = await wallet.getEthereumProvider();
      const client = createWalletClient({
        account: wallet.address as Address,
        chain: tempo({ feeToken: alphaUsd }),
        transport: custom(provider),
      })
        .extend(walletActions)
        .extend(tempoActions());

      const metadata = await client.token.getMetadata({ token: alphaUsd });

      // Execute transfers sequentially for reliability
      // (batch/parallel if the SDK supports it in future)
      for (const transfer of myTransfers) {
        const recipientWallet = memberWallets.get(transfer.to);
        if (!recipientWallet) {
          toast.error(`No wallet found for ${transfer.toName}`);
          continue;
        }

        const memo = buildSettlementMemo(groupId, groupName);

        const { receipt } = await client.token.transferSync({
          to: recipientWallet as Address,
          amount: parseUnits(transfer.amount.toFixed(2), metadata.decimals),
          memo: stringToHex(memo),
          token: alphaUsd,
        });

        const hash = receipt.transactionHash;
        setTxHash(hash);

        // Record in database
        await recordSettlement({
          groupId,
          fromUserId: transfer.from,
          toUserId: transfer.to,
          amount: transfer.amount,
          txHash: hash,
          memo,
        });
      }

      // Mark splits as settled
      if (txHash || myTransfers.length > 0) {
        await markSplitsSettled(
          groupId,
          currentUserId,
          txHash ?? "batch-settled"
        );
      }

      toast.success("Settled up! All debts cleared.");
      onSettled();
    } catch (err) {
      console.error("Settlement failed:", err);
      toast.error(
        err instanceof Error ? err.message : "Settlement failed"
      );
    } finally {
      setSettling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            Settle Up
          </DialogTitle>
          <DialogDescription>
            {txHash
              ? "Settlement complete!"
              : `Review and confirm ${myTransfers.length} payment${myTransfers.length !== 1 ? "s" : ""}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Success state */}
          {txHash && (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg">All Settled!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ${myTotalOwed.toFixed(2)} paid via Tempo
                </p>
              </div>
              <a
                href={`https://explore.tempo.xyz/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
              <Button
                onClick={() => {
                  setTxHash(null);
                  onOpenChange(false);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}

          {/* Transfer list */}
          {!txHash && (
            <>
              {myTransfers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    You don&apos;t owe anything!
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {myTransfers.map((transfer, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm">You</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {transfer.toName}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-primary">
                          ${transfer.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold text-primary">
                      ${myTotalOwed.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Payments settle instantly on Tempo via alphaUSD stablecoins.
                    Memos are attached on-chain.
                  </p>

                  <Button
                    onClick={handleSettle}
                    disabled={settling}
                    className="w-full"
                    size="lg"
                  >
                    {settling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Settling...
                      </>
                    ) : (
                      <>
                        <Scale className="h-4 w-4 mr-2" />
                        Pay ${myTotalOwed.toFixed(2)}
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
