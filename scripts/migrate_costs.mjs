// Script para migrar costos y márgenes de ganancia en Supabase
// Uso:
//   ADMIN_EMAIL="email" ADMIN_PASSWORD="pass" VITE_SUPABASE_URL="url" VITE_SUPABASE_ANON_KEY="key" node scripts/migrate_costs.mjs
// O:
//   node scripts/migrate_costs.mjs <ADMIN_EMAIL> <ADMIN_PASSWORD> [SUPABASE_URL] [SUPABASE_ANON_KEY]

import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[2];
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.argv[3];
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.argv[4];
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.argv[5];

if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ ERROR: Faltan credenciales o variables de entorno requeridas.');
  console.error('Debes proporcionar:');
  console.error('  - ADMIN_EMAIL (email del usuario con rol admin en Supabase)');
  console.error('  - ADMIN_PASSWORD (contraseña del usuario admin)');
  console.error('  - VITE_SUPABASE_URL (URL del proyecto Supabase)');
  console.error('  - VITE_SUPABASE_ANON_KEY (clave pública anon de Supabase)\n');
  console.error('Ejemplo de uso con variables de entorno:');
  console.error('  ADMIN_EMAIL="admin@ejemplo.com" ADMIN_PASSWORD="pass" VITE_SUPABASE_URL="https://xyz.supabase.co" VITE_SUPABASE_ANON_KEY="eyJ..." node scripts/migrate_costs.mjs\n');
  console.error('O como argumentos:');
  console.error('  node scripts/migrate_costs.mjs <ADMIN_EMAIL> <ADMIN_PASSWORD> <SUPABASE_URL> <SUPABASE_ANON_KEY>\n');
  process.exit(1);
}

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

  // Verificar si la tabla product_costs o las columnas cost_usd existen
  const { data: probeCosts, error: probeCostsError } = await supabase
    .from('product_costs')
    .select('product_id, cost_usd, profit_margin')
    .limit(1);

  const useSeparateTable = !probeCostsError;
  console.log(
    useSeparateTable
      ? '📊 Destino detectado: Tabla privada `public.product_costs`'
      : '📊 Destino detectado: Columnas directas en `public.products`'
  );

  console.log('\n📦 Obteniendo todos los productos de Supabase...');
  const allProducts = [];
  const PAGE_SIZE = 1000;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price_usd, price_ars')
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

    if (useSeparateTable) {
      const rows = updates.map((u) => ({
        product_id: u.id,
        cost_usd: u.cost_usd,
        cost_ars: u.cost_ars,
        profit_margin: u.profit_margin,
        updated_at: u.updated_at,
      }));
      const { error: upsertErr } = await supabase.from('product_costs').upsert(rows);
      if (upsertErr) {
        console.error(`❌ Error en lote ${i}:`, upsertErr);
      } else {
        updatedCount += rows.length;
      }
    } else {
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
    }

    console.log(`  Procesados ${Math.min(i + BATCH_SIZE, allProducts.length)} / ${allProducts.length}`);
  }

  console.log(`\n🎉 ¡Migración finalizada! ${updatedCount} productos actualizados con 15% de ganancia.`);
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
