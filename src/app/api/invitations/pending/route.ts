import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/invitations/pending — List pending invitations for the authenticated user.
 * Returns only invitations matching the user's email, with status 'pending' and not expired.
 * Uses admin client to bypass RLS so the invited user can see the organization name
 * and the inviter's name (they are not yet a member of the org).
 */
export async function GET() {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const userEmail = user.email;
  if (!userEmail) {
    return NextResponse.json(
      { error: "Erro ao buscar convites pendentes." },
      { status: 500 },
    );
  }

  // 2. Query pending, non-expired invitations using admin client to bypass RLS
  //    (the invited user is not yet a member, so RLS on organizations/profiles would block the joins)
  const admin = createAdminClient();

  const { data: invitations, error: queryError } = await admin
    .from("invitations")
    .select(
      "id, organization_id, organizations(name), profiles!invited_by(full_name), token, created_at, expires_at",
    )
    .eq("invited_email", userEmail)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (queryError) {
    return NextResponse.json(
      { error: "Erro ao buscar convites pendentes." },
      { status: 500 },
    );
  }

  // 3. Flatten the organization name and inviter name from the join result
  const result = (invitations ?? []).map((inv) => ({
    id: inv.id,
    organization_id: inv.organization_id,
    organization_name:
      (inv.organizations as unknown as { name: string })?.name ?? "",
    invited_by_name:
      (inv.profiles as unknown as { full_name: string })?.full_name ?? "",
    token: inv.token,
    created_at: inv.created_at,
    expires_at: inv.expires_at,
  }));

  return NextResponse.json(result);
}
