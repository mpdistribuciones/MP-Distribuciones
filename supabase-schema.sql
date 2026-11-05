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

-- 5. FUNCIÓN DE SEGURIDAD ADMIN
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
END $$;

-- Índices para búsqueda rápida en catálogo
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders (date DESC);

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
