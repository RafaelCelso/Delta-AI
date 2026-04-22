"use client";

import { useState, type FormEvent } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CreateOrganizationDialogProps {
  children: React.ReactNode;
}

export function CreateOrganizationDialog({
  children,
}: CreateOrganizationDialogProps) {
  const { refreshOrganizations, setActiveOrg } = useOrganization();
  const [open, setOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const name = orgName.trim();
    if (!name) {
      setError("Nome da organização é obrigatório.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao criar organização.");
      }

      const newOrg = await res.json();

      // Refresh the list and set the new org as active
      await refreshOrganizations();
      setActiveOrg(newOrg);

      // Reset and close
      setOrgName("");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro inesperado. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset state when closing
      setOrgName("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-neutral-800 bg-[#111111]">
        <DialogHeader>
          <DialogTitle className="text-[#f5f5f5]">
            Criar organização
          </DialogTitle>
          <DialogDescription>
            Dê um nome para sua nova organização. Você será adicionado como
            proprietário automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="org-name"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Nome da organização
            </label>
            <input
              id="org-name"
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Ex: Minha Empresa"
              disabled={isSubmitting}
              autoFocus
              className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-neutral-800"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {isSubmitting ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
