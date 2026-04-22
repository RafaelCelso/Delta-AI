/**
 * Pipeline de chunking de documentos para indexação vetorial.
 *
 * Divide seções em chunks de 256-512 tokens com 10-15% overlap,
 * respeitando fronteiras de seções.
 *
 * Requisitos: 3.4, 3.7
 */

import type { Section, DocumentChunk, ChunkingOptions } from "./types";

/** Opções padrão de chunking. */
const DEFAULT_OPTIONS: Required<ChunkingOptions> = {
  minTokens: 256,
  maxTokens: 512,
  overlapPercent: 0.12,
};

/**
 * Estima a contagem de tokens de um texto.
 * Usa contagem de palavras como aproximação (adequado para português).
 *
 * @param text - Texto para estimar tokens
 * @returns Número estimado de tokens
 */
export function estimateTokens(text: string): number {
  if (!text || text.trim() === "") return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Divide texto em sentenças.
 *
 * @param text - Texto para dividir
 * @returns Array de sentenças
 */
export function splitSentences(text: string): string[] {
  if (!text || text.trim() === "") return [];

  // Split on sentence-ending punctuation followed by space or end of string
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!sentences) return [text.trim()];

  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Divide uma seção grande em chunks menores respeitando fronteiras de sentenças.
 *
 * @param text - Texto da seção
 * @param maxTokens - Máximo de tokens por chunk
 * @param overlapPercent - Percentual de overlap entre chunks
 * @returns Array de textos dos chunks
 */
function splitSectionIntoChunks(
  text: string,
  maxTokens: number,
  overlapPercent: number,
): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const overlapTokens = Math.floor(maxTokens * overlapPercent);
  const chunks: string[] = [];
  let currentChunkSentences: string[] = [];
  let currentTokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    // If a single sentence exceeds maxTokens, it becomes its own chunk
    if (sentenceTokens > maxTokens) {
      // Flush current chunk if it has content
      if (currentChunkSentences.length > 0) {
        chunks.push(currentChunkSentences.join(" "));
        currentChunkSentences = [];
        currentTokenCount = 0;
      }
      chunks.push(sentence);
      continue;
    }

    // If adding this sentence would exceed maxTokens, flush current chunk
    if (
      currentTokenCount + sentenceTokens > maxTokens &&
      currentChunkSentences.length > 0
    ) {
      chunks.push(currentChunkSentences.join(" "));

      // Calculate overlap: take sentences from the end of the current chunk
      const overlapSentences: string[] = [];
      let overlapCount = 0;
      for (let j = currentChunkSentences.length - 1; j >= 0; j--) {
        const tokens = estimateTokens(currentChunkSentences[j]);
        if (overlapCount + tokens > overlapTokens) break;
        overlapSentences.unshift(currentChunkSentences[j]);
        overlapCount += tokens;
      }

      currentChunkSentences = [...overlapSentences];
      currentTokenCount = overlapCount;
    }

    currentChunkSentences.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  // Flush remaining content
  if (currentChunkSentences.length > 0) {
    chunks.push(currentChunkSentences.join(" "));
  }

  return chunks;
}

/**
 * Divide seções de documento em chunks para indexação vetorial.
 *
 * - Seções menores que minTokens são agrupadas (se compartilham o mesmo nível pai)
 * - Seções dentro do range [minTokens, maxTokens] viram um chunk único
 * - Seções maiores que maxTokens são divididas em fronteiras de sentenças com overlap
 *
 * @param sections - Seções extraídas do documento
 * @param options - Opções de chunking (minTokens, maxTokens, overlapPercent)
 * @returns Array de chunks do documento
 */
export function chunkDocument(
  sections: Section[],
  options?: ChunkingOptions,
): DocumentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const chunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;

  let pendingContent = "";
  let pendingSectionPath = "";
  let pendingSectionTitle = "";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionText = section.content;
    const sectionTokens = estimateTokens(sectionText);

    // Skip empty sections
    if (sectionTokens === 0) continue;

    // If section exceeds maxTokens, flush pending and split this section
    if (sectionTokens > opts.maxTokens) {
      // Flush pending small sections first
      if (pendingContent) {
        const tokenCount = estimateTokens(pendingContent);
        chunks.push({
          content: pendingContent,
          sectionPath: pendingSectionPath,
          sectionTitle: pendingSectionTitle,
          chunkIndex: globalChunkIndex++,
          tokenCount,
        });
        pendingContent = "";
        pendingSectionPath = "";
        pendingSectionTitle = "";
      }

      // Split large section into multiple chunks
      const subChunks = splitSectionIntoChunks(
        sectionText,
        opts.maxTokens,
        opts.overlapPercent,
      );

      for (const subChunk of subChunks) {
        const tokenCount = estimateTokens(subChunk);
        chunks.push({
          content: subChunk,
          sectionPath: section.sectionPath,
          sectionTitle: section.title,
          chunkIndex: globalChunkIndex++,
          tokenCount,
        });
      }
      continue;
    }

    // If section is small, try to accumulate with pending content
    if (sectionTokens < opts.minTokens) {
      if (pendingContent) {
        const combinedTokens = estimateTokens(pendingContent) + sectionTokens;

        if (combinedTokens <= opts.maxTokens) {
          // Accumulate
          pendingContent += "\n\n" + sectionText;
          // Keep the first section's path for the combined chunk
          continue;
        } else {
          // Flush pending, start new accumulation
          const tokenCount = estimateTokens(pendingContent);
          chunks.push({
            content: pendingContent,
            sectionPath: pendingSectionPath,
            sectionTitle: pendingSectionTitle,
            chunkIndex: globalChunkIndex++,
            tokenCount,
          });
          pendingContent = sectionText;
          pendingSectionPath = section.sectionPath;
          pendingSectionTitle = section.title;
          continue;
        }
      } else {
        // Start accumulating
        pendingContent = sectionText;
        pendingSectionPath = section.sectionPath;
        pendingSectionTitle = section.title;
        continue;
      }
    }

    // Section is within [minTokens, maxTokens] — flush pending and create chunk
    if (pendingContent) {
      const tokenCount = estimateTokens(pendingContent);
      chunks.push({
        content: pendingContent,
        sectionPath: pendingSectionPath,
        sectionTitle: pendingSectionTitle,
        chunkIndex: globalChunkIndex++,
        tokenCount,
      });
      pendingContent = "";
      pendingSectionPath = "";
      pendingSectionTitle = "";
    }

    chunks.push({
      content: sectionText,
      sectionPath: section.sectionPath,
      sectionTitle: section.title,
      chunkIndex: globalChunkIndex++,
      tokenCount: sectionTokens,
    });
  }

  // Flush any remaining pending content
  if (pendingContent) {
    const tokenCount = estimateTokens(pendingContent);
    chunks.push({
      content: pendingContent,
      sectionPath: pendingSectionPath,
      sectionTitle: pendingSectionTitle,
      chunkIndex: globalChunkIndex++,
      tokenCount,
    });
  }

  return chunks;
}
