"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { useOrganization } from "@/contexts/OrganizationContext";

export interface Session {
  id: string;
  user_id: string;
  organization_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSearchFilters {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  documentName?: string;
}

interface SessionContextType {
  sessions: Session[];
  activeSession: Session | null;
  setActiveSession: (session: Session | null) => void;
  isLoading: boolean;
  error: string | null;
  refreshKey: number;
  searchFilters: SessionSearchFilters;
  setSearchFilters: (filters: SessionSearchFilters) => void;
  createNewSession: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { activeOrg } = useOrganization();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchFilters, setSearchFilters] = useState<SessionSearchFilters>({});

  // Use the org id as a stable primitive dependency instead of the object
  const activeOrgId = activeOrg?.id ?? null;

  // Keep a ref to the org id so callbacks can read the latest value
  // without being recreated when it changes.
  const activeOrgIdRef = useRef(activeOrgId);
  activeOrgIdRef.current = activeOrgId;

  const fetchSessions = useCallback(async () => {
    const orgId = activeOrgIdRef.current;
    if (!orgId) {
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
        organization_id: orgId,
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
  }, [searchFilters]);

  // Fetch sessions when org changes or refreshKey bumps
  useEffect(() => {
    fetchSessions();
  }, [activeOrgId, fetchSessions, refreshKey]);

  // Reset active session when org changes
  useEffect(() => {
    setActiveSession(null);
  }, [activeOrgId]);

  const createNewSession = useCallback(async () => {
    const orgId = activeOrgIdRef.current;
    if (!orgId) return;

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: orgId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao criar sessão.");
      }

      const session: Session = await res.json();
      setActiveSession(session);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, []);

  const refreshSessions = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao excluir sessão.");
      }

      // Clear active session if it was the deleted one
      setActiveSession((prev) => (prev?.id === sessionId ? null : prev));

      // Remove from local list and refresh
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, []);

  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title } : s)),
    );
    setActiveSession((prev) =>
      prev && prev.id === sessionId ? { ...prev, title } : prev,
    );
  }, []);

  const value: SessionContextType = useMemo(
    () => ({
      sessions,
      activeSession,
      setActiveSession,
      isLoading,
      error,
      refreshKey,
      searchFilters,
      setSearchFilters,
      createNewSession,
      deleteSession,
      refreshSessions,
      updateSessionTitle,
    }),
    [
      sessions,
      activeSession,
      isLoading,
      error,
      refreshKey,
      searchFilters,
      createNewSession,
      deleteSession,
      refreshSessions,
      updateSessionTitle,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
