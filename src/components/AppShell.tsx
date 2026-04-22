"use client";

import { type ReactNode, useCallback } from "react";
import { AppSidebar } from "@/components/ui/sidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/contexts/ToastContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationIcon } from "@/components/NotificationIcon";
import { NotificationPanel } from "@/components/NotificationPanel";
import type {
  InviteNotification,
  GeneralNotification,
} from "@/hooks/useNotifications";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    notifications,
    count,
    isLoading,
    acceptInvite,
    rejectInvite,
    dismissNotification,
  } = useNotifications();
  const { addToast } = useToast();
  const { refreshOrganizations } = useOrganization();

  const handleAccept = useCallback(
    async (notification: InviteNotification) => {
      try {
        await acceptInvite(notification);
        addToast(
          "success",
          `Você agora é membro da organização ${notification.organization_name}.`,
        );
        await refreshOrganizations();
      } catch {
        addToast("error", "Erro ao aceitar convite. Tente novamente.");
      }
    },
    [acceptInvite, addToast, refreshOrganizations],
  );

  const handleReject = useCallback(
    async (notification: InviteNotification) => {
      try {
        await rejectInvite(notification);
        addToast("info", "Convite recusado.");
      } catch {
        addToast("error", "Erro ao recusar convite. Tente novamente.");
      }
    },
    [rejectInvite, addToast],
  );

  const handleDismiss = useCallback(
    async (notification: GeneralNotification) => {
      await dismissNotification(notification);
    },
    [dismissNotification],
  );

  return (
    <div className="flex h-screen w-screen flex-row">
      <AppSidebar />
      <div className="ml-[3.5rem] flex h-screen grow flex-col">
        <header className="flex shrink-0 items-center justify-end border-b border-border px-4 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NotificationIcon count={count} />
            </DropdownMenuTrigger>
            <NotificationPanel
              notifications={notifications}
              isLoading={isLoading}
              onAccept={handleAccept}
              onReject={handleReject}
              onDismiss={handleDismiss}
            />
          </DropdownMenu>
        </header>
        <main className="flex grow flex-col overflow-auto">{children}</main>
      </div>
    </div>
  );
}
