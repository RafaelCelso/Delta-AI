"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSession } from "@/contexts/SessionContext";
import { fetchWithOrg } from "@/lib/fetchWithOrg";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessagesSquare,
  FileText,
  Upload,
  Plus,
  Clock,
  ArrowRight,
  FolderOpen,
  Users,
  Activity,
  TrendingUp,
  Settings,
} from "lucide-react";
import { CreateOrganizationDialog } from "@/components/CreateOrganizationDialog";

interface DocumentSummary {
  total: number;
  indexed: number;
  processing: number;
  error: number;
}

interface RecentDocument {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeOrg, isLoading: orgLoading } = useOrganization();
  const { sessions, createNewSession } = useSession();
  const router = useRouter();

  const [documents, setDocuments] = useState<RecentDocument[]>([]);
  const [docSummary, setDocSummary] = useState<DocumentSummary>({
    total: 0,
    indexed: 0,
    processing: 0,
    error: 0,
  });
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  const activeOrgId = activeOrg?.id ?? null;

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        if (data?.full_name) {
          setProfileName(data.full_name);
        }
      } catch {
        // best-effort — fallback to email
      }
    }
    fetchProfile();
  }, [user]);

  const fetchDocuments = useCallback(async () => {
    if (!activeOrgId) {
      setDocuments([]);
      setDocSummary({ total: 0, indexed: 0, processing: 0, error: 0 });
      setIsLoadingDocs(false);
      return;
    }

    setIsLoadingDocs(true);
    try {
      const res = await fetchWithOrg("/api/documents", {
        organizationId: activeOrgId,
      });
      if (res.ok) {
        const data: RecentDocument[] = await res.json();
        setDocuments(data.slice(0, 5));
        setDocSummary({
          total: data.length,
          indexed: data.filter((d) => d.status === "indexed").length,
          processing: data.filter((d) => d.status === "processing").length,
          error: data.filter((d) => d.status === "error").length,
        });
      }
    } catch {
      // silently fail — dashboard is best-effort
    } finally {
      setIsLoadingDocs(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function handleNewChat() {
    await createNewSession();
    router.push("/chat");
  }

  const displayName = profileName || user?.email?.split("@")[0] || "usuário";
  const recentSessions = sessions.slice(0, 5);
  const greeting = getGreeting();

  if (orgLoading) {
    return (
      <AppShell>
        <div className="flex h-full flex-col gap-6 p-6 lg:p-8">
          <DashboardSkeleton />
        </div>
      </AppShell>
    );
  }

  if (!activeOrg) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <FolderOpen
              className="text-muted-foreground"
              size={48}
              strokeWidth={1.5}
            />
            <h2 className="text-xl font-semibold text-[#f5f5f5]">
              Bem-vindo ao Delta-AI
            </h2>
            <p className="max-w-md text-sm text-[#a3a3a3] leading-relaxed">
              Crie ou selecione uma organização para começar a usar o assistente
              de documentação de validação.
            </p>
            <CreateOrganizationDialog>
              <button
                type="button"
                className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#10b981] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#059669] cursor-pointer"
              >
                Criar organização
              </button>
            </CreateOrganizationDialog>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 shrink-0">
          <h1 className="text-2xl font-semibold text-[#f5f5f5]">
            {greeting}, <span className="text-[#10b981]">{displayName}</span>
          </h1>
          <p className="mt-1 text-sm text-[#a3a3a3]">
            Organização: <strong>{activeOrg.name}</strong>
          </p>
        </div>

        {/* Stats cards — always 4 columns on lg+ */}
        <div className="mb-6 grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<FileText size={20} />}
            label="Documentos"
            value={isLoadingDocs ? "—" : String(docSummary.total)}
            accent="#10b981"
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Indexados"
            value={isLoadingDocs ? "—" : String(docSummary.indexed)}
            accent="#34d399"
          />
          <StatCard
            icon={<MessagesSquare size={20} />}
            label="Sessões de Chat"
            value={String(sessions.length)}
            accent="#10b981"
          />
          <StatCard
            icon={<Users size={20} />}
            label="Organização"
            value={activeOrg.name}
            accent="#6ee7b7"
            isText
          />
        </div>

        {/* Quick actions — always 4 columns on lg+ */}
        <div className="mb-6 shrink-0">
          <h2 className="mb-3 text-base font-semibold text-[#f5f5f5]">
            Ações rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ActionCard
              icon={<Plus size={20} />}
              title="Novo Chat"
              description="Iniciar uma nova sessão de análise"
              onClick={handleNewChat}
            />
            <ActionCard
              icon={<Upload size={20} />}
              title="Upload de Documento"
              description="Enviar documentos para a base"
              href="/documents"
            />
            <ActionCard
              icon={<FileText size={20} />}
              title="Ver Documentos"
              description="Gerenciar documentos da organização"
              href="/documents"
            />
            <ActionCard
              icon={<Settings size={20} />}
              title="Configurações"
              description="Gerenciar membros e organização"
              href={`/organizations/${activeOrg.id}/settings`}
            />
          </div>
        </div>

        {/* Two-column: Recent sessions + Recent documents — fills remaining space */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent sessions */}
          <div className="flex flex-col rounded-lg border border-[#262626] bg-[#111111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f5f5f5]">
                <MessagesSquare size={16} />
                Sessões recentes
              </h3>
              <Link
                href="/chat"
                className="flex items-center gap-1 text-xs text-[#10b981] no-underline hover:underline"
              >
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-auto">
              {recentSessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#a3a3a3]">
                  Nenhuma sessão ainda. Inicie um novo chat!
                </p>
              ) : (
                recentSessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => router.push("/chat")}
                    className="flex w-full cursor-pointer items-center justify-between rounded-md border-none bg-transparent px-3 py-2.5 text-left text-inherit transition hover:bg-[#1a1a1a]"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-medium text-[#f5f5f5]">
                        {session.title || "Sessão sem título"}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[#a3a3a3]">
                        <Clock size={12} />
                        {formatRelativeDate(session.created_at)}
                      </span>
                    </div>
                    <ArrowRight size={14} className="shrink-0 text-[#a3a3a3]" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Recent documents */}
          <div className="flex flex-col rounded-lg border border-[#262626] bg-[#111111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#f5f5f5]">
                <FileText size={16} />
                Documentos recentes
              </h3>
              <Link
                href="/documents"
                className="flex items-center gap-1 text-xs text-[#10b981] no-underline hover:underline"
              >
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-auto">
              {isLoadingDocs ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#a3a3a3]">
                  Nenhum documento enviado ainda.
                </p>
              ) : (
                documents.map((doc) => {
                  const ext = doc.name.split(".").pop()?.toLowerCase() ?? "";
                  return (
                    <Link
                      key={doc.id}
                      href="/documents"
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-inherit no-underline transition hover:bg-[#1a1a1a]"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          ext === "pdf"
                            ? "bg-red-500/10 text-red-400"
                            : ext === "xlsx" || ext === "xls"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : ext === "docx" || ext === "doc"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-[#262626] text-[#a3a3a3]"
                        }`}
                      >
                        <FileText size={16} />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-medium text-[#f5f5f5]">
                          {doc.name}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-[#a3a3a3]">
                          <Clock size={11} />
                          {formatRelativeDate(doc.created_at)}
                        </span>
                      </div>
                      <ArrowRight
                        size={14}
                        className="shrink-0 text-[#a3a3a3]"
                      />
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─── Sub-components ─── */

function StatCard({
  icon,
  label,
  value,
  accent,
  isText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  isText?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#262626] bg-[#111111] px-5 py-4">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#a3a3a3]">
          {label}
        </p>
        <p
          className={`font-bold leading-tight text-[#f5f5f5] ${
            isText ? "truncate text-sm" : "text-2xl"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#10b981]/15 text-[#10b981]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#f5f5f5]">{title}</p>
        <p className="mt-0.5 text-xs text-[#a3a3a3]">{description}</p>
      </div>
      <ArrowRight
        size={14}
        className="shrink-0 text-[#525252] transition-transform group-hover:translate-x-0.5 group-hover:text-[#10b981]"
      />
    </>
  );

  const classes =
    "group flex w-full items-center gap-3 rounded-lg border border-dashed border-[#333333] bg-transparent px-4 py-3.5 text-left no-underline text-inherit transition-all hover:border-[#10b981]/50 hover:bg-[#10b981]/5 cursor-pointer";

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "indexed"
      ? "#10b981"
      : status === "processing"
        ? "#f59e0b"
        : "#ef4444";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function DashboardSkeleton() {
  return (
    <>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-full min-h-[200px] w-full rounded-lg" />
        <Skeleton className="h-full min-h-[200px] w-full rounded-lg" />
      </div>
    </>
  );
}

/* ─── Helpers ─── */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "indexed":
      return "Indexado";
    case "processing":
      return "Processando";
    case "error":
      return "Erro";
    default:
      return status;
  }
}
