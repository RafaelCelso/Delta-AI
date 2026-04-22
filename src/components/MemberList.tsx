"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserMinus, Crown, Shield, Users } from "lucide-react";

export interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    full_name: string;
    role: string;
    avatar_url: string | null;
  } | null;
}

interface MemberListProps {
  members: Member[];
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
  ownerId,
  organizationId,
  canManage,
  onMemberRemoved,
}: MemberListProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setError(data.error ?? "Erro ao remover membro.");
        return;
      }

      setConfirmUserId(null);
      onMemberRemoved();
    } catch {
      setError("Erro de conexão ao remover membro.");
    } finally {
      setRemovingUserId(null);
    }
  }

  if (members.length === 0) {
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
      <div className="grid grid-cols-[1fr_120px_120px_48px] items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nome
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
          const isLast = index === members.length - 1;
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
              className={`grid grid-cols-[1fr_120px_120px_48px] items-center gap-2 px-5 py-3 transition-colors hover:bg-secondary/30 ${
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
                  confirmUserId === member.user_id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleRemove(member.user_id)}
                        disabled={removingUserId === member.user_id}
                      >
                        {removingUserId === member.user_id ? "..." : "Sim"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setConfirmUserId(null)}
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
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
                          onClick={() => setConfirmUserId(member.user_id)}
                        >
                          <UserMinus className="h-4 w-4" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                ) : (
                  <span className="text-xs text-muted-foreground/30">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
