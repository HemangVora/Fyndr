"use client";

import type { ChatMessage as ChatMessageType } from "@/types/chat";
import { ToolResultCard } from "./ToolResultCard";
import { Loader2, User, Bot } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  onPaymentConfirm?: (to: string, amount: string, memo: string) => Promise<string | null>;
}

export function ChatMessage({ message, onPaymentConfirm }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
          isUser ? "bg-primary/20" : "bg-secondary"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Bot className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div
        className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Image preview for user messages */}
        {isUser && message.imageBase64 && (
          <div className="mb-1.5 rounded-lg overflow-hidden border border-border/50">
            <img
              src={`data:${message.imageMediaType ?? "image/jpeg"};base64,${message.imageBase64}`}
              alt="Uploaded"
              className="max-w-[200px] max-h-[200px] object-cover"
            />
          </div>
        )}

        {/* Text bubble */}
        {message.content && (
          <div
            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary/70 text-foreground rounded-bl-md"
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Tool results */}
        {!isUser && message.toolResults && message.toolResults.length > 0 && (
          <div className="w-full mt-1">
            {message.toolResults.map((tr) => (
              <ToolResultCard
                key={tr.toolCallId}
                toolResult={tr}
                onPaymentConfirm={onPaymentConfirm}
              />
            ))}
          </div>
        )}

        {/* Streaming indicator */}
        {!isUser && message.isStreaming && !message.content && (
          <div className="flex items-center gap-2 px-3.5 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
