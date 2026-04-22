/**
 * ExportService — Gerencia exportação de documentos e relatórios de mudanças.
 *
 * Handles:
 * - Exportação de documentos em DOCX e PDF
 * - Exportação de relatórios de controle de mudanças em DOCX e PDF
 * - Geração de página de capa com metadados
 * - Registro de log de exportação para auditoria
 *
 * Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  PageBreak,
  ShadingType,
} from "docx";
import type {
  ExportDocumentRequest,
  ExportChangeReportRequest,
  ExportResult,
  DocumentExportData,
  ChangeRecordExportData,
  CoverPageData,
} from "./types";

export class ExportService {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Exportar documento em DOCX ou PDF.
   *
   * Busca dados do documento, gera o arquivo no formato solicitado
   * com página de capa contendo metadados, e registra o log de exportação.
   *
   * Requisitos: 8.1, 8.2, 8.3, 8.4
   */
  async exportDocument(params: ExportDocumentRequest): Promise<ExportResult> {
    const {
      documentId,
      format,
      userId,
      organizationId,
      sessionId,
      taskDescription,
    } = params;

    // 1. Buscar dados do documento
    const { data: doc, error: docError } = await this.supabase
      .from("documents")
      .select("id, name, parsed_content, organization_id, created_at")
      .eq("id", documentId)
      .single();

    if (docError || !doc) {
      throw new Error("Documento não encontrado.");
    }

    const document = doc as DocumentExportData;

    // 2. Buscar nome do usuário exportador
    const userName = await this.getUserName(userId);

    // 3. Buscar referências de registros de controle associados
    const changeRecordRefs = await this.getChangeRecordReferences(documentId);

    // 4. Montar dados da página de capa
    const coverData: CoverPageData = {
      title: document.name,
      date: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      userName,
      taskDescription,
      changeRecordReferences: changeRecordRefs,
    };

    // 5. Gerar arquivo no formato solicitado
    let buffer: Buffer;
    if (format === "docx") {
      buffer = await this.generateDocumentDocx(document, coverData);
    } else {
      buffer = await this.generateDocumentPdf(document, coverData);
    }

    // 6. Registrar log de exportação
    const exportLogId = await this.logExport({
      sessionId: sessionId ?? null,
      documentId,
      changeRecordId: null,
      userId,
      organizationId,
      exportFormat: format,
      exportType: "document",
    });

    const extension = format === "docx" ? "docx" : "pdf";
    const mimeType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";
    const safeName = document.name.replace(/[^a-zA-Z0-9_\-. ]/g, "_");

    return {
      buffer,
      filename: `${safeName}.${extension}`,
      mimeType,
      exportLogId,
    };
  }

  /**
   * Exportar relatório de controle de mudanças em DOCX ou PDF.
   *
   * Busca dados do registro de controle com seções, gera o relatório
   * no formato solicitado com página de capa, e registra o log de exportação.
   *
   * Requisitos: 8.1, 8.2, 8.3, 8.4
   */
  async exportChangeReport(
    params: ExportChangeReportRequest,
  ): Promise<ExportResult> {
    const { changeRecordId, format, userId, sessionId, organizationId } =
      params;

    // 1. Buscar registro de controle
    const { data: record, error: recordError } = await this.supabase
      .from("change_records")
      .select(
        "id, sequential_number, task_description, document_name, document_id, status, created_at, user_id",
      )
      .eq("id", changeRecordId)
      .single();

    if (recordError || !record) {
      throw new Error("Registro de controle não encontrado.");
    }

    // 2. Buscar seções do registro
    const { data: sections, error: sectionsError } = await this.supabase
      .from("change_record_sections")
      .select(
        "section_path, section_title, content_before, content_after, change_description",
      )
      .eq("change_record_id", changeRecordId)
      .order("created_at", { ascending: true });

    if (sectionsError) {
      throw new Error(
        `Erro ao buscar seções do registro: ${sectionsError.message}`,
      );
    }

    // 3. Buscar nome do usuário que criou o registro
    const recordUserName = await this.getUserName(record.user_id as string);

    const changeRecord: ChangeRecordExportData = {
      id: record.id as string,
      sequential_number: record.sequential_number as number,
      task_description: record.task_description as string,
      document_name: record.document_name as string,
      document_id: record.document_id as string,
      status: record.status as string,
      created_at: record.created_at as string,
      user_name: recordUserName,
      sections: (sections ?? []).map((s) => ({
        section_path: s.section_path as string,
        section_title: s.section_title as string | null,
        content_before: s.content_before as string,
        content_after: s.content_after as string,
        change_description: s.change_description as string,
      })),
    };

    // 4. Buscar nome do usuário exportador
    const exporterName = await this.getUserName(userId);

    // 5. Montar dados da página de capa
    const coverData: CoverPageData = {
      title: `Relatório de Controle de Mudanças #${changeRecord.sequential_number}`,
      date: new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      userName: exporterName,
      taskDescription: changeRecord.task_description,
      changeRecordReferences: [
        `#${changeRecord.sequential_number} — ${changeRecord.document_name}`,
      ],
    };

    // 6. Gerar arquivo no formato solicitado
    let buffer: Buffer;
    if (format === "docx") {
      buffer = await this.generateChangeReportDocx(changeRecord, coverData);
    } else {
      buffer = await this.generateChangeReportPdf(changeRecord, coverData);
    }

    // 7. Registrar log de exportação
    const exportLogId = await this.logExport({
      sessionId,
      documentId: changeRecord.document_id,
      changeRecordId,
      userId,
      organizationId,
      exportFormat: format,
      exportType: "change_report",
    });

    const extension = format === "docx" ? "docx" : "pdf";
    const mimeType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

    return {
      buffer,
      filename: `relatorio_mudancas_${changeRecord.sequential_number}.${extension}`,
      mimeType,
      exportLogId,
    };
  }

  // ---------------------------------------------------------------------------
  // Geração DOCX
  // ---------------------------------------------------------------------------

  /**
   * Gerar DOCX de um documento com página de capa.
   */
  private async generateDocumentDocx(
    doc: DocumentExportData,
    cover: CoverPageData,
  ): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [];

    // Página de capa
    children.push(...this.buildCoverPageParagraphs(cover));
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // Conteúdo do documento
    if (doc.parsed_content) {
      children.push(...this.renderParsedContentDocx(doc.parsed_content));
    } else {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Conteúdo do documento não disponível (documento ainda não foi processado).",
              italics: true,
            }),
          ],
        }),
      );
    }

    const docxDocument = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(docxDocument);
    return Buffer.from(buffer);
  }

  /**
   * Gerar DOCX de relatório de controle de mudanças.
   */
  private async generateChangeReportDocx(
    record: ChangeRecordExportData,
    cover: CoverPageData,
  ): Promise<Buffer> {
    const children: (Paragraph | Table)[] = [];

    // Página de capa
    children.push(...this.buildCoverPageParagraphs(cover));
    children.push(new Paragraph({ children: [new PageBreak()] }));

    // Informações do registro
    children.push(
      new Paragraph({
        text: "Informações do Registro",
        heading: HeadingLevel.HEADING_1,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Número Sequencial: ", bold: true }),
          new TextRun({ text: `${record.sequential_number}` }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Data de Criação: ", bold: true }),
          new TextRun({
            text: new Date(record.created_at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Usuário: ", bold: true }),
          new TextRun({ text: record.user_name }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Documento: ", bold: true }),
          new TextRun({ text: record.document_name }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Descrição da Tarefa: ", bold: true }),
          new TextRun({ text: record.task_description }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Status: ", bold: true }),
          new TextRun({ text: record.status }),
        ],
      }),
    );

    // Seções alteradas
    if (record.sections.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(
        new Paragraph({
          text: "Seções Alteradas",
          heading: HeadingLevel.HEADING_1,
        }),
      );

      // Tabela de seções
      const headerRow = new TableRow({
        children: [
          this.createHeaderCell("#"),
          this.createHeaderCell("Seção"),
          this.createHeaderCell("Descrição"),
          this.createHeaderCell("Conteúdo Anterior"),
          this.createHeaderCell("Conteúdo Posterior"),
        ],
      });

      const dataRows = record.sections.map(
        (section, index) =>
          new TableRow({
            children: [
              this.createDataCell(`${index + 1}`),
              this.createDataCell(
                section.section_title ?? section.section_path,
              ),
              this.createDataCell(section.change_description),
              this.createDataCell(section.content_before),
              this.createDataCell(section.content_after),
            ],
          }),
      );

      children.push(
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
    }

    const docxDocument = new Document({
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(docxDocument);
    return Buffer.from(buffer);
  }

  // ---------------------------------------------------------------------------
  // Geração PDF
  // ---------------------------------------------------------------------------

  /**
   * Gerar PDF de um documento via HTML→PDF com puppeteer.
   */
  private async generateDocumentPdf(
    doc: DocumentExportData,
    cover: CoverPageData,
  ): Promise<Buffer> {
    const html = this.buildDocumentHtml(doc, cover);
    return this.renderHtmlToPdf(html);
  }

  /**
   * Gerar PDF de relatório de controle de mudanças via HTML→PDF com puppeteer.
   */
  private async generateChangeReportPdf(
    record: ChangeRecordExportData,
    cover: CoverPageData,
  ): Promise<Buffer> {
    const html = this.buildChangeReportHtml(record, cover);
    return this.renderHtmlToPdf(html);
  }

  /**
   * Renderizar HTML para PDF usando puppeteer.
   */
  private async renderHtmlToPdf(html: string): Promise<Buffer> {
    let browser;
    try {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
      });
      return Buffer.from(pdfBuffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      throw new Error(`Erro ao gerar PDF: ${message}. Tente novamente.`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers — Construção de conteúdo
  // ---------------------------------------------------------------------------

  /**
   * Construir parágrafos da página de capa para DOCX.
   */
  private buildCoverPageParagraphs(cover: CoverPageData): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Espaçamento superior
    paragraphs.push(new Paragraph({ text: "" }));
    paragraphs.push(new Paragraph({ text: "" }));
    paragraphs.push(new Paragraph({ text: "" }));

    // Título
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: cover.title, bold: true, size: 48 })],
        alignment: AlignmentType.CENTER,
      }),
    );

    paragraphs.push(new Paragraph({ text: "" }));

    // Data
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Data de Exportação: ", bold: true, size: 24 }),
          new TextRun({ text: cover.date, size: 24 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );

    // Usuário exportador
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Exportado por: ", bold: true, size: 24 }),
          new TextRun({ text: cover.userName, size: 24 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );

    // Descrição da tarefa (se disponível)
    if (cover.taskDescription) {
      paragraphs.push(new Paragraph({ text: "" }));
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Tarefa: ", bold: true, size: 22 }),
            new TextRun({ text: cover.taskDescription, size: 22 }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      );
    }

    // Referências ao registro de controle
    if (cover.changeRecordReferences.length > 0) {
      paragraphs.push(new Paragraph({ text: "" }));
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Referências de Controle de Mudanças:",
              bold: true,
              size: 22,
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      );
      for (const ref of cover.changeRecordReferences) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${ref}`, size: 20 })],
            alignment: AlignmentType.CENTER,
          }),
        );
      }
    }

    return paragraphs;
  }

  /**
   * Renderizar parsed_content de um documento como parágrafos DOCX.
   */
  private renderParsedContentDocx(
    parsedContent: Record<string, unknown>,
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // parsed_content pode ter estrutura variada; renderizar seções se disponíveis
    const sections = (parsedContent.sections ??
      parsedContent.content ??
      []) as Array<{
      title?: string;
      content?: string;
      level?: number;
      sectionPath?: string;
    }>;

    if (Array.isArray(sections) && sections.length > 0) {
      for (const section of sections) {
        if (section.title) {
          const level = section.level ?? 1;
          const heading =
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3;

          paragraphs.push(new Paragraph({ text: section.title, heading }));
        }

        if (section.content) {
          // Dividir conteúdo em parágrafos por quebra de linha
          const lines = section.content.split("\n").filter((l) => l.trim());
          for (const line of lines) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: line })],
              }),
            );
          }
        }
      }
    } else if (typeof parsedContent.text === "string") {
      // Fallback: conteúdo como texto simples
      const lines = (parsedContent.text as string)
        .split("\n")
        .filter((l) => l.trim());
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({ children: [new TextRun({ text: line })] }),
        );
      }
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Conteúdo do documento não pôde ser renderizado.",
              italics: true,
            }),
          ],
        }),
      );
    }

    return paragraphs;
  }

  /**
   * Criar célula de cabeçalho para tabela DOCX.
   */
  private createHeaderCell(text: string): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text, bold: true, size: 20, color: "FFFFFF" }),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
      shading: { type: ShadingType.SOLID, color: "2B579A" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
      },
    });
  }

  /**
   * Criar célula de dados para tabela DOCX.
   */
  private createDataCell(text: string): TableCell {
    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, size: 18 })],
        }),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers — HTML templates para PDF
  // ---------------------------------------------------------------------------

  /**
   * Construir HTML completo de um documento para renderização PDF.
   */
  private buildDocumentHtml(
    doc: DocumentExportData,
    cover: CoverPageData,
  ): string {
    const contentHtml = this.renderParsedContentHtml(doc.parsed_content);

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${this.getPdfStyles()}</style>
</head>
<body>
  ${this.buildCoverPageHtml(cover)}
  <div class="page-break"></div>
  <div class="content">
    ${contentHtml}
  </div>
</body>
</html>`;
  }

  /**
   * Construir HTML completo de relatório de mudanças para renderização PDF.
   */
  private buildChangeReportHtml(
    record: ChangeRecordExportData,
    cover: CoverPageData,
  ): string {
    let sectionsHtml = "";
    if (record.sections.length > 0) {
      const rowsHtml = record.sections
        .map(
          (section, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${this.escapeHtml(section.section_title ?? section.section_path)}</td>
          <td>${this.escapeHtml(section.change_description)}</td>
          <td class="diff-before">${this.escapeHtml(section.content_before)}</td>
          <td class="diff-after">${this.escapeHtml(section.content_after)}</td>
        </tr>`,
        )
        .join("");

      sectionsHtml = `
      <h2>Seções Alteradas</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Seção</th>
            <th>Descrição</th>
            <th>Conteúdo Anterior</th>
            <th>Conteúdo Posterior</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    }

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${this.getPdfStyles()}</style>
</head>
<body>
  ${this.buildCoverPageHtml(cover)}
  <div class="page-break"></div>
  <div class="content">
    <h1>Informações do Registro</h1>
    <p><strong>Número Sequencial:</strong> ${record.sequential_number}</p>
    <p><strong>Data de Criação:</strong> ${new Date(record.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
    <p><strong>Usuário:</strong> ${this.escapeHtml(record.user_name)}</p>
    <p><strong>Documento:</strong> ${this.escapeHtml(record.document_name)}</p>
    <p><strong>Descrição da Tarefa:</strong> ${this.escapeHtml(record.task_description)}</p>
    <p><strong>Status:</strong> ${this.escapeHtml(record.status)}</p>
    ${sectionsHtml}
  </div>
</body>
</html>`;
  }

  /**
   * Renderizar parsed_content como HTML.
   */
  private renderParsedContentHtml(
    parsedContent: Record<string, unknown> | null,
  ): string {
    if (!parsedContent) {
      return "<p><em>Conteúdo do documento não disponível (documento ainda não foi processado).</em></p>";
    }

    const sections = (parsedContent.sections ??
      parsedContent.content ??
      []) as Array<{
      title?: string;
      content?: string;
      level?: number;
    }>;

    if (Array.isArray(sections) && sections.length > 0) {
      return sections
        .map((section) => {
          let html = "";
          if (section.title) {
            const level = Math.min(section.level ?? 1, 6);
            html += `<h${level}>${this.escapeHtml(section.title)}</h${level}>`;
          }
          if (section.content) {
            const paragraphs = section.content
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `<p>${this.escapeHtml(l)}</p>`)
              .join("");
            html += paragraphs;
          }
          return html;
        })
        .join("");
    }

    if (typeof parsedContent.text === "string") {
      return (parsedContent.text as string)
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<p>${this.escapeHtml(l)}</p>`)
        .join("");
    }

    return "<p><em>Conteúdo do documento não pôde ser renderizado.</em></p>";
  }

  /**
   * Construir HTML da página de capa.
   */
  private buildCoverPageHtml(cover: CoverPageData): string {
    let refsHtml = "";
    if (cover.changeRecordReferences.length > 0) {
      refsHtml = `
        <p class="cover-label">Referências de Controle de Mudanças:</p>
        <ul class="cover-refs">
          ${cover.changeRecordReferences.map((ref) => `<li>${this.escapeHtml(ref)}</li>`).join("")}
        </ul>`;
    }

    let taskHtml = "";
    if (cover.taskDescription) {
      taskHtml = `<p class="cover-info"><strong>Tarefa:</strong> ${this.escapeHtml(cover.taskDescription)}</p>`;
    }

    return `
    <div class="cover-page">
      <h1 class="cover-title">${this.escapeHtml(cover.title)}</h1>
      <p class="cover-info"><strong>Data de Exportação:</strong> ${this.escapeHtml(cover.date)}</p>
      <p class="cover-info"><strong>Exportado por:</strong> ${this.escapeHtml(cover.userName)}</p>
      ${taskHtml}
      ${refsHtml}
    </div>`;
  }

  /**
   * Estilos CSS para renderização PDF.
   */
  private getPdfStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #333; }
      .cover-page { text-align: center; padding-top: 150px; min-height: 100vh; }
      .cover-title { font-size: 28px; font-weight: bold; margin-bottom: 40px; color: #2B579A; }
      .cover-info { font-size: 14px; margin-bottom: 8px; }
      .cover-label { font-size: 14px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; }
      .cover-refs { list-style: disc; display: inline-block; text-align: left; font-size: 13px; }
      .page-break { page-break-after: always; }
      .content { padding: 10px 0; }
      h1 { font-size: 20px; color: #2B579A; margin: 20px 0 10px; border-bottom: 2px solid #2B579A; padding-bottom: 4px; }
      h2 { font-size: 17px; color: #2B579A; margin: 16px 0 8px; }
      h3 { font-size: 14px; color: #444; margin: 12px 0 6px; }
      p { margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
      th { background-color: #2B579A; color: #fff; padding: 8px 6px; text-align: left; border: 1px solid #ccc; }
      td { padding: 6px; border: 1px solid #ccc; vertical-align: top; white-space: pre-wrap; word-break: break-word; }
      .diff-before { background-color: #ffeef0; }
      .diff-after { background-color: #e6ffed; }
    `;
  }

  /**
   * Escapar caracteres HTML especiais.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------------------------------------------------------------------------
  // Helpers — Dados auxiliares
  // ---------------------------------------------------------------------------

  /**
   * Buscar nome completo do usuário pelo ID.
   */
  private async getUserName(userId: string): Promise<string> {
    const { data: profile } = await this.supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    return (profile?.full_name as string) ?? "Usuário desconhecido";
  }

  /**
   * Buscar referências de registros de controle associados a um documento.
   */
  private async getChangeRecordReferences(
    documentId: string,
  ): Promise<string[]> {
    const { data: records } = await this.supabase
      .from("change_records")
      .select("sequential_number, document_name")
      .eq("document_id", documentId)
      .order("sequential_number", { ascending: true });

    if (!records || records.length === 0) {
      return [];
    }

    return records.map((r) => `#${r.sequential_number} — ${r.document_name}`);
  }

  /**
   * Registrar log de exportação na tabela export_logs.
   *
   * Requisito: 8.6
   */
  private async logExport(params: {
    sessionId: string | null;
    documentId: string | null;
    changeRecordId: string | null;
    userId: string;
    organizationId: string;
    exportFormat: string;
    exportType: string;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from("export_logs")
      .insert({
        session_id: params.sessionId,
        document_id: params.documentId,
        change_record_id: params.changeRecordId,
        user_id: params.userId,
        organization_id: params.organizationId,
        export_format: params.exportFormat,
        export_type: params.exportType,
      })
      .select("id")
      .single();

    if (error || !data) {
      console.error(
        "[export/logExport] Erro ao registrar log de exportação:",
        error?.message,
      );
      throw new Error(`Erro ao registrar log de exportação: ${error?.message}`);
    }

    return data.id as string;
  }
}
