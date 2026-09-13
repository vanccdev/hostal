"use client";

import Image from "next/image";
import { FileText, Upload, X } from "lucide-react";
import { useEffect } from "react";
import { useFileUpload, type FileUploadItem } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";

type DocumentUploadProps = {
  disabled?: boolean;
  inputId?: string;
  inputName?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: FileUploadItem[]) => void;
  preserveInputValue?: boolean;
  required?: boolean;
  resetKey?: number;
};

const ACCEPTED_DOCUMENTS = "application/pdf,image/jpeg,image/png,image/webp";

export const DocumentUpload = ({
  disabled = false,
  inputId,
  inputName,
  maxFiles = 1,
  maxSizeMB = 10,
  onFilesChange,
  preserveInputValue = false,
  required = false,
  resetKey = 0,
}: DocumentUploadProps) => {
  const upload = useFileUpload({
    accept: ACCEPTED_DOCUMENTS,
    maxFiles,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: maxFiles > 1,
    onFilesChange,
    resetInputValue: !preserveInputValue,
  });

  useEffect(() => {
    if (resetKey > 0) upload.clearFiles();
    // resetKey intentionally controls this one-time reset after a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#d8d4c8] p-4 transition-colors data-[dragging=true]:bg-accent/50 dark:border-[#314237]"
        data-dragging={upload.isDragging || undefined}
        onDragEnter={upload.handleDragEnter}
        onDragLeave={upload.handleDragLeave}
        onDragOver={upload.handleDragOver}
        onDrop={upload.handleDrop}
      >
        <input
          {...upload.getInputProps({
            accept: ACCEPTED_DOCUMENTS,
            id: inputId,
            name: inputName,
            required,
            disabled,
          })}
          aria-label="Subir comprobante"
          className="sr-only"
        />
        {upload.files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium">Archivos seleccionados ({upload.files.length})</h3>
              <Button
                type="button"
                disabled={disabled || upload.files.length >= maxFiles}
                onClick={upload.openFileDialog}
                size="sm"
                variant="outline"
              >
                <Upload className="mr-2 size-3.5" aria-hidden="true" /> Agregar más
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {upload.files.map((file) => (
                <div className="relative overflow-hidden rounded-md border bg-accent" key={file.id}>
                  {file.file.type === "application/pdf" ? (
                    <div className="flex aspect-square flex-col items-center justify-center gap-2 p-3 text-center">
                      <FileText className="size-10 text-destructive" aria-hidden="true" />
                      <span className="w-full truncate text-xs font-medium">{file.file.name}</span>
                    </div>
                  ) : (
                    <div className="relative aspect-square">
                      <Image
                        src={file.preview}
                        alt={file.file.name}
                        fill
                        sizes="(min-width: 768px) 33vw, 50vw"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <Button
                    type="button"
                    aria-label={`Quitar ${file.file.name}`}
                    className="absolute -right-1 -top-1 size-7 rounded-full border-2 border-background"
                    onClick={() => upload.removeFile(file.id)}
                    size="icon"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div className="mb-2 flex size-11 items-center justify-center rounded-full border bg-background" aria-hidden="true">
              <FileText className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium">Arrastra tu comprobante aquí</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG o WEBP (máximo {maxSizeMB} MB por archivo)</p>
            <Button type="button" disabled={disabled} className="mt-4" onClick={upload.openFileDialog} variant="outline">
              <Upload className="mr-2 size-4" aria-hidden="true" /> Seleccionar archivo
            </Button>
          </div>
        )}
      </div>
      {upload.errors.length > 0 ? <p className="text-xs text-destructive" role="alert">{upload.errors[0]}</p> : null}
    </div>
  );
};
