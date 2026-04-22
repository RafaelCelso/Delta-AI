"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

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
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-[400px]"
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

const toastConfig: Record<
  ToastType,
  {
    icon: typeof CheckCircle2;
    containerClass: string;
    iconClass: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    containerClass: "border-emerald-800 bg-emerald-950",
    iconClass: "text-emerald-400",
  },
  error: {
    icon: XCircle,
    containerClass: "border-red-800 bg-red-950",
    iconClass: "text-red-400",
  },
  info: {
    icon: Info,
    containerClass: "border-blue-800 bg-blue-950",
    iconClass: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "border-amber-800 bg-amber-950",
    iconClass: "text-amber-400",
  },
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-lg border bg-card p-3 shadow-lg
        transition-all duration-200 ease-out
        ${config.containerClass}
        ${visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}
      `}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconClass}`} />
      <span className="flex-1 text-sm text-foreground">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fechar notificação"
        className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
