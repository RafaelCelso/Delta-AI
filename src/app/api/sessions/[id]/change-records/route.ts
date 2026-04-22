import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChangeRecordsService } from "@/lib/change-records";

/**
 * GET /api/sessions/:id/change-records — Listar registros de controle de mudanças da sessão.
 *
 * Retorna array de registros ordenados por número sequencial ascendente.
 * RLS garante que apenas registros acessíveis ao usuário são retornados.
 *
 * Requisitos: 7.1, 7.2
 */
export async function GET(
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

  // Verificar se a sessão existe (RLS controla acesso)
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
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
    const records = await service.listBySession(sessionId);

    return NextResponse.json(records);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao buscar registros de controle.";
    console.error("[change-records/list] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
