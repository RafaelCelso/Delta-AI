"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  FileText,
  CheckCircle2,
  Pencil,
  Package,
  Trash2,
  Upload,
  Activity,
} from "lucide-react";

interface ActivityEvent {
  id: string;
  document_id: string;
  user_id: string;
  event_type: "upload" | "edit" | "change_accepted" | "export" | "delete";
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  documents: { name: string; organization_id: string } | null;
  profiles: { full_name: string } | null;
}

interface DocumentActivityLogProps {
  refreshKey?: number;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  upload: <Upload className="h-3 w-3" />,
  edit: <Pencil className="h-3 w-3" />,
  change_accepted: <CheckCircle2 className="h-3 w-3" />,
  export: <Package className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
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
  change_accepted: "Validação",
  export: "Exportação",
  delete: "Exclusão",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function DocumentActivityLog({ refreshKey }: DocumentActivityLogProps) {
  const { activeOrg } = useOrganization();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeOrgId = activeOrg?.id ?? null;

  const fetchActivity = useCallback(async () => {
    if (!activeOrgId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        organization_id: activeOrgId,
        limit: "15",
      });
      const res = await fetch(`/api/documents/activity?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao carregar atividades.");
        return;
      }

      const data: ActivityEvent[] = await res.json();
      setEvents(data);
    } catch {
      setError("Erro de conexão ao carregar atividades.");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity, refreshKey]);

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Atividade Recente
        </h3>
      </div>

      {/* Content */}
      <div className="max-h-[320px] overflow-auto">
        {error && (
          <div
            role="alert"
            className="m-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
          >
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground italic">
              Carregando atividades...
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 py-8">
            <Activity className="h-5 w-5 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground italic">
              Nenhuma atividade recente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((event) => {
              const iconColor =
                EVENT_COLORS[event.event_type] ??
                "text-neutral-400 bg-neutral-400/10";
              const label = EVENT_LABELS[event.event_type] ?? event.event_type;
              const userName = event.profiles?.full_name ?? "Usuário";
              const docName = event.documents?.name ?? "Documento";

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-secondary/30"
                >
                  {/* Icon */}
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${iconColor}`}
                  >
                    {EVENT_ICONS[event.event_type] ?? (
                      <FileText className="h-3 w-3" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{userName}</span>{" "}
                      <span className="text-muted-foreground">
                        realizou{" "}
                        <span className="text-foreground font-medium">
                          {label}
                        </span>
                      </span>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {docName}
                    </p>
                  </div>

                  {/* Time */}
                  <span className="shrink-0 text-[10px] text-muted-foreground/70">
                    {timeAgo(event.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
