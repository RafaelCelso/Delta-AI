/**
 * TypeScript interfaces for n8n webhook request/response payloads.
 *
 * Requisitos: 10.1, 10.4, 5.1
 */

// ─── Impact Analysis ────────────────────────────────────────────────────────

/**
 * Payload sent to the n8n impact-analysis webhook.
 */
export interface ImpactAnalysisRequest {
  task_description: string;
  organization_id: string;
  session_id: string;
  user_id: string;
}

/**
 * A single affected section within a document, as returned by n8n.
 */
export interface AffectedSectionResponse {
  section_id: string;
  section_path: string;
  relevance_summary: string;
  confidence_score: number;
}

/**
 * A single affected document, as returned by n8n.
 */
export interface AffectedDocumentResponse {
  document_id: string;
  document_name: string;
  sections: AffectedSectionResponse[];
}

/**
 * Expected response from the n8n impact-analysis webhook.
 */
export interface ImpactAnalysisResponse {
  affected_documents: AffectedDocumentResponse[];
}

// ─── Generate Changes ───────────────────────────────────────────────────────

/**
 * Payload sent to the n8n generate-changes webhook.
 */
export interface GenerateChangesRequest {
  analysis_id: string;
  organization_id: string;
  session_id: string;
  user_id: string;
}

/**
 * A single proposed change for a section, as returned by n8n.
 */
export interface ProposedChangeResponse {
  section_id: string;
  section_path: string;
  original_content: string;
  proposed_content: string;
}

/**
 * Expected response from the n8n generate-changes webhook.
 */
export interface GenerateChangesResponse {
  changes: ProposedChangeResponse[];
}

// ─── Generate Report ────────────────────────────────────────────────────────

/**
 * Payload sent to the n8n generate-report webhook.
 */
export interface GenerateReportRequest {
  session_id: string;
  organization_id: string;
  user_id: string;
}

/**
 * Expected response from the n8n generate-report webhook.
 */
export interface GenerateReportResponse {
  report_content: string;
  report_title: string;
  generated_at: string;
}

// ─── Error types ────────────────────────────────────────────────────────────

/**
 * Possible error types from n8n communication.
 */
export type N8nErrorType =
  | "timeout"
  | "unavailable"
  | "invalid_response"
  | "not_configured";

/**
 * Structured error returned by the N8nClient.
 */
export class N8nError extends Error {
  public readonly type: N8nErrorType;
  public readonly statusCode: number;

  constructor(type: N8nErrorType, message: string, statusCode: number) {
    super(message);
    this.name = "N8nError";
    this.type = type;
    this.statusCode = statusCode;
  }
}
