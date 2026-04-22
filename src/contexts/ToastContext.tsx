"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS);
    },
    [removeToast],
  );

  const value: ToastContextType = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

/* ---------- Toast Container (renders all active toasts) ---------- */

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "400px",
      }}
      aria-live="polite"
      aria-label="Notificações"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* ---------- Individual Toast ---------- */

const typeStyles: Record<
  ToastType,
  { bg: string; border: string; color: string }
> = {
  success: { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
  error: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
  info: { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" },
  warning: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e" },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const s = typeStyles[toast.type];

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
        padding: "0.75rem 1rem",
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "8px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        fontSize: "0.875rem",
        color: s.color,
        fontFamily: "system-ui, -apple-system, sans-serif",
        animation: "slideIn 0.2s ease-out",
      }}
    >
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "1rem",
          lineHeight: 1,
          color: s.color,
          opacity: 0.7,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
