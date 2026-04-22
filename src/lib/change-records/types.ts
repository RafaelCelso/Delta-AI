/**
 * TypeScript interfaces para o módulo de controle de mudanças.
 *
 * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Detalhe de uma seção dentro de um registro de controle de mudanças.
 */
export interface ChangeRecordSection {
  section_path: string;
  section_title: string | null;
  content_before: string;
  content_after: string;
  change_description: string;
}

/**
 * Registro completo de controle de mudanças com seções embutidas.
 */
export interface ChangeRecord {
  id: string;
  sequential_number: number;
  session_id: string;
  organization_id: string;
  user_id: string;
  task_description: string;
  document_name: string;
  document_id: string;
  status: string;
  created_at: string;
  sections: ChangeRecordSection[];
}

/**
 * Resumo de um registro de controle para listagem (sem seções).
 */
export interface ChangeRecordSummary {
  id: string;
  sequential_number: number;
  session_id: string;
  organization_id: string;
  user_id: string;
  task_description: string;
  document_name: string;
  document_id: string;
  status: string;
  created_at: string;
}

/**
 * Resultado da geração de relatório consolidado de mudanças.
 */
export interface ChangeReportResult {
  report_content: string;
  report_title: string;
  generated_at: string;
  session_id: string;
}
