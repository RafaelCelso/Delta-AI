"use client";

import { ImpactAnalysisResults } from "@/components/ImpactAnalysisResults";

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
}

/**
 * Renders a single chat message bubble.
 * User messages are right-aligned with a blue background.
 * Assistant messages are left-aligned with a gray background.
 *
 * When the assistant message contains analysis results (metadata.source === "n8n"
 * and metadata.status === "completed" with an analysis_id), renders the
 * ImpactAnalysisResults component below the text content.
 *
 * When metadata contains an error, renders with an error styling indicator.
 *
 * Requisitos: 4.2, 4.4, 5.2, 6.2
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const time = new Date(message.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const metadata = message.metadata;
  const isN8nCompleted =
    !isUser &&
    metadata?.source === "n8n" &&
    metadata?.status === "completed" &&
    typeof metadata?.analysis_id === "string";

  const hasError = !isUser && !!metadata?.error;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        padding: "0.25rem 0",
      }}
    >
      <div
        style={{
          maxWidth: isN8nCompleted ? "90%" : "75%",
          padding: "0.625rem 0.875rem",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          backgroundColor: isUser
            ? "#10b981"
            : hasError
              ? "rgba(239, 68, 68, 0.1)"
              : "#1a1a1a",
          color: isUser ? "#ffffff" : hasError ? "#fca5a5" : "#f5f5f5",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          wordBreak: "break-word",
          border: hasError ? "1px solid rgba(239, 68, 68, 0.3)" : "none",
        }}
      >
        {/* Error indicator */}
        {hasError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              marginBottom: "0.375rem",
              fontSize: "0.75rem",
              color: "#dc2626",
              fontWeight: 500,
            }}
          >
            <span>⚠️</span>
            <span>Erro no processamento</span>
          </div>
        )}

        {/* Text content */}
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>

        {/* Timestamp */}
        <div
          style={{
            marginTop: "0.25rem",
            fontSize: "0.6875rem",
            color: isUser
              ? "rgba(255,255,255,0.7)"
              : hasError
                ? "#f87171"
                : "#737373",
            textAlign: isUser ? "right" : "left",
          }}
        >
          {time}
        </div>

        {/* Impact analysis results */}
        {isN8nCompleted && (
          <ImpactAnalysisResults
            analysisId={metadata.analysis_id as string}
            sessionId={message.session_id}
          />
        )}
      </div>
    </div>
  );
}
