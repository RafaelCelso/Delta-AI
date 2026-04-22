import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/documents/activity — Get recent activity across all documents
 * for the current user's organization.
 *
 * Query params:
 *   - organization_id (required)
 *   - limit (optional, default 20, max 50)
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

  const orgId = request.nextUrl.searchParams.get("organization_id");
  if (!orgId) {
    return NextResponse.json(
      { error: "organization_id é obrigatório." },
      { status: 400 },
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(
    Math.max(parseInt(limitParam ?? "20", 10) || 20, 1),
    50,
  );

  // Fetch recent timeline events for documents belonging to this organization.
  // Join with documents to get the document name and filter by org,
  // and with profiles to get the user name.
  const { data: events, error: eventsError } = await supabase
    .from("document_timeline_events")
    .select(
      "id, document_id, user_id, event_type, description, metadata, created_at, documents:document_id(name, organization_id), profiles:user_id(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventsError) {
    return NextResponse.json(
      { error: `Erro ao buscar atividades: ${eventsError.message}` },
      { status: 500 },
    );
  }

  // Filter by organization (RLS handles row-level access, but we also
  // filter client-side to ensure only the requested org's events are returned)
  const filtered = (events ?? []).filter((e: Record<string, unknown>) => {
    const doc = e.documents as { organization_id?: string } | null;
    return doc?.organization_id === orgId;
  });

  return NextResponse.json(filtered);
}
