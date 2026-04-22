"use client";

import React, { useState } from "react";
import { Building2, Check, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  Notification,
  InviteNotification,
  GeneralNotification,
} from "@/hooks/useNotifications";

interface NotificationCardProps {
  notification: Notification;
  onAccept?: (notification: InviteNotification) => Promise<void>;
  onReject?: (notification: InviteNotification) => Promise<void>;
  onDismiss?: (notification: GeneralNotification) => Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function NotificationCard({
  notification,
  onAccept,
  onReject,
  onDismiss,
}: NotificationCardProps) {
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [dismissLoading, setDismissLoading] = useState(false);

  const isActionInProgress = acceptLoading || rejectLoading || dismissLoading;

  if (notification.kind === "invite") {
    const handleAccept = async () => {
      setAcceptLoading(true);
      try {
        await onAccept?.(notification);
      } finally {
        setAcceptLoading(false);
      }
    };

    const handleReject = async () => {
      setRejectLoading(true);
      try {
        await onReject?.(notification);
      } finally {
        setRejectLoading(false);
      }
    };

    return (
      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden">
            <span className="text-xs font-medium text-muted-foreground">
              Convite para organização
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {notification.organization_name}
            </span>
            {notification.invited_by_name && (
              <span className="text-xs text-muted-foreground">
                Enviado por{" "}
                <span className="font-medium text-foreground">
                  {notification.invited_by_name}
                </span>
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(notification.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 flex-1 gap-1 text-xs"
            disabled={isActionInProgress}
            onClick={handleAccept}
          >
            <Check className="h-3 w-3" />
            {acceptLoading ? "Aceitando..." : "Aceitar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 gap-1 text-xs"
            disabled={isActionInProgress}
            onClick={handleReject}
          >
            <X className="h-3 w-3" />
            {rejectLoading ? "Recusando..." : "Recusar"}
          </Button>
        </div>
      </div>
    );
  }

  // General notification (invite_accepted, invite_rejected, etc.)
  const handleDismiss = async () => {
    setDismissLoading(true);
    try {
      await onDismiss?.(notification);
    } finally {
      setDismissLoading(false);
    }
  };

  const isAccepted = notification.type === "invite_accepted";

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            isAccepted
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          <Info className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5 overflow-hidden">
          <span className="text-xs font-medium text-muted-foreground">
            {notification.title}
          </span>
          <span className="text-sm text-foreground">
            {notification.message}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(notification.created_at)}
          </span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground"
        disabled={dismissLoading}
        onClick={handleDismiss}
      >
        {dismissLoading ? "Dispensando..." : "Dispensar"}
      </Button>
    </div>
  );
}

export { NotificationCard };
export type { NotificationCardProps };
