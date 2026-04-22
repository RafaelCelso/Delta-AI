"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrganization } from "@/contexts/OrganizationContext";

interface NavItem {
  label: string;
  href: string;
  /** Match function — returns true when this nav item should be highlighted. */
  isActive: (pathname: string) => boolean;
}

/**
 * Horizontal navigation bar for switching between the main application modules.
 *
 * Requisitos: 1.4, 2.5, 2.6
 */
export function AppNavigation() {
  const pathname = usePathname();
  const { activeOrg } = useOrganization();

  const navItems: NavItem[] = [
    {
      label: "Chat",
      href: "/chat",
      isActive: (p) => p === "/" || p.startsWith("/chat"),
    },
    {
      label: "Documentos",
      href: "/documents",
      isActive: (p) => p.startsWith("/documents"),
    },
  ];

  // Only show org settings link when there's an active org
  if (activeOrg) {
    navItems.push({
      label: "Configurações",
      href: `/organizations/${activeOrg.id}/settings`,
      isActive: (p) => p.startsWith("/organizations"),
    });
  }

  return (
    <nav style={styles.nav} aria-label="Navegação principal">
      <ul style={styles.list}>
        {navItems.map((item) => {
          const active = item.isActive(pathname);
          return (
            <li key={item.href} style={styles.listItem}>
              <Link
                href={item.href}
                style={{
                  ...styles.link,
                  color: active ? "#0369a1" : "#6b7280",
                  borderBottom: active
                    ? "2px solid #0369a1"
                    : "2px solid transparent",
                  fontWeight: active ? 600 : 400,
                }}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "0 1.5rem",
  },
  list: {
    display: "flex",
    gap: "0.25rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  listItem: {
    display: "flex",
  },
  link: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.625rem 0.75rem",
    fontSize: "0.8125rem",
    textDecoration: "none",
    transition: "color 0.15s, border-color 0.15s",
    whiteSpace: "nowrap" as const,
  },
};
