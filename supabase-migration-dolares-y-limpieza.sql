-- ==============================================================================
-- MP DISTRIBUCIONES - MIGRACIÓN SQL:
-- 1. Eliminar columnas sku, brand y badge de public.products
-- 2. Agregar dollar_rate_key y cost_currency a public.product_costs (privado Admin)
-- 3. Hacer privadas las cotizaciones de dólar en public.app_settings (solo Admin)
-- Ejecutá este script en Supabase > SQL Editor
-- ==============================================================================

-- 1. Eliminar SKU, Marca y Etiqueta Especial de la tabla products
ALTER TABLE public.products
  DROP COLUMN IF EXISTS sku,
  DROP COLUMN IF EXISTS brand,
  DROP COLUMN IF EXISTS badge;

-- 2. Asegurar tabla y columnas privadas de costos y dólar asignado por producto
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_usd NUMERIC(10,2) DEFAULT 0,
  cost_ars NUMERIC(12,0) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 15,
  dollar_rate_key TEXT DEFAULT 'dolar1',
  cost_currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.product_costs
  ADD COLUMN IF NOT EXISTS dollar_rate_key TEXT DEFAULT 'dolar1',
  ADD COLUMN IF NOT EXISTS cost_currency TEXT DEFAULT 'USD';

-- 3. Restringir lectura de app_settings (3 cotizaciones de dólar) exclusivamente al Admin
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura y modificacion de settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_public" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_admin" ON public.app_settings;

CREATE POLICY "app_settings_select_admin" ON public.app_settings
  FOR SELECT TO authenticated USING (public.is_admin());
