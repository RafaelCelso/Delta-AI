"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/contexts/ToastContext";
import {
  MemberList,
  type Member,
  type PendingInvitation,
} from "@/components/MemberList";
import { InviteDialog } from "@/components/InviteDialog";
import { LeaveOrganizationDialog } from "@/components/LeaveOrganizationDialog";
import { DeleteOrganizationDialog } from "@/components/DeleteOrganizationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Users,
  UserPlus,
  Building2,
  Calendar,
  Shield,
  Crown,
  AlertTriangle,
} from "lucide-react";

interface OrganizationDetails {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  members: Member[];
  pending_invitations: PendingInvitation[];
}

interface OrganizationSettingsProps {
  organizationId: string;
}

export function OrganizationSettings({
  organizationId,
}: OrganizationSettingsProps) {
  const { user } = useAuth();
  const { refreshOrganizations, organizations } = useOrganization();
  const { addToast } = useToast();
  const router = useRouter();
  const [org, setOrg] = useState<OrganizationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchOrganization = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/organizations/${organizationId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Erro ao carregar organização.");
          return;
        }
        const data: OrganizationDetails = await res.json();
        setOrg(data);
      } catch {
        setError("Erro de conexão ao carregar organização.");
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [organizationId],
  );

  const refreshOrganization = useCallback(() => {
    return fetchOrganization(false);
  }, [fetchOrganization]);

  async function handleLeaveSuccess() {
    const orgName = org?.name ?? "";
    await refreshOrganizations();
    addToast("info", `Você saiu da organização ${orgName}.`);
    const remaining = organizations.filter((o) => o.id !== organizationId);
    if (remaining.length > 0) {
      router.push(`/organizations/${remaining[0].id}/settings`);
    } else {
      router.push("/onboarding");
    }
  }

  async function handleDeleteSuccess() {
    const orgName = org?.name ?? "";
    await refreshOrganizations();
    addToast("info", `Organização ${orgName} excluída com sucesso.`);
    const remaining = organizations.filter((o) => o.id !== organizationId);
    if (remaining.length > 0) {
      router.push(`/organizations/${remaining[0].id}/settings`);
    } else {
      router.push("/onboarding");
    }
  }

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Carregando configurações...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
        >
          {error}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Organização não encontrada.
        </p>
      </div>
    );
  }

  const isOwner = user?.id === org.owner_id;
  const currentMember = org.members.find((m) => m.user_id === user?.id);
  const isSuperAdm = currentMember?.profiles?.role === "super_adm";
  const canManage = isOwner || isSuperAdm;

  const createdDate = new Date(org.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const ownerMember = org.members.find((m) => m.user_id === org.owner_id);
  const ownerName = ownerMember?.profiles?.full_name ?? "Desconhecido";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page Header */}
      <div className="flex shrink-0 items-start justify-between border-b border-border px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Configurações
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Gerencie a organização{" "}
              <strong className="text-foreground">{org.name}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left Column - Members */}
        <div className="flex min-h-0 flex-1 flex-col overflow-auto border-r border-border">
          <div className="p-6">
            {/* Members Section */}
            <div className="rounded-lg border border-border bg-card">
              {/* Members Header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Membros
                  </h2>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {org.members.length}
                  </Badge>
                  {(org.pending_invitations?.length ?? 0) > 0 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10"
                    >
                      {org.pending_invitations.length} pendente
                      {org.pending_invitations.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {canManage && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Convidar
                  </Button>
                )}
              </div>

              {/* Members Table */}
              <MemberList
                members={org.members}
                pendingInvitations={org.pending_invitations ?? []}
                ownerId={org.owner_id}
                organizationId={org.id}
                canManage={canManage}
                onMemberRemoved={refreshOrganization}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Org Info */}
        <div className="flex w-[360px] shrink-0 flex-col overflow-auto">
          <div className="flex flex-col gap-4 p-4">
            {/* Organization Info Card */}
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Informações
                </h3>
              </div>
              <div className="flex flex-col gap-4 p-4">
                {/* Org Name */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Nome
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {org.name}
                  </p>
                </div>

                {/* Owner */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Proprietário
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                      {ownerName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-foreground">{ownerName}</span>
                  </div>
                </div>

                {/* Created Date */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Criada em
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {createdDate}
                    </span>
                  </div>
                </div>

                {/* Your Role */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Seu papel
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    {isOwner ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-primary/30 bg-primary/10 text-primary hover:bg-primary/10"
                      >
                        <Crown className="h-3 w-3" />
                        Proprietário
                      </Badge>
                    ) : isSuperAdm ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10"
                      >
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Membro</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Card */}
            <div className="rounded-lg border border-border bg-card">
              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="flex flex-col items-center gap-1 px-4 py-5">
                  <span className="text-2xl font-bold text-foreground">
                    {org.members.length}
                  </span>
                  <span className="text-xs text-muted-foreground">Membros</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-4 py-5">
                  <span className="text-2xl font-bold text-foreground">
                    {canManage ? "Admin" : "Membro"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Nível de Acesso
                  </span>
                </div>
              </div>
            </div>

            {/* Zona de Perigo Card */}
            <div className="rounded-lg border border-destructive/30 bg-card">
              <div className="flex items-center gap-2 border-b border-destructive/30 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">
                  Zona de Perigo
                </h3>
              </div>
              <div className="flex flex-col gap-3 p-4">
                {!isOwner && (
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setIsLeaveOpen(true)}
                  >
                    Sair da Organização
                  </Button>
                )}
                {isOwner && (
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Excluir Organização
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <InviteDialog
        organizationId={org.id}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInviteSent={refreshOrganization}
      />

      <LeaveOrganizationDialog
        organizationId={org.id}
        organizationName={org.name}
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        onLeaveSuccess={handleLeaveSuccess}
      />

      <DeleteOrganizationDialog
        organizationId={org.id}
        organizationName={org.name}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
}
