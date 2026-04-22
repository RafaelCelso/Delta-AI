import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/documents — List documents for an organization.
 *
 * Query params:
 * - organization_id (required): Filter by organization
 * - search (optional): Filter by document name (partial match)
 * - status (optional): Filter by status (processing, indexed, error)
 *
 * Requisitos: 3.10
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const organizationId = request.nextUrl.searchParams.get("organization_id");

  if (!organizationId) {
    return NextResponse.json(
      { error: "ID da organização é obrigatório." },
      { status: 400 },
    );
  }

  let query = supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const search = request.nextUrl.searchParams.get("search");
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const status = request.nextUrl.searchParams.get("status");
  if (status && ["processing", "indexed", "error"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data: documents, error: listError } = await query;

  if (listError) {
    return NextResponse.json(
      { error: `Erro ao listar documentos: ${listError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json(documents);
}
