"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { DottedSurface } from "@/components/ui/dotted-surface";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { signIn, signUp, resetPassword, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      if (mode === "forgot") {
        const { error: resetError } = await resetPassword(email);

        if (resetError) {
          setError("Erro ao enviar e-mail de redefinição. Tente novamente.");
          return;
        }

        setSuccess(
          "E-mail de redefinição enviado! Verifique sua caixa de entrada.",
        );
        return;
      }

      if (mode === "login") {
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          setError("Credenciais inválidas. Verifique seu email e senha.");
          return;
        }

        router.push("/");
      } else {
        if (password.length < 6) {
          setError("A senha deve ter pelo menos 6 caracteres.");
          return;
        }

        const { error: signUpError, needsConfirmation } = await signUp(
          email,
          password,
        );

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (needsConfirmation) {
          setSuccess(
            "Conta criada! Verifique seu email para confirmar o cadastro, depois faça login.",
          );
          setMode("login");
          return;
        }

        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          setSuccess("Conta criada com sucesso! Faça login para continuar.");
          setMode("login");
          return;
        }

        router.push("/onboarding");
      }
    } catch {
      setError(
        mode === "login"
          ? "Credenciais inválidas. Verifique seu email e senha."
          : mode === "signup"
            ? "Erro ao criar conta. Tente novamente."
            : "Erro ao enviar e-mail de redefinição. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setSuccess(null);
  }

  function goToForgot() {
    setMode("forgot");
    setError(null);
    setSuccess(null);
    setPassword("");
  }

  function backToLogin() {
    setMode("login");
    setError(null);
    setSuccess(null);
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Base background color */}
      <div className="fixed inset-0 bg-[#0a0a0a]" />

      {/* Animated dotted surface background */}
      <DottedSurface className="z-[1]" />

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-[440px] rounded-xl border border-neutral-800 bg-[#111111] p-8">
          {/* Logo */}
          <div className="mb-4 flex justify-center">
            <img
              src="/image/Delta-AI.png"
              alt="Delta-AI"
              className="h-28 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="mb-1 text-center text-2xl font-bold text-white">
            {mode === "login"
              ? "Bem-vindo de volta"
              : mode === "signup"
                ? "Crie sua conta"
                : "Esqueceu a senha?"}
          </h1>
          <p className="mb-8 text-center text-sm text-neutral-400">
            {mode === "login"
              ? "Faça login na sua conta Delta-AI para continuar"
              : mode === "signup"
                ? "Cadastre-se na Delta-AI para começar"
                : "Informe seu e-mail para receber o link de redefinição"}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-neutral-300"
              >
                Endereço de Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                autoComplete="email"
                className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>

            {/* Password */}
            {mode !== "forgot" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-neutral-300"
                  >
                    Senha
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={goToForgot}
                      className="cursor-pointer text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-[#1a1a1a] px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                />
                {mode === "signup" && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Mínimo de 6 caracteres
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400"
              >
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div
                role="status"
                className="rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-400"
              >
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? mode === "login"
                  ? "Entrando..."
                  : mode === "signup"
                    ? "Criando conta..."
                    : "Enviando..."
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : "Enviar link de redefinição"}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-neutral-400">
            {mode === "forgot" ? (
              <button
                type="button"
                onClick={backToLogin}
                className="cursor-pointer font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Voltar ao login
              </button>
            ) : mode === "login" ? (
              <>
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="cursor-pointer font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem uma conta?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="cursor-pointer font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Fazer login
                </button>
              </>
            )}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 border-t border-neutral-800/50 px-6 py-4 sm:flex-row">
        <p className="text-xs text-neutral-500">
          © 2024 Delta-AI Infrastructure. Todos os direitos reservados.
        </p>
        <div className="flex gap-4">
          <button className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Política de Privacidade
          </button>
          <button className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Termos de Serviço
          </button>
          <button className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
            Segurança
          </button>
        </div>
      </footer>
    </div>
  );
}
