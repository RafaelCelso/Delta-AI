import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/sessions — Create a new chat session.
 *
 * Body: { organization_id: string, title?: string }
 *
 * Requisitos: 4.1, 4.5
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { organization_id?: string; title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const organizationId = body.organization_id?.trim();
  if (!organizationId) {
    return NextResponse.json(
      { error: "ID da organização é obrigatório." },
      { status: 400 },
    );
  }

  const title = body.title?.trim() || null;

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      title,
    })
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .single();

  if (sessionError) {
    return NextResponse.json(
      { error: `Erro ao criar sessão: ${sessionError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(session, { status: 201 });
}

/**
 * GET /api/sessions — List sessions for the current user in an organization.
 *
 * Query params:
 * - organization_id (required): Filter by organization
 *
 * Returns sessions ordered by created_at descending.
 *
 * Requisitos: 9.1
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

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (sessionsError) {
    return NextResponse.json(
      { error: `Erro ao listar sessões: ${sessionsError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(sessions);
}
