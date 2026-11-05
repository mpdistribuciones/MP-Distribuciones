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

-- 6. BUCKET product-images (Storage)
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

-- 7. Verificación rápida de políticas aplicadas
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('products', 'product_costs', 'app_settings', 'orders'))
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY tablename, cmd;
