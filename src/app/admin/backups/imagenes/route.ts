import {
  backupFilename,
  contentDisposition,
  createHabitacionesImagesBackup,
  requireBackupAccess,
} from "@/lib/backups";

export async function GET() {
  const access = await requireBackupAccess();

  if (!access.ok) {
    return access.response;
  }

  try {
    const archive = await createHabitacionesImagesBackup(access.userId);
    const filename = backupFilename("hostal-imagenes-habitaciones", "tar");

    return new Response(archive, {
      headers: {
        "Content-Type": "application/x-tar",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "No se pudo crear el backup.", { status: 500 });
  }
}
