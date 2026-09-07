import {
  backupFilename,
  contentDisposition,
  createDatabaseBackup,
  requireBackupAccess,
} from "@/lib/backups";

export async function GET(request: Request) {
  const access = await requireBackupAccess();

  if (!access.ok) {
    return access.response;
  }

  try {
    const params = new URL(request.url).searchParams;
    const target = params.get("target") === "production" ? "production" : "local";
    const backup = await createDatabaseBackup(access.userId, {
      target,
      apiUrl: params.get("apiUrl") ?? undefined,
      studioUrl: params.get("studioUrl") ?? undefined,
      nextjsUrl: params.get("nextjsUrl") ?? undefined,
    });
    const filename = backupFilename(`hostal-db-${target}`, "json");

    return Response.json(backup, {
      headers: {
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "No se pudo crear el backup.", { status: 500 });
  }
}
