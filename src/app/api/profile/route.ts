import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateFullName } from "@/lib/validators/profile";

/**
 * PATCH /api/profile — Atualizar nome completo do usuário.
 *
 * Request body: { full_name: string }
 * Response: { full_name: string, updated_at: string } | { error: string }
 *
 * Requisitos: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { full_name } = body;

    const validation = validateFullName(full_name ?? "");
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: full_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("full_name, updated_at")
      .single();

    if (updateError) {
      console.error("[profile/update] Error:", updateError.message);
      return NextResponse.json(
        { error: "Erro ao atualizar perfil." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      full_name: data.full_name,
      updated_at: data.updated_at,
    });
  } catch {
    console.error("[profile/update] Unexpected error");
    return NextResponse.json(
      { error: "Erro ao atualizar perfil." },
      { status: 500 },
    );
  }
}
