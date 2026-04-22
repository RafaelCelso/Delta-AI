"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Mail, X, Send } from "lucide-react";

interface InviteDialogProps {
  organizationId: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteDialog({
  organizationId,
  isOpen,
  onClose,
  onInviteSent,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function resetState() {
    setEmail("");
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email é obrigatório.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Formato de email inválido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/organizations/${organizationId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao enviar convite.");
        return;
      }

      setSuccess(`Convite enviado para ${trimmedEmail}.`);
      setEmail("");
      onInviteSent();
    } catch {
      setError("Erro de conexão ao enviar convite.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar convite"
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Enviar Convite
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Insira o email do usuário que deseja convidar para a organização.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="invite-email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email do convidado
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
            >
              {success}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {isSubmitting ? "Enviando..." : "Enviar Convite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
