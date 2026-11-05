// Script para migrar costos y márgenes de ganancia en Supabase
// Uso: node scripts/migrate_costs.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ntalnljwhogbeaorhnlr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VlJkOSK-7Zx1qiv0tr8SWA_JEd7VjP3';
const ADMIN_EMAIL = 'mpdistribuciones.web@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'distribuci@nes123';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`🔐 Autenticando con usuario administrador: ${ADMIN_EMAIL}...`);
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (authError || !auth?.session) {
    console.error('❌ Error de autenticación:', authError?.message || 'No se pudo iniciar sesión.');
    process.exit(1);
  }
  console.log('✅ Sesión iniciada con éxito. Rol:', auth.user?.app_metadata?.role);

  // Verificar si las columnas cost_usd ya existen
  const { data: probe, error: probeError } = await supabase
    .from('products')
    .select('id, price_usd, price_ars, cost_usd, profit_margin')
    .limit(1);

  if (probeError && probeError.message?.includes('cost_usd')) {
    console.error('\n⚠️ Las columnas cost_usd, cost_ars y profit_margin aún no existen en Supabase.');
    console.error('👉 Por favor ejecutá en el SQL Editor de Supabase el archivo: supabase-add-cost-columns.sql');
    process.exit(1);
  }

  console.log('\n📦 Obteniendo todos los productos de Supabase...');
  const allProducts = [];
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price_usd, price_ars, cost_usd, cost_ars, profit_margin')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('❌ Error al obtener productos:', error);
      process.exit(1);
    }
    allProducts.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  console.log(`🔍 Total de productos encontrados: ${allProducts.length}`);

  let updatedCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const updates = batch.map((p) => {
      const priceUSD = Number(p.price_usd) || 0;
      const priceARS = Number(p.price_ars) || 0;
      const costUSD = priceUSD > 0 ? Number((priceUSD / 1.15).toFixed(2)) : 0;
      const costARS = priceARS > 0 ? Math.round(priceARS / 1.15) : 0;
      return {
        id: p.id,
        cost_usd: costUSD,
        cost_ars: costARS,
        profit_margin: 15,
        updated_at: new Date().toISOString(),
      };
    });

    for (const item of updates) {
      const { error: updErr } = await supabase
        .from('products')
        .update({
          cost_usd: item.cost_usd,
          cost_ars: item.cost_ars,
          profit_margin: item.profit_margin,
          updated_at: item.updated_at,
        })
        .eq('id', item.id);

      if (updErr) {
        console.error(`❌ Error actualizando producto ${item.id}:`, updErr);
      } else {
        updatedCount++;
      }
    }

    console.log(`  Procesados ${Math.min(i + BATCH_SIZE, allProducts.length)} / ${allProducts.length}`);
  }

  console.log(`\n🎉 ¡Migración finalizada! ${updatedCount} productos actualizados con 15% de ganancia.`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
