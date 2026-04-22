import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/organizations/:id/members — Accept an invitation via token.
 * Finds the invitation by token, verifies it's pending and not expired,
 * then adds the user as a member and marks the invitation as accepted.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Parse request body
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json(
      { error: "Token de convite é obrigatório." },
      { status: 400 },
    );
  }

  // Find the invitation by token and organization
  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .select(
      "id, organization_id, invited_email, invited_by, status, expires_at",
    )
    .eq("token", token)
    .eq("organization_id", orgId)
    .single();

  if (inviteError || !invitation) {
    return NextResponse.json(
      { error: "Convite não encontrado." },
      { status: 404 },
    );
  }

  // Verify invitation is pending
  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: "Este convite já foi utilizado ou expirou." },
      { status: 400 },
    );
  }

  // Verify invitation is not expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Mark as expired
    await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);

    return NextResponse.json(
      { error: "Este convite expirou." },
      { status: 400 },
    );
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (existingMember) {
    // Still mark invitation as accepted even if already a member
    await supabase
      .from("invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return NextResponse.json(
      { error: "Você já é membro desta organização." },
      { status: 400 },
    );
  }

  // Add user as a member
  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({ organization_id: orgId, user_id: user.id });

  if (memberError) {
    return NextResponse.json(
      { error: `Erro ao adicionar membro: ${memberError.message}` },
      { status: 500 },
    );
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  if (updateError) {
    return NextResponse.json(
      { error: `Erro ao atualizar convite: ${updateError.message}` },
      { status: 500 },
    );
  }

  // Notify the org owner that the invite was accepted
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id, name")
    .eq("id", orgId)
    .single();

  if (org) {
    const userName = user.email ?? "Um usuário";
    await supabase.from("notifications").insert({
      user_id: org.owner_id,
      type: "invite_accepted",
      title: "Convite aceito",
      message: `${userName} aceitou o convite para a organização ${org.name}.`,
      metadata: {
        organization_id: orgId,
        organization_name: org.name,
        invited_email: invitation.invited_email,
      },
    });
  }

  return NextResponse.json(
    { message: "Convite aceito com sucesso." },
    { status: 200 },
  );
}
