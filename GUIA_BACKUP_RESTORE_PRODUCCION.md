# Guía de backup y restauración en producción

Esta guía explica cómo generar backups local/producción y restaurarlos en un VPS administrado con Dokploy y Supabase self-hosted.

## 1. Contenido del backup

Un backup completo contiene:

```text
database.dump
storage.tar
manifest.txt
```

No se debe subir la carpeta `backups/` a Git. Debe copiarse directamente al VPS mediante `scp` u otro canal seguro.

El backup completo incluye la base PostgreSQL, Auth, tablas, políticas, metadata de Storage y archivos físicos de Storage.

## 2. Dominios

En `.env.prod` se pueden definir:

```env
URL_SUPABASE_API=api.tudominio.com
URL_SUPABASE_STUDIO=studio.tudominio.com
URL_SUPABASE_NEXTJS=tudominio.com
```

El sistema agrega automáticamente `https://` si falta. También se aceptan valores completos con `https://`.

El dominio importante para que carguen imágenes y comprobantes es `URL_SUPABASE_API`.

## 3. Generar backups

Ejecutar desde la máquina donde están los contenedores de Supabase:

```bash
cd /ruta/del/proyecto/hostal
BACKUP_TARGET=both scripts/backup-supabase-local.sh
```

Se crearán:

```text
backups/local/FECHA/
backups/production/FECHA/
```

La carpeta de producción registra en `manifest.txt` el dominio destino del API, por ejemplo:

```text
backup_target=production
source_api_url=http://localhost:8000
target_api_url=https://api.tudominio.com
```

Para generar un solo destino:

```bash
BACKUP_TARGET=local scripts/backup-supabase-local.sh
BACKUP_TARGET=production scripts/backup-supabase-local.sh
```

## 4. Copiar el backup al VPS

Desde una terminal de la computadora local:

```bash
cd /home/van/Desarrollo/Frontend/hostal
ls -lah backups/production/FECHA
```

En la terminal del VPS:

```bash
mkdir -p /root/backups/production
```

Desde la computadora local copiar el backup:

```bash
scp -r backups/production/FECHA \
root@IP_DEL_VPS:/root/backups/production/
```

Copiar también el script actualizado de restauración:

```bash
scp scripts/restore-supabase-local.sh \
root@IP_DEL_VPS:/root/restore-supabase-local.sh
```

Si el backup se generará directamente en el VPS, copiar también:

```bash
scp scripts/backup-supabase-local.sh \
root@IP_DEL_VPS:/root/backup-supabase-local.sh
```

## 5. Terminal correcta de Dokploy

La terminal del contenedor Next.js no sirve para restaurar Supabase. Se identifica por algo como:

```text
nextjs@...:/$
.dockerenv
```

En Dokploy se debe usar:

```text
Servers → VPS → Enter Terminal
```

La terminal correcta debe permitir:

```bash
docker ps
```

## 6. Identificar contenedores

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
```

En la instalación actual:

```text
hostal-supabase-1wbwri-db-1
hostal-supabase-1wbwri-storage-1
```

Los nombres pueden cambiar después de un nuevo despliegue. Siempre se deben confirmar con `docker ps`.

## 7. Verificar archivos

```bash
ls -lah /root/backups/production/FECHA
sed -n '1,80p' /root/backups/production/FECHA/manifest.txt
grep -n 'hostal_backup.source_api\|current_setting' /root/restore-supabase-local.sh
```

La carpeta debe contener `database.dump`, `storage.tar` y `manifest.txt`.

## 8. Restaurar producción

> La restauración reemplaza la base de datos y el Storage actuales del destino. No ejecutar si el VPS contiene información que no esté respaldada.

```bash
SUPABASE_DB_CONTAINER=hostal-supabase-1wbwri-db-1 \
SUPABASE_STORAGE_CONTAINER=hostal-supabase-1wbwri-storage-1 \
CONFIRM_RESTORE=YES \
/root/restore-supabase-local.sh \
/root/backups/production/FECHA
```

Si el dominio cambió después de crear el backup:

```bash
SUPABASE_DB_CONTAINER=hostal-supabase-1wbwri-db-1 \
SUPABASE_STORAGE_CONTAINER=hostal-supabase-1wbwri-storage-1 \
TARGET_SUPABASE_API_URL=https://api.nuevo-dominio.com \
CONFIRM_RESTORE=YES \
/root/restore-supabase-local.sh \
/root/backups/production/FECHA
```

El restore transforma las URLs locales de Storage a la URL de producción.

## 9. Verificar la restauración

```bash
docker exec hostal-supabase-1wbwri-db-1 \
psql -U supabase_admin -d postgres \
-c "select count(*) as habitaciones from public.habitaciones;"

docker exec hostal-supabase-1wbwri-db-1 \
psql -U supabase_admin -d postgres \
-c "select count(*) as archivos_storage from storage.objects;"

docker exec hostal-supabase-1wbwri-db-1 \
psql -U supabase_admin -d postgres \
-c "select count(*) filter (where url like 'http://localhost:%') as urls_locales, count(*) filter (where url like 'https://api.tudominio.com%') as urls_produccion from public.img_habitaciones;"
```

## 10. Configurar Next.js en Dokploy

En las variables de entorno de la aplicación configurar:

```env
NEXT_PUBLIC_SUPABASE_URL=https://api.tudominio.com
```

Después hacer redeploy o reiniciar la aplicación web para que tome la variable.

## 11. Prueba final

1. Iniciar sesión con el administrador.
2. Abrir `/admin`.
3. Verificar habitaciones y tarifas.
4. Confirmar que cargan las imágenes.
5. Confirmar que abren comprobantes PDF o imágenes.

Nunca imprimir ni compartir `SUPABASE_SERVICE_ROLE_KEY`, contraseñas o archivos `.env` completos.
