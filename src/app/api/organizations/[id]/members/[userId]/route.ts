import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/organizations/:id/members/:userId — Remove a member.
 * Only the org owner or a Super Adm can remove members.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: orgId, userId: targetUserId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
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
      { error: "Sem permissão para remover membros desta organização." },
      { status: 403 },
    );
  }

  // Prevent removing the owner from their own organization
  if (targetUserId === org.owner_id) {
    return NextResponse.json(
      { error: "Não é possível remover o dono da organização." },
      { status: 400 },
    );
  }

  // Remove the member
  const { error: deleteError, count } = await supabase
    .from("organization_members")
    .delete({ count: "exact" })
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId);

  if (deleteError) {
    return NextResponse.json(
      { error: `Erro ao remover membro: ${deleteError.message}` },
      { status: 500 },
    );
  }

  if (count === 0) {
    return NextResponse.json(
      { error: "Membro não encontrado nesta organização." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { message: "Membro removido com sucesso." },
    { status: 200 },
  );
}
