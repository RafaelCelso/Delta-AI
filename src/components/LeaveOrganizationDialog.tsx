"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface LeaveOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
  onLeaveSuccess: () => void;
}

export function LeaveOrganizationDialog({
  organizationId,
  organizationName,
  isOpen,
  onClose,
  onLeaveSuccess,
}: LeaveOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleLeave() {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/organizations/${organizationId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        addToast("error", "Erro ao sair da organização. Tente novamente.");
        return;
      }

      onLeaveSuccess();
    } catch {
      addToast("error", "Erro ao sair da organização. Tente novamente.");
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
      aria-label="Sair da organização"
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Sair da Organização
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Tem certeza que deseja sair da organização{" "}
          <strong className="text-foreground">{organizationName}</strong>? Você
          perderá acesso a todos os documentos e chats desta organização.
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="text-white"
            onClick={handleLeave}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saindo..." : "Sair"}
          </Button>
        </div>
      </div>
    </div>
  );
}
