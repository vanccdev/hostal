import {
  backupFilename,
  contentDisposition,
  createDatabaseBackup,
  requireBackupAccess,
} from "@/lib/backups";

export async function GET() {
  const access = await requireBackupAccess();

  if (!access.ok) {
    return access.response;
  }

  try {
    const backup = await createDatabaseBackup(access.userId);
    const filename = backupFilename("hostal-db", "json");

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
