"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  CheckCircle2,
  Pencil,
  Package,
  Trash2,
  MapPin,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineEvent {
  id: string;
  document_id: string;
  user_id: string;
  event_type: "upload" | "edit" | "change_accepted" | "export" | "delete";
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles: { full_name: string } | null;
}

interface DocumentTimelineProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  upload: <FileText className="h-3.5 w-3.5" />,
  edit: <Pencil className="h-3.5 w-3.5" />,
  change_accepted: <CheckCircle2 className="h-3.5 w-3.5" />,
  export: <Package className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
};

const EVENT_COLORS: Record<string, string> = {
  upload: "text-blue-400 bg-blue-400/10",
  edit: "text-amber-400 bg-amber-400/10",
  change_accepted: "text-emerald-400 bg-emerald-400/10",
  export: "text-purple-400 bg-purple-400/10",
  delete: "text-red-400 bg-red-400/10",
};

const EVENT_LABELS: Record<string, string> = {
  upload: "Upload",
  edit: "Edição",
  change_accepted: "Validação Aprovada",
  export: "Exportação",
  delete: "Exclusão",
};

export function DocumentTimeline({
  documentId,
  documentName,
  onClose,
}: DocumentTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/timeline`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao carregar timeline.");
        return;
      }

      const data: TimelineEvent[] = await res.json();
      setEvents(data);
    } catch {
      setError("Erro de conexão ao carregar timeline.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Timeline do Documento
          </h3>
          <Badge
            variant="outline"
            className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] hover:bg-emerald-500/20"
          >
            ACTIVE
          </Badge>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar timeline"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Current Selection */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
            <FileText className="h-4 w-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {documentName}
            </p>
            <p className="text-xs text-muted-foreground">SELEÇÃO ATUAL</p>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="px-4 py-3">
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground italic">
            Carregando timeline...
          </p>
        ) : events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground italic">
            Nenhum evento encontrado.
          </p>
        ) : (
          <div className="flex flex-col">
            {events.map((event, index) => {
              const date = new Date(event.created_at);
              const formattedDate = date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              });
              const formattedTime = date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const userName = event.profiles?.full_name ?? "Usuário";
              const isLast = index === events.length - 1;
              const iconColor =
                EVENT_COLORS[event.event_type] ??
                "text-neutral-400 bg-neutral-400/10";

              return (
                <div key={event.id} className="flex gap-3">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconColor}`}
                    >
                      {EVENT_ICONS[event.event_type] ?? (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 bg-border min-h-[16px]" />
                    )}
                  </div>

                  {/* Event Content */}
                  <div className={`pb-4 min-w-0 ${isLast ? "" : ""}`}>
                    <p className="text-sm font-medium text-foreground">
                      {EVENT_LABELS[event.event_type] ?? event.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formattedDate}, {formattedTime} por {userName}
                    </p>
                    {event.description && (
                      <div className="mt-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1.5">
                        <p className="text-xs text-primary">
                          {event.description}
                        </p>
                      </div>
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
