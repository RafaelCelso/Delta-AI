"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  SessionSearch,
  type SessionSearchFilters,
} from "@/components/SessionSearch";

interface Session {
  id: string;
  user_id: string;
  organization_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionListProps {
  /** Currently selected session id. */
  activeSessionId?: string | null;
  /** Called when the user selects a session. */
  onSelectSession: (session: Session) => void;
  /** Called when the user clicks "New Session". */
  onNewSession: () => void;
  /** Incremented externally to trigger a refresh. */
  refreshKey?: number;
}

/**
 * Sidebar list of past chat sessions with search capabilities.
 *
 * Requisitos: 9.1, 9.2, 9.4
 */
export function SessionList({
  activeSessionId,
  onSelectSession,
  onNewSession,
  refreshKey,
}: SessionListProps) {
  const { activeOrg } = useOrganization();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SessionSearchFilters>({});

  const activeOrgId = activeOrg?.id ?? null;

  const fetchSessions = useCallback(async () => {
    if (!activeOrgId) {
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const hasFilters =
        searchFilters.q ||
        searchFilters.dateFrom ||
        searchFilters.dateTo ||
        searchFilters.documentName;

      const baseUrl = hasFilters ? "/api/sessions/search" : "/api/sessions";

      const params = new URLSearchParams({
        organization_id: activeOrgId,
      });

      if (searchFilters.q) params.set("q", searchFilters.q);
      if (searchFilters.dateFrom)
        params.set("date_from", searchFilters.dateFrom);
      if (searchFilters.dateTo) params.set("date_to", searchFilters.dateTo);
      if (searchFilters.documentName)
        params.set("document_name", searchFilters.documentName);

      const res = await fetch(`${baseUrl}?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao carregar sessões.");
      }

      const data: Session[] = await res.json();
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId, searchFilters]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshKey]);

  const handleSearch = useCallback((filters: SessionSearchFilters) => {
    setSearchFilters(filters);
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <aside style={styles.sidebar} aria-label="Lista de sessões">
      <div style={styles.header}>
        <span style={styles.headerTitle}>Sessões</span>
        <button
          type="button"
          onClick={onNewSession}
          style={styles.newBtn}
          aria-label="Nova sessão"
        >
          + Nova
        </button>
      </div>

      <SessionSearch onSearch={handleSearch} />

      <div style={styles.list} role="list" aria-label="Sessões de chat">
        {isLoading && (
          <div style={styles.statusText} role="status">
            Carregando...
          </div>
        )}

        {error && <div style={styles.errorText}>{error}</div>}

        {!isLoading && !error && sessions.length === 0 && (
          <div style={styles.statusText}>Nenhuma sessão encontrada.</div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            role="listitem"
            onClick={() => onSelectSession(session)}
            style={{
              ...styles.sessionItem,
              backgroundColor:
                session.id === activeSessionId ? "#eff6ff" : "transparent",
              borderLeft:
                session.id === activeSessionId
                  ? "3px solid #0369a1"
                  : "3px solid transparent",
            }}
            aria-current={session.id === activeSessionId ? "true" : undefined}
          >
            <span style={styles.sessionTitle}>
              {session.title || "Sessão sem título"}
            </span>
            <span style={styles.sessionDate}>
              {formatDate(session.created_at)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: "280px",
    minWidth: "280px",
    borderRight: "1px solid #e5e7eb",
    backgroundColor: "#fafafa",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 0.75rem 0.25rem",
  },
  headerTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#111827",
  },
  newBtn: {
    padding: "0.25rem 0.625rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    backgroundColor: "#0369a1",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  list: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "0.25rem 0",
  },
  sessionItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.125rem",
    width: "100%",
    padding: "0.5rem 0.75rem",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "background-color 0.15s",
  },
  sessionTitle: {
    fontSize: "0.8125rem",
    color: "#111827",
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  sessionDate: {
    fontSize: "0.6875rem",
    color: "#9ca3af",
  },
  statusText: {
    padding: "1rem",
    fontSize: "0.8125rem",
    color: "#9ca3af",
    textAlign: "center" as const,
  },
  errorText: {
    padding: "0.75rem",
    fontSize: "0.8125rem",
    color: "#dc2626",
    textAlign: "center" as const,
  },
};
