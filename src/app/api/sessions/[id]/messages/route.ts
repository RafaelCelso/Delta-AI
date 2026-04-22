import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { N8nClient, N8nError } from "@/lib/n8n";
import { ImpactAnalysisService } from "@/lib/impact-analysis/service";

/**
 * POST /api/sessions/:id/messages — Send a message in a session.
 *
 * Persists the user's message, runs impact analysis via n8n, persists the
 * analysis results, and returns both the user and assistant messages.
 *
 * Body: { content: string }
 *
 * Requisitos: 4.1, 4.4, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 10.1, 10.2, 10.5
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Verify session exists and belongs to the user (RLS enforces org access)
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, organization_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Sessão não encontrada." },
      { status: 404 },
    );
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json(
      { error: "Conteúdo da mensagem é obrigatório." },
      { status: 400 },
    );
  }

  // 1. Persist the user message
  const { data: userMessage, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      role: "user",
      content,
    })
    .select("id, session_id, role, content, metadata, created_at")
    .single();

  if (userMsgError) {
    return NextResponse.json(
      { error: `Erro ao salvar mensagem: ${userMsgError.message}` },
      { status: 500 },
    );
  }

  // 2. Run impact analysis via n8n
  let assistantContent: string;
  let assistantMetadata: Record<string, unknown> = {};

  const n8nBaseUrl = process.env.N8N_BASE_URL;

  if (n8nBaseUrl) {
    try {
      const n8nClient = new N8nClient();
      const analysisService = new ImpactAnalysisService(supabase, n8nClient);

      const result = await analysisService.analyze({
        sessionId,
        messageId: userMessage.id,
        taskDescription: content,
        organizationId: session.organization_id,
        userId: user.id,
      });

      assistantContent = result.message;
      assistantMetadata = {
        source: "n8n",
        analysis_id: result.analysis_id,
        status: result.status,
        processing_time_ms: result.processing_time_ms,
        affected_documents: result.affected_documents,
      };
    } catch (err) {
      if (err instanceof N8nError) {
        switch (err.type) {
          case "timeout":
            assistantContent =
              "O serviço de análise demorou mais que o esperado. Por favor, tente novamente.";
            break;
          case "invalid_response":
            console.error("[n8n] Invalid response structure:", err.message);
            assistantContent =
              "Ocorreu um erro ao processar a resposta do serviço de análise. Por favor, tente novamente.";
            break;
          case "unavailable":
          default:
            assistantContent =
              "O serviço de análise está temporariamente indisponível. Por favor, tente novamente mais tarde.";
            break;
        }
        assistantMetadata = {
          source: "n8n",
          error: err.type,
          error_message: err.message,
        };
      } else {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido";
        console.error("[impact-analysis] Unexpected error:", errorMessage);
        assistantContent =
          "Ocorreu um erro inesperado durante a análise. Por favor, tente novamente.";
        assistantMetadata = {
          source: "n8n",
          error: "unexpected",
          error_message: errorMessage,
        };
      }
    }
  } else {
    // n8n not configured — return a placeholder response
    assistantContent =
      "O serviço de análise de IA não está configurado. Configure a variável N8N_BASE_URL para habilitar a análise de impacto.";
    assistantMetadata = { source: "placeholder", error: "n8n_not_configured" };
  }

  // 3. Persist the assistant message
  const { data: assistantMessage, error: assistantMsgError } = await supabase
    .from("messages")
    .insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantContent,
      metadata: assistantMetadata,
    })
    .select("id, session_id, role, content, metadata, created_at")
    .single();

  if (assistantMsgError) {
    // User message was saved but assistant message failed — still return user message
    return NextResponse.json(
      {
        userMessage,
        assistantMessage: null,
        error: `Mensagem do usuário salva, mas erro ao salvar resposta: ${assistantMsgError.message}`,
      },
      { status: 207 },
    );
  }

  // 4. Update session's updated_at timestamp
  await supabase
    .from("sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ userMessage, assistantMessage }, { status: 201 });
}
