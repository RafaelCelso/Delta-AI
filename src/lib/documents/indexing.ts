/**
 * Serviço de orquestração de indexação de documentos.
 *
 * Coordena o pipeline completo: parsing → extração de seções → chunking →
 * geração de embeddings → armazenamento vetorial.
 *
 * Requisitos: 3.5
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDocument } from "./parsers";
import { extractSections } from "./sections";
import { chunkDocument } from "./chunking";
import { EmbeddingService } from "./embeddings";

/** Resultado da operação de indexação de documento. */
export interface IndexDocumentResult {
  success: boolean;
  error?: string;
  chunksCreated?: number;
}

/**
 * Indexa um documento: parsing, extração de seções, chunking,
 * geração de embeddings e armazenamento na tabela `document_chunks`.
 *
 * Atualiza o status do documento para `indexed` em caso de sucesso
 * ou `error` em caso de falha.
 *
 * @param supabase - Cliente Supabase autenticado
 * @param documentId - ID do documento na tabela `documents`
 * @param organizationId - ID da organização proprietária
 * @param fileBuffer - Buffer do arquivo para parsing
 * @param fileType - Extensão do arquivo (pdf, docx, doc, xls, xlsx)
 * @returns Resultado da indexação
 */
export async function indexDocument(
  supabase: SupabaseClient,
  documentId: string,
  organizationId: string,
  fileBuffer: Buffer,
  fileType: string,
): Promise<IndexDocumentResult> {
  try {
    // a. Parse do documento
    const parsed = await parseDocument(fileBuffer, fileType);

    // b. Extração de seções hierárquicas
    const sections = extractSections(parsed.text);

    // c. Criação de chunks
    const chunks = chunkDocument(sections);

    if (chunks.length === 0) {
      await updateDocumentStatus(supabase, documentId, "error", {
        errorMessage: "Nenhum conteúdo extraído do documento para indexação.",
      });
      return {
        success: false,
        error: "Nenhum conteúdo extraído do documento para indexação.",
      };
    }

    // d. Geração de embeddings
    const embeddingService = createEmbeddingService();
    const texts = chunks.map((chunk) => chunk.content);
    const embeddings = await embeddingService.generateEmbeddings(texts);

    // e. Armazenamento dos chunks com embeddings na tabela `document_chunks`
    const chunkRows = chunks.map((chunk, index) => ({
      document_id: documentId,
      organization_id: organizationId,
      section_path: chunk.sectionPath,
      section_title: chunk.sectionTitle,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(embeddings[index]),
      metadata: {
        file_type: fileType,
      },
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkRows);

    if (insertError) {
      await updateDocumentStatus(supabase, documentId, "error", {
        errorMessage: `Erro ao armazenar chunks: ${insertError.message}`,
      });
      return {
        success: false,
        error: `Erro ao armazenar chunks: ${insertError.message}`,
      };
    }

    // f. Atualizar status do documento para `indexed` e armazenar parsed_content
    await updateDocumentStatus(supabase, documentId, "indexed", {
      parsedContent: {
        text: parsed.text,
        metadata: parsed.metadata,
        sections: sections.map((s) => ({
          title: s.title,
          sectionPath: s.sectionPath,
          level: s.level,
        })),
        chunksCount: chunks.length,
      },
    });

    return {
      success: true,
      chunksCreated: chunks.length,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido na indexação.";

    // Atualizar status do documento para `error`
    await updateDocumentStatus(supabase, documentId, "error", {
      errorMessage: message,
    }).catch(() => {
      // Ignorar erro ao atualizar status — o erro original é mais importante
    });

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Atualiza o status de um documento na tabela `documents`.
 */
async function updateDocumentStatus(
  supabase: SupabaseClient,
  documentId: string,
  status: "indexed" | "error",
  options?: {
    errorMessage?: string;
    parsedContent?: Record<string, unknown>;
  },
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "error" && options?.errorMessage) {
    updateData.error_message = options.errorMessage;
  }

  if (options?.parsedContent) {
    updateData.parsed_content = options.parsedContent;
  }

  const { error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", documentId);

  if (error) {
    throw new Error(`Erro ao atualizar status do documento: ${error.message}`);
  }
}

/**
 * Cria uma instância do EmbeddingService a partir de variáveis de ambiente.
 */
function createEmbeddingService(): EmbeddingService {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Variável de ambiente EMBEDDING_API_KEY não configurada. Configure-a para habilitar a geração de embeddings.",
    );
  }

  return new EmbeddingService({
    apiKey,
    apiUrl: process.env.EMBEDDING_API_URL,
    model: process.env.EMBEDDING_MODEL,
  });
}
