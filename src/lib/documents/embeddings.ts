/**
 * Serviço de geração de embeddings vetoriais.
 *
 * Envia chunks de texto para uma API de embeddings (compatível com OpenAI)
 * e retorna os vetores resultantes.
 *
 * Requisitos: 3.5
 */

/** Configuração do serviço de embeddings. */
export interface EmbeddingServiceConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
}

/** Tamanho do lote para requisições à API de embeddings. */
const DEFAULT_BATCH_SIZE = 20;

/** URL padrão da API de embeddings (OpenAI). */
const DEFAULT_API_URL = "https://api.openai.com/v1/embeddings";

/** Modelo padrão de embeddings. */
const DEFAULT_MODEL = "text-embedding-ada-002";

/**
 * Serviço para geração de embeddings vetoriais via API compatível com OpenAI.
 *
 * Processa textos em lotes para evitar limites de taxa da API.
 */
export class EmbeddingService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(config: EmbeddingServiceConfig) {
    if (!config.apiKey) {
      throw new Error(
        "Chave de API de embeddings é obrigatória. Configure a variável EMBEDDING_API_KEY.",
      );
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    this.model = config.model ?? DEFAULT_MODEL;
  }

  /**
   * Gera embeddings para um array de textos, processando em lotes.
   *
   * @param texts - Array de textos para gerar embeddings
   * @param batchSize - Tamanho do lote (padrão: 20)
   * @returns Array de vetores de embeddings na mesma ordem dos textos
   */
  async generateEmbeddings(
    texts: string[],
    batchSize: number = DEFAULT_BATCH_SIZE,
  ): Promise<number[][]> {
    if (texts.length === 0) return [];

    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.requestEmbeddings(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  /**
   * Gera embedding para um único texto.
   *
   * @param text - Texto para gerar embedding
   * @returns Vetor de embedding
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const results = await this.requestEmbeddings([text]);
    return results[0];
  }

  /**
   * Envia requisição para a API de embeddings.
   *
   * @param texts - Array de textos para enviar à API
   * @returns Array de vetores de embeddings
   */
  private async requestEmbeddings(texts: string[]): Promise<number[][]> {
    let response: Response;

    try {
      response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: this.model,
        }),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(`Erro de conexão com a API de embeddings: ${message}`);
    }

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorBody = await response.json();
        errorDetail = errorBody?.error?.message ?? JSON.stringify(errorBody);
      } catch {
        errorDetail = response.statusText;
      }
      throw new Error(
        `Erro na API de embeddings (${response.status}): ${errorDetail}`,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Erro ao processar resposta da API de embeddings: resposta não é JSON válido.",
      );
    }

    const body = data as {
      data?: Array<{ embedding: number[]; index: number }>;
    };

    if (!body.data || !Array.isArray(body.data)) {
      throw new Error(
        "Resposta inesperada da API de embeddings: campo 'data' ausente ou inválido.",
      );
    }

    // Sort by index to ensure correct order
    const sorted = [...body.data].sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  }
}
