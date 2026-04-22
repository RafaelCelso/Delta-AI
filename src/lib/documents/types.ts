/**
 * Tipos TypeScript para o módulo de documentos da Base de Conhecimento.
 */

/** Registro de documento conforme schema da tabela `documents`. */
export interface DocumentRecord {
  id: string;
  organization_id: string;
  uploaded_by: string;
  name: string;
  file_type: "doc" | "docx" | "pdf" | "xls" | "xlsx";
  storage_path: string;
  parsed_content: Record<string, unknown> | null;
  status: "processing" | "indexed" | "error";
  error_message: string | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

/** Resultado da operação de upload de documento. */
export type UploadResult =
  | { status: "success"; document: DocumentRecord }
  | { status: "duplicate"; existingDocument: DocumentRecord }
  | { status: "error"; error: string };

/** Resultado do parsing de um documento. */
export interface ParsedDocument {
  text: string;
  metadata: Record<string, unknown>;
}

/** Seção hierárquica extraída de um documento. */
export interface Section {
  title: string;
  content: string;
  sectionPath: string;
  level: number;
}

/** Chunk de documento para indexação vetorial. */
export interface DocumentChunk {
  content: string;
  sectionPath: string;
  sectionTitle: string;
  chunkIndex: number;
  tokenCount: number;
}

/** Opções de configuração para o chunking de documentos. */
export interface ChunkingOptions {
  minTokens?: number;
  maxTokens?: number;
  overlapPercent?: number;
}
