import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supported message roles.
 */
export type MessageRole = "user" | "assistant";

/**
 * Parameters for sending a message in a session.
 */
export interface SendMessageParams {
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * A message as stored in the database.
 */
export interface Message {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Send (persist) a message in a session.
 *
 * Inserts a new row into the `messages` table and returns the inserted message.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  params: SendMessageParams,
): Promise<Message> {
  const { sessionId, role, content, metadata } = params;

  const insertData: Record<string, unknown> = {
    session_id: sessionId,
    role,
    content,
  };

  if (metadata !== undefined) {
    insertData.metadata = metadata;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert(insertData)
    .select("id, session_id, role, content, metadata, created_at")
    .single();

  if (error) {
    throw new Error(`Erro ao enviar mensagem: ${error.message}`);
  }

  return data as Message;
}

/**
 * Get all messages for a session, ordered by `created_at` ascending.
 *
 * Returns an array of messages in chronological order.
 */
export async function getSessionMessages(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, session_id, role, content, metadata, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  }

  return (data ?? []) as Message[];
}
