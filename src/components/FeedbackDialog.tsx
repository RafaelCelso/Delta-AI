"use client";

import { useState, useRef, useEffect } from "react";

interface FeedbackDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean;
  /** Called when the user cancels or closes the dialog. */
  onClose: () => void;
  /** Called when the user submits feedback. */
  onSubmit: (feedback: string) => void;
  /** Whether the submission is in progress. */
  isSubmitting?: boolean;
  /** Section path for context display. */
  sectionPath?: string;
}

/**
 * FeedbackDialog — Modal for providing feedback when rejecting a proposed change.
 *
 * Allows the user to explain why the change was rejected so the AI can
 * generate a revised proposal.
 *
 * Requisitos: 6.5
 */
export function FeedbackDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  sectionPath,
}: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFeedback("");
      // Small delay to ensure the dialog is rendered
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(feedback.trim());
  };

  const handleRejectWithoutFeedback = () => {
    onSubmit("");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Feedback para rejeição de alteração"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
          margin: "1rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1rem",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Rejeitar alteração
            </h3>
            {sectionPath && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.8125rem",
                  color: "#6b7280",
                }}
              >
                Seção: {sectionPath}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: "none",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "1.25rem",
              color: "#9ca3af",
              padding: "0.25rem",
              lineHeight: 1,
            }}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.875rem",
            color: "#4b5563",
            lineHeight: 1.5,
          }}
        >
          Forneça um feedback para que a IA possa gerar uma proposta revisada,
          ou rejeite sem feedback.
        </p>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Descreva o que deve ser diferente na próxima proposta..."
          disabled={isSubmitting}
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "0.625rem",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          aria-label="Feedback para a IA"
        />

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            marginTop: "1rem",
          }}
        >
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              backgroundColor: "#ffffff",
              color: "#374151",
              fontSize: "0.875rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleRejectWithoutFeedback}
            disabled={isSubmitting}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              fontSize: "0.875rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Rejeitar sem feedback
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !feedback.trim()}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "6px",
              backgroundColor:
                isSubmitting || !feedback.trim() ? "#9ca3af" : "#dc2626",
              color: "#ffffff",
              fontSize: "0.875rem",
              cursor:
                isSubmitting || !feedback.trim() ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Enviando..." : "Rejeitar com feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
