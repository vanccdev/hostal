import type { Column } from "@/components/crud/DataTable";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { userReferenceColumns } from "@/lib/table-user-references";
import type { Database, GenericRow, Json } from "@/types/database";

type TableName = keyof Database["public"]["Tables"];
type RowRecord = Record<string, Json | undefined>;
type ColumnsForTableOptions = {
  userNamesById?: Record<string, string>;
};

const columnLabels: Record<string, string> = {
  id: "ID",
  nombre: "Nombre",
  rol: "Rol",
  activo: "Activo",
  created_at: "Creado",
  updated_at: "Actualizado",
  must_change_password: "Cambio pendiente",
  usuario_id: "Usuario ID",
  nombre_completo: "Nombre completo",
  email: "Email",
  telefono: "Teléfono",
  tipo_documento: "Tipo documento",
  numero_documento: "Número documento",
  pais_origen: "País origen",
  numero: "Número",
  tipo: "Tipo",
  tarifa_id: "Tarifa ID",
  piso: "Piso",
  capacidad_max: "Capacidad máxima",
  descripcion: "Descripción",
  habitacion_id: "Habitación ID",
  url: "URL",
  habitacion_tipo: "Tipo habitación",
  temporada: "Temporada",
  precio_noche: "Precio noche",
  moneda: "Moneda",
  vigente_desde: "Vigente desde",
  vigente_hasta: "Vigente hasta",
  created_by: "Creado por",
  fecha_nacimiento: "Fecha nacimiento",
  observaciones: "Observaciones",
  codigo_reserva: "Código reserva",
  huesped_id: "Huésped ID",
  fecha_ingreso: "Fecha ingreso",
  fecha_salida: "Fecha salida",
  num_noches: "Noches",
  num_huespedes: "Huéspedes",
  canal_origen: "Canal origen",
  estado: "Estado",
  precio_total: "Precio total",
  precio_ajustado: "Precio ajustado",
  motivo_ajuste: "Motivo ajuste",
  notas_internas: "Notas internas",
  registrado_por: "Registrado por",
  checkin_at: "Check-in",
  checkout_at: "Check-out",
  actor_id: "Actor ID",
  accion: "Acción",
  entidad: "Entidad",
  entidad_id: "Entidad ID",
  tabla_afectada: "Tabla afectada",
  registro_id: "Registro ID",
  datos_anteriores: "Datos anteriores",
  datos_nuevos: "Datos nuevos",
  ip_origen: "IP origen",
  metadata: "Metadata",
  titulo: "Título",
  mensaje: "Mensaje",
  leida: "Leída",
  fecha_inicio: "Fecha inicio",
  fecha_fin: "Fecha fin",
  motivo: "Motivo",
  creado_por: "Creado por",
  reserva_id: "Reserva ID",
  horas_anticipacion: "Horas anticipación",
  politica_aplicada: "Política aplicada",
  monto_reembolso: "Monto reembolso",
  gestionado_por: "Gestionado por",
  transaccion_id: "Transacción ID",
  numero_comprobante: "Número comprobante",
  emitido_at: "Emitido",
  pdf_url: "PDF URL",
  clave: "Clave",
  valor: "Valor",
  cambiado_por: "Cambiado por",
  notas: "Notas",
  changed_at: "Cambiado",
  estado_anterior: "Estado anterior",
  estado_nuevo: "Estado nuevo",
  monto: "Monto",
  metodo_pago: "Método pago",
  estado_verificacion: "Estado verificación",
  comprobante_url: "Comprobante URL",
  referencia_externa: "Referencia externa",
  verificado_por: "Verificado por",
  verificado_at: "Verificado",
  notas_admin: "Notas admin",
  es_titular: "Es titular",
  destinatario_rol: "Destinatario rol",
};

const schemaColumns: Partial<Record<TableName, string[]>> = {
  usuarios: ["id", "nombre", "rol", "activo", "created_at", "must_change_password"],
  huespedes: [
    "id",
    "nombre_completo",
    "tipo_documento",
    "numero_documento",
    "pais_origen",
    "telefono",
    "email",
    "fecha_nacimiento",
    "observaciones",
    "created_at",
    "updated_at",
    "usuario_id",
  ],
  habitaciones: ["id", "numero", "tipo", "tarifa_id", "piso", "capacidad_max", "descripcion", "activa", "created_at"],
  img_habitaciones: ["id", "habitacion_id", "url", "created_at"],
  tarifas: [
    "id",
    "habitacion_tipo",
    "temporada",
    "precio_noche",
    "moneda",
    "vigente_desde",
    "vigente_hasta",
    "activa",
    "created_by",
    "created_at",
  ],
  reservas: [
    "id",
    "codigo_reserva",
    "huesped_id",
    "habitacion_id",
    "tarifa_id",
    "fecha_ingreso",
    "fecha_salida",
    "num_noches",
    "num_huespedes",
    "canal_origen",
    "estado",
    "precio_total",
    "precio_ajustado",
    "motivo_ajuste",
    "notas_internas",
    "registrado_por",
    "checkin_at",
    "checkout_at",
    "created_at",
    "updated_at",
  ],
  transacciones: [
    "id",
    "reserva_id",
    "monto",
    "moneda",
    "metodo_pago",
    "estado_verificacion",
    "comprobante_url",
    "referencia_externa",
    "verificado_por",
    "verificado_at",
    "notas_admin",
    "tipo",
    "created_at",
  ],
  cancelaciones: [
    "id",
    "reserva_id",
    "motivo",
    "horas_anticipacion",
    "politica_aplicada",
    "monto_reembolso",
    "gestionado_por",
    "created_at",
  ],
  comprobantes: ["id", "reserva_id", "transaccion_id", "numero_comprobante", "emitido_at", "pdf_url"],
  bloqueos_fechas: ["id", "habitacion_id", "fecha_inicio", "fecha_fin", "motivo", "creado_por", "created_at"],
  estado_habitaciones: ["id", "habitacion_id", "estado", "cambiado_por", "notas", "changed_at"],
  log_estados_habitacion: ["id", "habitacion_id", "estado_anterior", "estado_nuevo", "cambiado_por", "created_at"],
  configuracion_hostal: ["id", "clave", "valor", "descripcion", "updated_at"],
  audit_log: [
    "id",
    "usuario_id",
    "accion",
    "tabla_afectada",
    "registro_id",
    "datos_anteriores",
    "datos_nuevos",
    "ip_origen",
    "created_at",
  ],
  notificaciones: ["id", "tipo", "reserva_id", "mensaje", "leida", "destinatario_rol", "created_at"],
};

const dateColumns = new Set([
  "fecha_nacimiento",
  "fecha_ingreso",
  "fecha_salida",
  "fecha_inicio",
  "fecha_fin",
  "vigente_desde",
  "vigente_hasta",
]);

const dateTimeColumns = new Set([
  "created_at",
  "updated_at",
  "checkin_at",
  "checkout_at",
  "emitido_at",
  "changed_at",
  "verificado_at",
]);

const formatColumnHeader = (key: string) =>
  columnLabels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatTableValue = (value: Json | undefined, key?: string, options?: ColumnsForTableOptions) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "string" && key && userReferenceColumns.has(key)) {
    return options?.userNamesById?.[value] ?? value;
  }

  if (typeof value === "string" && key && dateColumns.has(key)) {
    return formatDate(value);
  }

  if (typeof value === "string" && key && dateTimeColumns.has(key)) {
    return formatDateTime(value);
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
};

const rowKeys = <T extends RowRecord>(rows: T[]) => {
  const keys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  return [...keys];
};

export const columnsForTable = <T extends RowRecord>(
  table: TableName,
  rows: T[] = [],
  options?: ColumnsForTableOptions,
): Column<T>[] => {
  const orderedKeys = [...(schemaColumns[table] ?? []), ...rowKeys(rows)];
  const uniqueKeys = [...new Set(orderedKeys)];

  return uniqueKeys.map((key) => ({
    key,
    header: formatColumnHeader(key),
    render: (row) => formatTableValue(row[key], key, options),
  }));
};

export const genericRows = (rows: unknown[] | null | undefined) => (rows ?? []) as GenericRow[];
