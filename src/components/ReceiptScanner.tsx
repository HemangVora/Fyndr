"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  Loader2,
  X,
  Check,
  Sparkles,
} from "lucide-react";
import type { ParsedReceipt, ReceiptItem } from "@/types";
import type { User } from "@/types";
import { toast } from "sonner";

interface ReceiptScannerProps {
  members: { user_id: string; user: User }[];
  currentUserId: string;
  onExpenseReady: (params: {
    title: string;
    totalAmount: number;
    splits: { userId: string; amount: number }[];
  }) => void;
  onCancel: () => void;
}

interface ItemAssignment {
  item: ReceiptItem;
  assignedTo: Set<string>; // user IDs
}

export function ReceiptScanner({
  members,
  currentUserId,
  onExpenseReady,
  onCancel,
}: ReceiptScannerProps) {
  const [step, setStep] = useState<"upload" | "scanning" | "assign">(
    "upload"
  );
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Scan
    setStep("scanning");
    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/receipt", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to scan receipt");
      }

      const data = await res.json();
      const parsed = data.receipt as ParsedReceipt;
      setReceipt(parsed);

      // Initialize assignments — each item assigned to everyone by default
      const allMemberIds = new Set(members.map((m) => m.user_id));
      setAssignments(
        parsed.items.map((item) => ({
          item,
          assignedTo: new Set(allMemberIds),
        }))
      );

      setStep("assign");
      toast.success(
        `Found ${parsed.items.length} items from ${parsed.merchant ?? "receipt"}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to scan receipt"
      );
      setStep("upload");
    }
  };

  const toggleAssignment = (itemIdx: number, userId: string) => {
    setAssignments((prev) =>
      prev.map((a, i) => {
        if (i !== itemIdx) return a;
        const next = new Set(a.assignedTo);
        if (next.has(userId)) {
          next.delete(userId);
        } else {
          next.add(userId);
        }
        return { ...a, assignedTo: next };
      })
    );
  };

  const handleConfirm = () => {
    if (!receipt) return;

    // Calculate per-person amounts
    const perPerson = new Map<string, number>();
    for (const member of members) {
      perPerson.set(member.user_id, 0);
    }

    for (const assignment of assignments) {
      const count = assignment.assignedTo.size;
      if (count === 0) continue;
      const perPersonAmount = assignment.item.price / count;
      for (const userId of assignment.assignedTo) {
        perPerson.set(
          userId,
          (perPerson.get(userId) ?? 0) + perPersonAmount
        );
      }
    }

    // Add tax/tip proportionally
    const subtotal = assignments.reduce((sum, a) => sum + a.item.price, 0);
    const extras = (receipt.tax ?? 0) + (receipt.tip ?? 0);
    if (extras > 0 && subtotal > 0) {
      for (const [userId, amount] of perPerson) {
        const proportion = amount / subtotal;
        perPerson.set(userId, amount + extras * proportion);
      }
    }

    const splits = Array.from(perPerson.entries())
      .filter(([, amount]) => amount > 0)
      .map(([userId, amount]) => ({
        userId,
        amount: Math.round(amount * 100) / 100,
      }));

    onExpenseReady({
      title: receipt.merchant ?? "Receipt expense",
      totalAmount: receipt.total,
      splits,
    });
  };

  // Upload step
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Receipt Scanner
          </h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-colors"
        >
          <div className="p-3 rounded-full bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              Take a photo or upload receipt
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              AI will extract items and prices
            </p>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    );
  }

  // Scanning step
  if (step === "scanning") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Scanning Receipt...
          </h3>
        </div>
        {previewUrl && (
          <div className="rounded-xl overflow-hidden border border-border/50 max-h-48">
            <img
              src={previewUrl}
              alt="Receipt"
              className="w-full h-auto object-contain"
            />
          </div>
        )}
        <div className="flex items-center justify-center gap-3 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            AI is reading your receipt...
          </p>
        </div>
      </div>
    );
  }

  // Assignment step
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {receipt?.merchant ?? "Receipt"} — ${receipt?.total.toFixed(2)}
        </h3>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tap names to assign items. Each person pays for their items.
      </p>

      <div className="space-y-3 max-h-[40vh] overflow-y-auto">
        {assignments.map((assignment, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg bg-secondary/30 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {assignment.item.name}
              </span>
              <span className="text-sm text-primary font-medium">
                ${assignment.item.price.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((member) => {
                const isAssigned = assignment.assignedTo.has(
                  member.user_id
                );
                return (
                  <button
                    key={member.user_id}
                    onClick={() => toggleAssignment(idx, member.user_id)}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      isAssigned
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-secondary/50 text-muted-foreground border border-transparent"
                    }`}
                  >
                    {member.user_id === currentUserId
                      ? "You"
                      : (member.user?.display_name ?? "?").split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tax/Tip info */}
      {receipt && (receipt.tax || receipt.tip) && (
        <div className="text-xs text-muted-foreground space-y-1 px-1">
          {receipt.tax && <p>Tax: ${receipt.tax.toFixed(2)} (split proportionally)</p>}
          {receipt.tip && <p>Tip: ${receipt.tip.toFixed(2)} (split proportionally)</p>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm}>
          <Check className="h-4 w-4 mr-2" />
          Create Split
        </Button>
      </div>
    </div>
  );
}
