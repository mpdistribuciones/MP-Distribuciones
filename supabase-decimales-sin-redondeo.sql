-- ==============================================================================
-- MP DISTRIBUCIONES - PERMITIR DECIMALES EXACTOS EN PESOS Y USD (SIN REDONDEO)
-- Ejecutar en Supabase > SQL Editor
-- ==============================================================================

ALTER TABLE public.products
  ALTER COLUMN price_usd TYPE NUMERIC(12,4),
  ALTER COLUMN price_ars TYPE NUMERIC(14,2);

ALTER TABLE public.product_costs
  ALTER COLUMN cost_usd TYPE NUMERIC(12,4),
  ALTER COLUMN cost_ars TYPE NUMERIC(14,2),
  ALTER COLUMN profit_margin TYPE NUMERIC(8,4);

ALTER TABLE public.orders
  ALTER COLUMN total_usd TYPE NUMERIC(12,4),
  ALTER COLUMN total_ars TYPE NUMERIC(14,2);
