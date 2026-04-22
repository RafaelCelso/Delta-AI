"use client";

import { useState, useEffect } from "react";
import { ExportUI } from "@/components/ExportUI";
import type { ChangeRecordSummary } from "@/lib/change-records/types";

interface ChangeRecordsSummaryProps {
  /** The session ID to fetch change records for. */
  sessionId: string;
  /** Called when the user wants to close the summary panel. */
  onClose: () => void;
}

/**
 * ChangeRecordsSummary — Displays a summary of all change records for a session.
 *
 * Fetches data from GET /api/sessions/:id/change-records and renders each
 * record with its sequential number, document name, status, and an ExportUI
 * for exporting the change report.
 *
 * Requisitos: 7.3, 7.5, 8.1
 */
export function ChangeRecordsSummary({
  sessionId,
  onClose,
}: ChangeRecordsSummaryProps) {
  const [records, setRecords] = useState<ChangeRecordSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecords() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/sessions/${sessionId}/change-records`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ||
              "Erro ao carregar registros de mudanças.",
          );
        }

        const data: ChangeRecordSummary[] = await res.json();
        if (!cancelled) {
          setRecords(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro ao carregar registros de mudanças.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRecords();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Registros de Mudanças"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={styles.panel}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Registros de Mudanças</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Fechar">
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {isLoading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Carregando registros...</span>
            </div>
          )}

          {error && (
            <div style={styles.errorContainer} role="alert">
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && records.length === 0 && (
            <div style={styles.emptyContainer}>
              <span style={styles.emptyText}>
                Nenhum registro de mudança encontrado nesta sessão.
              </span>
            </div>
          )}

          {!isLoading &&
            !error &&
            records.map((record) => (
              <div key={record.id} style={styles.recordCard}>
                {/* Record header */}
                <div style={styles.recordHeader}>
                  <div style={styles.recordNumber}>
                    #{record.sequential_number}
                  </div>
                  <div style={styles.recordInfo}>
                    <span style={styles.recordDocName}>
                      {record.document_name}
                    </span>
                    <span style={styles.recordDate}>
                      {new Date(record.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        record.status === "accepted"
                          ? "rgba(16, 185, 129, 0.1)"
                          : "rgba(239, 68, 68, 0.1)",
                      color:
                        record.status === "accepted" ? "#6ee7b7" : "#fca5a5",
                    }}
                  >
                    {record.status === "accepted"
                      ? "✅ Aceita"
                      : "❌ Rejeitada"}
                  </span>
                </div>

                {/* Task description */}
                <p style={styles.taskDescription}>{record.task_description}</p>

                {/* Export for change report */}
                {record.status === "accepted" && (
                  <div style={styles.exportContainer}>
                    <ExportUI
                      exportType="change_report"
                      resourceId={record.id}
                      resourceName={`Registro #${record.sequential_number} — ${record.document_name}`}
                    />
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
  },
  panel: {
    backgroundColor: "#111111",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "640px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "none",
    margin: "1rem",
    border: "1px solid #262626",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #262626",
  },
  title: {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#f5f5f5",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1.25rem",
    color: "#a3a3a3",
    padding: "0.25rem",
    lineHeight: 1,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "2rem 0",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #404040",
    borderTopColor: "#10b981",
    borderRadius: "50%",
    animation: "records-spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: "0.875rem",
    color: "#a3a3a3",
  },
  errorContainer: {
    padding: "0.75rem",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#fca5a5",
    fontSize: "0.875rem",
  },
  emptyContainer: {
    padding: "2rem",
    textAlign: "center" as const,
  },
  emptyText: {
    fontSize: "0.875rem",
    color: "#a3a3a3",
  },
  recordCard: {
    border: "1px solid #262626",
    borderRadius: "10px",
    padding: "1rem",
    backgroundColor: "#111111",
  },
  recordHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  recordNumber: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    whiteSpace: "nowrap" as const,
  },
  recordInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
  },
  recordDocName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#f5f5f5",
  },
  recordDate: {
    fontSize: "0.75rem",
    color: "#a3a3a3",
  },
  statusBadge: {
    fontSize: "0.6875rem",
    fontWeight: 500,
    padding: "0.125rem 0.5rem",
    borderRadius: "9999px",
    whiteSpace: "nowrap" as const,
  },
  taskDescription: {
    margin: "0.5rem 0 0",
    fontSize: "0.8125rem",
    color: "#a3a3a3",
    lineHeight: 1.5,
  },
  exportContainer: {
    marginTop: "0.75rem",
    paddingTop: "0.75rem",
    borderTop: "1px dashed #404040",
  },
};
