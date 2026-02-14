export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: Record<string, unknown>;
  isError?: boolean;
}

export type SSEEventType =
  | "text_delta"
  | "tool_use_start"
  | "tool_result"
  | "done"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  data: string | Record<string, unknown>;
}

export interface ChatRequest {
  messages: {
    role: "user" | "assistant";
    content: string;
    imageBase64?: string;
    imageMediaType?: string;
  }[];
  userId: string;
}
