-- ==============================================================================
-- MP DISTRIBUCIONES - BLINDAJE RLS COMPLETO
-- Ejecutar en Supabase > SQL Editor
-- ==============================================================================
-- Este script endurece las políticas de seguridad (Row Level Security) para:
--   1. Función public.is_admin() con search_path sanitizado.
--   2. Tabla products: SELECT público, mutaciones solo admin.
--   3. Tabla product_costs: Acceso exclusivo a administradores.
--   4. Tabla app_settings: SELECT público, mutaciones solo admin.
--   5. Tabla orders: INSERT público validado, lectura/modificación/borrado solo admin.
--   6. Storage bucket product-images: Límites de 5MB y tipos MIME de imagen permitidos.

-- 0. Marcar al usuario administrador (si aún no tiene el rol asignado)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'mpdistribuciones.web@gmail.com';

-- 1. Helper: ¿el JWT actual pertenece a un administrador?
--    SET search_path = '' previene secuestro de esquemas o inyección en funciones SECURITY DEFINER / STABLE.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- 2. TABLA products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
DROP POLICY IF EXISTS "Permitir modificacion de productos" ON public.products;
DROP POLICY IF EXISTS "products_select_public" ON public.products;
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
DROP POLICY IF EXISTS "products_update_admin" ON public.products;
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

CREATE POLICY "products_select_public" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE TO authenticated USING (public.is_admin());

-- 3. TABLA product_costs (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_costs') THEN
    ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "product_costs_admin_select" ON public.product_costs;
    DROP POLICY IF EXISTS "product_costs_admin_insert" ON public.product_costs;
    DROP POLICY IF EXISTS "product_costs_admin_update" ON public.product_costs;
    DROP POLICY IF EXISTS "product_costs_admin_delete" ON public.product_costs;

    CREATE POLICY "product_costs_admin_select" ON public.product_costs
      FOR SELECT TO authenticated USING (public.is_admin());

    CREATE POLICY "product_costs_admin_insert" ON public.product_costs
      FOR INSERT TO authenticated WITH CHECK (public.is_admin());

    CREATE POLICY "product_costs_admin_update" ON public.product_costs
      FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

    CREATE POLICY "product_costs_admin_delete" ON public.product_costs
      FOR DELETE TO authenticated USING (public.is_admin());
  END IF;
END $$;

-- 4. TABLA app_settings (Configuraciones generales / Tipo de cambio)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura y modificacion de settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_public" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_insert_admin" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_update_admin" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_delete_admin" ON public.app_settings;

CREATE POLICY "app_settings_select_public" ON public.app_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "app_settings_insert_admin" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "app_settings_update_admin" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "app_settings_delete_admin" ON public.app_settings
  FOR DELETE TO authenticated USING (public.is_admin());

-- 5. TABLA orders (Pedidos mayoristas)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura y creacion de pedidos" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;

-- Los clientes anónimos y autenticados pueden registrar su pedido desde el checkout
CREATE POLICY "orders_insert_public" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    total_usd >= 0
    AND total_ars >= 0
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
  );

-- Únicamente el administrador puede consultar todos los pedidos recibidos, cambiar estado o eliminarlos
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE TO authenticated USING (public.is_admin());

-- 6. TABLA b2b_users (Clientes mayoristas - Blindaje RLS sin acceso anónimo de lectura)
ALTER TABLE public.b2b_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "b2b_users_select_all" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_select_own_or_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_insert_public" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_update_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_update_own_or_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_delete_admin" ON public.b2b_users;

-- a) Cada cliente autenticado únicamente puede leer su propio registro; el administrador puede leer todos
CREATE POLICY "b2b_users_select_own_or_admin" ON public.b2b_users
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid()::text = id
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- b) Solicitud de alta B2B: solo permite insertar registros con estado 'pendiente' / 'pending'
CREATE POLICY "b2b_users_insert_public" ON public.b2b_users
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status IN ('pendiente', 'pending')
    AND char_length(business_name) > 0
    AND char_length(cuit) > 0
    AND char_length(email) > 0
  );

-- c) Actualización: El administrador puede modificar todo y aprobar/rechazar/suspender;
--    el cliente autenticado solo puede editar su propio perfil sin cambiar su status
CREATE POLICY "b2b_users_update_own_or_admin" ON public.b2b_users
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR auth.uid()::text = id
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    public.is_admin()
    OR (
      (auth.uid()::text = id OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
      AND status = (SELECT b.status FROM public.b2b_users b WHERE b.id = b2b_users.id)
    )
  );

-- d) Eliminación exclusiva para el administrador
CREATE POLICY "b2b_users_delete_admin" ON public.b2b_users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Función RPC segura para resolver email por CUIT en el login sin abrir SELECT público sobre b2b_users
CREATE OR REPLACE FUNCTION public.resolve_b2b_email_by_cuit(p_cuit text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT email
  FROM public.b2b_users
  WHERE regexp_replace(lower(cuit), '[^0-9a-z]', '', 'g') = regexp_replace(lower(trim(p_cuit)), '[^0-9a-z]', '', 'g')
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_b2b_email_by_cuit(text) TO anon, authenticated;

-- 7. BUCKET product-images (Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Permitir lectura publica de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualizacion y borrado de imagenes" ON storage.objects;
DROP POLICY IF EXISTS "product_images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "product_images_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete_admin" ON storage.objects;

CREATE POLICY "product_images_select_public" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_admin" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product_images_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

CREATE POLICY "product_images_delete_admin" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_admin());

-- 8. Verificación rápida de políticas aplicadas
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('products', 'product_costs', 'app_settings', 'orders', 'b2b_users'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY tablename, cmd;
