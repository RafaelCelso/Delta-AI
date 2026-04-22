/**
 * Extração de seções hierárquicas de documentos.
 *
 * Identifica headings numerados (1., 1.1, 1.1.1) e headings markdown (#, ##, ###)
 * e constrói hierarquia com section_path.
 *
 * Requisitos: 3.4
 */

import type { Section } from "./types";

/**
 * Regex para detectar headings numerados.
 * Exemplos: "1. Introdução", "1.1 Escopo", "1.1.1 Definições", "2.3.4 Subseção"
 */
const NUMBERED_HEADING_REGEX = /^(\d+(?:\.\d+)*)\s*\.?\s+(.+)$/;

/**
 * Regex para detectar headings markdown.
 * Exemplos: "# Título", "## Seção", "### Subseção"
 */
const MARKDOWN_HEADING_REGEX = /^(#{1,6})\s+(.+)$/;

interface RawHeading {
  title: string;
  level: number;
  lineIndex: number;
}

/**
 * Determina o nível hierárquico de um heading numerado.
 * "1" → 1, "1.1" → 2, "1.1.1" → 3
 */
function getNumberedLevel(numbering: string): number {
  return numbering.split(".").filter((p) => p.length > 0).length;
}

/**
 * Extrai seções hierárquicas de um texto.
 *
 * Identifica headings (numerados ou markdown) e constrói seções com:
 * - title: título do heading
 * - content: conteúdo da seção (texto entre este heading e o próximo)
 * - sectionPath: caminho hierárquico (ex.: "Capítulo 1 > Seção 1.1 > Subseção 1.1.1")
 * - level: profundidade na hierarquia
 *
 * @param text - Texto completo do documento
 * @returns Array de seções extraídas
 */
export function extractSections(text: string): Section[] {
  if (!text || text.trim() === "") {
    return [];
  }

  const lines = text.split("\n");
  const headings: RawHeading[] = [];

  // First pass: identify all headings
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for numbered headings first
    const numberedMatch = line.match(NUMBERED_HEADING_REGEX);
    if (numberedMatch) {
      headings.push({
        title: numberedMatch[2].trim(),
        level: getNumberedLevel(numberedMatch[1]),
        lineIndex: i,
      });
      continue;
    }

    // Check for markdown headings
    const markdownMatch = line.match(MARKDOWN_HEADING_REGEX);
    if (markdownMatch) {
      headings.push({
        title: markdownMatch[2].trim(),
        level: markdownMatch[1].length,
        lineIndex: i,
      });
      continue;
    }
  }

  // If no headings found, return entire text as a single section
  if (headings.length === 0) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    return [
      {
        title: "Documento",
        content: trimmed,
        sectionPath: "Documento",
        level: 0,
      },
    ];
  }

  // Second pass: extract content and build section paths
  const sections: Section[] = [];

  // Handle content before the first heading
  const preHeadingContent = lines
    .slice(0, headings[0].lineIndex)
    .join("\n")
    .trim();
  if (preHeadingContent) {
    sections.push({
      title: "Introdução",
      content: preHeadingContent,
      sectionPath: "Introdução",
      level: 0,
    });
  }

  // Build sections from headings
  const pathStack: string[] = [];
  const levelStack: number[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    // Extract content between this heading and the next
    const contentStart = heading.lineIndex + 1;
    const contentEnd = nextHeading ? nextHeading.lineIndex : lines.length;
    const content = lines.slice(contentStart, contentEnd).join("\n").trim();

    // Build section path by maintaining a stack of parent titles
    while (
      levelStack.length > 0 &&
      levelStack[levelStack.length - 1] >= heading.level
    ) {
      pathStack.pop();
      levelStack.pop();
    }

    pathStack.push(heading.title);
    levelStack.push(heading.level);

    const sectionPath = pathStack.join(" > ");

    sections.push({
      title: heading.title,
      content,
      sectionPath,
      level: heading.level,
    });
  }

  return sections;
}
