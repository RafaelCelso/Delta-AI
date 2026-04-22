"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { useOrganization } from "@/contexts/OrganizationContext";
import {
  validateFileFormat,
  getSupportedFormatsMessage,
} from "@/lib/documents/validation";
import { CloudUpload, Upload } from "lucide-react";

interface DocumentUploaderProps {
  onUploadComplete?: () => void;
  onDuplicateDetected?: (existingDocument: DuplicateInfo) => void;
}

export interface DuplicateInfo {
  id: string;
  name: string;
  created_at: string;
  uploaded_by: string;
  file: File;
}

export function DocumentUploader({
  onUploadComplete,
  onDuplicateDetected,
}: DocumentUploaderProps) {
  const { activeOrg } = useOrganization();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(
    null,
  );

  const handleUpload = useCallback(
    async (file: File, replaceExisting = false) => {
      setError(null);
      setSuccess(null);

      const validation = validateFileFormat(file.name);
      if (!validation.valid) {
        setError(validation.error!);
        return;
      }

      if (!activeOrg?.id) {
        setError("Selecione uma organização antes de enviar documentos.");
        return;
      }

      setIsUploading(true);
      setUploadingFileName(file.name);
      setProgress(10);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("organization_id", activeOrg.id);

        setProgress(30);

        const url = replaceExisting
          ? "/api/documents/upload?replaceExisting=true"
          : "/api/documents/upload";

        const res = await fetch(url, {
          method: "POST",
          body: formData,
        });

        setProgress(80);

        if (res.status === 409) {
          const data = await res.json();
          setIsUploading(false);
          setProgress(0);
          setUploadingFileName(null);
          onDuplicateDetected?.({
            ...data.existingDocument,
            file,
          });
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Erro ao enviar documento.");
          return;
        }

        setProgress(100);
        setSuccess(`"${file.name}" enviado com sucesso.`);
        onUploadComplete?.();
      } catch {
        setError("Erro de conexão ao enviar documento.");
      } finally {
        setIsUploading(false);
        setUploadingFileName(null);
        setTimeout(() => setProgress(0), 1000);
      }
    },
    [activeOrg?.id, onUploadComplete, onDuplicateDetected],
  );

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  }

  function handleFileSelect() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Card Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <CloudUpload className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Upload de documento
        </h3>
      </div>

      {/* Dropzone Area */}
      <div className="p-4">
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-8 transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={isUploading ? undefined : handleFileSelect}
          role="button"
          tabIndex={0}
          aria-label="Área de upload de documentos"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isUploading) handleFileSelect();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".doc,.docx,.pdf,.xls,.xlsx"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>

          {isUploading ? (
            <p className="text-sm text-muted-foreground">
              Enviando documento...
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Clique ou arraste para enviar
              </p>
              <p className="text-xs text-muted-foreground/70 uppercase">
                {getSupportedFormatsMessage()}
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && progress > 0 && (
          <div className="mt-3 space-y-2">
            {uploadingFileName && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground truncate">
                  {uploadingFileName}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {progress}%
                </span>
              </div>
            )}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            role="status"
            className="mt-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
          >
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
