import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  // Enrich members with email from auth.users (requires admin client)
  const adminClient = createAdminClient();
  const enrichedMembers = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data: authUser } = await adminClient.auth.admin.getUserById(
        member.user_id,
      );
      return {
        ...member,
        email: authUser?.user?.email ?? null,
      };
    }),
  );

  // Fetch pending invitations (non-expired, status = pending)
  const { data: pendingInvitations, error: invitationsError } = await supabase
    .from("invitations")
    .select("id, invited_email, created_at, expires_at")
    .eq("organization_id", id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (invitationsError) {
    return NextResponse.json(
      {
        error: `Erro ao buscar convites pendentes: ${invitationsError.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ...org,
    members: enrichedMembers,
    pending_invitations: pendingInvitations ?? [],
  });
}

/** Bucket name used for organization files in Supabase Storage. */
const STORAGE_BUCKET = "documents";

/**
 * DELETE /api/organizations/:id — Delete an organization.
 * Only the owner can delete the organization.
 * Uses the admin client (service role) to bypass RLS.
 *
 * Flow:
 * 1. Authenticate user
 * 2. Fetch organization (verify existence + ownership)
 * 3. Fetch invited members (non-owner)
 * 4. Create notifications for invited members (before CASCADE)
 * 5. Remove files from Supabase Storage (log errors, don't block)
 * 6. Delete organization record (CASCADE handles dependent data)
 *
 * Requisitos: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2
 */
export async function DELETE(
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

  const supabaseAdmin = createAdminClient();

  try {
    // 2. Fetch organization by ID (using admin to bypass RLS)
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("id, name, owner_id")
      .eq("id", id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organização não encontrada." },
        { status: 404 },
      );
    }

    // 3. Verify user is the owner
    if (org.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Apenas o proprietário pode excluir a organização." },
        { status: 403 },
      );
    }

    // 4. Fetch invited members (user_id != owner_id)
    const { data: invitedMembers } = await supabaseAdmin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", id)
      .neq("user_id", org.owner_id);

    // 5. Create notifications for each invited member BEFORE deleting
    if (invitedMembers && invitedMembers.length > 0) {
      const notifications = invitedMembers.map((member) => ({
        user_id: member.user_id,
        type: "org_deleted" as const,
        title: "Organização excluída",
        message: `A organização ${org.name} foi excluída pelo proprietário.`,
        metadata: {
          organization_id: id,
          organization_name: org.name,
        },
      }));

      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error(
          `Erro ao criar notificações de exclusão para org ${id}:`,
          notifError,
        );
      }
    }

    // 6. List and remove files from Supabase Storage
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .list(`organizations/${id}`);

      if (listError) {
        console.error(
          `Erro ao listar arquivos do Storage para org ${id}:`,
          listError,
        );
      } else if (files && files.length > 0) {
        // Storage may have nested folders — list recursively
        const filePaths = await listAllStorageFiles(
          supabaseAdmin,
          STORAGE_BUCKET,
          `organizations/${id}`,
        );

        if (filePaths.length > 0) {
          const { error: removeError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .remove(filePaths);

          if (removeError) {
            console.error(
              `Erro ao remover arquivos do Storage para org ${id}:`,
              removeError,
            );
          }
        }
      }
    } catch (storageError) {
      console.error(
        `Erro inesperado ao limpar Storage para org ${id}:`,
        storageError,
      );
    }

    // 7. Delete organization record (CASCADE handles dependent data)
    const { error: deleteError } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error(
        `Erro ao excluir organização ${id}:`,
        deleteError.message,
        deleteError.details,
        deleteError.hint,
        deleteError.code,
      );
      return NextResponse.json(
        { error: "Erro ao excluir organização." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Organização excluída com sucesso.",
    });
  } catch (err) {
    console.error(`Exceção inesperada ao excluir organização ${id}:`, err);
    return NextResponse.json(
      { error: "Erro ao excluir organização." },
      { status: 500 },
    );
  }
}

/**
 * Recursively lists all file paths under a given Storage prefix.
 * Supabase Storage `.list()` returns items at one level — folders
 * appear as items with `id: null`. This helper walks into each
 * sub-folder to collect every file path.
 */
async function listAllStorageFiles(
  client: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const { data: items, error } = await client.storage.from(bucket).list(prefix);

  if (error || !items) {
    return [];
  }

  const paths: string[] = [];

  for (const item of items) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.id === null) {
      // It's a folder — recurse
      const nested = await listAllStorageFiles(client, bucket, fullPath);
      paths.push(...nested);
    } else {
      paths.push(fullPath);
    }
  }

  return paths;
}
