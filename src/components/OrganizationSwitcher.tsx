"use client";

import { useState, useRef, useEffect } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";

export function OrganizationSwitcher() {
  const { activeOrg, setActiveOrg, organizations, isLoading } =
    useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <span style={styles.loadingText} aria-label="Carregando organizações">
        Carregando...
      </span>
    );
  }

  if (organizations.length === 0) {
    return (
      <span style={styles.noOrgText}>
        Nenhuma organização. Crie uma ou aceite um convite.
      </span>
    );
  }

  return (
    <div ref={dropdownRef} style={styles.container}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Selecionar organização"
      >
        <span style={styles.triggerText}>
          {activeOrg?.name ?? "Selecionar organização"}
        </span>
        <span style={styles.chevron} aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <ul role="listbox" style={styles.dropdown} aria-label="Organizações">
          {organizations.map((org) => (
            <li
              key={org.id}
              role="option"
              aria-selected={org.id === activeOrg?.id}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveOrg(org);
                  setIsOpen(false);
                }}
                style={{
                  ...styles.option,
                  backgroundColor:
                    org.id === activeOrg?.id ? "#eff6ff" : "transparent",
                  fontWeight: org.id === activeOrg?.id ? 600 : 400,
                }}
              >
                {org.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "relative",
    display: "inline-block",
  },
  trigger: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.375rem 0.75rem",
    fontSize: "0.875rem",
    color: "#374151",
    backgroundColor: "#f3f4f6",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    cursor: "pointer",
    minWidth: "160px",
  },
  triggerText: {
    flex: 1,
    textAlign: "left" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  chevron: {
    fontSize: "0.625rem",
    color: "#6b7280",
  },
  dropdown: {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    marginTop: "4px",
    minWidth: "200px",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    zIndex: 50,
    listStyle: "none",
    padding: "4px 0",
    margin: 0,
  },
  option: {
    display: "block",
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    color: "#374151",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  loadingText: {
    fontSize: "0.875rem",
    color: "#9ca3af",
  },
  noOrgText: {
    fontSize: "0.8rem",
    color: "#6b7280",
    fontStyle: "italic",
  },
};
