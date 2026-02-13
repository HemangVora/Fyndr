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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Users, Loader2 } from "lucide-react";
import { createGroup, addMemberByIdentifier } from "@/services/groups";
import { toast } from "sonner";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: () => void;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  userId,
  onCreated,
}: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const addMemberToList = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.includes(trimmed)) {
      toast.error("Already added");
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setMemberInput("");
  };

  const removeMemberFromList = (identifier: string) => {
    setMembers((prev) => prev.filter((m) => m !== identifier));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setCreating(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        createdBy: userId,
      });

      // Add members in parallel
      const memberPromises = members.map((identifier) =>
        addMemberByIdentifier(group.id, identifier).catch((err) => {
          console.error(`Failed to add ${identifier}:`, err);
          toast.error(`Failed to add ${identifier}`);
        })
      );
      await Promise.all(memberPromises);

      toast.success(`Group "${name}" created!`);
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create group"
      );
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setMemberInput("");
    setMembers([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Create Group
          </DialogTitle>
          <DialogDescription>
            Create a group to start splitting expenses with friends.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g., Friday Dinner Crew"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="group-desc">Description (optional)</Label>
            <Input
              id="group-desc"
              placeholder="e.g., Weekly dinner expenses"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Add Members */}
          <div className="space-y-2">
            <Label>Invite Members</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Email or phone number"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMemberToList();
                  }
                }}
                className="bg-background border-border"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addMemberToList}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add by email or phone — they don&apos;t need an account yet
            </p>
          </div>

          {/* Member List */}
          {members.length > 0 && (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50"
                >
                  <span className="text-sm truncate">{m}</span>
                  <button
                    onClick={() => removeMemberFromList(m)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
