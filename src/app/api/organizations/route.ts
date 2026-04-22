import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/organizations — Create a new organization.
 * The authenticated user becomes the owner and is added as a member.
 * Uses the admin client to bypass the chicken-and-egg RLS problem where
 * adding a member to organization_members requires already being a member.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json(
      { error: "Nome da organização é obrigatório." },
      { status: 400 },
    );
  }

  // Use admin client to bypass RLS for the atomic org + member creation
  const admin = createAdminClient();

  // Create the organization (owner_id = current user)
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, owner_id: user.id })
    .select("id, name, owner_id, created_at, updated_at")
    .single();

  if (orgError) {
    return NextResponse.json(
      { error: `Erro ao criar organização: ${orgError.message}` },
      { status: 500 },
    );
  }

  // Add the creator as a member of the organization
  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: user.id });

  if (memberError) {
    return NextResponse.json(
      { error: `Erro ao adicionar membro: ${memberError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(org, { status: 201 });
}

/**
 * GET /api/organizations — List organizations for the current user.
 * "Padrão" users see only their orgs; "Super Adm" sees all.
 */
export async function GET() {
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

  let query = supabase
    .from("organizations")
    .select("id, name, owner_id, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (!isSuperAdm) {
    // For "Padrão" users, filter to only orgs they are a member of.
    // RLS already enforces this, but we rely on it here.
    // The RLS policy on organizations_select uses is_org_member(id),
    // so the query will naturally return only the user's orgs.
  }

  const { data: organizations, error: listError } = await query;

  if (listError) {
    return NextResponse.json(
      { error: `Erro ao listar organizações: ${listError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(organizations);
}
