import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExportService } from "@/lib/export";

/**
 * POST /api/export/document/:id — Exportar documento em DOCX ou PDF.
 *
 * Gera o documento no formato solicitado com página de capa contendo
 * metadados (título, data, usuário, tarefa, referências de controle).
 * Registra log de exportação para auditoria.
 *
 * Body: { format: 'docx' | 'pdf', session_id?: string, task_description?: string }
 *
 * Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const supabase = await createClient();

  // 1. Verificar autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // 2. Validar body
  let body: { format?: string; session_id?: string; task_description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body da requisição inválido." },
      { status: 400 },
    );
  }

  const format = body.format;
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json(
      { error: "Formato inválido. Use 'docx' ou 'pdf'." },
      { status: 400 },
    );
  }

  // 3. Verificar se o documento existe e obter organization_id
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("id, organization_id")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return NextResponse.json(
      { error: "Documento não encontrado." },
      { status: 404 },
    );
  }

  // 4. Gerar exportação
  try {
    const service = new ExportService(supabase);
    const result = await service.exportDocument({
      documentId,
      format,
      userId: user.id,
      organizationId: doc.organization_id as string,
      sessionId: body.session_id,
      taskDescription: body.task_description,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Export-Log-Id": result.exportLogId,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao exportar documento.";

    if (message.includes("não encontrado")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[export/document] Error:", message);
    return NextResponse.json(
      { error: `${message} Tente novamente.` },
      { status: 500 },
    );
  }
}
