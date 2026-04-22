import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ChangesService } from "@/lib/changes";

/**
 * POST /api/changes/:changeId/reject — Reject a proposed change with optional feedback.
 *
 * Updates the proposed_change status to 'rejected' and stores the feedback.
 * The feedback can be used by the AI to generate a revised proposal.
 *
 * Body: { feedback?: string }
 *
 * Requisitos: 6.3, 6.5
 */
export async function POST(
  request: NextRequest,
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

  // Parse optional feedback from body
  let feedback: string | undefined;
  try {
    const body = await request.json();
    feedback = typeof body.feedback === "string" ? body.feedback : undefined;
  } catch {
    // Body is optional for rejection — proceed without feedback
  }

  try {
    const service = new ChangesService(supabase);
    const result = await service.rejectChange({
      changeId,
      userId: user.id,
      feedback,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao rejeitar alteração.";

    if (message.includes("não encontrada")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("já foi")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.error("[changes/reject] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
