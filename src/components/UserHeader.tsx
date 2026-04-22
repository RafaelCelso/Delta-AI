"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";

export function UserHeader() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Delta-AI
        </span>
        <span style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
          Carregando...
        </span>
      </header>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.email ?? "Usuário";

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.75rem 1.5rem",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "#111827",
          }}
        >
          Delta-AI
        </span>
        <OrganizationSwitcher />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span
          style={{
            fontSize: "0.875rem",
            color: "#374151",
          }}
        >
          {displayName}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: "0.375rem 0.75rem",
            fontSize: "0.875rem",
            color: "#374151",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
