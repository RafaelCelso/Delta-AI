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

  // --- Validation 1: Check if email belongs to a registered user ---
  const { data: profileId, error: profileLookupError } = await supabase.rpc(
    "get_profile_id_by_email",
    { p_email: email },
  );

  if (profileLookupError || !profileId) {
    return NextResponse.json(
      { error: "Nenhum usuário cadastrado com este e-mail." },
      { status: 404 },
    );
  }

  // --- Validation 2: Check for duplicate pending invite ---
  const { data: existingInvite } = await supabase
    .from("invitations")
    .select("id")
    .eq("invited_email", email)
    .eq("organization_id", orgId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (existingInvite) {
    return NextResponse.json(
      {
        error:
          "Já existe um convite pendente para este e-mail nesta organização.",
      },
      { status: 409 },
    );
  }

  // --- Validation 3: Check if user is already a member ---
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json(
      { error: "Este usuário já é membro da organização." },
      { status: 409 },
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
