"use client";

import { useState, useCallback } from "react";
import { DiffViewer } from "@/components/DiffViewer";
import { FeedbackDialog } from "@/components/FeedbackDialog";

interface ChangeCardProps {
  /** Unique ID of the proposed change. */
  changeId: string;
  /** Original content before the change. */
  originalContent: string;
  /** Proposed content with the change applied. */
  proposedContent: string;
  /** Current status of the change. */
  status: "pending" | "accepted" | "rejected";
  /** Section path (e.g., "Cap 3 > Seção 3.2 > Subseção 3.2.1"). */
  sectionPath: string;
  /** Section title, if available. */
  sectionTitle?: string | null;
  /** Document name for context. */
  documentName: string;
  /** Relevance summary explaining why this section is affected. */
  relevanceSummary: string;
  /** Confidence score (0-1). */
  confidenceScore: number;
  /** Whether the AI could not generate a meaningful change. */
  noMeaningfulChange?: boolean;
  /** Called when the user accepts the change. */
  onAccept?: (changeId: string) => Promise<void>;
  /** Called when the user rejects the change with optional feedback. */
  onReject?: (changeId: string, feedback: string) => Promise<void>;
}

const STATUS_STYLES: Record<
  string,
  { bg: string; color: string; label: string; icon: string }
> = {
  pending: {
    bg: "#fef3c7",
    color: "#92400e",
    label: "Pendente",
    icon: "⏳",
  },
  accepted: {
    bg: "#dcfce7",
    color: "#166534",
    label: "Aceita",
    icon: "✅",
  },
  rejected: {
    bg: "#fee2e2",
    color: "#991b1b",
    label: "Rejeitada",
    icon: "❌",
  },
};

/**
 * ChangeCard — Displays a single proposed change with accept/reject actions.
 *
 * Shows the section context, a visual diff, confidence score, and action buttons.
 * When rejected, opens a FeedbackDialog for the user to provide feedback.
 *
 * Requisitos: 6.2, 6.3, 6.5
 */
export function ChangeCard({
  changeId,
  originalContent,
  proposedContent,
  status,
  sectionPath,
  sectionTitle,
  documentName,
  relevanceSummary,
  confidenceScore,
  noMeaningfulChange = false,
  onAccept,
  onReject,
}: ChangeCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusInfo = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  const scorePercent = Math.round(confidenceScore * 100);
  const isPending = status === "pending";

  const handleAccept = useCallback(async () => {
    if (!onAccept) return;
    setIsAccepting(true);
    setError(null);

    try {
      await onAccept(changeId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao aceitar alteração.",
      );
    } finally {
      setIsAccepting(false);
    }
  }, [changeId, onAccept]);

  const handleRejectWithFeedback = useCallback(
    async (feedback: string) => {
      if (!onReject) return;
      setIsRejecting(true);
      setError(null);

      try {
        await onReject(changeId, feedback);
        setShowFeedbackDialog(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao rejeitar alteração.",
        );
      } finally {
        setIsRejecting(false);
      }
    },
    [changeId, onReject],
  );

  return (
    <>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          marginBottom: "1rem",
        }}
        role="article"
        aria-label={`Alteração proposta para ${sectionPath}`}
      >
        {/* Card header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "0.75rem 1rem",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "#111827",
                }}
              >
                {sectionTitle ?? sectionPath}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  backgroundColor: statusInfo.bg,
                  color: statusInfo.color,
                }}
              >
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>
            {sectionTitle && (
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginTop: "0.125rem",
                }}
              >
                {sectionPath}
              </div>
            )}
            <div
              style={{
                fontSize: "0.8125rem",
                color: "#4b5563",
                marginTop: "0.375rem",
                lineHeight: 1.4,
              }}
            >
              {relevanceSummary}
            </div>
          </div>

          {/* Confidence badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginLeft: "0.75rem",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: "0.6875rem",
                color: "#9ca3af",
                marginBottom: "0.125rem",
              }}
            >
              Confiança
            </span>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color:
                  scorePercent >= 80
                    ? "#166534"
                    : scorePercent >= 50
                      ? "#92400e"
                      : "#991b1b",
              }}
            >
              {scorePercent}%
            </span>
          </div>
        </div>

        {/* Diff viewer */}
        <div style={{ padding: "0.75rem 1rem" }}>
          <DiffViewer
            originalContent={originalContent}
            proposedContent={proposedContent}
            sectionPath={sectionPath}
            noMeaningfulChange={noMeaningfulChange}
          />
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontSize: "0.8125rem",
              borderTop: "1px solid #fecaca",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Action buttons */}
        {isPending && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f9fafb",
            }}
          >
            <button
              onClick={() => setShowFeedbackDialog(true)}
              disabled={isAccepting || isRejecting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
                color: "#dc2626",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: isAccepting || isRejecting ? "not-allowed" : "pointer",
                opacity: isAccepting || isRejecting ? 0.6 : 1,
              }}
              aria-label={`Rejeitar alteração na seção ${sectionPath}`}
            >
              ✕ Rejeitar
            </button>
            <button
              onClick={handleAccept}
              disabled={isAccepting || isRejecting || noMeaningfulChange}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                border: "none",
                borderRadius: "6px",
                backgroundColor:
                  isAccepting || isRejecting || noMeaningfulChange
                    ? "#9ca3af"
                    : "#16a34a",
                color: "#ffffff",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor:
                  isAccepting || isRejecting || noMeaningfulChange
                    ? "not-allowed"
                    : "pointer",
              }}
              aria-label={`Aceitar alteração na seção ${sectionPath}`}
            >
              {isAccepting ? "Aceitando..." : "✓ Aceitar"}
            </button>
          </div>
        )}
      </div>

      {/* Feedback dialog for rejection */}
      <FeedbackDialog
        isOpen={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        onSubmit={handleRejectWithFeedback}
        isSubmitting={isRejecting}
        sectionPath={sectionPath}
      />
    </>
  );
}
