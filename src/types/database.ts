export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "recepcionista" | "limpieza" | "cliente";
export type HabitacionTipo = "individual" | "matrimonial" | "doble" | "triple" | "familiar";
export type TipoDocumento = "CI" | "Pasaporte" | "DNI" | "RUC" | "Otro";
export type TemporadaTarifa = "alta" | "baja" | "normal";
export type ReservaCanal = "whatsapp" | "recepcion" | "walkin" | "web";
export type ReservaEstado = "pendiente_pago" | "confirmada" | "checkin" | "checkout" | "cancelada" | "no_show";
export type EstadoHabitacion = "disponible" | "ocupada" | "limpieza" | "mantenimiento" | "bloqueada";
export type MetodoPago = "qr_simple_tigo" | "qr_simple_bnb" | "qr_otro";
export type EstadoVerificacionPago = "por_verificar" | "aprobada" | "rechazada";
export type TransaccionTipo = "pago" | "reembolso_50" | "reembolso_total";
export type PoliticaCancelacion = "sin_reembolso" | "reembolso_50" | "reembolso_total";
export type NotificacionTipo = "overbooking" | "pago_pendiente" | "checkin_hoy" | "checkout_hoy" | "mantenimiento";
export type NotificacionDestinatarioRol = "admin" | "recepcionista" | "todos";

export type Usuario = {
  id: string;
  nombre: string;
  rol: UserRole;
  activo: boolean | null;
  created_at: string | null;
  must_change_password: boolean;
};

export type Huesped = {
  id: string;
  nombre_completo: string;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  pais_origen: string | null;
  telefono: string | null;
  email: string | null;
  fecha_nacimiento: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  usuario_id: string | null;
};

export type Habitacion = {
  id: string;
  numero: string;
  tipo: HabitacionTipo;
  piso: number;
  capacidad_max: number;
  descripcion: string | null;
  activa: boolean | null;
  created_at: string;
  tarifa_id: string | null;
};

export type ImgHabitacion = {
  id: string;
  habitacion_id: string;
  url: string;
  created_at: string;
};

export type Tarifa = {
  id: string;
  habitacion_tipo: HabitacionTipo;
  temporada: TemporadaTarifa;
  precio_noche: number;
  moneda: string | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  activa: boolean | null;
  created_by: string;
  created_at: string;
};

export type Reserva = {
  id: string;
  codigo_reserva: string;
  huesped_id: string;
  habitacion_id: string;
  tarifa_id: string;
  fecha_ingreso: string;
  fecha_salida: string;
  num_noches: number;
  num_huespedes: number;
  canal_origen: ReservaCanal;
  estado: ReservaEstado;
  precio_total: number;
  precio_ajustado: number | null;
  motivo_ajuste: string | null;
  notas_internas: string | null;
  registrado_por: string;
  checkin_at: string | null;
  checkout_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Transaccion = {
  id: string;
  reserva_id: string;
  monto: number;
  moneda: string | null;
  metodo_pago: MetodoPago;
  estado_verificacion: EstadoVerificacionPago;
  comprobante_url: string | null;
  referencia_externa: string | null;
  verificado_por: string | null;
  verificado_at: string | null;
  notas_admin: string | null;
  tipo: TransaccionTipo;
  created_at: string;
};

export type Cancelacion = {
  id: string;
  reserva_id: string;
  motivo: string;
  horas_anticipacion: number;
  politica_aplicada: PoliticaCancelacion;
  monto_reembolso: number | null;
  gestionado_por: string;
  created_at: string;
};

export type Comprobante = {
  id: string;
  reserva_id: string;
  transaccion_id: string;
  numero_comprobante: string;
  emitido_at: string;
  pdf_url: string | null;
};

export type BloqueoFecha = {
  id: string;
  habitacion_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  creado_por: string;
  created_at: string;
};

export type EstadoHabitacionRow = {
  id: string;
  habitacion_id: string;
  estado: EstadoHabitacion;
  cambiado_por: string;
  notas: string | null;
  changed_at: string;
};

export type LogEstadoHabitacion = {
  id: string;
  habitacion_id: string;
  estado_anterior: EstadoHabitacion | null;
  estado_nuevo: EstadoHabitacion | null;
  cambiado_por: string;
  created_at: string;
};

export type ConfiguracionHostal = {
  id: string;
  clave: string;
  valor: string;
  descripcion: string | null;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  usuario_id: string;
  accion: string;
  tabla_afectada: string;
  registro_id: string | null;
  datos_anteriores: Json | null;
  datos_nuevos: Json | null;
  ip_origen: string | null;
  created_at: string;
};

export type Notificacion = {
  id: string;
  tipo: NotificacionTipo;
  reserva_id: string | null;
  mensaje: string;
  leida: boolean | null;
  destinatario_rol: NotificacionDestinatarioRol;
  created_at: string;
};

export type GenericRow = {
  id: string;
  [key: string]: Json | undefined;
};

export type GenericInsert = {
  [key: string]: Json | undefined;
};

export type AuditLogInsert = {
  actor_id: string;
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  metadata?: Json;
};

type DbTable<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type WithGeneratedId<T extends { id: string }> = Partial<Pick<T, "id">>;

export type Database = {
  public: {
    Tables: {
      usuarios: DbTable<
        Usuario,
        WithGeneratedId<Usuario> &
          Pick<Usuario, "nombre" | "rol"> &
          Partial<Pick<Usuario, "activo" | "created_at" | "must_change_password">>
      >;
      huespedes: DbTable<
        Huesped,
        WithGeneratedId<Huesped> &
          Pick<Huesped, "nombre_completo" | "tipo_documento" | "numero_documento"> &
          Partial<Omit<Huesped, "id" | "nombre_completo" | "tipo_documento" | "numero_documento">>
      >;
      habitaciones: DbTable<
        Habitacion,
        WithGeneratedId<Habitacion> &
          Pick<Habitacion, "numero" | "tipo" | "piso" | "capacidad_max"> &
          Partial<Omit<Habitacion, "id" | "numero" | "tipo" | "piso" | "capacidad_max">>
      >;
      img_habitaciones: DbTable<
        ImgHabitacion,
        WithGeneratedId<ImgHabitacion> &
          Pick<ImgHabitacion, "habitacion_id" | "url"> &
          Partial<Pick<ImgHabitacion, "created_at">>,
        Partial<Pick<ImgHabitacion, "habitacion_id" | "url">>
      >;
      tarifas: DbTable<
        Tarifa,
        WithGeneratedId<Tarifa> &
          Pick<Tarifa, "habitacion_tipo" | "temporada" | "precio_noche" | "vigente_desde" | "created_by"> &
          Partial<Omit<Tarifa, "id" | "habitacion_tipo" | "temporada" | "precio_noche" | "vigente_desde" | "created_by">>
      >;
      reservas: DbTable<
        Reserva,
        WithGeneratedId<Reserva> &
          Pick<
            Reserva,
            | "codigo_reserva"
            | "huesped_id"
            | "habitacion_id"
            | "tarifa_id"
            | "fecha_ingreso"
            | "fecha_salida"
            | "num_noches"
            | "num_huespedes"
            | "canal_origen"
            | "estado"
            | "precio_total"
            | "registrado_por"
          > &
          Partial<Omit<Reserva, "id" | "codigo_reserva" | "huesped_id" | "habitacion_id" | "tarifa_id" | "fecha_ingreso" | "fecha_salida" | "num_noches" | "num_huespedes" | "canal_origen" | "estado" | "precio_total" | "registrado_por">>
      >;
      transacciones: DbTable<
        Transaccion,
        WithGeneratedId<Transaccion> &
          Pick<Transaccion, "reserva_id" | "monto" | "metodo_pago" | "estado_verificacion" | "tipo"> &
          Partial<Omit<Transaccion, "id" | "reserva_id" | "monto" | "metodo_pago" | "estado_verificacion" | "tipo">>
      >;
      cancelaciones: DbTable<
        Cancelacion,
        WithGeneratedId<Cancelacion> &
          Pick<Cancelacion, "reserva_id" | "motivo" | "horas_anticipacion" | "politica_aplicada" | "gestionado_por"> &
          Partial<Omit<Cancelacion, "id" | "reserva_id" | "motivo" | "horas_anticipacion" | "politica_aplicada" | "gestionado_por">>
      >;
      comprobantes: DbTable<
        Comprobante,
        WithGeneratedId<Comprobante> &
          Pick<Comprobante, "reserva_id" | "transaccion_id" | "numero_comprobante" | "emitido_at"> &
          Partial<Pick<Comprobante, "pdf_url">>
      >;
      bloqueos_fechas: DbTable<
        BloqueoFecha,
        WithGeneratedId<BloqueoFecha> &
          Pick<BloqueoFecha, "fecha_inicio" | "fecha_fin" | "motivo" | "creado_por"> &
          Partial<Pick<BloqueoFecha, "habitacion_id" | "created_at">>
      >;
      estado_habitaciones: DbTable<
        EstadoHabitacionRow,
        WithGeneratedId<EstadoHabitacionRow> &
          Pick<EstadoHabitacionRow, "habitacion_id" | "estado" | "cambiado_por"> &
          Partial<Pick<EstadoHabitacionRow, "notas" | "changed_at">>
      >;
      log_estados_habitacion: DbTable<
        LogEstadoHabitacion,
        WithGeneratedId<LogEstadoHabitacion> &
          Pick<LogEstadoHabitacion, "habitacion_id" | "cambiado_por"> &
          Partial<Pick<LogEstadoHabitacion, "estado_anterior" | "estado_nuevo" | "created_at">>
      >;
      configuracion_hostal: DbTable<
        ConfiguracionHostal,
        WithGeneratedId<ConfiguracionHostal> &
          Pick<ConfiguracionHostal, "clave" | "valor"> &
          Partial<Pick<ConfiguracionHostal, "descripcion" | "updated_at">>
      >;
      audit_log: DbTable<
        AuditLog,
        WithGeneratedId<AuditLog> &
          Pick<AuditLog, "usuario_id" | "accion" | "tabla_afectada"> &
          Partial<Pick<AuditLog, "registro_id" | "datos_anteriores" | "datos_nuevos" | "ip_origen" | "created_at">>
      >;
      notificaciones: DbTable<
        Notificacion,
        WithGeneratedId<Notificacion> &
          Pick<Notificacion, "tipo" | "mensaje" | "destinatario_rol"> &
          Partial<Pick<Notificacion, "reserva_id" | "leida" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
