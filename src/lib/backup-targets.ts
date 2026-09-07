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

export const getProductionBackupDefaults = () => ({
  apiUrl: serverEnv.productionSupabaseApiUrl() ?? readEnvFileValue("URL_SUPABASE_API") ?? "",
  studioUrl: serverEnv.productionSupabaseStudioUrl() ?? readEnvFileValue("URL_SUPABASE_STUDIO") ?? "",
  nextjsUrl: serverEnv.productionNextjsUrl() ?? readEnvFileValue("URL_SUPABASE_NEXTJS") ?? "",
});

export const getLocalBackupDefaults = () => ({ apiUrl: publicEnv.supabaseUrl() });
