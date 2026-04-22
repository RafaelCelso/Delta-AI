/**
 * Serviço de upload de documentos para Supabase Storage.
 *
 * Orquestra: validação de formato → detecção de duplicata → upload ao Storage →
 * registro na tabela `documents`.
 *
 * Requisitos: 3.1, 3.2, 3.3, 3.6, 3.8, 3.9
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentRecord, UploadResult } from "./types";
import { validateFileFormat } from "./validation";

/** Nome do bucket no Supabase Storage. */
const STORAGE_BUCKET = "documents";

/**
 * Sanitiza um nome de arquivo para uso como chave no Supabase Storage.
 *
 * Remove acentos/diacríticos via NFD + strip de combining marks, substitui
 * caracteres não seguros por hífens e colapsa hífens consecutivos.
 *
 * @param filename - Nome original do arquivo (ex.: "Portaria nº 302.pdf")
 * @returns Nome seguro para uso em storage keys (ex.: "Portaria-n-302.pdf")
 */
export function sanitizeFilename(filename: string): string {
  // Separar extensão para preservá-la intacta
  const lastDot = filename.lastIndexOf(".");
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : "";

  const sanitized = name
    // Decompor acentos (é → e + combining accent) e remover combining marks
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Substituir qualquer caractere que não seja alfanumérico, hífen ou underscore
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    // Colapsar hífens consecutivos
    .replace(/-{2,}/g, "-")
    // Remover hífens no início e fim
    .replace(/^-+|-+$/g, "");

  // Fallback caso o nome fique vazio após sanitização
  const safeName = sanitized || "documento";

  return `${safeName}${ext.toLowerCase()}`;
}

/**
 * Gera o caminho de armazenamento para um documento no Storage.
 *
 * Formato: `organizations/{orgId}/documents/{timestamp}-{sanitizedFilename}`
 *
 * O nome do arquivo é sanitizado para conter apenas caracteres ASCII seguros,
 * evitando erros de "Invalid key" no Supabase Storage.
 *
 * @param orgId - ID da organização
 * @param filename - Nome original do arquivo
 * @returns Caminho completo no Storage
 */
export function generateStoragePath(orgId: string, filename: string): string {
  const timestamp = Date.now();
  const safeName = sanitizeFilename(filename);
  return `organizations/${orgId}/documents/${timestamp}-${safeName}`;
}

export interface UploadDocumentOptions {
  /** Se true, substitui documento existente com mesmo nome na organização. */
  replaceExisting?: boolean;
}

/**
 * Faz upload de um documento para o Supabase Storage e registra na tabela `documents`.
 *
 * Fluxo:
 * 1. Valida formato do arquivo
 * 2. Verifica duplicata (mesmo nome + organização)
 * 3. Se duplicata e `replaceExisting` não é true, retorna status 'duplicate'
 * 4. Faz upload para Supabase Storage
 * 5. Insere (ou atualiza) registro na tabela `documents`
 * 6. Retorna resultado da operação
 *
 * @param supabase - Cliente Supabase autenticado
 * @param file - Arquivo a ser enviado
 * @param orgId - ID da organização
 * @param userId - ID do usuário que faz o upload
 * @param options - Opções adicionais (ex.: replaceExisting)
 * @returns Resultado do upload
 */
export async function uploadDocument(
  supabase: SupabaseClient,
  file: File,
  orgId: string,
  userId: string,
  options?: UploadDocumentOptions,
): Promise<UploadResult> {
  // 1. Validar formato do arquivo
  const validation = validateFileFormat(file.name);
  if (!validation.valid) {
    return { status: "error", error: validation.error! };
  }

  const fileExtension = validation.extension!;

  try {
    // 2. Verificar duplicata (mesmo nome + organização)
    const { data: existingDoc, error: queryError } = await supabase
      .from("documents")
      .select("*")
      .eq("organization_id", orgId)
      .eq("name", file.name)
      .maybeSingle();

    if (queryError) {
      return {
        status: "error",
        error: `Erro ao verificar documento existente: ${queryError.message}`,
      };
    }

    // 3. Se duplicata encontrada e não deve substituir, retornar status 'duplicate'
    if (existingDoc && !options?.replaceExisting) {
      return {
        status: "duplicate",
        existingDocument: existingDoc as DocumentRecord,
      };
    }

    // Se substituindo, remover arquivo antigo do Storage e registro do banco
    if (existingDoc && options?.replaceExisting) {
      // Remover arquivo antigo do Storage (ignorar erro se não existir)
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([existingDoc.storage_path]);

      // Remover registro antigo do banco
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", existingDoc.id);

      if (deleteError) {
        return {
          status: "error",
          error: `Erro ao remover documento existente: ${deleteError.message}`,
        };
      }
    }

    // 4. Fazer upload para Supabase Storage
    const storagePath = generateStoragePath(orgId, file.name);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return {
        status: "error",
        error: `Erro ao fazer upload do arquivo: ${uploadError.message}`,
      };
    }

    // 5. Inserir registro na tabela `documents`
    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        organization_id: orgId,
        uploaded_by: userId,
        name: file.name,
        file_type: fileExtension,
        storage_path: storagePath,
        status: "processing",
        file_size_bytes: file.size,
      })
      .select("*")
      .single();

    if (insertError) {
      // Tentar limpar o arquivo do Storage em caso de falha no insert
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

      return {
        status: "error",
        error: `Erro ao registrar documento: ${insertError.message}`,
      };
    }

    // 6. Retornar sucesso
    return {
      status: "success",
      document: document as DocumentRecord,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido no upload.";
    return { status: "error", error: message };
  }
}
