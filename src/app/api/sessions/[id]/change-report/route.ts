import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { N8nError } from "@/lib/n8n";
import { ChangeRecordsService } from "@/lib/change-records";

/**
 * POST /api/sessions/:id/change-report — Gerar relatório consolidado de mudanças.
 *
 * Chama o webhook n8n para gerar um relatório consolidado de todas as
 * mudanças registradas na sessão.
 *
 * Requisitos: 7.3, 7.5
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Verificar se a sessão existe e obter organization_id (RLS controla acesso)
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, organization_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 },
    );
  }

  try {
    const service = new ChangeRecordsService(supabase);
    const report = await service.generateReport({
      sessionId,
      organizationId: session.organization_id as string,
      userId: user.id,
    });

    return NextResponse.json(report);
  } catch (err) {
    if (err instanceof N8nError) {
      switch (err.type) {
        case "timeout":
        case "unavailable":
        case "not_configured":
          return NextResponse.json({ error: err.message }, { status: 503 });
        case "invalid_response":
          return NextResponse.json({ error: err.message }, { status: 502 });
        default:
          return NextResponse.json({ error: err.message }, { status: 503 });
      }
    }

    const message =
      err instanceof Error
        ? err.message
        : "Erro ao gerar relatório de mudanças.";
    console.error("[change-report] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
