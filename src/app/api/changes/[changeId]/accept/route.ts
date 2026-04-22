import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChangesService } from "@/lib/changes";

/**
 * POST /api/changes/:changeId/accept — Accept a proposed change.
 *
 * Atomically:
 * 1. Updates the proposed_change status to 'accepted'
 * 2. Creates a change_record with change_record_sections
 * 3. Adds a timeline event to the document
 *
 * If any step fails, all previous steps are rolled back.
 *
 * Requisitos: 6.3, 6.4
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ changeId: string }> },
) {
  const { changeId } = await params;
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
    const result = await service.acceptChange({
      changeId,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao aceitar alteração.";

    if (message.includes("não encontrada")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("já foi")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error("[changes/accept] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
