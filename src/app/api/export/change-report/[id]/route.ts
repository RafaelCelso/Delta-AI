import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ExportService } from "@/lib/export";

/**
 * POST /api/export/change-report/:id — Exportar relatório de controle de mudanças.
 *
 * Gera o relatório no formato solicitado (DOCX ou PDF) com página de capa
 * contendo metadados e tabela de seções alteradas com conteúdo antes/depois.
 * Registra log de exportação para auditoria.
 *
 * Body: { format: 'docx' | 'pdf' }
 *
 * Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: changeRecordId } = await params;
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
  let body: { format?: string };
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

  // 3. Verificar se o registro de controle existe e obter dados de contexto
  const { data: record, error: recordError } = await supabase
    .from("change_records")
    .select("id, session_id, organization_id")
    .eq("id", changeRecordId)
    .single();

  if (recordError || !record) {
    return NextResponse.json(
      { error: "Registro de controle não encontrado." },
      { status: 404 },
    );
  }

  // 4. Gerar exportação
  try {
    const service = new ExportService(supabase);
    const result = await service.exportChangeReport({
      changeRecordId,
      format,
      userId: user.id,
      sessionId: record.session_id as string,
      organizationId: record.organization_id as string,
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
      err instanceof Error
        ? err.message
        : "Erro ao exportar relatório de mudanças.";

    if (message.includes("não encontrado")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[export/change-report] Error:", message);
    return NextResponse.json(
      { error: `${message} Tente novamente.` },
      { status: 500 },
    );
  }
}
