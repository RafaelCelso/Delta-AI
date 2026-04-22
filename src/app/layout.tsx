import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/components/theme-provider";
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
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OrganizationProvider>
              <SessionProvider>
                <ToastProvider>{children}</ToastProvider>
              </SessionProvider>
            </OrganizationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
