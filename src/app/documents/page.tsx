"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import {
  DocumentUploader,
  type DuplicateInfo,
} from "@/components/DocumentUploader";
import { DocumentList } from "@/components/DocumentList";
import { DocumentTimeline } from "@/components/DocumentTimeline";
import { DocumentActivityLog } from "@/components/DocumentActivityLog";
import { DuplicateDialog } from "@/components/DuplicateDialog";
import { useOrganization } from "@/contexts/OrganizationContext";

export default function DocumentsPage() {
  const { activeOrg, isLoading } = useOrganization();
  const [refreshKey, setRefreshKey] = useState(0);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(
    null,
  );
  const [timelineDoc, setTimelineDoc] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleUploadComplete = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleDuplicateDetected = useCallback((info: DuplicateInfo) => {
    setDuplicateInfo(info);
  }, []);

  const handleReplaced = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleViewTimeline = useCallback(
    (documentId: string, documentName: string) => {
      setTimelineDoc({ id: documentId, name: documentName });
    },
    [],
  );

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </AppShell>
    );
  }

  if (!activeOrg) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground text-sm">
            Selecione ou crie uma organização para gerenciar documentos.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Page Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-border px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Base de Conhecimento
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gerencie e valide a documentação regulatória de{" "}
              <strong className="text-foreground">{activeOrg.name}</strong>.
            </p>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left Column - Document List */}
          <div className="flex min-h-0 flex-1 flex-col overflow-auto border-r border-border">
            <div className="p-6">
              <DocumentList
                refreshKey={refreshKey}
                onViewTimeline={handleViewTimeline}
                selectedDocId={timelineDoc?.id ?? null}
              />
            </div>
          </div>

          {/* Right Column - Dropzone + Timeline */}
          <div className="flex w-[380px] shrink-0 flex-col overflow-auto">
            <div className="flex flex-col gap-4 p-4">
              {/* Dropzone */}
              <div id="dropzone-area">
                <DocumentUploader
                  onUploadComplete={handleUploadComplete}
                  onDuplicateDetected={handleDuplicateDetected}
                />
              </div>

              {/* Activity Log */}
              <DocumentActivityLog refreshKey={refreshKey} />

              {/* Timeline */}
              {timelineDoc && (
                <DocumentTimeline
                  documentId={timelineDoc.id}
                  documentName={timelineDoc.name}
                  onClose={() => setTimelineDoc(null)}
                />
              )}
            </div>
          </div>
        </div>

        <DuplicateDialog
          duplicateInfo={duplicateInfo}
          onClose={() => setDuplicateInfo(null)}
          onReplaced={handleReplaced}
        />
      </div>
    </AppShell>
  );
}
