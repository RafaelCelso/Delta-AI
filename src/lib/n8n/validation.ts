/**
 * Response validation functions for n8n webhook responses.
 *
 * Each validator checks for required fields, correct types, and valid ranges
 * (e.g., confidence_score between 0 and 1) before the backend forwards
 * the response to the frontend.
 *
 * Requisito: 10.4
 */

import type {
  ImpactAnalysisResponse,
  GenerateChangesResponse,
  GenerateReportResponse,
} from "./types";

/**
 * Result of a validation attempt.
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates the response structure from the n8n impact-analysis webhook.
 *
 * Expected schema:
 * {
 *   affected_documents: [{
 *     document_id: string,
 *     document_name: string,
 *     sections: [{
 *       section_id: string,
 *       section_path: string,
 *       relevance_summary: string,
 *       confidence_score: number (0..1)
 *     }]
 *   }]
 * }
 *
 * **Validates: Requirements 10.4**
 */
export function validateImpactAnalysisResponse(
  data: unknown,
): ValidationResult<ImpactAnalysisResponse> {
  if (data === null || data === undefined || typeof data !== "object") {
    return { valid: false, error: "Response is not an object" };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.affected_documents)) {
    return {
      valid: false,
      error: "Missing or invalid 'affected_documents' array",
    };
  }

  for (let i = 0; i < obj.affected_documents.length; i++) {
    const doc = obj.affected_documents[i] as Record<string, unknown>;

    if (typeof doc.document_id !== "string" || doc.document_id.length === 0) {
      return {
        valid: false,
        error: `affected_documents[${i}]: missing or invalid 'document_id'`,
      };
    }

    if (
      typeof doc.document_name !== "string" ||
      doc.document_name.length === 0
    ) {
      return {
        valid: false,
        error: `affected_documents[${i}]: missing or invalid 'document_name'`,
      };
    }

    if (!Array.isArray(doc.sections)) {
      return {
        valid: false,
        error: `affected_documents[${i}]: missing or invalid 'sections' array`,
      };
    }

    for (let j = 0; j < doc.sections.length; j++) {
      const section = doc.sections[j] as Record<string, unknown>;

      if (
        typeof section.section_id !== "string" ||
        section.section_id.length === 0
      ) {
        return {
          valid: false,
          error: `affected_documents[${i}].sections[${j}]: missing or invalid 'section_id'`,
        };
      }

      if (
        typeof section.section_path !== "string" ||
        section.section_path.length === 0
      ) {
        return {
          valid: false,
          error: `affected_documents[${i}].sections[${j}]: missing or invalid 'section_path'`,
        };
      }

      if (
        typeof section.relevance_summary !== "string" ||
        section.relevance_summary.length === 0
      ) {
        return {
          valid: false,
          error: `affected_documents[${i}].sections[${j}]: missing or invalid 'relevance_summary'`,
        };
      }

      if (
        typeof section.confidence_score !== "number" ||
        !Number.isFinite(section.confidence_score) ||
        section.confidence_score < 0 ||
        section.confidence_score > 1
      ) {
        return {
          valid: false,
          error: `affected_documents[${i}].sections[${j}]: 'confidence_score' must be a number between 0 and 1`,
        };
      }
    }
  }

  return { valid: true, data: obj as unknown as ImpactAnalysisResponse };
}

/**
 * Validates the response structure from the n8n generate-changes webhook.
 *
 * Expected schema:
 * {
 *   changes: [{
 *     section_id: string,
 *     section_path: string,
 *     original_content: string,
 *     proposed_content: string
 *   }]
 * }
 */
export function validateGenerateChangesResponse(
  data: unknown,
): ValidationResult<GenerateChangesResponse> {
  if (data === null || data === undefined || typeof data !== "object") {
    return { valid: false, error: "Response is not an object" };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.changes)) {
    return { valid: false, error: "Missing or invalid 'changes' array" };
  }

  for (let i = 0; i < obj.changes.length; i++) {
    const change = obj.changes[i] as Record<string, unknown>;

    if (
      typeof change.section_id !== "string" ||
      change.section_id.length === 0
    ) {
      return {
        valid: false,
        error: `changes[${i}]: missing or invalid 'section_id'`,
      };
    }

    if (
      typeof change.section_path !== "string" ||
      change.section_path.length === 0
    ) {
      return {
        valid: false,
        error: `changes[${i}]: missing or invalid 'section_path'`,
      };
    }

    if (typeof change.original_content !== "string") {
      return {
        valid: false,
        error: `changes[${i}]: missing or invalid 'original_content'`,
      };
    }

    if (typeof change.proposed_content !== "string") {
      return {
        valid: false,
        error: `changes[${i}]: missing or invalid 'proposed_content'`,
      };
    }
  }

  return { valid: true, data: obj as unknown as GenerateChangesResponse };
}

/**
 * Validates the response structure from the n8n generate-report webhook.
 *
 * Expected schema:
 * {
 *   report_content: string,
 *   report_title: string,
 *   generated_at: string
 * }
 */
export function validateGenerateReportResponse(
  data: unknown,
): ValidationResult<GenerateReportResponse> {
  if (data === null || data === undefined || typeof data !== "object") {
    return { valid: false, error: "Response is not an object" };
  }

  const obj = data as Record<string, unknown>;

  if (
    typeof obj.report_content !== "string" ||
    obj.report_content.length === 0
  ) {
    return { valid: false, error: "Missing or invalid 'report_content'" };
  }

  if (typeof obj.report_title !== "string" || obj.report_title.length === 0) {
    return { valid: false, error: "Missing or invalid 'report_title'" };
  }

  if (typeof obj.generated_at !== "string" || obj.generated_at.length === 0) {
    return { valid: false, error: "Missing or invalid 'generated_at'" };
  }

  return { valid: true, data: obj as unknown as GenerateReportResponse };
}
