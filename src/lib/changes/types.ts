/**
 * TypeScript interfaces for the preview and approval module.
 *
 * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

/**
 * A proposed change as stored in the database.
 */
export interface ProposedChange {
  id: string;
  affected_section_id: string;
  original_content: string;
  proposed_content: string;
  status: "pending" | "accepted" | "rejected";
  rejection_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * A proposed change enriched with section and document context for preview.
 */
export interface ProposedChangePreview {
  id: string;
  affected_section_id: string;
  original_content: string;
  proposed_content: string;
  status: "pending" | "accepted" | "rejected";
  section_path: string;
  section_title: string | null;
  document_id: string;
  document_name: string;
  relevance_summary: string;
  confidence_score: number;
  /** True when original_content equals proposed_content (no meaningful change). */
  no_meaningful_change: boolean;
}

/**
 * Full preview response for an analysis, grouped by document.
 */
export interface AnalysisPreview {
  analysis_id: string;
  task_description: string;
  status: string;
  documents: DocumentPreview[];
}

/**
 * Preview of changes for a single document.
 */
export interface DocumentPreview {
  document_id: string;
  document_name: string;
  changes: ProposedChangePreview[];
}

/**
 * Result of accepting a proposed change.
 */
export interface AcceptChangeResult {
  change_id: string;
  change_record_id: string;
  document_id: string;
  message: string;
}

/**
 * Result of rejecting a proposed change.
 */
export interface RejectChangeResult {
  change_id: string;
  message: string;
}
