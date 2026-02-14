"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, ToolResult } from "@/types/chat";

export function useChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, imageBase64?: string, imageMediaType?: string) => {
      if (!userId || (!text.trim() && !imageBase64)) return;
      if (isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        imageBase64,
        imageMediaType: imageMediaType as ChatMessage["imageMediaType"],
      };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        toolResults: [],
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Build the messages payload — last 20 messages, strip old image data
        const allMessages = [...messages, userMessage];
        const recentMessages = allMessages.slice(-20);

        const payload = recentMessages.map((m, idx) => {
          const isLast = idx === recentMessages.length - 1;
          return {
            role: m.role,
            content: m.content,
            ...(isLast && m.imageBase64
              ? {
                  imageBase64: m.imageBase64,
                  imageMediaType: m.imageMediaType,
                }
              : {}),
          };
        });

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload, userId }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const dataMatch = line.match(/^data: (.+)$/m);
            if (!dataMatch) continue;

            try {
              const event = JSON.parse(dataMatch[1]);

              switch (event.type) {
                case "text_delta":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content: last.content + (event.data.text ?? ""),
                      };
                    }
                    return updated;
                  });
                  break;

                case "tool_use_start":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        toolCalls: [
                          ...(last.toolCalls ?? []),
                          {
                            id: event.data.id,
                            name: event.data.name,
                            input: event.data.input,
                          },
                        ],
                      };
                    }
                    return updated;
                  });
                  break;

                case "tool_result":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      const toolResult: ToolResult = {
                        toolCallId: event.data.toolCallId,
                        toolName: event.data.toolName,
                        result: event.data.result,
                        isError: event.data.isError,
                      };
                      updated[updated.length - 1] = {
                        ...last,
                        toolResults: [...(last.toolResults ?? []), toolResult],
                      };
                    }
                    return updated;
                  });
                  break;

                case "done":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
                  break;

                case "error":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      updated[updated.length - 1] = {
                        ...last,
                        content:
                          last.content ||
                          `Error: ${event.data.message ?? "Something went wrong"}`,
                        isStreaming: false,
                      };
                    }
                    return updated;
                  });
                  break;
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Chat error:", err);

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content:
                last.content || "Sorry, something went wrong. Please try again.",
              isStreaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [userId, messages, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
