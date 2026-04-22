"use client";

import { useState, useEffect, useCallback } from "react";
import { ChangeCard } from "@/components/ChangeCard";
import { ExportUI } from "@/components/ExportUI";
import { useToast } from "@/contexts/ToastContext";
import type {
  AnalysisPreview,
  ProposedChangePreview,
} from "@/lib/changes/types";

interface ImpactAnalysisResultsProps {
  /** The analysis ID to fetch preview data for. */
  analysisId: string;
  /** The session ID for export context. */
  sessionId?: string;
}

/**
 * ImpactAnalysisResults — Fetches and renders the full analysis preview.
 *
 * Fetches preview data from GET /api/analyses/:analysisId/preview,
 * renders ChangeCard components for each proposed change, handles
 * accept/reject via API calls, and shows ExportUI after acceptance.
 *
 * Requisitos: 5.2, 6.2, 6.3, 7.3, 8.1
 */
export function ImpactAnalysisResults({
  analysisId,
  sessionId,
}: ImpactAnalysisResultsProps) {
  const { addToast } = useToast();
  const [preview, setPreview] = useState<AnalysisPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedDocumentIds, setAcceptedDocumentIds] = useState<Set<string>>(
    new Set(),
  );

  // Fetch preview data
  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/analyses/${analysisId}/preview`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ||
              "Erro ao carregar preview de alterações.",
          );
        }

        const data: AnalysisPreview = await res.json();
        if (!cancelled) {
          setPreview(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "Erro ao carregar preview de alterações.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchPreview();
    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  // Handle accepting a change
  const handleAccept = useCallback(
    async (changeId: string) => {
      const res = await fetch(`/api/changes/${changeId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg =
          (data as { error?: string }).error || "Erro ao aceitar alteração.";
        addToast("error", errorMsg);
        throw new Error(errorMsg);
      }

      const result = await res.json();
      addToast("success", result.message || "Alteração aceita com sucesso.");

      // Update local state to reflect accepted status
      setPreview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map((doc) => ({
            ...doc,
            changes: doc.changes.map((change) =>
              change.id === changeId
                ? { ...change, status: "accepted" as const }
                : change,
            ),
          })),
        };
      });

      // Track accepted document for export
      if (result.document_id) {
        setAcceptedDocumentIds(
          (prev) => new Set([...prev, result.document_id]),
        );
      }
    },
    [addToast],
  );

  // Handle rejecting a change
  const handleReject = useCallback(
    async (changeId: string, feedback: string) => {
      const res = await fetch(`/api/changes/${changeId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errorMsg =
          (data as { error?: string }).error || "Erro ao rejeitar alteração.";
        addToast("error", errorMsg);
        throw new Error(errorMsg);
      }

      const result = await res.json();
      addToast("info", result.message || "Alteração rejeitada.");

      // Update local state to reflect rejected status
      setPreview((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map((doc) => ({
            ...doc,
            changes: doc.changes.map((change) =>
              change.id === changeId
                ? { ...change, status: "rejected" as const }
                : change,
            ),
          })),
        };
      });
    },
    [addToast],
  );

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>
          Carregando preview de alterações...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer} role="alert">
        <span style={styles.errorIcon}>⚠️</span>
        <span style={styles.errorText}>{error}</span>
      </div>
    );
  }

  if (!preview || preview.documents.length === 0) {
    return (
      <div style={styles.emptyContainer}>
        <span style={styles.emptyText}>
          Nenhuma alteração proposta encontrada para esta análise.
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Summary header */}
      <div style={styles.summaryHeader}>
        <span style={styles.summaryIcon}>📋</span>
        <span style={styles.summaryText}>
          {preview.documents.length} documento(s) com alterações propostas
        </span>
      </div>

      {/* Documents and their changes */}
      {preview.documents.map((doc) => {
        const hasAcceptedChanges =
          doc.changes.some((c) => c.status === "accepted") ||
          acceptedDocumentIds.has(doc.document_id);

        return (
          <div key={doc.document_id} style={styles.documentSection}>
            {/* Document header */}
            <div style={styles.documentHeader}>
              <span style={styles.documentIcon}>📄</span>
              <span style={styles.documentName}>{doc.document_name}</span>
              <span style={styles.changeCount}>
                {doc.changes.length} alteração(ões)
              </span>
            </div>

            {/* Change cards */}
            {doc.changes.map((change: ProposedChangePreview) => (
              <ChangeCard
                key={change.id}
                changeId={change.id}
                originalContent={change.original_content}
                proposedContent={change.proposed_content}
                status={change.status}
                sectionPath={change.section_path}
                sectionTitle={change.section_title}
                documentName={change.document_name}
                relevanceSummary={change.relevance_summary}
                confidenceScore={change.confidence_score}
                noMeaningfulChange={change.no_meaningful_change}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}

            {/* Export UI for accepted changes */}
            {hasAcceptedChanges && (
              <div style={styles.exportSection}>
                <ExportUI
                  exportType="document"
                  resourceId={doc.document_id}
                  sessionId={sessionId}
                  taskDescription={preview.task_description}
                  resourceName={doc.document_name}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    marginTop: "0.5rem",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #d1d5db",
    borderTopColor: "#0369a1",
    borderRadius: "50%",
    animation: "impact-spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: "0.8125rem",
    color: "#6b7280",
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    marginTop: "0.5rem",
  },
  errorIcon: {
    fontSize: "1rem",
  },
  errorText: {
    fontSize: "0.8125rem",
    color: "#991b1b",
  },
  emptyContainer: {
    padding: "0.75rem",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    marginTop: "0.5rem",
  },
  emptyText: {
    fontSize: "0.8125rem",
    color: "#6b7280",
  },
  summaryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "8px",
  },
  summaryIcon: {
    fontSize: "1rem",
  },
  summaryText: {
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#1e40af",
  },
  documentSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  documentHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0",
  },
  documentIcon: {
    fontSize: "1rem",
  },
  documentName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#111827",
    flex: 1,
  },
  changeCount: {
    fontSize: "0.75rem",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
  },
  exportSection: {
    marginTop: "0.5rem",
    paddingTop: "0.75rem",
    borderTop: "1px dashed #d1d5db",
  },
};
