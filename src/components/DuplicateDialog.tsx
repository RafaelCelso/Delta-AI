"use client";

import { useState } from "react";
import type { DuplicateInfo } from "@/components/DocumentUploader";
import { useOrganization } from "@/contexts/OrganizationContext";

interface DuplicateDialogProps {
  duplicateInfo: DuplicateInfo | null;
  onClose: () => void;
  onReplaced: () => void;
}

export function DuplicateDialog({
  duplicateInfo,
  onClose,
  onReplaced,
}: DuplicateDialogProps) {
  const { activeOrg } = useOrganization();
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!duplicateInfo) return null;

  const uploadDate = new Date(duplicateInfo.created_at).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );

  async function handleReplace() {
    if (!duplicateInfo || !activeOrg) return;

    setIsReplacing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", duplicateInfo.file);
      formData.append("organization_id", activeOrg.id);

      const res = await fetch("/api/documents/upload?replaceExisting=true", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao substituir documento.");
        return;
      }

      onReplaced();
      onClose();
    } catch {
      setError("Erro de conexão ao substituir documento.");
    } finally {
      setIsReplacing(false);
    }
  }

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Documento duplicado"
    >
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Documento Duplicado</h3>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div style={styles.body}>
          <p style={styles.message}>
            Já existe um documento com o nome{" "}
            <strong>{duplicateInfo.name}</strong> nesta organização.
          </p>

          <div style={styles.existingInfo}>
            <p style={styles.infoLabel}>Documento existente:</p>
            <p style={styles.infoValue}>
              <strong>{duplicateInfo.name}</strong>
            </p>
            <p style={styles.infoMeta}>Enviado em {uploadDate}</p>
          </div>

          <p style={styles.question}>
            Deseja substituir o documento existente?
          </p>
        </div>

        {error && (
          <div role="alert" style={styles.errorBox}>
            {error}
          </div>
        )}

        <div style={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            style={styles.cancelButton}
            disabled={isReplacing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleReplace}
            style={styles.replaceButton}
            disabled={isReplacing}
          >
            {isReplacing ? "Substituindo..." : "Substituir"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  dialog: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#111111",
    borderRadius: "8px",
    boxShadow: "none",
    padding: "1.5rem",
    border: "1px solid #262626",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: 600,
    color: "#f5f5f5",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "1rem",
    color: "#a3a3a3",
    cursor: "pointer",
    padding: "0.25rem",
  },
  body: {
    marginBottom: "1rem",
  },
  message: {
    fontSize: "0.875rem",
    color: "#d4d4d4",
    margin: "0 0 0.75rem 0",
  },
  existingInfo: {
    padding: "0.75rem",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    border: "1px solid #262626",
    marginBottom: "0.75rem",
  },
  infoLabel: {
    fontSize: "0.75rem",
    color: "#a3a3a3",
    margin: "0 0 0.25rem 0",
  },
  infoValue: {
    fontSize: "0.875rem",
    color: "#f5f5f5",
    margin: "0 0 0.25rem 0",
  },
  infoMeta: {
    fontSize: "0.75rem",
    color: "#a3a3a3",
    margin: 0,
  },
  question: {
    fontSize: "0.875rem",
    color: "#d4d4d4",
    margin: 0,
    fontWeight: 500,
  },
  errorBox: {
    padding: "0.5rem 0.75rem",
    marginBottom: "0.75rem",
    fontSize: "0.8rem",
    color: "#fca5a5",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "6px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
  },
  cancelButton: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#d4d4d4",
    backgroundColor: "#1a1a1a",
    border: "1px solid #404040",
    borderRadius: "6px",
    cursor: "pointer",
  },
  replaceButton: {
    padding: "0.5rem 1rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#ffffff",
    backgroundColor: "#dc2626",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
