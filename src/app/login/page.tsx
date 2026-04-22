"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, FileSpreadsheet, FileType } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { signIn, signUp, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
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
          : "Erro ao criar conta. Tente novamente.",
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

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Neon background blobs */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle, #10b981 0%, transparent 70%)",
          animation: "neonFloat1 12s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: "radial-gradient(circle, #059669 0%, transparent 70%)",
          animation: "neonFloat2 15s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 h-[450px] w-[450px] rounded-full opacity-10 blur-[110px]"
        style={{
          background: "radial-gradient(circle, #34d399 0%, transparent 70%)",
          animation: "neonFloat3 18s ease-in-out infinite",
        }}
      />

      {/* Animated connection lines between documents */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <path id="p1" d="M120,170 L860,220" />
          <path id="p2" d="M860,220 L800,730" />
          <path id="p3" d="M800,730 L170,800" />
          <path id="p4" d="M170,800 L100,570" />
          <path id="p5" d="M100,570 L120,170" />
          <path id="p6" d="M900,620 L120,170" />
          <path id="p7" d="M100,570 L900,620" />
        </defs>

        {/* Dotted connection lines */}
        <line
          x1="120"
          y1="170"
          x2="860"
          y2="220"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.1;0.3;0.1"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="860"
          y1="220"
          x2="800"
          y2="730"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.08;0.25;0.08"
            dur="8s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="800"
          y1="730"
          x2="170"
          y2="800"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.1;0.3;0.1"
            dur="7s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="170"
          y1="800"
          x2="100"
          y2="570"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.08;0.2;0.08"
            dur="9s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="100"
          y1="570"
          x2="120"
          y2="170"
          stroke="#10b981"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.1;0.25;0.1"
            dur="7.5s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="900"
          y1="620"
          x2="120"
          y2="170"
          stroke="#34d399"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.06;0.18;0.06"
            dur="10s"
            repeatCount="indefinite"
          />
        </line>
        <line
          x1="100"
          y1="570"
          x2="900"
          y2="620"
          stroke="#34d399"
          strokeWidth="1"
          strokeDasharray="3 8"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        >
          <animate
            attributeName="opacity"
            values="0.06;0.15;0.06"
            dur="11s"
            repeatCount="indefinite"
          />
        </line>

        {/* Traveling pulse dots along paths */}
        <circle r="3" fill="#10b981">
          <animate
            attributeName="opacity"
            values="0;0.7;0.7;0"
            dur="6s"
            repeatCount="indefinite"
          />
          <animateMotion dur="6s" repeatCount="indefinite">
            <mpath href="#p1" />
          </animateMotion>
        </circle>
        <circle r="3" fill="#34d399">
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            dur="8s"
            repeatCount="indefinite"
          />
          <animateMotion dur="8s" repeatCount="indefinite">
            <mpath href="#p2" />
          </animateMotion>
        </circle>
        <circle r="2.5" fill="#10b981">
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateMotion dur="7s" repeatCount="indefinite">
            <mpath href="#p3" />
          </animateMotion>
        </circle>
        <circle r="2.5" fill="#34d399">
          <animate
            attributeName="opacity"
            values="0;0.5;0.5;0"
            dur="9s"
            repeatCount="indefinite"
          />
          <animateMotion dur="9s" repeatCount="indefinite">
            <mpath href="#p4" />
          </animateMotion>
        </circle>
        <circle r="2" fill="#10b981">
          <animate
            attributeName="opacity"
            values="0;0.6;0.6;0"
            dur="7.5s"
            repeatCount="indefinite"
          />
          <animateMotion dur="7.5s" repeatCount="indefinite">
            <mpath href="#p5" />
          </animateMotion>
        </circle>
      </svg>

      {/* Floating document icons */}
      <div
        className="pointer-events-none absolute left-[10%] top-[15%] opacity-[0.07]"
        style={{ animation: "iconFloat1 20s ease-in-out infinite" }}
      >
        <FileText className="h-16 w-16 text-emerald-400" />
      </div>
      <div
        className="pointer-events-none absolute right-[12%] top-[20%] opacity-[0.06]"
        style={{ animation: "iconFloat2 24s ease-in-out infinite" }}
      >
        <FileSpreadsheet className="h-14 w-14 text-emerald-500" />
      </div>
      <div
        className="pointer-events-none absolute left-[15%] bottom-[18%] opacity-[0.06]"
        style={{ animation: "iconFloat3 22s ease-in-out infinite" }}
      >
        <FileType className="h-12 w-12 text-emerald-300" />
      </div>
      <div
        className="pointer-events-none absolute right-[18%] bottom-[25%] opacity-[0.05]"
        style={{ animation: "iconFloat1 26s ease-in-out infinite reverse" }}
      >
        <FileText className="h-10 w-10 text-emerald-400" />
      </div>
      <div
        className="pointer-events-none absolute left-[8%] top-[55%] opacity-[0.05]"
        style={{ animation: "iconFloat2 18s ease-in-out infinite reverse" }}
      >
        <FileSpreadsheet className="h-12 w-12 text-emerald-500" />
      </div>
      <div
        className="pointer-events-none absolute right-[8%] top-[60%] opacity-[0.06]"
        style={{ animation: "iconFloat3 21s ease-in-out infinite" }}
      >
        <FileType className="h-14 w-14 text-emerald-300" />
      </div>

      <style>{`
        @keyframes neonFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(60px, 40px) scale(1.1); }
          66% { transform: translate(-30px, 60px) scale(0.95); }
        }
        @keyframes neonFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, -30px) scale(1.05); }
          66% { transform: translate(40px, -50px) scale(0.9); }
        }
        @keyframes neonFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -40px) scale(1.08); }
          66% { transform: translate(-60px, 20px) scale(0.92); }
        }
        @keyframes iconFloat1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(15px, -20px) rotate(5deg); }
          50% { transform: translate(-10px, -35px) rotate(-3deg); }
          75% { transform: translate(20px, -10px) rotate(4deg); }
        }
        @keyframes iconFloat2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-20px, 15px) rotate(-4deg); }
          50% { transform: translate(10px, 25px) rotate(6deg); }
          75% { transform: translate(-15px, 10px) rotate(-2deg); }
        }
        @keyframes iconFloat3 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(12px, 18px) rotate(3deg); }
          50% { transform: translate(-18px, -12px) rotate(-5deg); }
          75% { transform: translate(8px, -20px) rotate(2deg); }
        }
      `}</style>

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
            {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mb-8 text-center text-sm text-neutral-400">
            {mode === "login"
              ? "Faça login na sua conta Delta-AI para continuar"
              : "Cadastre-se na Delta-AI para começar"}
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
                  : "Criando conta..."
                : mode === "login"
                  ? "Entrar"
                  : "Criar conta"}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="mt-6 text-center text-sm text-neutral-400">
            {mode === "login" ? "Não tem uma conta? " : "Já tem uma conta? "}
            <button
              type="button"
              onClick={toggleMode}
              className="cursor-pointer font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              {mode === "login" ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t border-neutral-800/50 px-6 py-4 sm:flex-row">
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
