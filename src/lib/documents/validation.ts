/**
 * Validação de formato de arquivo para upload de documentos.
 *
 * Aceita exclusivamente: DOC, DOCX, PDF, XLS, XLSX (case-insensitive).
 * Requisitos: 3.1, 3.6
 */

/** Extensões de arquivo suportadas para upload. */
export const SUPPORTED_EXTENSIONS = [
  "doc",
  "docx",
  "pdf",
  "xls",
  "xlsx",
] as const;

export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

/**
 * Valida se o nome de arquivo possui uma extensão suportada.
 *
 * @param filename - Nome do arquivo (ex.: "relatorio.pdf")
 * @returns Objeto com `valid`, `extension` (se válido) ou `error` (se inválido)
 */
export function validateFileFormat(filename: string): {
  valid: boolean;
  extension?: SupportedExtension;
  error?: string;
} {
  if (!filename || filename.trim() === "") {
    return {
      valid: false,
      error: "Nome do arquivo é obrigatório.",
    };
  }

  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return {
      valid: false,
      error: `Formato de arquivo não suportado. ${getSupportedFormatsMessage()}`,
    };
  }

  const extension = filename.slice(lastDotIndex + 1).toLowerCase();

  if (SUPPORTED_EXTENSIONS.includes(extension as SupportedExtension)) {
    return {
      valid: true,
      extension: extension as SupportedExtension,
    };
  }

  return {
    valid: false,
    error: `Formato de arquivo não suportado. ${getSupportedFormatsMessage()}`,
  };
}

/**
 * Retorna mensagem legível com a lista de formatos suportados.
 */
export function getSupportedFormatsMessage(): string {
  const formatted = SUPPORTED_EXTENSIONS.map((ext) => ext.toUpperCase()).join(
    ", ",
  );
  return `Formatos suportados: ${formatted}.`;
}
