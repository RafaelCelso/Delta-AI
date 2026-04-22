import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Timeline event types supported by the system.
 */
export type TimelineEventType =
  | "upload"
  | "edit"
  | "change_accepted"
  | "export"
  | "delete";

/**
 * Parameters for adding a timeline event.
 */
export interface AddTimelineEventParams {
  documentId: string;
  userId: string;
  eventType: TimelineEventType;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * A timeline event as stored in the database.
 */
export interface TimelineEvent {
  id: string;
  document_id: string;
  user_id: string;
  event_type: TimelineEventType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Add a timeline event for a document.
 *
 * Inserts a new row into `document_timeline_events` with the given parameters.
 * Returns the inserted event or throws on error.
 */
export async function addTimelineEvent(
  supabase: SupabaseClient,
  params: AddTimelineEventParams,
): Promise<TimelineEvent> {
  const { documentId, userId, eventType, description, metadata } = params;

  const insertData: Record<string, unknown> = {
    document_id: documentId,
    user_id: userId,
    event_type: eventType,
    description,
  };

  if (metadata !== undefined) {
    insertData.metadata = metadata;
  }

  const { data, error } = await supabase
    .from("document_timeline_events")
    .insert(insertData)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao adicionar evento na timeline: ${error.message}`);
  }

  return data as TimelineEvent;
}

/**
 * Get all timeline events for a document, ordered by `created_at` ascending.
 *
 * Returns an array of timeline events in chronological order.
 */
export async function getDocumentTimeline(
  supabase: SupabaseClient,
  documentId: string,
): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("document_timeline_events")
    .select(
      "id, document_id, user_id, event_type, description, metadata, created_at",
    )
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar timeline: ${error.message}`);
  }

  return (data ?? []) as TimelineEvent[];
}
