/**
 * TypeScript interfaces para o módulo de exportação de documentos e relatórios.
 *
 * Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

/** Formato de exportação suportado. */
export type ExportFormat = "docx" | "pdf";

/** Tipo de exportação. */
export type ExportType = "document" | "change_report";

/** Parâmetros para exportação de documento. */
export interface ExportDocumentRequest {
  documentId: string;
  format: ExportFormat;
  userId: string;
  organizationId: string;
  sessionId?: string;
  taskDescription?: string;
}

/** Parâmetros para exportação de relatório de mudanças. */
export interface ExportChangeReportRequest {
  changeRecordId: string;
  format: ExportFormat;
  userId: string;
  sessionId: string;
  organizationId: string;
}

/** Resultado de uma exportação bem-sucedida. */
export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  exportLogId: string;
}

/** Dados do documento para geração de exportação. */
export interface DocumentExportData {
  id: string;
  name: string;
  parsed_content: Record<string, unknown> | null;
  organization_id: string;
  created_at: string;
}

/** Dados do registro de controle para geração de relatório. */
export interface ChangeRecordExportData {
  id: string;
  sequential_number: number;
  task_description: string;
  document_name: string;
  document_id: string;
  status: string;
  created_at: string;
  user_name: string;
  sections: ChangeRecordSectionExportData[];
}

/** Dados de uma seção do registro de controle para exportação. */
export interface ChangeRecordSectionExportData {
  section_path: string;
  section_title: string | null;
  content_before: string;
  content_after: string;
  change_description: string;
}

/** Metadados da página de capa. */
export interface CoverPageData {
  title: string;
  date: string;
  userName: string;
  taskDescription?: string;
  changeRecordReferences: string[];
}
