"use client";

import { type ChangeEvent, type DragEvent, type InputHTMLAttributes, useCallback, useRef, useState } from "react";

export type FileUploadItem = {
  file: File;
  id: string;
  preview: string;
};

type FileUploadOptions = {
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  multiple?: boolean;
  onFilesChange?: (files: FileUploadItem[]) => void;
  resetInputValue?: boolean;
};

export const useFileUpload = ({
  accept = "*",
  maxFiles = Number.POSITIVE_INFINITY,
  maxSize = Number.POSITIVE_INFINITY,
  multiple = false,
  onFilesChange,
  resetInputValue = true,
}: FileUploadOptions = {}) => {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateFiles = useCallback(
    (nextFiles: FileUploadItem[]) => {
      setFiles(nextFiles);
      onFilesChange?.(nextFiles);
    },
    [onFilesChange],
  );

  const isAccepted = useCallback(
    (file: File) => {
      if (accept === "*") return true;
      const extension = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
      return accept.split(",").some((candidate) => {
        const value = candidate.trim().toLowerCase();
        return value.startsWith(".") ? extension === value : value.endsWith("/*") ? file.type.startsWith(value.slice(0, -1)) : file.type === value;
      });
    },
    [accept],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const nextErrors: string[] = [];
      const validFiles: FileUploadItem[] = [];
      const incomingFiles = Array.from(incoming);

      if (multiple && files.length + incomingFiles.length > maxFiles) {
        nextErrors.push(`Solo puedes subir un máximo de ${maxFiles} imágenes.`);
      }

      const filesToValidate = multiple ? incomingFiles.slice(0, Math.max(0, maxFiles - files.length)) : incomingFiles.slice(0, 1);

      for (const file of filesToValidate) {
        if (file.size > maxSize) {
          nextErrors.push(`"${file.name}" supera el límite de ${Math.round(maxSize / 1024 / 1024)} MB.`);
        } else if (!isAccepted(file)) {
          nextErrors.push(`"${file.name}" no tiene un formato permitido.`);
        } else if (!files.some((existing) => existing.file.name === file.name && existing.file.size === file.size)) {
          validFiles.push({ file, id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`, preview: URL.createObjectURL(file) });
        }
      }

      if (!multiple) {
        for (const file of files) URL.revokeObjectURL(file.preview);
      }
      const nextFiles = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
      if (!resetInputValue && validFiles.length > 0 && inputRef.current) {
        const dataTransfer = new DataTransfer();
        for (const file of nextFiles) dataTransfer.items.add(file.file);
        inputRef.current.files = dataTransfer.files;
      }
      setErrors(nextErrors);
      updateFiles(nextFiles);
      if (resetInputValue && inputRef.current) inputRef.current.value = "";
    },
    [files, isAccepted, maxFiles, maxSize, multiple, resetInputValue, updateFiles],
  );

  const removeFile = useCallback((id: string) => {
    const removed = files.find((file) => file.id === id);
    if (removed) URL.revokeObjectURL(removed.preview);
    setErrors([]);
    updateFiles(files.filter((file) => file.id !== id));
  }, [files, updateFiles]);

  const clearFiles = useCallback(() => {
    for (const file of files) URL.revokeObjectURL(file.preview);
    setErrors([]);
    updateFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [files, updateFiles]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
  }, [addFiles]);

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (inputRef.current?.disabled) return;
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }, [addFiles]);

  const getInputProps = useCallback((props: InputHTMLAttributes<HTMLInputElement> = {}) => ({
    ...props,
    accept: props.accept ?? accept,
    multiple: props.multiple ?? multiple,
    onChange: handleFileChange,
    ref: inputRef,
    type: "file" as const,
  }), [accept, handleFileChange, multiple]);

  return {
    files,
    errors,
    isDragging,
    addFiles,
    clearFiles,
    removeFile,
    getInputProps,
    openFileDialog: () => inputRef.current?.click(),
    handleDragEnter: (event: DragEvent<HTMLElement>) => { event.preventDefault(); setIsDragging(true); },
    handleDragLeave: (event: DragEvent<HTMLElement>) => { event.preventDefault(); setIsDragging(false); },
    handleDragOver: (event: DragEvent<HTMLElement>) => event.preventDefault(),
    handleDrop,
  };
};
