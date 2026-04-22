"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

interface DeleteOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: () => void;
}

export function DeleteOrganizationDialog({
  organizationId,
  organizationName,
  isOpen,
  onClose,
  onDeleteSuccess,
}: DeleteOrganizationDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const isNameMatch = confirmText === organizationName;

  // Clear the text field when the dialog opens or closes
  useEffect(() => {
    setConfirmText("");
  }, [isOpen]);

  function handleClose() {
    if (isSubmitting) return;
    onClose();
  }

  async function handleDelete() {
    if (!isNameMatch) return;

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/organizations/${organizationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        addToast("error", "Erro ao excluir organização. Tente novamente.");
        return;
      }

      onDeleteSuccess();
    } catch {
      addToast("error", "Erro ao excluir organização. Tente novamente.");
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
      aria-label="Excluir organização"
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Excluir Organização
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

        <p className="mb-4 text-sm text-muted-foreground">
          Tem certeza que deseja excluir a organização{" "}
          <strong className="text-foreground">{organizationName}</strong>? Esta
          ação é irreversível. Todos os membros serão removidos e todos os
          documentos, chats e dados serão apagados permanentemente.
        </p>

        {/* Confirmation input */}
        <div className="mb-6">
          <label
            htmlFor="confirm-org-name"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Digite{" "}
            <strong className="text-destructive">{organizationName}</strong>{" "}
            para confirmar:
          </label>
          <input
            id="confirm-org-name"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isSubmitting}
            placeholder={organizationName}
            className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            autoComplete="off"
          />
        </div>

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
            onClick={handleDelete}
            disabled={!isNameMatch || isSubmitting}
          >
            {isSubmitting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
