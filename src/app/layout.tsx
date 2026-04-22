import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Delta-AI",
  description:
    "Assistente de documentação de validação para sistemas regulados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <OrganizationProvider>
            <SessionProvider>
              <ToastProvider>{children}</ToastProvider>
            </SessionProvider>
          </OrganizationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
