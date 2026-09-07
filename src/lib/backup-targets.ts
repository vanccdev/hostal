import "server-only";

import fs from "node:fs";
import path from "node:path";
import { publicEnv, serverEnv } from "@/lib/env";

const readEnvFileValue = (key: string) => {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), ".env.prod"), "utf8");
    const line = content.split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
    return line?.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "") || undefined;
  } catch {
    return undefined;
  }
};

export const normalizeBackupUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/$/, "") : `https://${trimmed.replace(/\/$/, "")}`;
};

export const getProductionBackupDefaults = () => ({
  apiUrl: normalizeBackupUrl(serverEnv.productionSupabaseApiUrl() ?? readEnvFileValue("URL_SUPABASE_API") ?? ""),
  studioUrl: normalizeBackupUrl(serverEnv.productionSupabaseStudioUrl() ?? readEnvFileValue("URL_SUPABASE_STUDIO") ?? ""),
  nextjsUrl: normalizeBackupUrl(serverEnv.productionNextjsUrl() ?? readEnvFileValue("URL_SUPABASE_NEXTJS") ?? ""),
});

export const getLocalBackupDefaults = () => ({ apiUrl: normalizeBackupUrl(publicEnv.supabaseUrl()) });
