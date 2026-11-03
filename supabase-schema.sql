-- ==============================================================================
-- MP DISTRIBUCIONES - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Ejecutá este script en el SQL Editor de tu proyecto en Supabase (https://supabase.com)
-- Este script crea las tablas, políticas de seguridad RLS y habilita Realtime.

-- 1. TABLA DE PRODUCTOS
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

-- 2. TABLA DE PEDIDOS (ÓRDENES MAYORISTAS)
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

-- 3. TABLA DE CONFIGURACIONES GENERALES (Cotización Dólar, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valor por defecto de cotización de referencia
INSERT INTO public.app_settings (key, value)
VALUES ('exchange_rate', '1350')
ON CONFLICT (key) DO NOTHING;

-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público (Lectura y Escritura permitida para clientes y panel)
DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
CREATE POLICY "Permitir lectura publica de productos" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir modificacion de productos" ON public.products;
CREATE POLICY "Permitir modificacion de productos" ON public.products
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura y creacion de pedidos" ON public.orders;
CREATE POLICY "Permitir lectura y creacion de pedidos" ON public.orders
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Permitir lectura y modificacion de settings" ON public.app_settings;
CREATE POLICY "Permitir lectura y modificacion de settings" ON public.app_settings
  FOR ALL USING (true);

-- 5. HABILITAR REALTIME (Para sincronización en vivo entre Celulares y PCs)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- Índices para búsqueda rápida en catálogo
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON public.orders (date DESC);

-- ==============================================================================
-- 6. CONFIGURACIÓN DE STORAGE (FOTOS DE PRODUCTOS)
-- ==============================================================================
-- Bucket público para almacenar las fotos del catálogo optimizadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acceso para el bucket de imágenes
DROP POLICY IF EXISTS "Permitir lectura publica de imagenes" ON storage.objects;
CREATE POLICY "Permitir lectura publica de imagenes" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Permitir subida de imagenes" ON storage.objects;
CREATE POLICY "Permitir subida de imagenes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Permitir actualizacion y borrado de imagenes" ON storage.objects;
CREATE POLICY "Permitir actualizacion y borrado de imagenes" ON storage.objects
  FOR ALL USING (bucket_id = 'product-images');
