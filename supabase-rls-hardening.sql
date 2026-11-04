-- ==============================================================================
-- MP DISTRIBUCIONES - BLINDAJE RLS (products + bucket product-images)
-- Ejecutar en Supabase > SQL Editor DESPUÉS de crear el usuario administrador
-- (Authentication > Users > Add user) y de haber desplegado la versión de la web
-- con login por Supabase Auth.
--
--   * SELECT: público (anon + authenticated)
--   * INSERT / UPDATE / DELETE: solo usuarios autenticados con app_metadata.role = 'admin'
-- ==============================================================================

-- 0. Marcar al usuario administrador
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'mpdistribuciones.web@gmail.com';

-- 1. Helper: ¿el JWT actual pertenece a un administrador?
--    app_metadata solo puede ser modificado con service_role, el usuario NO puede editarlo.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
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

-- 3. BUCKET product-images (Storage)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

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

-- 4. Verificación rápida
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE (schemaname = 'public' AND tablename = 'products')
   OR (schemaname = 'storage' AND tablename = 'objects')
ORDER BY tablename, cmd;
