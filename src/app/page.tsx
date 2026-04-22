"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Home page — redirects authenticated users to the Dashboard.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <main
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "#0a0a0a",
      }}
    >
      <p style={{ color: "#a3a3a3", fontSize: "0.875rem" }}>
        Redirecionando...
      </p>
    </main>
  );
}
