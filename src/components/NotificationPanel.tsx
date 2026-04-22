"use client";

import React from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCard } from "@/components/NotificationCard";
import type {
  Notification,
  InviteNotification,
  GeneralNotification,
} from "@/hooks/useNotifications";

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  onAccept: (notification: InviteNotification) => Promise<void>;
  onReject: (notification: InviteNotification) => Promise<void>;
  onDismiss: (notification: GeneralNotification) => Promise<void>;
}

function NotificationPanel({
  notifications,
  isLoading,
  onAccept,
  onReject,
  onDismiss,
}: NotificationPanelProps) {
  return (
    <DropdownMenuContent align="end" className="w-[360px] p-0">
      <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">Notificações</span>
        <span className="text-xs text-muted-foreground">
          {notifications.length}
        </span>
      </DropdownMenuLabel>

      <DropdownMenuSeparator className="m-0" />

      <ScrollArea className="max-h-[400px]">
        <div className="flex flex-col gap-2 p-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Bell className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="text-sm">Nenhuma notificação pendente.</span>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onAccept={onAccept}
                onReject={onReject}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </DropdownMenuContent>
  );
}

export { NotificationPanel };
export type { NotificationPanelProps };
