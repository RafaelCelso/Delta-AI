import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChangeRecordsService } from "@/lib/change-records";

/**
 * GET /api/change-records/:id — Detalhes de um registro de controle de mudanças.
 *
 * Retorna o registro completo com seções embutidas (conteúdo antes/depois).
 * RLS garante que apenas registros acessíveis ao usuário são retornados.
 *
 * Requisitos: 7.1, 7.4
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

  try {
    const service = new ChangeRecordsService(supabase);
    const record = await service.getById(id);

    return NextResponse.json(record);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Erro ao buscar registro de controle.";

    if (message.includes("não encontrado")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[change-records/detail] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
