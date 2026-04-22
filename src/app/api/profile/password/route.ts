import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createBrowserStyleClient } from "@supabase/supabase-js";
import {
  validateCurrentPassword,
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/lib/validators/profile";

/**
 * POST /api/profile/password — Alterar senha do usuário.
 *
 * Request body: { currentPassword: string, newPassword: string, confirmPassword: string }
 * Response: { success: true } | { error: string }
 *
 * Uses an isolated Supabase client to verify the current password so that the
 * signInWithPassword call does NOT overwrite the session cookies of the
 * authenticated request. This keeps the user's browser session intact after
 * the password change.
 *
 * Requisitos: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
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

  try {
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate current password
    const currentPasswordValidation = validateCurrentPassword(
      currentPassword ?? "",
    );
    if (!currentPasswordValidation.valid) {
      return NextResponse.json(
        { error: currentPasswordValidation.error },
        { status: 400 },
      );
    }

    // Validate new password
    const newPasswordValidation = validateNewPassword(newPassword ?? "");
    if (!newPasswordValidation.valid) {
      return NextResponse.json(
        { error: newPasswordValidation.error },
        { status: 400 },
      );
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(
      newPassword ?? "",
      confirmPassword ?? "",
    );
    if (!confirmValidation.valid) {
      return NextResponse.json(
        { error: confirmValidation.error },
        { status: 400 },
      );
    }

    // Verify current password using an isolated client so the
    // signInWithPassword call does NOT touch the request cookies /
    // session of the already-authenticated user.
    const isolatedClient = createBrowserStyleClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    const { error: signInError } = await isolatedClient.auth.signInWithPassword(
      {
        email: user.email!,
        password: currentPassword,
      },
    );

    if (signInError) {
      return NextResponse.json(
        { error: "Senha atual incorreta." },
        { status: 400 },
      );
    }

    // Update password via admin client
    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword },
    );

    if (updateError) {
      console.error("[profile/password] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Erro ao alterar senha." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    console.error("[profile/password] Unexpected error");
    return NextResponse.json(
      { error: "Erro ao alterar senha." },
      { status: 500 },
    );
  }
}
