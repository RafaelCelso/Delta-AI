/**
 * ChangesService — Manages preview, acceptance, and rejection of proposed changes.
 *
 * Handles:
 * - Fetching preview of proposed changes for an analysis
 * - Accepting a change atomically (update document, create change record, add timeline event)
 * - Rejecting a change with feedback
 * - Detecting when AI could not generate a meaningful modification
 *
 * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { addTimelineEvent } from "@/lib/documents/timeline";
import type {
  AnalysisPreview,
  DocumentPreview,
  ProposedChangePreview,
  AcceptChangeResult,
  RejectChangeResult,
} from "./types";

export class ChangesService {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get preview of all proposed changes for an analysis.
   *
   * Fetches affected sections with their proposed changes, grouped by document.
   * Marks changes where original_content === proposed_content as no_meaningful_change.
   *
   * Requisitos: 6.1, 6.2, 6.6
   */
  async getPreview(analysisId: string): Promise<AnalysisPreview> {
    // 1. Fetch the analysis record
    const { data: analysis, error: analysisError } = await this.supabase
      .from("impact_analyses")
      .select("id, task_description, status")
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) {
      throw new Error("Análise de impacto não encontrada.");
    }

    // 2. Fetch affected sections with their proposed changes
    const { data: sections, error: sectionsError } = await this.supabase
      .from("affected_sections")
      .select(
        `
        id,
        document_id,
        section_path,
        section_title,
        relevance_summary,
        confidence_score,
        proposed_changes (
          id,
          affected_section_id,
          original_content,
          proposed_content,
          status,
          rejection_feedback,
          reviewed_by,
          reviewed_at,
          created_at
        )
      `,
      )
      .eq("analysis_id", analysisId);

    if (sectionsError) {
      throw new Error(
        `Erro ao buscar seções afetadas: ${sectionsError.message}`,
      );
    }

    // 3. Collect unique document IDs and fetch document names
    const documentIds = [
      ...new Set((sections ?? []).map((s) => s.document_id as string)),
    ];

    const documentNames: Record<string, string> = {};
    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await this.supabase
        .from("documents")
        .select("id, name")
        .in("id", documentIds);

      if (docsError) {
        throw new Error(`Erro ao buscar documentos: ${docsError.message}`);
      }

      for (const doc of docs ?? []) {
        documentNames[doc.id] = doc.name;
      }
    }

    // 4. Group changes by document
    const documentMap = new Map<string, ProposedChangePreview[]>();

    for (const section of sections ?? []) {
      const docId = section.document_id as string;
      const changes = (section.proposed_changes ?? []) as Array<{
        id: string;
        affected_section_id: string;
        original_content: string;
        proposed_content: string;
        status: string;
        rejection_feedback: string | null;
        reviewed_by: string | null;
        reviewed_at: string | null;
        created_at: string;
      }>;

      for (const change of changes) {
        const noMeaningfulChange =
          change.original_content.trim() === change.proposed_content.trim();

        const preview: ProposedChangePreview = {
          id: change.id,
          affected_section_id: change.affected_section_id,
          original_content: change.original_content,
          proposed_content: change.proposed_content,
          status: change.status as "pending" | "accepted" | "rejected",
          section_path: section.section_path as string,
          section_title: section.section_title as string | null,
          document_id: docId,
          document_name: documentNames[docId] ?? "Documento desconhecido",
          relevance_summary: section.relevance_summary as string,
          confidence_score: Number(section.confidence_score),
          no_meaningful_change: noMeaningfulChange,
        };

        if (!documentMap.has(docId)) {
          documentMap.set(docId, []);
        }
        documentMap.get(docId)!.push(preview);
      }
    }

    // 5. Build response grouped by document
    const documents: DocumentPreview[] = [];
    for (const [docId, changes] of documentMap) {
      documents.push({
        document_id: docId,
        document_name: documentNames[docId] ?? "Documento desconhecido",
        changes,
      });
    }

    return {
      analysis_id: analysisId,
      task_description: analysis.task_description as string,
      status: analysis.status as string,
      documents,
    };
  }

  /**
   * Accept a proposed change atomically.
   *
   * Performs three operations that must all succeed or all fail:
   * 1. Update the proposed_change status to 'accepted'
   * 2. Create a change_record with change_record_sections
   * 3. Add a timeline event to the document
   *
   * If any step fails, previous steps are rolled back via error handling.
   *
   * Requisitos: 6.3, 6.4
   */
  async acceptChange(params: {
    changeId: string;
    userId: string;
  }): Promise<AcceptChangeResult> {
    const { changeId, userId } = params;

    // 1. Fetch the proposed change with full context
    const changeContext = await this.getChangeContext(changeId);

    if (changeContext.status !== "pending") {
      throw new Error(
        `Alteração já foi ${changeContext.status === "accepted" ? "aceita" : "rejeitada"}.`,
      );
    }

    // 2. Update proposed_change status to 'accepted'
    const { error: updateError } = await this.supabase
      .from("proposed_changes")
      .update({
        status: "accepted",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", changeId);

    if (updateError) {
      throw new Error(`Erro ao aceitar alteração: ${updateError.message}`);
    }

    // 3. Create change record
    const { data: changeRecord, error: recordError } = await this.supabase
      .from("change_records")
      .insert({
        session_id: changeContext.session_id,
        organization_id: changeContext.organization_id,
        user_id: userId,
        task_description: changeContext.task_description,
        document_name: changeContext.document_name,
        document_id: changeContext.document_id,
        status: "accepted",
      })
      .select("id, sequential_number")
      .single();

    if (recordError || !changeRecord) {
      // Rollback: revert proposed_change status
      await this.supabase
        .from("proposed_changes")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null })
        .eq("id", changeId);

      throw new Error(
        `Erro ao criar registro de controle: ${recordError?.message}`,
      );
    }

    // 4. Create change record section
    const { error: sectionError } = await this.supabase
      .from("change_record_sections")
      .insert({
        change_record_id: changeRecord.id,
        section_path: changeContext.section_path,
        section_title: changeContext.section_title,
        content_before: changeContext.original_content,
        content_after: changeContext.proposed_content,
        change_description: changeContext.relevance_summary,
      });

    if (sectionError) {
      // Rollback: delete change record and revert proposed_change
      await this.supabase
        .from("change_records")
        .delete()
        .eq("id", changeRecord.id);
      await this.supabase
        .from("proposed_changes")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null })
        .eq("id", changeId);

      throw new Error(
        `Erro ao criar seção do registro: ${sectionError.message}`,
      );
    }

    // 5. Add timeline event to the document
    try {
      await addTimelineEvent(this.supabase, {
        documentId: changeContext.document_id,
        userId,
        eventType: "change_accepted",
        description: `Alteração aceita na seção "${changeContext.section_path}": ${changeContext.relevance_summary}`,
        metadata: {
          change_record_id: changeRecord.id,
          proposed_change_id: changeId,
          section_path: changeContext.section_path,
        },
      });
    } catch (timelineError) {
      // Rollback: delete change record sections, change record, and revert proposed_change
      await this.supabase
        .from("change_record_sections")
        .delete()
        .eq("change_record_id", changeRecord.id);
      await this.supabase
        .from("change_records")
        .delete()
        .eq("id", changeRecord.id);
      await this.supabase
        .from("proposed_changes")
        .update({ status: "pending", reviewed_by: null, reviewed_at: null })
        .eq("id", changeId);

      throw new Error(
        `Erro ao registrar evento na timeline: ${timelineError instanceof Error ? timelineError.message : "Erro desconhecido"}`,
      );
    }

    // 6. Update document's updated_at timestamp
    await this.supabase
      .from("documents")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", changeContext.document_id);

    return {
      change_id: changeId,
      change_record_id: changeRecord.id,
      document_id: changeContext.document_id,
      message: `Alteração aceita com sucesso. Registro de controle #${changeRecord.sequential_number} criado.`,
    };
  }

  /**
   * Reject a proposed change with optional feedback.
   *
   * Updates the proposed_change status to 'rejected' and stores the feedback.
   * The feedback can be used by the AI to generate a revised proposal.
   *
   * Requisitos: 6.3, 6.5
   */
  async rejectChange(params: {
    changeId: string;
    userId: string;
    feedback?: string;
  }): Promise<RejectChangeResult> {
    const { changeId, userId, feedback } = params;

    // 1. Verify the change exists and is pending
    const { data: change, error: fetchError } = await this.supabase
      .from("proposed_changes")
      .select("id, status")
      .eq("id", changeId)
      .single();

    if (fetchError || !change) {
      throw new Error("Alteração proposta não encontrada.");
    }

    if (change.status !== "pending") {
      throw new Error(
        `Alteração já foi ${change.status === "accepted" ? "aceita" : "rejeitada"}.`,
      );
    }

    // 2. Update status to rejected
    const { error: updateError } = await this.supabase
      .from("proposed_changes")
      .update({
        status: "rejected",
        rejection_feedback: feedback?.trim() || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", changeId);

    if (updateError) {
      throw new Error(`Erro ao rejeitar alteração: ${updateError.message}`);
    }

    return {
      change_id: changeId,
      message: feedback
        ? "Alteração rejeitada. O feedback foi registrado e pode ser usado para gerar uma nova proposta."
        : "Alteração rejeitada.",
    };
  }

  /**
   * Fetch full context for a proposed change, including session, document, and analysis info.
   */
  private async getChangeContext(changeId: string): Promise<{
    change_id: string;
    status: string;
    original_content: string;
    proposed_content: string;
    section_path: string;
    section_title: string | null;
    relevance_summary: string;
    document_id: string;
    document_name: string;
    session_id: string;
    organization_id: string;
    task_description: string;
  }> {
    // Fetch proposed change → affected section → analysis → session
    const { data: change, error: changeError } = await this.supabase
      .from("proposed_changes")
      .select(
        `
        id,
        status,
        original_content,
        proposed_content,
        affected_section_id,
        affected_sections!inner (
          section_path,
          section_title,
          relevance_summary,
          document_id,
          analysis_id,
          impact_analyses!inner (
            task_description,
            session_id,
            sessions!inner (
              organization_id
            )
          )
        )
      `,
      )
      .eq("id", changeId)
      .single();

    if (changeError || !change) {
      throw new Error("Alteração proposta não encontrada.");
    }

    // Navigate the nested joins
    const section = change.affected_sections as unknown as {
      section_path: string;
      section_title: string | null;
      relevance_summary: string;
      document_id: string;
      analysis_id: string;
      impact_analyses: {
        task_description: string;
        session_id: string;
        sessions: {
          organization_id: string;
        };
      };
    };

    const analysis = section.impact_analyses;
    const session = analysis.sessions;

    // Fetch document name
    const { data: doc } = await this.supabase
      .from("documents")
      .select("name")
      .eq("id", section.document_id)
      .single();

    return {
      change_id: changeId,
      status: change.status as string,
      original_content: change.original_content as string,
      proposed_content: change.proposed_content as string,
      section_path: section.section_path,
      section_title: section.section_title,
      relevance_summary: section.relevance_summary,
      document_id: section.document_id,
      document_name: doc?.name ?? "Documento desconhecido",
      session_id: analysis.session_id,
      organization_id: session.organization_id,
      task_description: analysis.task_description,
    };
  }
}
