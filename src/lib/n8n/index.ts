export { N8nClient } from "./client";
export { N8nError } from "./types";
export type {
  N8nErrorType,
  ImpactAnalysisRequest,
  ImpactAnalysisResponse,
  AffectedDocumentResponse,
  AffectedSectionResponse,
  GenerateChangesRequest,
  GenerateChangesResponse,
  ProposedChangeResponse,
  GenerateReportRequest,
  GenerateReportResponse,
} from "./types";
export {
  validateImpactAnalysisResponse,
  validateGenerateChangesResponse,
  validateGenerateReportResponse,
} from "./validation";
export type { ValidationResult } from "./validation";
