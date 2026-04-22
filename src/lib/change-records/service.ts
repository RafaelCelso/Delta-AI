/**
 * ChangeRecordsService — Gerencia consulta de registros de controle de mudanças
 * e geração de relatórios consolidados via n8n.
 *
 * Handles:
 * - Listagem de registros por sessão
 * - Detalhes de um registro com seções
 * - Geração de relatório consolidado via n8n
 *
 * Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { N8nClient } from "@/lib/n8n";
import type {
  ChangeRecord,
  ChangeRecordSummary,
  ChangeRecordSection,
  ChangeReportResult,
} from "./types";

export class ChangeRecordsService {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Listar registros de controle de mudanças de uma sessão.
   *
   * Retorna registros ordenados por número sequencial ascendente.
   * RLS garante que apenas registros da organização do usuário são retornados.
   *
   * Requisitos: 7.1, 7.2
   */
  async listBySession(sessionId: string): Promise<ChangeRecordSummary[]> {
    const { data, error } = await this.supabase
      .from("change_records")
      .select(
        "id, sequential_number, session_id, organization_id, user_id, task_description, document_name, document_id, status, created_at",
      )
      .eq("session_id", sessionId)
      .order("sequential_number", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar registros de controle: ${error.message}`);
    }

    return (data ?? []) as ChangeRecordSummary[];
  }

  /**
   * Obter detalhes de um registro de controle com suas seções.
   *
   * Retorna o registro completo com as seções embutidas.
   * RLS garante acesso apenas a registros da organização do usuário.
   *
   * Requisitos: 7.1, 7.4
   */
  async getById(recordId: string): Promise<ChangeRecord> {
    const { data: record, error: recordError } = await this.supabase
      .from("change_records")
      .select(
        "id, sequential_number, session_id, organization_id, user_id, task_description, document_name, document_id, status, created_at",
      )
      .eq("id", recordId)
      .single();

    if (recordError || !record) {
      throw new Error("Registro de controle não encontrado.");
    }

    const { data: sections, error: sectionsError } = await this.supabase
      .from("change_record_sections")
      .select(
        "section_path, section_title, content_before, content_after, change_description",
      )
      .eq("change_record_id", recordId)
      .order("created_at", { ascending: true });

    if (sectionsError) {
      throw new Error(
        `Erro ao buscar seções do registro: ${sectionsError.message}`,
      );
    }

    return {
      ...(record as Omit<ChangeRecord, "sections">),
      sections: (sections ?? []) as ChangeRecordSection[],
    };
  }

  /**
   * Gerar relatório consolidado de mudanças via n8n.
   *
   * Chama o webhook de geração de relatório do n8n e retorna o resultado.
   * Erros do N8nClient (N8nError) são propagados para o caller tratar.
   *
   * Requisitos: 7.3, 7.5
   */
  async generateReport(params: {
    sessionId: string;
    organizationId: string;
    userId: string;
  }): Promise<ChangeReportResult> {
    const { sessionId, organizationId, userId } = params;

    const n8nClient = new N8nClient();
    const response = await n8nClient.generateReport({
      session_id: sessionId,
      organization_id: organizationId,
      user_id: userId,
    });

    return {
      report_content: response.report_content,
      report_title: response.report_title,
      generated_at: response.generated_at,
      session_id: sessionId,
    };
  }
}
