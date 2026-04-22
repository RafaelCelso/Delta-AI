"use client";

import { use } from "react";
import { AppShell } from "@/components/AppShell";
import { OrganizationSettings } from "@/components/OrganizationSettings";

export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <AppShell>
      <OrganizationSettings organizationId={id} />
    </AppShell>
  );
}
