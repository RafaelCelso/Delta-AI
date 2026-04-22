import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "documents";

/**
 * GET /api/documents/:id — Get document details.
 *
 * Requisitos: 3.10
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

  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json(document);
}

/**
 * PUT /api/documents/:id — Update document metadata (name only).
 *
 * Requisitos: 3.10
 */
export async function PUT(
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

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Nome do documento é obrigatório." },
      { status: 400 },
    );
  }

  const { data: document, error: updateError } = await supabase
    .from("documents")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao atualizar documento: ${updateError.message}` },
      { status: 500 },
    );
  }

  // Add timeline event for edit
  await supabase.from("document_timeline_events").insert({
    document_id: id,
    user_id: user.id,
    event_type: "edit",
    description: `Nome do documento alterado para "${name}".`,
  });

  return NextResponse.json(document);
}

/**
 * DELETE /api/documents/:id — Delete a document, its chunks, storage file, and timeline events.
 *
 * Requisitos: 3.10
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

  // Fetch document to get storage_path
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, name, storage_path")
    .eq("id", id)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  // Delete chunks
  await supabase.from("document_chunks").delete().eq("document_id", id);

  // Delete timeline events
  await supabase
    .from("document_timeline_events")
    .delete()
    .eq("document_id", id);

  // Delete storage file
  await supabase.storage.from(STORAGE_BUCKET).remove([document.storage_path]);

  // Delete document record
  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: `Erro ao excluir documento: ${deleteError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Documento excluído com sucesso." });
}
