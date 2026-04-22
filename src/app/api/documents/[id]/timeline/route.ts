import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/documents/:id/timeline — Get timeline events for a document.
 *
 * Returns events ordered by created_at ascending, with user profile info.
 *
 * Requisitos: 3.12
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Verify document exists (RLS handles access control)
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", id)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  const { data: events, error: eventsError } = await supabase
    .from("document_timeline_events")
    .select(
      "id, document_id, user_id, event_type, description, metadata, created_at, profiles:user_id(full_name)",
    )
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return NextResponse.json(
      { error: `Erro ao buscar timeline: ${eventsError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(events);
}
