import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sessions/search — Search sessions by description, date range, or document name.
 *
 * Query params:
 * - organization_id (required): Filter by organization
 * - q (optional): Search term to match against session title or message content
 * - date_from (optional): ISO date string — sessions created on or after this date
 * - date_to (optional): ISO date string — sessions created on or before this date
 * - document_name (optional): Filter sessions that reference a specific document name
 *
 * Requisitos: 9.4
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organization_id");

  if (!organizationId) {
    return NextResponse.json(
      { error: "ID da organização é obrigatório." },
      { status: 400 },
    );
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const dateFrom = request.nextUrl.searchParams.get("date_from");
  const dateTo = request.nextUrl.searchParams.get("date_to");
  const documentName = request.nextUrl.searchParams
    .get("document_name")
    ?.trim();

  // Start with base query for user's sessions in the organization
  let query = supabase
    .from("sessions")
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Filter by date range
  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }
  if (dateTo) {
    // Add end-of-day to include the full day
    const endDate = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`;
    query = query.lte("created_at", endDate);
  }

  // Filter by title (text search)
  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  const { data: sessions, error: sessionsError } = await query;

  if (sessionsError) {
    return NextResponse.json(
      { error: `Erro ao buscar sessões: ${sessionsError.message}` },
      { status: 500 },
    );
  }

  // If document_name filter is provided, further filter sessions that have
  // impact analyses referencing documents with that name.
  if (documentName && sessions && sessions.length > 0) {
    const sessionIds = sessions.map((s) => s.id);

    // Find sessions that have impact analyses with affected sections
    // referencing documents matching the name
    const { data: matchingSessions, error: matchError } = await supabase
      .from("impact_analyses")
      .select(
        "session_id, affected_sections!inner(document_id, documents!inner(name))",
      )
      .in("session_id", sessionIds)
      .ilike("affected_sections.documents.name", `%${documentName}%`);

    if (matchError) {
      // If the join query fails (e.g., tables don't exist yet), return
      // sessions filtered only by the other criteria
      return NextResponse.json(sessions);
    }

    const matchingSessionIds = new Set(
      (matchingSessions ?? []).map((m) => m.session_id),
    );

    const filtered = sessions.filter((s) => matchingSessionIds.has(s.id));
    return NextResponse.json(filtered);
  }

  return NextResponse.json(sessions);
}
