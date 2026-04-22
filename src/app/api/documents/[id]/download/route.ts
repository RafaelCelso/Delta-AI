import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Map file extensions to MIME types. */
const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * GET /api/documents/:id/download — Download the original file from Supabase Storage.
 *
 * Requisitos: 3.11
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

  // Fetch document to get storage_path and metadata
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("name, file_type, storage_path")
    .eq("id", id)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: "Erro ao baixar arquivo do armazenamento." },
      { status: 500 },
    );
  }

  const contentType =
    MIME_TYPES[document.file_type] ?? "application/octet-stream";
  const buffer = Buffer.from(await fileData.arrayBuffer());

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${document.name}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
