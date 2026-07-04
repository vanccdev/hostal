ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.huespedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancelaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloqueos_fechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estado_habitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid() AND activo = true;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() IN ('admin', 'recepcionista', 'limpieza');
$$;

CREATE OR REPLACE FUNCTION public.is_management()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_app_role() IN ('admin', 'recepcionista');
$$;

DROP POLICY IF EXISTS "usuarios_self_read" ON public.usuarios;
CREATE POLICY "usuarios_self_read"
ON public.usuarios FOR SELECT
USING (id = auth.uid() OR public.is_management());

DROP POLICY IF EXISTS "usuarios_management_write" ON public.usuarios;
CREATE POLICY "usuarios_management_write"
ON public.usuarios FOR ALL
USING (public.is_admin() OR (public.current_app_role() = 'recepcionista' AND rol = 'cliente'))
WITH CHECK (public.is_admin() OR (public.current_app_role() = 'recepcionista' AND rol = 'cliente'));

DROP POLICY IF EXISTS "huespedes_client_own_read" ON public.huespedes;
CREATE POLICY "huespedes_client_own_read"
ON public.huespedes FOR SELECT
USING (usuario_id = auth.uid() OR public.is_management());

DROP POLICY IF EXISTS "huespedes_management_write" ON public.huespedes;
CREATE POLICY "huespedes_management_write"
ON public.huespedes FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "reservas_client_own_read" ON public.reservas;
CREATE POLICY "reservas_client_own_read"
ON public.reservas FOR SELECT
USING (
  public.is_management()
  OR EXISTS (
    SELECT 1 FROM public.huespedes h
    WHERE h.id = reservas.huesped_id AND h.usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "reservas_client_own_insert" ON public.reservas;
CREATE POLICY "reservas_client_own_insert"
ON public.reservas FOR INSERT
WITH CHECK (
  public.is_management()
  OR EXISTS (
    SELECT 1 FROM public.huespedes h
    WHERE h.id = reservas.huesped_id AND h.usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "reservas_management_write" ON public.reservas;
CREATE POLICY "reservas_management_write"
ON public.reservas FOR UPDATE
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "habitaciones_read" ON public.habitaciones;
CREATE POLICY "habitaciones_read"
ON public.habitaciones FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "habitaciones_management_write" ON public.habitaciones;
CREATE POLICY "habitaciones_management_write"
ON public.habitaciones FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "tarifas_read" ON public.tarifas;
CREATE POLICY "tarifas_read"
ON public.tarifas FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tarifas_admin_write" ON public.tarifas;
CREATE POLICY "tarifas_admin_write"
ON public.tarifas FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "notificaciones_own_read" ON public.notificaciones;
CREATE POLICY "notificaciones_own_read"
ON public.notificaciones FOR SELECT
USING (usuario_id = auth.uid() OR public.is_management());

DROP POLICY IF EXISTS "notificaciones_staff_write" ON public.notificaciones;
CREATE POLICY "notificaciones_staff_write"
ON public.notificaciones FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "audit_log_admin_read" ON public.audit_log;
CREATE POLICY "audit_log_admin_read"
ON public.audit_log FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "shared_management_tables" ON public.transacciones;
CREATE POLICY "shared_management_tables"
ON public.transacciones FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "shared_management_tables" ON public.comprobantes;
CREATE POLICY "shared_management_tables"
ON public.comprobantes FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "shared_management_tables" ON public.cancelaciones;
CREATE POLICY "shared_management_tables"
ON public.cancelaciones FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "shared_management_tables" ON public.bloqueos_fechas;
CREATE POLICY "shared_management_tables"
ON public.bloqueos_fechas FOR ALL
USING (public.is_management())
WITH CHECK (public.is_management());

DROP POLICY IF EXISTS "estado_habitaciones_staff" ON public.estado_habitaciones;
CREATE POLICY "estado_habitaciones_staff"
ON public.estado_habitaciones FOR ALL
USING (public.is_staff())
WITH CHECK (public.is_staff());

