"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { OrganizationSettings } from "@/components/OrganizationSettings";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeOrg } = useOrganization();
  const router = useRouter();

  // When the user switches organization, redirect to the new org's settings page
  useEffect(() => {
    if (activeOrg && activeOrg.id !== id) {
      router.replace(`/organizations/${activeOrg.id}/settings`);
    }
  }, [activeOrg, id, router]);

  return (
    <AppShell>
      <OrganizationSettings organizationId={activeOrg?.id ?? id} />
    </AppShell>
  );
}
