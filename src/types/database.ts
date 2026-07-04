export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "recepcionista" | "limpieza" | "cliente";

export type Usuario = {
  id: string;
  nombre: string;
  rol: UserRole;
  activo: boolean;
  created_at: string;
  must_change_password: boolean;
};

export type Huesped = {
  id: string;
  usuario_id: string | null;
  nombre_completo: string;
  email: string | null;
  telefono: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  pais_origen: string | null;
  created_at?: string;
};

export type Habitacion = {
  id: string;
  numero: string;
  tipo: string;
  piso: number;
  capacidad_max: number;
  descripcion?: string | null;
  activa?: boolean | null;
  created_at?: string;
};

export type ImgHabitacion = {
  id: string;
  habitacion_id: string;
  url: string;
  created_at: string;
};

export type Tarifa = {
  id: string;
  habitacion_tipo: string;
  temporada: string;
  precio_noche: number;
  moneda?: string | null;
  vigente_desde: string;
  vigente_hasta?: string | null;
  activa?: boolean | null;
  created_by: string;
  created_at?: string;
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
  canal_origen: string;
  estado: string;
  precio_total: number;
  precio_ajustado: number | null;
  motivo_ajuste: string | null;
  notas_internas: string | null;
  registrado_por: string;
  checkin_at: string | null;
  checkout_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type GenericRow = {
  id: string;
  created_at?: string;
  [key: string]: Json | undefined;
};

export type GenericInsert = {
  [key: string]: Json | undefined;
};

export type AuditLogInsert = {
  actor_id: string | null;
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  metadata?: Json;
};

export type Database = {
  public: {
    Tables: {
      usuarios: {
        Row: Usuario;
        Insert: Partial<Usuario> & Pick<Usuario, "id" | "nombre" | "rol" | "activo">;
        Update: Partial<Usuario>;
        Relationships: [];
      };
      huespedes: {
        Row: Huesped;
        Insert: Partial<Huesped> & Pick<Huesped, "nombre_completo">;
        Update: Partial<Huesped>;
        Relationships: [];
      };
      habitaciones: {
        Row: Habitacion;
        Insert: Partial<Habitacion>;
        Update: Partial<Habitacion>;
        Relationships: [];
      };
      img_habitaciones: {
        Row: ImgHabitacion;
        Insert: Partial<ImgHabitacion> & Pick<ImgHabitacion, "habitacion_id" | "url">;
        Update: Partial<Pick<ImgHabitacion, "habitacion_id" | "url">>;
        Relationships: [];
      };
      tarifas: {
        Row: Tarifa;
        Insert: Partial<Tarifa> & Pick<Tarifa, "habitacion_tipo" | "temporada" | "precio_noche" | "vigente_desde" | "created_by">;
        Update: Partial<Tarifa>;
        Relationships: [];
      };
      reservas: {
        Row: Reserva;
        Insert: Partial<Reserva> &
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
          >;
        Update: Partial<Reserva>;
        Relationships: [];
      };
      transacciones: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      cancelaciones: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      comprobantes: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      bloqueos_fechas: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      estado_habitaciones: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      log_estados_habitacion: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      configuracion_hostal: {
        Row: GenericRow;
        Insert: GenericInsert;
        Update: GenericInsert;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogInsert & { id: string; created_at: string };
        Insert: AuditLogInsert;
        Update: Partial<AuditLogInsert>;
        Relationships: [];
      };
      notificaciones: {
        Row: {
          id: string;
          usuario_id: string | null;
          tipo: string;
          titulo: string;
          mensaje: string;
          metadata: Json | null;
          leida: boolean;
          created_at: string;
        };
        Insert: {
          usuario_id?: string | null;
          tipo: string;
          titulo: string;
          mensaje: string;
          metadata?: Json | null;
          leida?: boolean;
        };
        Update: {
          leida?: boolean;
          metadata?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
