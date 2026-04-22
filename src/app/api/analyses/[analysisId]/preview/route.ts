import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChangesService } from "@/lib/changes";

/**
 * GET /api/analyses/:analysisId/preview — Get preview of proposed changes for an analysis.
 *
 * Returns all proposed changes grouped by document, with section context,
 * diff content (original vs proposed), and a flag for cases where the AI
 * could not generate a meaningful modification.
 *
 * Requisitos: 6.1, 6.2, 6.6
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const { analysisId } = await params;
  const supabase = await createClient();

  // Authenticate
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const service = new ChangesService(supabase);
    const preview = await service.getPreview(analysisId);

    return NextResponse.json(preview);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao buscar preview.";

    // Distinguish "not found" from other errors
    if (message.includes("não encontrada")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error("[changes/preview] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
