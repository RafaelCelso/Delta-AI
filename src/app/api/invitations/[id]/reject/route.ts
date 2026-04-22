import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invitations/:id/reject — Reject a pending invitation.
 * Only the invited user (matched by email) can reject.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invitationId } = await params;
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // 2. Find the invitation by ID
  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .select("id, invited_email, organization_id, status")
    .eq("id", invitationId)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Convite não encontrado." },
      { status: 404 },
    );
  }

  // 3. Verify that the invitation belongs to the authenticated user
  if (invitation.invited_email !== user.email) {
    return NextResponse.json(
      { error: "Sem permissão para rejeitar este convite." },
      { status: 403 },
    );
  }

  // 4. Verify the invitation is still pending
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Este convite já foi processado." },
      { status: 400 },
    );
  }

  // 5. Update invitation status to rejected
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "rejected" })
    .eq("id", invitationId);

  if (updateError) {
    return NextResponse.json(
      { error: "Erro ao rejeitar convite." },
      { status: 500 },
    );
  }

  // Notify the org owner that the invite was rejected
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id, name")
    .eq("id", invitation.organization_id)
    .single();

  if (org) {
    const userName = user.email ?? "Um usuário";
    await supabase.from("notifications").insert({
      user_id: org.owner_id,
      type: "invite_rejected",
      title: "Convite recusado",
      message: `${userName} recusou o convite para a organização ${org.name}.`,
      metadata: {
        organization_id: invitation.organization_id,
        organization_name: org.name,
        invited_email: invitation.invited_email,
      },
    });
  }

  return NextResponse.json({ message: "Convite recusado." }, { status: 200 });
}
