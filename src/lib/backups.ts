import "server-only";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";

const databaseTables = [
  "usuarios",
  "huespedes",
  "habitaciones",
  "img_habitaciones",
  "tarifas",
  "reservas",
  "transacciones",
  "comprobantes",
  "cancelaciones",
  "bloqueos_fechas",
  "estado_habitaciones",
  "log_estados_habitacion",
  "configuracion_hostal",
  "audit_log",
  "notificaciones",
] as const;

type BackupAccess =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

type TarFile = {
  path: string;
  data: Uint8Array;
};

type StorageFile = {
  name: string;
  id?: string | null;
  metadata?: { size?: number; mimetype?: string } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const textEncoder = new TextEncoder();

export const requireBackupAccess = async (): Promise<BackupAccess> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile) {
    return { ok: false, response: new Response("No autenticado.", { status: 401 }) };
  }

  if (!currentUser.profile.activo || currentUser.profile.rol !== "admin") {
    return { ok: false, response: new Response("No autorizado.", { status: 403 }) };
  }

  return { ok: true, userId: currentUser.authUserId };
};

export const backupFilename = (prefix: string, extension: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${timestamp}.${extension}`;
};

export const contentDisposition = (filename: string) => `attachment; filename="${filename}"`;

export const createDatabaseBackup = async (actorId: string) => {
  const supabaseUrl = publicEnv.supabaseUrl();
  const serviceRoleKey = serverEnv.supabaseServiceRoleKey();
  const tables: Record<string, unknown[]> = {};

  for (const table of databaseTables) {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`No se pudo exportar ${table}: ${await response.text()}`);
    }

    tables[table] = (await response.json()) as unknown[];
  }

  return {
    generated_at: new Date().toISOString(),
    generated_by: actorId,
    scope: "public",
    tables,
  };
};

const isDirectory = (item: StorageFile) => !item.id;

const listStorageFiles = async (bucket: string, prefix = ""): Promise<StorageFile[]> => {
  const admin = createSupabaseAdminClient();
  const files: StorageFile[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, {
      limit: 1000,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data as StorageFile[]) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (isDirectory(item)) {
        files.push(...(await listStorageFiles(bucket, path)));
      } else {
        files.push({ ...item, name: path });
      }
    }

    if (data.length < 1000) {
      break;
    }

    offset += data.length;
  }

  return files;
};

const writeString = (buffer: Uint8Array, offset: number, value: string, length: number) => {
  const bytes = textEncoder.encode(value);
  buffer.set(bytes.slice(0, length), offset);
};

const writeOctal = (buffer: Uint8Array, offset: number, value: number, length: number) => {
  const octal = value.toString(8).padStart(length - 1, "0");
  writeString(buffer, offset, `${octal}\0`, length);
};

const splitTarPath = (path: string) => {
  if (textEncoder.encode(path).byteLength <= 100) {
    return { name: path, prefix: "" };
  }

  const slashIndex = path.lastIndexOf("/");
  const prefix = path.slice(0, slashIndex);
  const name = path.slice(slashIndex + 1);

  if (!prefix || textEncoder.encode(name).byteLength > 100 || textEncoder.encode(prefix).byteLength > 155) {
    throw new Error(`La ruta es demasiado larga para TAR: ${path}`);
  }

  return { name, prefix };
};

const createTarHeader = (path: string, size: number) => {
  const { name, prefix } = splitTarPath(path);
  const header = new Uint8Array(512);
  writeString(header, 0, name, 100);
  writeOctal(header, 100, 0o644, 8);
  writeOctal(header, 108, 0, 8);
  writeOctal(header, 116, 0, 8);
  writeOctal(header, 124, size, 12);
  writeOctal(header, 136, Math.floor(Date.now() / 1000), 12);
  header.fill(32, 148, 156);
  writeString(header, 156, "0", 1);
  writeString(header, 257, "ustar", 6);
  writeString(header, 263, "00", 2);
  writeString(header, 345, prefix, 155);

  const checksum = header.reduce((total, byte) => total + byte, 0);
  writeOctal(header, 148, checksum, 8);
  return header;
};

export const createTarArchive = (files: TarFile[]) => {
  const chunks: Uint8Array[] = [];

  for (const file of files) {
    chunks.push(createTarHeader(file.path, file.data.byteLength));
    chunks.push(file.data);

    const remainder = file.data.byteLength % 512;
    if (remainder > 0) {
      chunks.push(new Uint8Array(512 - remainder));
    }
  }

  chunks.push(new Uint8Array(1024));
  const totalSize = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const archive = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    archive.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return archive;
};

const createStorageBucketBackup = async (actorId: string, bucket: string) => {
  const admin = createSupabaseAdminClient();
  const storageFiles = await listStorageFiles(bucket);
  const tarFiles: TarFile[] = [];
  const manifest = {
    generated_at: new Date().toISOString(),
    generated_by: actorId,
    bucket,
    files: storageFiles.map((file) => ({
      path: file.name,
      size: file.metadata?.size ?? null,
      mimetype: file.metadata?.mimetype ?? null,
      created_at: file.created_at ?? null,
      updated_at: file.updated_at ?? null,
    })),
  };

  tarFiles.push({
    path: "manifest.json",
    data: textEncoder.encode(JSON.stringify(manifest, null, 2)),
  });

  for (const file of storageFiles) {
    const { data, error } = await admin.storage.from(bucket).download(file.name);

    if (error || !data) {
      throw new Error(error?.message ?? `No se pudo descargar ${file.name}`);
    }

    tarFiles.push({
      path: `${bucket}/${file.name}`,
      data: new Uint8Array(await data.arrayBuffer()),
    });
  }

  return createTarArchive(tarFiles);
};

export const createHabitacionesImagesBackup = async (actorId: string) =>
  createStorageBucketBackup(actorId, "habitaciones");

export const createComprobantesImagesBackup = async (actorId: string) =>
  createStorageBucketBackup(actorId, "comprobante");
