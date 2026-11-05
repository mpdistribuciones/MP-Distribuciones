// Script para subir el logo oficial a Supabase Storage y reemplazar las fotos genéricas de Unsplash
// Uso:
//   node scripts/set_default_logo.mjs <CONTRASEÑA_ADMIN_O_SERVICE_ROLE_KEY> [ADMIN_EMAIL] [SUPABASE_URL] [SUPABASE_ANON_KEY]
// O con variables de entorno:
//   ADMIN_PASSWORD="pass" ADMIN_EMAIL="email" VITE_SUPABASE_URL="url" VITE_SUPABASE_ANON_KEY="key" node scripts/set_default_logo.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretInput = process.argv[2] || process.env.ADMIN_PASSWORD || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.argv[3];
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.argv[4];
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.argv[5];
const BUCKET = 'product-images';
const LOGO_FILENAME = 'mp-logo-placeholder.png';

if (!SUPABASE_URL || !secretInput) {
  console.error('\n❌ ERROR: Faltan credenciales o URL de Supabase para operar.');
  console.error('Uso:');
  console.error('  ADMIN_PASSWORD="pass" ADMIN_EMAIL="admin@ejemplo.com" VITE_SUPABASE_URL="https://xyz.supabase.co" VITE_SUPABASE_ANON_KEY="eyJ..." node scripts/set_default_logo.mjs');
  console.error('O con service_role:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY="eyJ..." VITE_SUPABASE_URL="https://xyz.supabase.co" node scripts/set_default_logo.mjs\n');
  process.exit(1);
}

const isServiceRole = secretInput.startsWith('eyJ') && secretInput.length > 50;

if (!isServiceRole && (!ADMIN_EMAIL || !SUPABASE_ANON_KEY)) {
  console.error('\n❌ ERROR: Para autenticar mediante contraseña se requiere ADMIN_EMAIL y VITE_SUPABASE_ANON_KEY.');
  process.exit(1);
}

let supabase;

if (isServiceRole) {
  console.log('🔑 Autenticando mediante service_role key...');
  supabase = createClient(SUPABASE_URL, secretInput, {
    auth: { persistSession: false },
  });
} else {
  console.log(`🔐 Autenticando con usuario administrador: ${ADMIN_EMAIL}...`);
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: secretInput,
  });
  if (error || !data?.session) {
    console.error('❌ Error de autenticación:', error?.message || 'No se pudo iniciar sesión.');
    process.exit(1);
  }
  console.log('✅ Sesión de Administrador iniciada con éxito. Rol:', data.user?.app_metadata?.role || 'autenticado');
}

// 1. Subir logo a Supabase Storage
const logoPath = path.resolve(__dirname, '../public/logo.png');
if (!fs.existsSync(logoPath)) {
  console.error('❌ No se encontró el logo en:', logoPath);
  process.exit(1);
}

console.log('📤 Subiendo logo oficial a Supabase Storage...');
const logoBuffer = fs.readFileSync(logoPath);
const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(LOGO_FILENAME, logoBuffer, {
    contentType: 'image/png',
    upsert: true,
    cacheControl: '31536000',
  });

if (uploadError) {
  console.error('❌ Error al subir logo al Storage:', uploadError);
  process.exit(1);
}

const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(LOGO_FILENAME);
const targetLogoUrl = publicUrlData.publicUrl;
console.log('✅ Logo disponible en URL pública permanente:\n  ', targetLogoUrl);

// 2. Buscar productos con imágenes genéricas de Unsplash o vacías
console.log('\n🔍 Buscando productos con imágenes genéricas de Unsplash...');
const { data: unsplashProducts, error: fetchError } = await supabase
  .from('products')
  .select('id, name, image_url')
  .like('image_url', '%unsplash.com%');

if (fetchError) {
  console.error('❌ Error al consultar productos:', fetchError);
  process.exit(1);
}

console.log(`📦 Se encontraron ${unsplashProducts.length} productos con fotos de Unsplash.`);

// 3. Actualizar productos en la tabla
if (unsplashProducts.length > 0) {
  console.log('⚡ Actualizando productos en la base de datos...');
  const ids = unsplashProducts.map((p) => p.id);

  // Update in batches of 50 to avoid request length limits
  for (let i = 0; i < ids.length; i += 50) {
    const batchIds = ids.slice(i, i + 50);
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: targetLogoUrl, updated_at: new Date().toISOString() })
      .in('id', batchIds);

    if (updateError) {
      console.error(`❌ Error en lote ${i}-${i + batchIds.length}:`, updateError);
      process.exit(1);
    }
    console.log(`  Actualizados ${Math.min(i + 50, ids.length)} / ${ids.length}`);
  }
}

// 4. Verificación final
const { count: remainingUnsplash } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .like('image_url', '%unsplash.com%');

const { count: totalWithLogo } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true })
  .eq('image_url', targetLogoUrl);

console.log('\n📊 Resumen de actualización:');
console.log(`  - Productos actualizados con el logo de MP: ${totalWithLogo}`);
console.log(`  - Productos con Unsplash restantes: ${remainingUnsplash || 0}`);
console.log('\n🎉 ¡Proceso finalizado exitosamente!');
