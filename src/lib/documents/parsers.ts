/**
 * Parsers de documentos para extração de texto.
 *
 * Suporta PDF, DOCX, DOC e XLS/XLSX.
 * Requisitos: 3.4, 3.7
 */

import type { ParsedDocument } from "./types";

/**
 * Extrai texto de um arquivo PDF usando pdf-parse.
 *
 * @param buffer - Buffer do arquivo PDF
 * @returns Documento parseado com texto e metadados
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // pdf-parse v2 exports PDFParse as named export; v1 used default.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import("pdf-parse")) as any;
    const pdfParse = mod.default ?? mod;
    const result = await pdfParse(buffer);
    return {
      text: result.text,
      metadata: {
        pages: result.numpages,
        info: result.info,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao processar arquivo PDF: ${message}`);
  }
}

/**
 * Extrai texto de um arquivo DOCX usando mammoth.
 * Converte DOCX→HTML preservando estrutura, depois extrai texto.
 *
 * @param buffer - Buffer do arquivo DOCX
 * @returns Documento parseado com texto e metadados
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ buffer });

    // Extract text from HTML, preserving heading structure
    const text = htmlToStructuredText(result.value);

    return {
      text,
      metadata: {
        warnings: result.messages,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao processar arquivo DOCX: ${message}`);
  }
}

/**
 * Extrai texto de um arquivo DOC usando officeparser como fallback.
 *
 * @param buffer - Buffer do arquivo DOC
 * @returns Documento parseado com texto e metadados
 */
export async function parseDoc(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const { parseOfficeAsync } = await import("officeparser");
    const text = await parseOfficeAsync(buffer, {
      newlineDelimiter: "\n",
    });
    return {
      text,
      metadata: {
        parser: "officeparser",
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao processar arquivo DOC: ${message}`);
  }
}

/**
 * Extrai dados tabulares de um arquivo XLS/XLSX usando SheetJS.
 *
 * @param buffer - Buffer do arquivo XLS/XLSX
 * @returns Documento parseado com texto (tabular) e metadados
 */
export async function parseXlsx(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const textParts: string[] = [];
    const sheetNames = workbook.SheetNames;

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      textParts.push(`# ${sheetName}`);
      const csv = XLSX.utils.sheet_to_csv(sheet);
      if (csv.trim()) {
        textParts.push(csv);
      }
    }

    return {
      text: textParts.join("\n\n"),
      metadata: {
        sheetCount: sheetNames.length,
        sheetNames,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    throw new Error(`Erro ao processar arquivo XLS/XLSX: ${message}`);
  }
}

/**
 * Dispatcher que roteia para o parser correto com base no tipo de arquivo.
 *
 * @param buffer - Buffer do arquivo
 * @param fileType - Extensão do arquivo (pdf, docx, doc, xls, xlsx)
 * @returns Documento parseado
 */
export async function parseDocument(
  buffer: Buffer,
  fileType: string,
): Promise<ParsedDocument> {
  const type = fileType.toLowerCase();

  switch (type) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "doc":
      return parseDoc(buffer);
    case "xls":
    case "xlsx":
      return parseXlsx(buffer);
    default:
      throw new Error(
        `Tipo de arquivo não suportado para parsing: ${fileType}. Tipos suportados: PDF, DOCX, DOC, XLS, XLSX.`,
      );
  }
}

/**
 * Converte HTML gerado pelo mammoth em texto estruturado,
 * preservando headings como marcadores de seção.
 *
 * @param html - HTML gerado pelo mammoth
 * @returns Texto com headings preservados
 */
export function htmlToStructuredText(html: string): string {
  let text = html;

  // Convert headings to markdown-style markers for section extraction
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n");
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n");
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n");
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n");
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, "\n##### $1\n");
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, "\n###### $1\n");

  // Convert paragraphs and line breaks
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n");
  text = text.replace(/<p[^>]*>/gi, "");

  // Convert list items
  text = text.replace(/<li[^>]*>/gi, "- ");
  text = text.replace(/<\/li>/gi, "\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  // Clean up excessive whitespace
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}
