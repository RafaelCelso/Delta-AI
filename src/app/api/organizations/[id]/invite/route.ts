import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/organizations/:id/invite — Send an invitation.
 * Only the org owner or a Super Adm can invite.
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
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "Email é obrigatório." },
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
    .eq("id", orgId)
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
      { error: "Sem permissão para enviar convites nesta organização." },
      { status: 403 },
    );
  }

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      invited_email: email,
      invited_by: user.id,
    })
    .select(
      "id, organization_id, invited_email, token, status, created_at, expires_at",
    )
    .single();

  if (inviteError) {
    return NextResponse.json(
      { error: `Erro ao criar convite: ${inviteError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(invitation, { status: 201 });
}
