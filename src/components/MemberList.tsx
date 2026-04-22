"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/contexts/ToastContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  UserMinus,
  Crown,
  Shield,
  Users,
  Mail,
  RefreshCw,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";

export interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  email: string | null;
  profiles: {
    full_name: string;
    role: string;
    avatar_url: string | null;
  } | null;
}

export interface PendingInvitation {
  id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
}

interface MemberListProps {
  members: Member[];
  pendingInvitations?: PendingInvitation[];
  ownerId: string;
  organizationId: string;
  canManage: boolean;
  onMemberRemoved: () => void;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  super_adm: {
    label: "Super Admin",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10",
    icon: <Shield className="h-3 w-3" />,
  },
  padrao: {
    label: "Padrão",
    className:
      "border-neutral-500/30 bg-neutral-500/10 text-neutral-400 hover:bg-neutral-500/10",
    icon: null,
  },
};

export function MemberList({
  members,
  pendingInvitations = [],
  ownerId,
  organizationId,
  canManage,
  onMemberRemoved,
}: MemberListProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmMember, setConfirmMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const { addToast } = useToast();

  async function handleRemove(userId: string) {
    setError(null);
    setRemovingUserId(userId);

    try {
      const res = await fetch(
        `/api/organizations/${organizationId}/members/${userId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error ?? "Erro ao remover membro.";
        setError(msg);
        addToast("error", msg);
        return;
      }

      const name = confirmMember?.profiles?.full_name ?? "Membro";
      addToast("info", `${name} foi removido da organização.`);
      setConfirmMember(null);
      onMemberRemoved();
    } catch {
      const msg = "Erro de conexão ao remover membro.";
      setError(msg);
      addToast("error", msg);
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleResendInvite(invitationId: string, email: string) {
    setError(null);
    setActionInviteId(invitationId);

    try {
      const res = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error ?? "Erro ao reenviar convite.";
        setError(msg);
        addToast("error", msg);
        return;
      }

      addToast("success", `Convite reenviado para ${email}.`);
      onMemberRemoved();
    } catch {
      const msg = "Erro de conexão ao reenviar convite.";
      setError(msg);
      addToast("error", msg);
    } finally {
      setActionInviteId(null);
    }
  }

  async function handleRevokeInvite(invitationId: string, email: string) {
    setError(null);
    setActionInviteId(invitationId);

    try {
      const res = await fetch(`/api/invitations/${invitationId}/revoke`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error ?? "Erro ao revogar convite.";
        setError(msg);
        addToast("error", msg);
        return;
      }

      addToast("info", `Convite para ${email} revogado.`);
      onMemberRemoved();
    } catch {
      const msg = "Erro de conexão ao revogar convite.";
      setError(msg);
      addToast("error", msg);
    } finally {
      setActionInviteId(null);
    }
  }

  if (members.length === 0 && pendingInvitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12">
        <Users className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground italic">
          Nenhum membro encontrado.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mx-5 mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
        >
          {error}
        </div>
      )}

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_1fr_120px_120px_48px] items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nome
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          E-mail
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Papel
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Desde
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          Ação
        </span>
      </div>

      {/* Table Body */}
      <div>
        {members.map((member, index) => {
          const isOwner = member.user_id === ownerId;
          const name = member.profiles?.full_name ?? "Usuário";
          const role = member.profiles?.role ?? "padrao";
          const joinDate = new Date(member.joined_at).toLocaleDateString(
            "pt-BR",
            { day: "2-digit", month: "short", year: "numeric" },
          );
          const isLast =
            index === members.length - 1 && pendingInvitations.length === 0;
          const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.padrao;
          const initials = name
            .split(" ")
            .map((n) => n.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={member.id}
              className={`grid grid-cols-[1fr_1fr_120px_120px_48px] items-center gap-2 px-5 py-3 transition-colors hover:bg-secondary/30 ${
                !isLast ? "border-b border-border/50" : ""
              }`}
            >
              {/* Name + Avatar */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {name}
                    </p>
                    {isOwner && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-primary/30 bg-primary/10 text-primary text-[10px] hover:bg-primary/10"
                      >
                        <Crown className="h-2.5 w-2.5" />
                        Dono
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <span className="truncate text-sm text-muted-foreground">
                {member.email ?? "—"}
              </span>

              {/* Role */}
              <Badge
                variant="outline"
                className={`w-fit gap-1 text-[10px] font-bold ${roleConfig.className}`}
              >
                {roleConfig.icon}
                {roleConfig.label}
              </Badge>

              {/* Join Date */}
              <span className="text-sm text-muted-foreground">{joinDate}</span>

              {/* Actions */}
              <div className="flex justify-center">
                {canManage && !isOwner ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                        onClick={() => setConfirmMember(member)}
                      >
                        <UserMinus className="h-4 w-4" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-xs text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Pending Invitations */}
        {pendingInvitations.map((invitation, index) => {
          const inviteDate = new Date(invitation.created_at).toLocaleDateString(
            "pt-BR",
            { day: "2-digit", month: "short", year: "numeric" },
          );
          const isLast = index === pendingInvitations.length - 1;

          return (
            <div
              key={`invite-${invitation.id}`}
              className={`grid grid-cols-[1fr_1fr_120px_120px_48px] items-center gap-2 px-5 py-3 opacity-60 transition-colors hover:bg-secondary/30 ${
                !isLast ? "border-b border-border/50" : ""
              }`}
            >
              {/* Email + Mail Icon */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {invitation.invited_email}
                  </p>
                </div>
              </div>

              {/* Email column (same as name for pending) */}
              <span className="truncate text-sm text-muted-foreground">
                {invitation.invited_email}
              </span>

              {/* Role - Pendente Badge */}
              <Badge
                variant="outline"
                className="w-fit gap-1 text-[10px] font-bold border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10"
              >
                Pendente
              </Badge>

              {/* Invite Date */}
              <span className="text-sm text-muted-foreground">
                {inviteDate}
              </span>

              {/* Actions for pending invites */}
              <div className="flex justify-center">
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        disabled={actionInviteId === invitation.id}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() =>
                          handleResendInvite(
                            invitation.id,
                            invitation.invited_email,
                          )
                        }
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reenviar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer text-red-400 focus:text-red-400"
                        onClick={() =>
                          handleRevokeInvite(
                            invitation.id,
                            invitation.invited_email,
                          )
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Revogar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-xs text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remove Member Confirmation Modal */}
      {confirmMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setConfirmMember(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar remoção de membro"
        >
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Remover Membro
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmMember(null)}
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mb-5 text-sm text-muted-foreground">
              Tem certeza que deseja remover{" "}
              <strong className="text-foreground">
                {confirmMember.profiles?.full_name ?? "este membro"}
              </strong>{" "}
              da organização? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmMember(null)}
                disabled={removingUserId === confirmMember.user_id}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRemove(confirmMember.user_id)}
                disabled={removingUserId === confirmMember.user_id}
                className="gap-1.5 text-white"
              >
                <UserMinus className="h-3.5 w-3.5" />
                {removingUserId === confirmMember.user_id
                  ? "Removendo..."
                  : "Remover"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
