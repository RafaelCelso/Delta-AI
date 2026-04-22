import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/sessions/:id — Get session details with all messages.
 *
 * Returns the session object with an embedded `messages` array ordered by created_at ascending.
 *
 * Requisitos: 4.4, 4.6
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

  // Fetch session (RLS handles access control)
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 },
    );
  }

  // Fetch messages for the session, ordered chronologically
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, session_id, role, content, metadata, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json(
      { error: `Erro ao buscar mensagens: ${messagesError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ...session, messages: messages ?? [] });
}

/**
 * DELETE /api/sessions/:id — Delete a session and its messages.
 *
 * Only the session owner can delete it. Messages are cascade-deleted
 * by the database foreign key constraint, but we delete them explicitly
 * as a safety measure.
 */
export async function DELETE(
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

  // Verify session exists and belongs to the user
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 },
    );
  }

  if (session.user_id !== user.id) {
    return NextResponse.json(
      { error: "Sem permissão para excluir esta sessão." },
      { status: 403 },
    );
  }

  // Delete messages first
  await supabase.from("messages").delete().eq("session_id", id);

  // Delete the session
  const { error: deleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Erro ao excluir sessão: ${deleteError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Sessão excluída com sucesso." });
}

/**
 * PATCH /api/sessions/:id — Update session title.
 *
 * Only the session owner can update it.
 */
export async function PATCH(
  request: NextRequest,
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

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Campo 'title' é obrigatório." },
      { status: 400 },
    );
  }

  const title = body.title.trim();
  if (title.length === 0 || title.length > 200) {
    return NextResponse.json(
      { error: "O título deve ter entre 1 e 200 caracteres." },
      { status: 400 },
    );
  }

  const { data: session, error: updateError } = await supabase
    .from("sessions")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_id, organization_id, title, created_at, updated_at")
    .single();

  if (updateError || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada ou sem permissão." },
      { status: 404 },
    );
  }

  return NextResponse.json(session);
}
