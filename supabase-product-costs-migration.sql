-- ==============================================================================
-- MP DISTRIBUCIONES - MIGRACIÓN Y AISLAMIENTO DE COSTOS Y MÁRGENES (B2B)
-- Ejecutar en Supabase > SQL Editor
-- ==============================================================================
-- Este script separa los costos de compra y márgenes de ganancia de la tabla pública
-- `products` hacia una tabla privada `product_costs`, protegiéndolos mediante RLS
-- para que solo el rol administrador pueda leerlos y modificarlos.

-- 1. Crear tabla privada public.product_costs
CREATE TABLE IF NOT EXISTS public.product_costs (
  product_id TEXT PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  cost_usd NUMERIC(10,2) DEFAULT 0,
  cost_ars NUMERIC(12,0) DEFAULT 0,
  profit_margin NUMERIC(5,2) DEFAULT 15,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Migrar los datos existentes de products hacia product_costs (si aún existen las columnas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cost_usd'
  ) THEN
    INSERT INTO public.product_costs (product_id, cost_usd, cost_ars, profit_margin)
    SELECT 
      id, 
      COALESCE(cost_usd, 0), 
      COALESCE(cost_ars, 0), 
      COALESCE(profit_margin, 15) 
    FROM public.products 
    ON CONFLICT (product_id) DO UPDATE SET 
      cost_usd = EXCLUDED.cost_usd, 
      cost_ars = EXCLUDED.cost_ars, 
      profit_margin = EXCLUDED.profit_margin,
      updated_at = NOW();
  END IF;
END $$;

-- 3. Eliminar columnas cost_usd, cost_ars y profit_margin de public.products
-- (Así ningún cliente anónimo podrá recibirlas en SELECT *)
ALTER TABLE public.products 
  DROP COLUMN IF EXISTS cost_usd, 
  DROP COLUMN IF EXISTS cost_ars, 
  DROP COLUMN IF EXISTS profit_margin;

-- 4. Habilitar RLS en product_costs permitiendo acceso exclusivo al administrador
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

-- 5. Publicación Realtime para product_costs (sincronización entre dispositivos del admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_costs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_costs;
  END IF;
END $$;

-- 6. Verificación
SELECT COUNT(*) AS total_costos_migrados FROM public.product_costs;
