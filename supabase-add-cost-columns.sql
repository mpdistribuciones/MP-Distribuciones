-- ==============================================================================
-- MP DISTRIBUCIONES - AGREGAR COLUMNAS DE COSTO Y MARGEN DE GANANCIA
-- Ejecutar en Supabase > SQL Editor
-- ==============================================================================

-- 1. Agregar columnas a la tabla products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_ars NUMERIC(12,0) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2) DEFAULT 15;

-- 2. Actualizar productos existentes calculando costo automático con 15% de ganancia
UPDATE public.products
SET 
  profit_margin = 15,
  cost_usd = CASE WHEN price_usd > 0 THEN ROUND(price_usd / 1.15, 2) ELSE 0 END,
  cost_ars = CASE WHEN price_ars > 0 THEN ROUND(price_ars / 1.15, 0) ELSE 0 END
WHERE cost_usd = 0 OR cost_usd IS NULL;

-- 3. Verificación
SELECT id, sku, name, price_usd, cost_usd, price_ars, cost_ars, profit_margin
FROM public.products
LIMIT 10;
