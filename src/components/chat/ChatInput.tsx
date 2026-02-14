"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (text: string, imageBase64?: string, imageMediaType?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<{
    base64: string;
    mediaType: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    if (!text.trim() && !imagePreview) return;

    onSend(text, imagePreview?.base64, imagePreview?.mediaType);
    setText("");
    setImagePreview(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, imagePreview, onSend, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      // Auto-resize
      const el = e.target;
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:image/...;base64, prefix
        const base64 = result.split(",")[1];
        setImagePreview({ base64, mediaType: file.type });
      };
      reader.readAsDataURL(file);

      // Reset file input
      e.target.value = "";
    },
    []
  );

  const canSend = !disabled && (text.trim() || imagePreview);

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl px-3 py-2">
      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2">
          <img
            src={`data:${imagePreview.mediaType};base64,${imagePreview.base64}`}
            alt="Upload preview"
            className="h-16 w-16 rounded-lg object-cover border border-border/50"
          />
          <button
            onClick={() => setImagePreview(null)}
            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Camera button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Camera className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask SplitPay AI..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-secondary/50 rounded-xl px-3.5 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
        />

        {/* Send button */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-9 w-9 flex-shrink-0 ${
            canSend
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground"
          }`}
          onClick={handleSubmit}
          disabled={!canSend}
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
