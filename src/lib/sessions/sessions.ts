import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * A session as stored in the database.
 */
export interface Session {
  id: string;
  user_id: string;
  organization_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for searching sessions with optional filters.
 */
export interface SearchSessionsParams {
  userId: string;
  organizationId: string;
  /** Text search — matches session title (case-insensitive, substring). */
  q?: string;
  /** ISO date string — sessions created on or after this date. */
  dateFrom?: string;
  /** ISO date string — sessions created on or before this date. */
  dateTo?: string;
  /** Filter sessions linked to documents whose name matches (case-insensitive, substring). */
  documentName?: string;
}

/**
 * List sessions for a user in an organization, ordered by `created_at` descending
 * (most recent first).
 *
 * Requisito 9.1: Sessions must be ordered from most recent to oldest.
 */
export async function listUserSessions(
  supabase: SupabaseClient,
  params: { userId: string; organizationId: string },
): Promise<Session[]> {
  const { userId, organizationId } = params;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao listar sessões: ${error.message}`);
  }

  return (data ?? []) as Session[];
}

/**
 * Search sessions for a user in an organization with optional filters.
 *
 * Filters:
 * - `q`: case-insensitive substring match on session title (ilike)
 * - `dateFrom`: sessions with created_at >= dateFrom
 * - `dateTo`: sessions with created_at <= dateTo (end-of-day if no time component)
 * - `documentName`: sessions linked to documents matching the name via
 *   impact_analyses → affected_sections → documents join
 *
 * Results are ordered by `created_at` descending (most recent first).
 *
 * Requisito 9.4: Filter sessions by task description, date range, or affected document name.
 */
export async function searchSessions(
  supabase: SupabaseClient,
  params: SearchSessionsParams,
): Promise<Session[]> {
  const { userId, organizationId, q, dateFrom, dateTo, documentName } = params;

  // Build base query
  let query = supabase
    .from("sessions")
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Text filter on title
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  // Date range filters
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    const endDate = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`;
    query = query.lte("created_at", endDate);
  }

  const { data: sessions, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar sessões: ${error.message}`);
  }

  const result = (sessions ?? []) as Session[];

  // Document name filter: find sessions linked to matching documents
  // via impact_analyses → affected_sections → documents
  if (documentName && result.length > 0) {
    const sessionIds = result.map((s) => s.id);

    const { data: matchingSessions, error: matchError } = await supabase
      .from("impact_analyses")
      .select(
        "session_id, affected_sections!inner(document_id, documents!inner(name))",
      )
      .in("session_id", sessionIds)
      .ilike("affected_sections.documents.name", `%${documentName}%`);

    if (matchError) {
      throw new Error(`Erro ao filtrar por documento: ${matchError.message}`);
    }

    const matchingSessionIds = new Set(
      (matchingSessions ?? []).map((m) => m.session_id),
    );

    return result.filter((s) => matchingSessionIds.has(s.id));
  }

  return result;
}
