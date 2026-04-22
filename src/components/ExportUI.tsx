"use client";

import { useState } from "react";

/**
 * Tipo de exportação suportado pelo componente.
 */
type ExportFormat = "docx" | "pdf";

/**
 * Props do componente ExportUI.
 */
interface ExportUIProps {
  /** Tipo de exportação: documento ou relatório de mudanças */
  exportType: "document" | "change_report";
  /** ID do recurso a exportar (ID do documento ou ID do registro de controle) */
  resourceId: string;
  /** ID da sessão opcional para exportações de documentos */
  sessionId?: string;
  /** Descrição da tarefa opcional para exportações de documentos */
  taskDescription?: string;
  /** Nome de exibição opcional do recurso sendo exportado */
  resourceName?: string;
}

/**
 * ExportUI — Componente de exportação de documentos e relatórios de mudanças.
 *
 * Permite ao usuário selecionar o formato de exportação (DOCX ou PDF),
 * iniciar o download, e exibe indicadores de progresso e mensagens de erro
 * com opção de retry.
 *
 * Requisitos: 8.1, 8.5
 */
export function ExportUI({
  exportType,
  resourceId,
  sessionId,
  taskDescription,
  resourceName,
}: ExportUIProps) {
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    exportType === "document"
      ? "Exportar Documento"
      : "Exportar Relatório de Mudanças";

  /**
   * Extrair nome do arquivo do header Content-Disposition.
   */
  function extractFilename(
    contentDisposition: string | null,
    fallbackFormat: ExportFormat,
  ): string {
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match?.[1]) {
        return match[1];
      }
    }
    const extension = fallbackFormat === "docx" ? "docx" : "pdf";
    return `export.${extension}`;
  }

  /**
   * Executar exportação: chamar API, baixar blob e acionar download no navegador.
   */
  async function handleExport() {
    setIsLoading(true);
    setError(null);

    try {
      const url =
        exportType === "document"
          ? `/api/export/document/${resourceId}`
          : `/api/export/change-report/${resourceId}`;

      const body: Record<string, string> = { format };
      if (exportType === "document") {
        if (sessionId) body.session_id = sessionId;
        if (taskDescription) body.task_description = taskDescription;
      }

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let errorMessage = "Erro ao exportar. Tente novamente.";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Usar mensagem padrão se não conseguir parsear o JSON
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const filename = extractFilename(
        response.headers.get("Content-Disposition"),
        format,
      );

      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao exportar. Tente novamente.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #d1d5db",
        borderRadius: "10px",
        padding: "1.25rem",
        backgroundColor: "#ffffff",
        maxWidth: "400px",
      }}
      role="region"
      aria-label={title}
    >
      {/* Título */}
      <h3
        style={{
          margin: "0 0 0.25rem",
          fontSize: "1rem",
          fontWeight: 600,
          color: "#374151",
        }}
      >
        {title}
      </h3>

      {/* Nome do recurso */}
      {resourceName && (
        <p
          style={{
            margin: "0 0 0.75rem",
            fontSize: "0.8125rem",
            color: "#6b7280",
          }}
        >
          {resourceName}
        </p>
      )}

      {/* Seletor de formato */}
      <div
        style={{
          display: "flex",
          gap: "0",
          marginBottom: "0.75rem",
        }}
        role="radiogroup"
        aria-label="Formato de exportação"
      >
        <button
          type="button"
          role="radio"
          aria-checked={format === "docx"}
          onClick={() => setFormat("docx")}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "6px 0 0 6px",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: isLoading ? "not-allowed" : "pointer",
            backgroundColor: format === "docx" ? "#2B579A" : "#ffffff",
            color: format === "docx" ? "#ffffff" : "#374151",
            borderColor: format === "docx" ? "#2B579A" : "#d1d5db",
            transition: "background-color 0.15s, color 0.15s",
          }}
        >
          DOCX
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={format === "pdf"}
          onClick={() => setFormat("pdf")}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: "0.5rem 1rem",
            border: "1px solid #d1d5db",
            borderRadius: "0 6px 6px 0",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: isLoading ? "not-allowed" : "pointer",
            backgroundColor: format === "pdf" ? "#2B579A" : "#ffffff",
            color: format === "pdf" ? "#ffffff" : "#374151",
            borderColor: format === "pdf" ? "#2B579A" : "#d1d5db",
            borderLeft: format === "pdf" ? "1px solid #2B579A" : "none",
            transition: "background-color 0.15s, color 0.15s",
          }}
        >
          PDF
        </button>
      </div>

      {/* Botão de exportação */}
      <button
        type="button"
        onClick={handleExport}
        disabled={isLoading}
        style={{
          width: "100%",
          padding: "0.625rem 1rem",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: isLoading ? "not-allowed" : "pointer",
          backgroundColor: isLoading ? "#9ca3af" : "#2B579A",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "background-color 0.15s",
        }}
        aria-label={isLoading ? "Gerando documento" : "Exportar"}
      >
        {isLoading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "export-spin 0.8s linear infinite",
              }}
              aria-hidden="true"
            />
            Gerando...
          </>
        ) : (
          "Exportar"
        )}
      </button>

      {/* Mensagem de erro */}
      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.625rem 0.75rem",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            fontSize: "0.8125rem",
            color: "#991b1b",
          }}
          role="alert"
        >
          <p style={{ margin: "0 0 0.5rem" }}>{error}</p>
          <button
            type="button"
            onClick={handleExport}
            style={{
              padding: "0.375rem 0.75rem",
              border: "1px solid #fca5a5",
              borderRadius: "4px",
              backgroundColor: "#ffffff",
              color: "#991b1b",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes export-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
