"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";

type Step = "welcome" | "create-org";

export function OnboardingFlow() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSkip(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Nome completo é obrigatório.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc("handle_onboarding", {
        p_full_name: fullName.trim(),
      });

      if (rpcError) {
        throw new Error(`Erro ao criar perfil: ${rpcError.message}`);
      }

      router.push("/");
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

  async function handleCreateOrg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Nome completo é obrigatório.");
      return;
    }

    if (!orgName.trim()) {
      setError("Nome da organização é obrigatório.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error: rpcError } = await supabase.rpc("handle_onboarding", {
        p_full_name: fullName.trim(),
        p_org_name: orgName.trim(),
      });

      if (rpcError) {
        throw new Error(`Erro ao criar organização: ${rpcError.message}`);
      }

      router.push("/");
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-[480px] rounded-xl border border-neutral-800 bg-[#111111] p-8">
        {/* Title */}
        <h1 className="mb-1 text-center text-xl font-bold text-white">
          Configure seu perfil
        </h1>
        <p className="mb-8 text-center text-sm text-neutral-400">
          Preencha seus dados para começar a usar o sistema.
        </p>

        {/* Full name field */}
        <div className="mb-5">
          <label
            htmlFor="fullName"
            className="mb-1.5 block text-sm font-medium text-neutral-300"
          >
            Nome completo
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Seu nome completo"
            disabled={isSubmitting}
            className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
          />
        </div>

        {step === "welcome" && (
          <>
            <p className="mb-4 text-center text-sm text-neutral-400">
              Deseja criar uma organização agora ou seguir sem organização?
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setStep("create-org")}
                disabled={isSubmitting}
                className="cursor-pointer w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Criar Organização
              </button>

              <form onSubmit={handleSkip}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Pular"}
                </button>
              </form>
            </div>
          </>
        )}

        {step === "create-org" && (
          <form onSubmit={handleCreateOrg} className="space-y-5">
            <div>
              <label
                htmlFor="orgName"
                className="mb-1.5 block text-sm font-medium text-neutral-300"
              >
                Nome da organização
              </label>
              <input
                id="orgName"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Nome da sua organização"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Criando..." : "Criar e continuar"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("welcome");
                  setError(null);
                }}
                disabled={isSubmitting}
                className="cursor-pointer w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Voltar
              </button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
