import type { Database } from "@/types/database";

export type TableName = keyof Database["public"]["Tables"];
export type SortDirection = "asc" | "desc";

export type TableServerState = {
  page: number;
  pageSize: number;
  total: number;
  q: string;
  qColumn: string;
  sort: string;
  dir: SortDirection;
};

export type TableQueryInput = {
  page?: string | string[];
  pageSize?: string | string[];
  q?: string | string[];
  qColumn?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
};

export const allColumnsValue = "__all__";

const defaultPageSize = 10;
const maxPageSize = 100;
const pageSizes = new Set([10, 20, 25, 50, 100]);

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const parseTableQuery = (
  input: TableQueryInput | undefined,
  options: {
    defaultSort: string;
    defaultDir?: SortDirection;
    searchableColumns: string[];
    sortableColumns: string[];
  },
) => {
  const requestedPageSize = positiveInteger(firstValue(input?.pageSize), defaultPageSize);
  const pageSize = pageSizes.has(requestedPageSize) ? requestedPageSize : Math.min(requestedPageSize, maxPageSize);
  const page = positiveInteger(firstValue(input?.page), 1);
  const q = firstValue(input?.q)?.trim() ?? "";
  const requestedColumn = firstValue(input?.qColumn) ?? allColumnsValue;
  const qColumn =
    requestedColumn === allColumnsValue || options.searchableColumns.includes(requestedColumn)
      ? requestedColumn
      : allColumnsValue;
  const requestedSort = firstValue(input?.sort) ?? options.defaultSort;
  const sort = options.sortableColumns.includes(requestedSort) ? requestedSort : options.defaultSort;
  const dir = firstValue(input?.dir) === "asc" ? "asc" : options.defaultDir ?? "desc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { page, pageSize, q, qColumn, sort, dir, from, to };
};

export const tableStateFromQuery = (
  query: ReturnType<typeof parseTableQuery>,
  total: number,
): TableServerState => ({
  page: query.page,
  pageSize: query.pageSize,
  total,
  q: query.q,
  qColumn: query.qColumn,
  sort: query.sort,
  dir: query.dir,
});

export const searchableColumnsByTable: Partial<Record<TableName, string[]>> = {
  usuarios: ["id", "nombre", "rol"],
  huespedes: ["tipo_documento", "numero_documento", "pais_origen"],
  habitaciones: ["id", "numero", "tipo", "descripcion", "tarifa_id"],
  tarifas: ["id", "habitacion_tipo", "temporada", "moneda", "created_by"],
  reservas: ["id", "codigo_reserva", "huesped_id", "habitacion_id", "tarifa_id", "canal_origen", "estado", "registrado_por"],
  audit_log: ["id", "usuario_id", "accion", "tabla_afectada", "registro_id", "ip_origen"],
  transacciones: ["id", "reserva_id", "moneda", "metodo_pago", "estado_verificacion", "referencia_externa", "verificado_por", "tipo"],
  cancelaciones: ["id", "reserva_id", "motivo", "politica_aplicada", "gestionado_por"],
  comprobantes: ["id", "reserva_id", "transaccion_id", "numero_comprobante", "pdf_url", "uploaded_by"],
  bloqueos_fechas: ["id", "habitacion_id", "motivo", "creado_por"],
  estado_habitaciones: ["id", "habitacion_id", "estado", "cambiado_por", "notas"],
  log_estados_habitacion: ["id", "habitacion_id", "estado_anterior", "estado_nuevo", "cambiado_por"],
  configuracion_hostal: ["id", "clave", "valor", "descripcion"],
  notificaciones: ["id", "tipo", "reserva_id", "usuario_id", "mensaje", "destinatario_rol"],
};

export const sortableColumnsByTable: Partial<Record<TableName, string[]>> = {
  usuarios: ["nombre", "rol", "activo", "created_at", "must_change_password"],
  huespedes: ["usuario_id", "tipo_documento", "numero_documento", "pais_origen", "created_at", "updated_at"],
  habitaciones: ["numero", "tipo", "piso", "capacidad_max", "activa", "created_at"],
  tarifas: ["habitacion_tipo", "temporada", "precio_noche", "peso", "vigente_desde", "vigente_hasta", "activa", "created_at"],
  reservas: ["codigo_reserva", "fecha_ingreso", "fecha_salida", "num_noches", "num_huespedes", "estado", "precio_total", "created_at"],
  audit_log: ["accion", "tabla_afectada", "created_at"],
  transacciones: ["monto", "metodo_pago", "estado_verificacion", "tipo", "created_at"],
  cancelaciones: [
    "created_at",
    "horas_anticipacion",
    "monto_pagado_aprobado",
    "retencion_porcentaje_aplicado",
    "monto_reembolso",
    "monto_retenido",
  ],
  comprobantes: ["numero_comprobante", "emitido_at", "created_at"],
  bloqueos_fechas: ["fecha_inicio", "fecha_fin", "created_at"],
  estado_habitaciones: ["estado", "changed_at"],
  log_estados_habitacion: ["created_at"],
  configuracion_hostal: ["clave", "updated_at"],
  notificaciones: ["tipo", "leida", "destinatario_rol", "created_at"],
};

export const ilikePattern = (value: string) => `%${value.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;

export const orIlike = (columns: string[], value: string) =>
  columns.map((column) => `${column}.ilike.${ilikePattern(value)}`).join(",");
