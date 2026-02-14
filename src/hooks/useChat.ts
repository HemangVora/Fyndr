"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { ChatMessage, ToolResult } from "@/types/chat";

export function useChat(userId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history from Supabase on mount
  useEffect(() => {
    if (!userId || loaded) return;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) {
          console.error("Failed to load chat history:", error);
          setLoaded(true);
          return;
        }

        if (data && data.length > 0) {
          const restored: ChatMessage[] = data.map((row) => ({
            id: row.id,
            role: row.role as "user" | "assistant",
            content: row.content ?? "",
            toolResults: row.tool_results ?? [],
            isStreaming: false,
          }));
          setMessages(restored);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [userId, loaded]);

  // Save a message to Supabase
  const persistMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!userId) return;
      try {
        await supabase.from("chat_messages").insert({
          id: msg.id.startsWith("user-") || msg.id.startsWith("assistant-")
            ? undefined
            : msg.id,
          user_id: userId,
          role: msg.role,
          content: msg.content,
          tool_results: msg.toolResults ?? [],
        });
      } catch (err) {
        console.error("Failed to persist message:", err);
      }
    },
    [userId]
  );

  // Update an existing assistant message in Supabase
  const updatePersistedMessage = useCallback(
    async (msg: ChatMessage, dbId: string) => {
      if (!userId) return;
      try {
        await supabase
          .from("chat_messages")
          .update({
            content: msg.content,
            tool_results: msg.toolResults ?? [],
          })
          .eq("id", dbId);
      } catch (err) {
        console.error("Failed to update persisted message:", err);
      }
    },
    [userId]
  );

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

      // Persist user message immediately
      const { data: savedUser } = await supabase
        .from("chat_messages")
        .insert({
          user_id: userId,
          role: "user",
          content: text.trim(),
          tool_results: [],
        })
        .select("id")
        .single();

      // Insert placeholder for assistant message
      const { data: savedAssistant } = await supabase
        .from("chat_messages")
        .insert({
          user_id: userId,
          role: "assistant",
          content: "",
          tool_results: [],
        })
        .select("id")
        .single();

      const assistantDbId = savedAssistant?.id;

      // Update local IDs to DB IDs
      if (savedUser?.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, id: savedUser.id } : m
          )
        );
      }
      if (assistantDbId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id ? { ...m, id: assistantDbId } : m
          )
        );
      }

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
                      // Persist final assistant message to Supabase
                      const finalMsg = {
                        ...last,
                        isStreaming: false,
                      };
                      if (assistantDbId) {
                        updatePersistedMessage(finalMsg, assistantDbId);
                      }
                      updated[updated.length - 1] = finalMsg;
                    }
                    return updated;
                  });
                  break;

                case "error":
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "assistant") {
                      const errorMsg = {
                        ...last,
                        content:
                          last.content ||
                          `Error: ${event.data.message ?? "Something went wrong"}`,
                        isStreaming: false,
                      };
                      if (assistantDbId) {
                        updatePersistedMessage(errorMsg, assistantDbId);
                      }
                      updated[updated.length - 1] = errorMsg;
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
            const errorMsg = {
              ...last,
              content:
                last.content || "Sorry, something went wrong. Please try again.",
              isStreaming: false,
            };
            if (assistantDbId) {
              updatePersistedMessage(errorMsg, assistantDbId);
            }
            updated[updated.length - 1] = errorMsg;
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [userId, messages, isStreaming, updatePersistedMessage]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(async () => {
    setMessages([]);
    if (userId) {
      await supabase.from("chat_messages").delete().eq("user_id", userId);
    }
  }, [userId]);

  return {
    messages,
    isStreaming,
    loaded,
    sendMessage,
    stopStreaming,
    clearMessages,
  };
}
