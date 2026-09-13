"use client";

import { AlertCircle, ImageIcon, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { useFileUpload, type FileUploadItem } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";

type ImageUploadProps = {
  inputId?: string;
  inputName?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  onFilesChange: (files: FileUploadItem[]) => void;
  preserveInputValue?: boolean;
  required?: boolean;
  resetKey?: number;
};

export const ImageUpload = ({
  inputId,
  inputName,
  maxFiles = 6,
  maxSizeMB = 5,
  onFilesChange,
  preserveInputValue = false,
  required = false,
  resetKey = 0,
}: ImageUploadProps) => {
  const upload = useFileUpload({
    accept: "image/jpeg,image/png,image/webp,image/gif",
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
            accept: "image/jpeg,image/png,image/webp,image/gif",
            id: inputId,
            name: inputName,
            required,
          })}
          aria-describedby="image-upload-help"
          aria-label="Subir imágenes"
          className="sr-only"
        />
        {upload.files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium">
                Imágenes seleccionadas ({upload.files.length})
              </h3>
              <Button
                type="button"
                disabled={upload.files.length >= maxFiles}
                onClick={upload.openFileDialog}
                size="sm"
                variant="outline"
              >
                <Upload className="mr-2 size-3.5" aria-hidden="true" /> Agregar
                más
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {upload.files.map((file) => (
                <div
                  className="relative aspect-square rounded-md bg-accent"
                  key={file.id}
                >
                  <Image
                    src={file.preview}
                    alt={file.file.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 50vw"
                    unoptimized
                    className="rounded-[inherit] object-cover"
                  />
                  <Button
                    type="button"
                    aria-label={`Quitar ${file.file.name}`}
                    className="absolute -right-2 -top-2 size-7 rounded-full border-2 border-background"
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
            <div
              className="mb-2 flex size-11 items-center justify-center rounded-full border bg-background"
              aria-hidden="true"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium">Arrastra imágenes aquí</p>
            <p className="text-xs text-muted-foreground">
              Solo imágenes JPG, PNG, WEBP (máximo {maxSizeMB} MB por imagen)
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={upload.openFileDialog}
              variant="outline"
            >
              <Upload className="mr-2 size-4" aria-hidden="true" /> Seleccionar
              imágenes
            </Button>
          </div>
        )}
      </div>
      <p id="image-upload-help" className="sr-only">
        Solo se permiten imágenes JPG, PNG, WEBP de hasta {maxSizeMB} MB por
        archivo.
      </p>
      {upload.errors.length > 0 ? (
        <div
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
          {upload.errors[0]}
        </div>
      ) : null}
    </div>
  );
};
