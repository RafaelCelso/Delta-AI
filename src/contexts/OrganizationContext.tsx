"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization | null) => void;
  organizations: Organization[];
  isLoading: boolean;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined,
);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setActiveOrg(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/organizations");
      if (!res.ok) {
        setOrganizations([]);
        setActiveOrg(null);
        return;
      }
      const data: Organization[] = await res.json();
      setOrganizations(data);

      // If there's no active org yet, or the active org is no longer in the list,
      // select the first one
      setActiveOrg((prev) => {
        if (prev && data.some((o) => o.id === prev.id)) {
          return prev;
        }
        return data.length > 0 ? data[0] : null;
      });
    } catch {
      setOrganizations([]);
      setActiveOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchOrganizations();
    }
  }, [authLoading, fetchOrganizations]);

  const value: OrganizationContextType = useMemo(
    () => ({
      activeOrg,
      setActiveOrg,
      organizations,
      isLoading,
      refreshOrganizations: fetchOrganizations,
    }),
    [activeOrg, organizations, isLoading, fetchOrganizations],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}
