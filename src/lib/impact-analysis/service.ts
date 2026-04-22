/**
 * ImpactAnalysisService — Orchestrates the full impact analysis flow.
 *
 * 1. Calls n8n via N8nClient to analyze impact
 * 2. Persists results in `impact_analyses` and `affected_sections` tables
 * 3. Returns formatted results
 * 4. Handles no-results scenario
 *
 * Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.5
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { N8nClient, N8nError } from "@/lib/n8n";
import type {
  ImpactAnalysisResponse,
  AffectedDocumentResponse,
} from "@/lib/n8n";

// ─── Result types ───────────────────────────────────────────────────────────

export interface AffectedSectionResult {
  id: string;
  document_id: string;
  section_path: string;
  section_title: string | null;
  relevance_summary: string;
  confidence_score: number;
}

export interface AffectedDocumentResult {
  document_id: string;
  document_name: string;
  sections: AffectedSectionResult[];
}

export interface ImpactAnalysisResult {
  analysis_id: string;
  status: "completed" | "no_results" | "error";
  processing_time_ms: number;
  affected_documents: AffectedDocumentResult[];
  /** User-facing message describing the result. */
  message: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class ImpactAnalysisService {
  private readonly supabase: SupabaseClient;
  private readonly n8nClient: N8nClient;

  constructor(supabase: SupabaseClient, n8nClient?: N8nClient) {
    this.supabase = supabase;
    this.n8nClient = n8nClient ?? new N8nClient();
  }

  /**
   * Run impact analysis for a task description.
   *
   * Calls n8n, persists results, and returns formatted output.
   */
  async analyze(params: {
    sessionId: string;
    messageId: string;
    taskDescription: string;
    organizationId: string;
    userId: string;
  }): Promise<ImpactAnalysisResult> {
    const { sessionId, messageId, taskDescription, organizationId, userId } =
      params;

    const startTime = Date.now();

    // 1. Create the analysis record in "processing" state
    const { data: analysis, error: insertError } = await this.supabase
      .from("impact_analyses")
      .insert({
        session_id: sessionId,
        message_id: messageId,
        task_description: taskDescription,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertError || !analysis) {
      throw new Error(
        `Erro ao criar registro de análise: ${insertError?.message}`,
      );
    }

    const analysisId = analysis.id as string;

    try {
      // 2. Call n8n for impact analysis
      const n8nResponse = await this.n8nClient.analyzeImpact({
        task_description: taskDescription,
        organization_id: organizationId,
        session_id: sessionId,
        user_id: userId,
      });

      const processingTimeMs = Date.now() - startTime;

      // 3. Handle no-results scenario
      if (
        !n8nResponse.affected_documents ||
        n8nResponse.affected_documents.length === 0
      ) {
        await this.updateAnalysisStatus(
          analysisId,
          "no_results",
          processingTimeMs,
        );

        return {
          analysis_id: analysisId,
          status: "no_results",
          processing_time_ms: processingTimeMs,
          affected_documents: [],
          message:
            "Nenhum documento afetado foi encontrado para esta tarefa de alteração. " +
            "Tente refinar a descrição da tarefa com mais detalhes sobre as áreas do sistema impactadas.",
        };
      }

      // 4. Persist affected sections
      const affectedDocuments = await this.persistAffectedSections(
        analysisId,
        n8nResponse,
      );

      // 5. Update analysis status to completed
      await this.updateAnalysisStatus(
        analysisId,
        "completed",
        processingTimeMs,
      );

      // 6. Build user-facing message
      const message = this.buildResultMessage(affectedDocuments);

      return {
        analysis_id: analysisId,
        status: "completed",
        processing_time_ms: processingTimeMs,
        affected_documents: affectedDocuments,
        message,
      };
    } catch (err) {
      const processingTimeMs = Date.now() - startTime;

      // Update analysis status to error
      await this.updateAnalysisStatus(analysisId, "error", processingTimeMs);

      // Re-throw N8nError for the caller to handle
      if (err instanceof N8nError) {
        throw err;
      }

      throw err;
    }
  }

  /**
   * Update the status and processing time of an analysis record.
   */
  private async updateAnalysisStatus(
    analysisId: string,
    status: "completed" | "no_results" | "error",
    processingTimeMs: number,
  ): Promise<void> {
    await this.supabase
      .from("impact_analyses")
      .update({ status, processing_time_ms: processingTimeMs })
      .eq("id", analysisId);
  }

  /**
   * Persist affected sections from the n8n response into the database.
   *
   * For each affected document and section, inserts a row into `affected_sections`.
   * Returns the formatted results with database IDs.
   */
  private async persistAffectedSections(
    analysisId: string,
    response: ImpactAnalysisResponse,
  ): Promise<AffectedDocumentResult[]> {
    const results: AffectedDocumentResult[] = [];

    for (const doc of response.affected_documents) {
      const sectionResults: AffectedSectionResult[] = [];

      // Build rows for batch insert
      const rows = doc.sections.map((section) => ({
        analysis_id: analysisId,
        document_id: doc.document_id,
        section_path: section.section_path,
        section_title: section.section_id, // Use section_id as title fallback
        relevance_summary: section.relevance_summary,
        confidence_score: section.confidence_score,
      }));

      if (rows.length > 0) {
        const { data: insertedSections, error: sectionsError } =
          await this.supabase
            .from("affected_sections")
            .insert(rows)
            .select(
              "id, document_id, section_path, section_title, relevance_summary, confidence_score",
            );

        if (sectionsError) {
          throw new Error(
            `Erro ao persistir seções afetadas: ${sectionsError.message}`,
          );
        }

        for (const inserted of insertedSections ?? []) {
          sectionResults.push({
            id: inserted.id,
            document_id: inserted.document_id,
            section_path: inserted.section_path,
            section_title: inserted.section_title,
            relevance_summary: inserted.relevance_summary,
            confidence_score: Number(inserted.confidence_score),
          });
        }
      }

      results.push({
        document_id: doc.document_id,
        document_name: doc.document_name,
        sections: sectionResults,
      });
    }

    return results;
  }

  /**
   * Build a user-facing message summarizing the impact analysis results.
   */
  private buildResultMessage(documents: AffectedDocumentResult[]): string {
    const totalSections = documents.reduce(
      (sum, doc) => sum + doc.sections.length,
      0,
    );

    const lines: string[] = [
      `Análise de impacto concluída. Foram identificados **${documents.length}** documento(s) afetado(s) com **${totalSections}** seção(ões) relevante(s).`,
      "",
    ];

    for (const doc of documents) {
      lines.push(`📄 **${doc.document_name}**`);
      for (const section of doc.sections) {
        const scorePercent = Math.round(section.confidence_score * 100);
        lines.push(
          `  • ${section.section_path}: ${section.relevance_summary} (confiança: ${scorePercent}%)`,
        );
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }
}
