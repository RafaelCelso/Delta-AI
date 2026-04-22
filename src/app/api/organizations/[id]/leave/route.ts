import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/organizations/:id/leave — Leave an organization.
 * Removes the authenticated user from the organization's members.
 * The owner cannot leave; they must delete the organization instead.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    // 2. Fetch organization by ID
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, owner_id")
      .eq("id", id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organização não encontrada." },
        { status: 404 },
      );
    }

    // 3. Verify user is not the owner
    if (org.owner_id === user.id) {
      return NextResponse.json(
        {
          error:
            "O proprietário não pode sair da organização. Utilize a opção de excluir organização.",
        },
        { status: 400 },
      );
    }

    // 4. Verify user is a member of the organization
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Você não é membro desta organização." },
        { status: 404 },
      );
    }

    // 5. Remove user from organization members
    const { error: deleteError } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao sair da organização." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Você saiu da organização." });
  } catch {
    return NextResponse.json(
      { error: "Erro ao sair da organização." },
      { status: 500 },
    );
  }
}
