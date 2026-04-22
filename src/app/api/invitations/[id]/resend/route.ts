import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invitations/:id/resend — Resend (renew) a pending invitation.
 * Deletes the old invitation and creates a new one with a fresh expiration.
 * Only the org owner or a Super Adm can resend.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invitationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Find the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .select("id, organization_id, invited_email, status")
    .eq("id", invitationId)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Convite não encontrado." },
      { status: 404 },
    );
  }

  // Verify invitation is still pending
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Este convite já foi processado." },
      { status: 400 },
    );
  }

  // Check if user is Super Adm
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdm = profile?.role === "super_adm";

  // Check if user is the org owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", invitation.organization_id)
    .single();

  if (!org) {
    return NextResponse.json(
      { error: "Organização não encontrada." },
      { status: 404 },
    );
  }

  const isOwner = org.owner_id === user.id;

  if (!isOwner && !isSuperAdm) {
    return NextResponse.json(
      { error: "Sem permissão para reenviar convites nesta organização." },
      { status: 403 },
    );
  }

  // Delete the old invitation
  const { error: deleteError } = await supabase
    .from("invitations")
    .delete()
    .eq("id", invitationId);

  if (deleteError) {
    return NextResponse.json(
      { error: "Erro ao reenviar convite." },
      { status: 500 },
    );
  }

  // Create a new invitation with fresh expiration
  const { data: newInvitation, error: createError } = await supabase
    .from("invitations")
    .insert({
      organization_id: invitation.organization_id,
      invited_email: invitation.invited_email,
      invited_by: user.id,
    })
    .select(
      "id, organization_id, invited_email, token, status, created_at, expires_at",
    )
    .single();

  if (createError) {
    return NextResponse.json(
      { error: `Erro ao reenviar convite: ${createError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(newInvitation, { status: 201 });
}
