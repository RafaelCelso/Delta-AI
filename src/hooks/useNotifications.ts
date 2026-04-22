"use client";

import { useState, useCallback, useEffect } from "react";

export interface InviteNotification {
  kind: "invite";
  id: string;
  organization_id: string;
  organization_name: string;
  invited_by_name: string;
  token: string;
  created_at: string;
  expires_at: string;
}

export interface GeneralNotification {
  kind: "general";
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Notification = InviteNotification | GeneralNotification;

export interface UseNotificationsReturn {
  notifications: Notification[];
  count: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  acceptInvite: (notification: InviteNotification) => Promise<void>;
  rejectInvite: (notification: InviteNotification) => Promise<void>;
  dismissNotification: (notification: GeneralNotification) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const count = notifications.length;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invitesRes, notificationsRes] = await Promise.all([
        fetch("/api/invitations/pending"),
        fetch("/api/notifications"),
      ]);

      const allNotifications: Notification[] = [];

      if (invitesRes.ok) {
        const invites = await invitesRes.json();
        for (const inv of invites) {
          allNotifications.push({
            kind: "invite",
            id: inv.id,
            organization_id: inv.organization_id,
            organization_name: inv.organization_name,
            invited_by_name: inv.invited_by_name ?? "",
            token: inv.token,
            created_at: inv.created_at,
            expires_at: inv.expires_at,
          });
        }
      }

      if (notificationsRes.ok) {
        const generals = await notificationsRes.json();
        for (const n of generals) {
          allNotifications.push({
            kind: "general",
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            metadata: n.metadata ?? {},
            created_at: n.created_at,
          });
        }
      }

      // Sort by created_at descending
      allNotifications.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setNotifications(allNotifications);
    } catch {
      console.error("Failed to fetch notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(async (notification: InviteNotification) => {
    const response = await fetch(
      `/api/organizations/${notification.organization_id}/members`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: notification.token }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao aceitar convite.");
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  }, []);

  const rejectInvite = useCallback(async (notification: InviteNotification) => {
    const response = await fetch(`/api/invitations/${notification.id}/reject`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Erro ao recusar convite.");
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  }, []);

  const dismissNotification = useCallback(
    async (notification: GeneralNotification) => {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });

      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    },
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    notifications,
    count,
    isLoading,
    refresh,
    acceptInvite,
    rejectInvite,
    dismissNotification,
  };
}
