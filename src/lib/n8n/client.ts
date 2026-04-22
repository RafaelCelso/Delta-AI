/**
 * N8nClient — HTTP client for communicating with n8n webhooks.
 *
 * Handles:
 * - POST requests to n8n webhook endpoints (impact-analysis, generate-changes, generate-report)
 * - Authentication via X-Webhook-Secret header
 * - 30-second timeout via AbortController
 * - Error handling for timeout, network errors, and invalid responses
 * - Response validation before forwarding to the frontend
 *
 * Requisitos: 10.1, 10.3, 10.4
 */

import type {
  ImpactAnalysisRequest,
  ImpactAnalysisResponse,
  GenerateChangesRequest,
  GenerateChangesResponse,
  GenerateReportRequest,
  GenerateReportResponse,
} from "./types";
import { N8nError } from "./types";
import {
  validateImpactAnalysisResponse,
  validateGenerateChangesResponse,
  validateGenerateReportResponse,
} from "./validation";

/** Default timeout for n8n requests (30 seconds). */
const DEFAULT_TIMEOUT_MS = 30_000;

export class N8nClient {
  private readonly baseUrl: string;
  private readonly webhookSecret: string | undefined;
  private readonly timeoutMs: number;

  constructor(options?: {
    baseUrl?: string;
    webhookSecret?: string;
    timeoutMs?: number;
  }) {
    const baseUrl = options?.baseUrl ?? process.env.N8N_BASE_URL;
    if (!baseUrl) {
      throw new N8nError(
        "not_configured",
        "N8N_BASE_URL não está configurado. Configure a variável de ambiente para habilitar a integração com n8n.",
        503,
      );
    }

    // Remove trailing slash for consistent URL building
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.webhookSecret =
      options?.webhookSecret ?? process.env.N8N_WEBHOOK_SECRET;
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Send a task for impact analysis.
   *
   * Calls POST {baseUrl}/webhook/impact-analysis with the given payload,
   * validates the response, and returns typed results.
   */
  async analyzeImpact(
    payload: ImpactAnalysisRequest,
  ): Promise<ImpactAnalysisResponse> {
    const data = await this.post("/webhook/impact-analysis", payload);

    const result = validateImpactAnalysisResponse(data);
    if (!result.valid || !result.data) {
      throw new N8nError(
        "invalid_response",
        `Resposta do n8n com estrutura inválida: ${result.error}`,
        502,
      );
    }

    return result.data;
  }

  /**
   * Request generation of proposed changes for an analysis.
   *
   * Calls POST {baseUrl}/webhook/generate-changes with the given payload,
   * validates the response, and returns typed results.
   */
  async generateChanges(
    payload: GenerateChangesRequest,
  ): Promise<GenerateChangesResponse> {
    const data = await this.post("/webhook/generate-changes", payload);

    const result = validateGenerateChangesResponse(data);
    if (!result.valid || !result.data) {
      throw new N8nError(
        "invalid_response",
        `Resposta do n8n com estrutura inválida: ${result.error}`,
        502,
      );
    }

    return result.data;
  }

  /**
   * Request generation of a change report for a session.
   *
   * Calls POST {baseUrl}/webhook/generate-report with the given payload,
   * validates the response, and returns typed results.
   */
  async generateReport(
    payload: GenerateReportRequest,
  ): Promise<GenerateReportResponse> {
    const data = await this.post("/webhook/generate-report", payload);

    const result = validateGenerateReportResponse(data);
    if (!result.valid || !result.data) {
      throw new N8nError(
        "invalid_response",
        `Resposta do n8n com estrutura inválida: ${result.error}`,
        502,
      );
    }

    return result.data;
  }

  /**
   * Internal helper — sends a POST request to an n8n webhook endpoint.
   *
   * Handles timeout (AbortController), network errors, non-OK HTTP status,
   * and JSON parsing failures.
   */
  private async post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.webhookSecret) {
        headers["X-Webhook-Secret"] = this.webhookSecret;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new N8nError(
          "unavailable",
          `n8n retornou status ${response.status}`,
          503,
        );
      }

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new N8nError(
          "invalid_response",
          "Resposta do n8n não é um JSON válido.",
          502,
        );
      }

      return data;
    } catch (err) {
      if (err instanceof N8nError) {
        throw err;
      }

      if (err instanceof Error && err.name === "AbortError") {
        throw new N8nError(
          "timeout",
          "O serviço de análise demorou mais que o esperado. Por favor, tente novamente.",
          503,
        );
      }

      // Network error or other fetch failure
      throw new N8nError(
        "unavailable",
        "O serviço de análise está temporariamente indisponível. Por favor, tente novamente mais tarde.",
        503,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
