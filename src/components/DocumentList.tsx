"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  FileSpreadsheet,
  File,
  MoreHorizontal,
  Download,
  Clock,
  Trash2,
} from "lucide-react";

interface Document {
  id: string;
  name: string;
  file_type: string;
  status: "processing" | "indexed" | "error";
  uploaded_by: string;
  created_at: string;
  file_size_bytes: number | null;
  profiles?: { full_name: string } | null;
}

interface DocumentListProps {
  refreshKey?: number;
  onViewTimeline?: (documentId: string, documentName: string) => void;
  selectedDocId?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  processing: {
    label: "REVIEWING",
    className:
      "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/20",
  },
  indexed: {
    label: "VALIDATED",
    className:
      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  error: {
    label: "DRAFT",
    className:
      "bg-neutral-500/20 text-neutral-400 border-neutral-500/30 hover:bg-neutral-500/20",
  },
};

function getFileIcon(fileType: string) {
  const type = fileType.toLowerCase();
  if (type === "pdf") {
    return <FileText className="h-5 w-5 text-red-400" />;
  }
  if (type === "xlsx" || type === "xls") {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
  }
  if (type === "docx" || type === "doc") {
    return <FileText className="h-5 w-5 text-blue-400" />;
  }
  return <File className="h-5 w-5 text-neutral-400" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  refreshKey,
  onViewTimeline,
  selectedDocId,
}: DocumentListProps) {
  const { activeOrg } = useOrganization();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!activeOrg) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organization_id: activeOrg.id,
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao carregar documentos.");
        return;
      }

      const data: Document[] = await res.json();
      setDocuments(data);
    } catch {
      setError("Erro de conexão ao carregar documentos.");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrg, search, statusFilter]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao excluir documento.");
        return;
      }

      setConfirmDeleteId(null);
      fetchDocuments();
    } catch {
      setError("Erro de conexão ao excluir documento.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleDownload(docId: string, docName: string) {
    const link = document.createElement("a");
    link.href = `/api/documents/${docId}/download`;
    link.download = docName;
    link.click();
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
        >
          {error}
        </div>
      )}

      {/* Table Header */}
      <div className="rounded-lg border border-border bg-card">
        <div className="grid grid-cols-[1fr_140px_140px_100px_48px] items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nome do Documento
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Data de Upload
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Usuário
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
            Ação
          </span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground italic">
              Carregando documentos...
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground italic">
              Nenhum documento encontrado.
            </p>
          </div>
        ) : (
          <div>
            {documents.map((doc, index) => {
              const uploadDate = new Date(doc.created_at).toLocaleDateString(
                "pt-BR",
                { day: "2-digit", month: "short", year: "numeric" },
              );
              const statusConfig =
                STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.error;
              const isSelected = selectedDocId === doc.id;
              const isLast = index === documents.length - 1;
              const userName =
                doc.profiles?.full_name ?? doc.uploaded_by ?? "Usuário";
              const fileSize = formatFileSize(doc.file_size_bytes);

              return (
                <div
                  key={doc.id}
                  className={`grid grid-cols-[1fr_140px_140px_100px_48px] items-center gap-2 px-4 py-3 transition-colors hover:bg-secondary/50 cursor-pointer ${
                    isSelected ? "bg-secondary/70" : ""
                  } ${!isLast ? "border-b border-border/50" : ""}`}
                  onClick={() => onViewTimeline?.(doc.id, doc.name)}
                >
                  {/* Document Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {doc.name}
                      </p>
                      {fileSize && (
                        <p className="text-xs text-muted-foreground">
                          {fileSize}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Upload Date */}
                  <span className="text-sm text-muted-foreground">
                    {uploadDate}
                  </span>

                  {/* User */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-foreground">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate text-sm text-muted-foreground">
                      {userName}
                    </span>
                  </div>

                  {/* Status */}
                  <Badge
                    variant="outline"
                    className={`w-fit text-[10px] font-bold uppercase ${statusConfig.className}`}
                  >
                    {statusConfig.label}
                  </Badge>

                  {/* Actions */}
                  <div
                    className="flex justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {confirmDeleteId === doc.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deletingId === doc.id}
                        >
                          {deletingId === doc.id ? "..." : "Sim"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Não
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => handleDownload(doc.id, doc.name)}
                          >
                            <Download className="h-4 w-4" />
                            Baixar
                          </DropdownMenuItem>
                          {onViewTimeline && (
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => onViewTimeline(doc.id, doc.name)}
                            >
                              <Clock className="h-4 w-4" />
                              Ver Timeline
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                            onClick={() => setConfirmDeleteId(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
