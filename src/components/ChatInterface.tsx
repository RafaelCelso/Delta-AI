"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSession } from "@/contexts/SessionContext";
import { MessageBubble, type Message } from "@/components/MessageBubble";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { ChangeRecordsSummary } from "@/components/ChangeRecordsSummary";
import { Send, Pencil, Check, X } from "lucide-react";

/**
 * Main chat interface — message area only.
 * Session selection is handled by the sidebar via SessionContext.
 *
 * Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.2
 */
export function ChatInterface() {
  const { activeOrg } = useOrganization();
  const {
    activeSession,
    createNewSession,
    refreshSessions,
    updateSessionTitle,
  } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChangeRecords, setShowChangeRecords] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleStartEditTitle = useCallback(() => {
    if (!activeSession) return;
    setEditTitle(activeSession.title || "");
    setIsEditingTitle(true);
  }, [activeSession]);

  const handleCancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
    setEditTitle("");
  }, []);

  const handleSaveTitle = useCallback(async () => {
    if (!activeSession) return;
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed.length > 200) return;

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao atualizar título.");
      }

      updateSessionTitle(activeSession.id, trimmed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao atualizar título.",
      );
    } finally {
      setIsEditingTitle(false);
      setEditTitle("");
    }
  }, [activeSession, editTitle, updateSessionTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveTitle();
      } else if (e.key === "Escape") {
        handleCancelEditTitle();
      }
    },
    [handleSaveTitle, handleCancelEditTitle],
  );

  // Load messages when active session changes
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setError(null);

      try {
        const res = await fetch(`/api/sessions/${activeSession!.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Erro ao carregar mensagens.");
        }

        const data = await res.json();
        if (!cancelled) {
          setMessages(data.messages ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeSession]);

  // Create a new session
  const handleNewSession = useCallback(async () => {
    if (!activeOrg) return;
    await createNewSession();
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  }, [activeOrg, createNewSession]);

  // Send a message
  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !activeSession || isSending) return;

    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${activeSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok && res.status !== 207) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao enviar mensagem.");
      }

      const data = await res.json();

      const newMessages: Message[] = [];
      if (data.userMessage) newMessages.push(data.userMessage);
      if (data.assistantMessage) newMessages.push(data.assistantMessage);

      setMessages((prev) => [...prev, ...newMessages]);

      // Update session title if it's the first message and session has no title
      if (!activeSession.title && data.userMessage) {
        const titleSnippet =
          data.userMessage.content.length > 60
            ? data.userMessage.content.slice(0, 57) + "..."
            : data.userMessage.content;

        // Fire-and-forget title update — not critical
        fetch(`/api/sessions/${activeSession.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleSnippet }),
        }).catch(() => {});

        updateSessionTitle(activeSession.id, titleSnippet);
        refreshSessions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [input, activeSession, isSending, updateSessionTitle, refreshSessions]);

  // Handle Enter key (Shift+Enter for newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!activeOrg) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.emptyText}>
          Selecione uma organização para iniciar o chat.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Chat area */}
      <div style={styles.chatArea}>
        {!activeSession ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Delta-AI Chat</p>
            <p style={styles.emptyText}>
              Selecione uma sessão existente no menu lateral ou crie uma nova
              para começar.
            </p>
            <button
              type="button"
              onClick={handleNewSession}
              style={styles.startBtn}
            >
              Nova Sessão
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={styles.chatHeader}>
              <div style={styles.chatHeaderTitleArea}>
                {isEditingTitle ? (
                  <div style={styles.titleEditRow}>
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      maxLength={200}
                      style={styles.titleInput}
                      aria-label="Editar título da sessão"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTitle}
                      style={styles.titleActionBtn}
                      aria-label="Salvar título"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditTitle}
                      style={styles.titleActionBtnCancel}
                      aria-label="Cancelar edição"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={styles.titleDisplayRow}>
                    <span style={styles.chatHeaderTitle}>
                      {activeSession.title || "Nova sessão"}
                    </span>
                    <button
                      type="button"
                      onClick={handleStartEditTitle}
                      style={styles.titleEditBtn}
                      aria-label="Editar título"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowChangeRecords(true)}
                style={styles.changeRecordsBtn}
                aria-label="Ver registros de mudanças"
              >
                📋 Registros de Mudanças
              </button>
            </div>

            {/* Messages */}
            <div style={styles.messagesContainer} role="log" aria-live="polite">
              {isLoadingMessages && (
                <div style={styles.loadingContainer}>
                  <LoadingIndicator text="Carregando mensagens..." />
                </div>
              )}

              {!isLoadingMessages && messages.length === 0 && (
                <div style={styles.emptyMessages}>
                  <p style={styles.emptyText}>
                    Descreva uma tarefa de alteração para iniciar a análise de
                    impacto nos documentos de validação.
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isSending && <LoadingIndicator text="Analisando..." />}

              <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {error && (
              <div style={styles.errorBanner} role="alert">
                {error}
              </div>
            )}

            {/* Input area */}
            <div style={styles.inputArea}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descreva a tarefa de alteração..."
                rows={2}
                disabled={isSending}
                style={{
                  ...styles.textarea,
                  opacity: isSending ? 0.6 : 1,
                }}
                aria-label="Mensagem"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                style={{
                  ...styles.sendBtn,
                  opacity: isSending || !input.trim() ? 0.5 : 1,
                  cursor:
                    isSending || !input.trim() ? "not-allowed" : "pointer",
                }}
                aria-label="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            </div>

            {/* Change records summary modal */}
            {showChangeRecords && (
              <ChangeRecordsSummary
                sessionId={activeSession.id}
                onClose={() => setShowChangeRecords(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    height: "100%",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.625rem 8%",
    borderBottom: "1px solid #262626",
    backgroundColor: "#111111",
  },
  chatHeaderTitle: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#f5f5f5",
  },
  chatHeaderTitleArea: {
    flex: 1,
    minWidth: 0,
  },
  titleDisplayRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  titleEditRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
  },
  titleEditBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25rem",
    background: "none",
    border: "none",
    color: "#737373",
    cursor: "pointer",
    borderRadius: "4px",
  },
  titleInput: {
    flex: 1,
    padding: "0.25rem 0.5rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#f5f5f5",
    backgroundColor: "#1a1a1a",
    border: "1px solid #404040",
    borderRadius: "6px",
    outline: "none",
    fontFamily: "inherit",
    maxWidth: "300px",
  },
  titleActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25rem",
    background: "none",
    border: "none",
    color: "#10b981",
    cursor: "pointer",
    borderRadius: "4px",
  },
  titleActionBtnCancel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25rem",
    background: "none",
    border: "none",
    color: "#ef4444",
    cursor: "pointer",
    borderRadius: "4px",
  },
  changeRecordsBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.375rem",
    padding: "0.375rem 0.75rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    borderRadius: "6px",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 8%",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "2rem 0",
  },
  emptyMessages: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  errorBanner: {
    padding: "0.5rem 8%",
    fontSize: "0.8125rem",
    color: "#fca5a5",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderTop: "1px solid rgba(239, 68, 68, 0.3)",
  },
  inputArea: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.75rem 8%",
    borderTop: "1px solid #262626",
    backgroundColor: "#111111",
    alignItems: "center",
  },
  textarea: {
    flex: 1,
    padding: "0.625rem 0.75rem",
    fontSize: "0.875rem",
    border: "1px solid #404040",
    borderRadius: "8px",
    outline: "none",
    resize: "none" as const,
    fontFamily: "inherit",
    lineHeight: "1.5",
    color: "#f5f5f5",
    backgroundColor: "#1a1a1a",
    minHeight: "2.75rem",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.625rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    whiteSpace: "nowrap" as const,
    height: "2.75rem",
    width: "2.75rem",
    flexShrink: 0,
  },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "2rem",
  },
  emptyTitle: {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#f5f5f5",
    margin: 0,
  },
  emptyText: {
    fontSize: "0.875rem",
    color: "#a3a3a3",
    textAlign: "center",
    maxWidth: "400px",
    margin: 0,
    lineHeight: "1.5",
  },
  startBtn: {
    padding: "0.5rem 1.25rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
