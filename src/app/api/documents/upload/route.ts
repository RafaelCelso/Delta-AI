import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadDocument } from "@/lib/documents/upload";
import { indexDocument } from "@/lib/documents/indexing";

/**
 * POST /api/documents/upload — Upload a document to the knowledge base.
 *
 * Accepts multipart form data with `file` and `organization_id`.
 * Optionally accepts `replaceExisting` query param for duplicate replacement.
 *
 * Requisitos: 3.1, 3.2, 3.6, 3.8, 3.9
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido. Envie multipart/form-data." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const organizationId = formData.get("organization_id");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo é obrigatório." },
      { status: 400 },
    );
  }

  if (!organizationId || typeof organizationId !== "string") {
    return NextResponse.json(
      { error: "ID da organização é obrigatório." },
      { status: 400 },
    );
  }

  const replaceExisting =
    request.nextUrl.searchParams.get("replaceExisting") === "true";

  const result = await uploadDocument(supabase, file, organizationId, user.id, {
    replaceExisting,
  });

  if (result.status === "error") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.status === "duplicate") {
    return NextResponse.json(
      {
        status: "duplicate",
        existingDocument: result.existingDocument,
      },
      { status: 409 },
    );
  }

  // Add timeline event for upload
  const document = result.document;
  await supabase.from("document_timeline_events").insert({
    document_id: document.id,
    user_id: user.id,
    event_type: "upload",
    description: `Documento "${document.name}" enviado.`,
  });

  // Trigger indexing asynchronously (fire-and-forget)
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  indexDocument(
    supabase,
    document.id,
    organizationId,
    fileBuffer,
    document.file_type,
  ).catch(() => {
    // Indexing errors are handled internally (document status updated to 'error')
  });

  return NextResponse.json(document, { status: 201 });
}
