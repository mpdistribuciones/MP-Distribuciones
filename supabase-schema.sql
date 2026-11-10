-- ==============================================================================
-- MP DISTRIBUCIONES - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Ejecutá este script en el SQL Editor de tu proyecto en Supabase (https://supabase.com)
-- Este script crea las tablas base, políticas de seguridad RLS y habilita Realtime.

-- 1. TABLA DE PRODUCTOS (Catálogo público para visitantes y clientes B2B)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Genérico',
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  specs JSONB DEFAULT '[]'::jsonb,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  price_ars NUMERIC(12,0) NOT NULL DEFAULT 0,
  price_currency TEXT NOT NULL DEFAULT 'ARS', -- 'ARS' o 'USD'
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_wholesale_qty INTEGER NOT NULL DEFAULT 1,
  badge TEXT, -- 'NUEVO', 'DESTACADO', 'OFERTA', 'MÁS VENDIDO'
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA PRIVADA DE COSTOS Y MÁRGENES (Solo visible para Administradores)
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_usd NUMERIC(10,2) DEFAULT 0,
  cost_ars NUMERIC(12,0) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 15,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE PEDIDOS (ÓRDENES MAYORISTAS)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  user_id TEXT,
  user_business_name TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_cuit TEXT,
  shipping_address TEXT,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_ars NUMERIC(12,0) NOT NULL DEFAULT 0,
  delivery_method TEXT DEFAULT 'retiro',
  invoice_type TEXT DEFAULT 'B',
  status TEXT NOT NULL DEFAULT 'enviado',
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE CONFIGURACIONES GENERALES (Cotización Dólar, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valor por defecto de cotización de referencia
INSERT INTO public.app_settings (key, value)
VALUES ('exchange_rate', '1350')
ON CONFLICT (key) DO NOTHING;

-- 5. TABLA DE USUARIOS / CLIENTES B2B MAYORISTAS
CREATE TABLE IF NOT EXISTS public.b2b_users (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  cuit TEXT NOT NULL,
  city TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 6. FUNCIÓN DE SEGURIDAD ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_users ENABLE ROW LEVEL SECURITY;

-- Políticas de products
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

-- Políticas de product_costs (Privado para admin)
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

-- Políticas de app_settings
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

-- Políticas de orders
DROP POLICY IF EXISTS "orders_insert_public" ON public.orders;
DROP POLICY IF EXISTS "orders_select_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_update_admin" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_admin" ON public.orders;

CREATE POLICY "orders_insert_public" ON public.orders
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    total_usd >= 0
    AND total_ars >= 0
    AND jsonb_typeof(items) = 'array'
    AND jsonb_array_length(items) > 0
  );
CREATE POLICY "orders_select_admin" ON public.orders
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "orders_update_admin" ON public.orders
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "orders_delete_admin" ON public.orders
  FOR DELETE TO authenticated USING (public.is_admin());

-- Políticas de b2b_users (Blindaje RLS estricto: sin lectura anónima pública)
DROP POLICY IF EXISTS "b2b_users_select_all" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_select_own_or_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_insert_public" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_update_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_update_own_or_admin" ON public.b2b_users;
DROP POLICY IF EXISTS "b2b_users_delete_admin" ON public.b2b_users;

-- a) Lectura: Cada cliente autenticado solo puede leer su propio registro; el administrador puede leer todos
CREATE POLICY "b2b_users_select_own_or_admin" ON public.b2b_users
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR auth.uid()::text = id
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

-- b) Registro de nuevos comercios: únicamente con estado inicial 'pendiente' / 'pending'
CREATE POLICY "b2b_users_insert_public" ON public.b2b_users
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status IN ('pendiente', 'pending')
    AND char_length(business_name) > 0
    AND char_length(cuit) > 0
    AND char_length(email) > 0
  );

-- c) Actualización: El administrador puede actualizar todo (incluyendo estados aprobado/rechazado/pendiente);
--    el propio usuario autenticado solo puede editar sus datos sin alterar su status
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

-- d) Eliminación restringida exclusivamente a administradores
CREATE POLICY "b2b_users_delete_admin" ON public.b2b_users
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Función RPC segura para resolver email a partir de CUIT durante el login sin exponer la tabla
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

-- Función RPC para eliminación completa de usuarios (b2b_users + auth.users) exclusiva para Administradores
CREATE OR REPLACE FUNCTION public.delete_b2b_user_complete(target_user_id text, target_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_auth_uid uuid;
BEGIN
  -- 1. Verificar estrictamente que quien llama a la función sea el Administrador
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el administrador puede eliminar cuentas.';
  END IF;

  -- 2. Eliminar de la tabla comercial b2b_users
  DELETE FROM public.b2b_users 
  WHERE id = target_user_id 
     OR (target_email IS NOT NULL AND target_email <> '' AND lower(email) = lower(target_email));

  -- 3. Si target_user_id es un UUID válido, eliminar de auth.users
  BEGIN
    v_auth_uid := target_user_id::uuid;
    DELETE FROM auth.users WHERE id = v_auth_uid;
  EXCEPTION WHEN invalid_text_representation THEN
    NULL;
  END;

  -- 4. Si se especificó email, eliminar también de auth.users por email
  IF target_email IS NOT NULL AND target_email <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(target_email);
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_b2b_user_complete(text, text) TO authenticated;

-- Función RPC para recuperar usuarios registrados en auth.users que hayan quedado sin fila en b2b_users
CREATE OR REPLACE FUNCTION public.sync_orphan_b2b_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN;
  END IF;

  -- Confirmar automáticamente emails pendientes de usuarios B2B
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE email_confirmed_at IS NULL;

  -- Insertar en public.b2b_users cualquier usuario de auth.users (no admin) que no tenga fila en b2b_users
  INSERT INTO public.b2b_users (id, business_name, cuit, city, phone, email, status, created_at)
  SELECT
    u.id::text,
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'business_name', ''), split_part(u.email, '@', 1)),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'cuit', ''), 'S/D'),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'city', ''), 'Rosario, Santa Fe'),
    COALESCE(NULLIF(u.raw_user_meta_data ->> 'phone', ''), 'S/D'),
    u.email,
    'pendiente',
    COALESCE(u.created_at, NOW())
  FROM auth.users u
  WHERE COALESCE(u.raw_app_meta_data ->> 'role', '') <> 'admin'
    AND u.email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.b2b_users b
      WHERE b.id = u.id::text OR lower(b.email) = lower(u.email)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_orphan_b2b_users() TO authenticated;

-- 7. HABILITAR REALTIME
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_costs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_costs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'b2b_users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.b2b_users;
  END IF;
END $$;

-- Índices para búsqueda rápida en catálogo
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders (date DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_users_email ON public.b2b_users (email);
CREATE INDEX IF NOT EXISTS idx_b2b_users_cuit ON public.b2b_users (cuit);
CREATE INDEX IF NOT EXISTS idx_b2b_users_status ON public.b2b_users (status);

-- ==============================================================================
-- 8. CONFIGURACIÓN DE STORAGE (FOTOS DE PRODUCTOS)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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
