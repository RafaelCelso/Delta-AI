/**
 * Utility for making API calls that automatically include the active
 * organization context. Wraps the native `fetch` and appends
 * `organization_id` as a query parameter (for GET) or in the JSON body
 * (for POST/PUT/PATCH).
 *
 * Requisitos: 2.5, 2.6 — garante que o contexto de organização ativa é
 * propagado para todas as API calls.
 */

export interface FetchWithOrgOptions extends RequestInit {
  /** The active organization id to include in the request. */
  organizationId: string;
}

export async function fetchWithOrg(
  url: string,
  { organizationId, ...init }: FetchWithOrgOptions,
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();

  if (method === "GET" || method === "HEAD") {
    // Append organization_id as a query parameter
    const separator = url.includes("?") ? "&" : "?";
    const fullUrl = `${url}${separator}organization_id=${encodeURIComponent(organizationId)}`;
    return fetch(fullUrl, init);
  }

  // For mutation methods, merge organization_id into the JSON body
  let body: Record<string, unknown> = {};

  if (init.body) {
    if (typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        // If body is not JSON, fall back to sending as-is with a header
        const headers = new Headers(init.headers);
        headers.set("X-Organization-Id", organizationId);
        return fetch(url, { ...init, headers });
      }
    } else {
      // Non-string body (FormData, etc.) — use header instead
      const headers = new Headers(init.headers);
      headers.set("X-Organization-Id", organizationId);
      return fetch(url, { ...init, headers });
    }
  }

  body.organization_id = organizationId;

  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...init,
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Lightweight wrapper around `fetch` that intercepts common HTTP errors
 * and returns a structured result. Designed to be used with the Toast
 * system for global error handling.
 */
export interface ApiResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as T;
      return { ok: true, data: data ?? undefined, status: res.status };
    }

    // Map common HTTP errors to user-friendly messages in pt-BR
    const errorMessages: Record<number, string> = {
      401: "Sessão expirada. Faça login novamente.",
      403: "Você não tem permissão para realizar esta ação.",
      404: "Recurso não encontrado.",
      409: "Conflito: o recurso já existe ou foi modificado.",
      422: "Dados inválidos. Verifique os campos e tente novamente.",
      429: "Muitas requisições. Aguarde um momento e tente novamente.",
      500: "Erro interno do servidor. Tente novamente mais tarde.",
      502: "Serviço temporariamente indisponível.",
      503: "Serviço em manutenção. Tente novamente em alguns minutos.",
    };

    let errorMsg = errorMessages[res.status];

    if (!errorMsg) {
      const body = await res.json().catch(() => null);
      errorMsg =
        (body as { error?: string })?.error ??
        `Erro inesperado (${res.status}).`;
    }

    return { ok: false, error: errorMsg, status: res.status };
  } catch {
    return {
      ok: false,
      error: "Erro de conexão. Verifique sua internet e tente novamente.",
      status: 0,
    };
  }
}
