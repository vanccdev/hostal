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
  pais: string | null;
  created_at?: string;
};

export type Habitacion = {
  id: string;
  nombre?: string | null;
  numero?: string | null;
  tipo?: string | null;
  capacidad?: number | null;
  precio_base?: number | null;
  estado?: string | null;
  descripcion?: string | null;
  activa?: boolean | null;
};

export type Tarifa = {
  id: string;
  nombre: string;
  precio_noche: number;
  activa?: boolean | null;
};

export type Reserva = {
  id: string;
  huesped_id: string;
  habitacion_id: string;
  tarifa_id: string | null;
  fecha_ingreso: string;
  fecha_salida: string;
  num_noches: number;
  precio_total: number;
  estado: string;
  created_at?: string;
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
      tarifas: {
        Row: Tarifa;
        Insert: Partial<Tarifa> & Pick<Tarifa, "nombre" | "precio_noche">;
        Update: Partial<Tarifa>;
        Relationships: [];
      };
      reservas: {
        Row: Reserva;
        Insert: Partial<Reserva> &
          Pick<Reserva, "huesped_id" | "habitacion_id" | "fecha_ingreso" | "fecha_salida">;
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
