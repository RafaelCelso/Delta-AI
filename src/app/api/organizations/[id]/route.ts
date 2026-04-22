import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/organizations/:id — Organization details including members list.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Fetch organization details (RLS ensures access control)
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, owner_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (orgError || !org) {
    return NextResponse.json(
      { error: "Organização não encontrada." },
      { status: 404 },
    );
  }

  // Fetch members with profile info
  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select(
      "id, user_id, joined_at, profiles:user_id(full_name, role, avatar_url)",
    )
    .eq("organization_id", id);

  if (membersError) {
    return NextResponse.json(
      { error: `Erro ao buscar membros: ${membersError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ...org, members: members ?? [] });
}
