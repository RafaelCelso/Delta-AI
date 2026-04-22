import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/notifications — List unread notifications for the authenticated user.
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

  const { data: notifications, error: queryError } = await supabase
    .from("notifications")
    .select("id, type, title, message, read, metadata, created_at")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false });

  if (queryError) {
    return NextResponse.json(
      { error: "Erro ao buscar notificações." },
      { status: 500 },
    );
  }

  return NextResponse.json(notifications ?? []);
}
