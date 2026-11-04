// Migra las fotos de Google Photos (lh3.googleusercontent.com) al bucket público
// `product-images` de Supabase Storage y actualiza products.image_url.
// Uso: node scripts/migrate_images_to_storage.mjs
// Es idempotente: solo procesa productos cuya image_url todavía apunta a Google.
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const BUCKET = 'product-images';
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://ntalnljwhogbeaorhnlr.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_VlJkOSK-7Zx1qiv0tr8SWA_JEd7VjP3'
);

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (!error && buckets?.some((b) => b.id === BUCKET)) {
    console.log(`Bucket "${BUCKET}" ya existe.`);
    return;
  }
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (createErr) {
    // Con la clave anon no se pueden listar/crear buckets; el bucket se crea desde supabase-schema.sql.
    console.log(`No se pudo verificar/crear el bucket con la clave anon (${createErr.message}). Se asume creado por supabase-schema.sql.`);
  } else {
    console.log(`Bucket "${BUCKET}" creado.`);
  }
}

async function fetchAllGooglePhotoProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('products')
      .select('id, image_url')
      .like('image_url', '%googleusercontent.com%')
      .order('id')
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

async function migrateOne(row) {
  const res = await fetch(row.image_url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`descarga HTTP ${res.status}`);
  const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!type.startsWith('image/')) throw new Error(`content-type inesperado: ${type}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const path = `${row.id}.${EXT[type] || 'jpg'}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, { contentType: type, upsert: true, cacheControl: '31536000' });
  if (upErr) throw new Error(`upload: ${upErr.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const { error: dbErr } = await supabase.from('products').update({ image_url: data.publicUrl }).eq('id', row.id);
  if (dbErr) throw new Error(`update: ${dbErr.message}`);
  return data.publicUrl;
}

async function main() {
  await ensureBucket();
  const rows = await fetchAllGooglePhotoProducts();
  console.log(`Productos con foto en Google a migrar: ${rows.length}`);

  let ok = 0;
  const failed = [];
  const CONCURRENCY = 8;
  let idx = 0;

  async function worker() {
    while (idx < rows.length) {
      const row = rows[idx++];
      try {
        await migrateOne(row);
        ok++;
      } catch (e) {
        failed.push({ id: row.id, error: e.message });
      }
      const done = ok + failed.length;
      if (done % 25 === 0 || done === rows.length) console.log(`  ${done}/${rows.length} (ok: ${ok}, fallidas: ${failed.length})`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nMigradas: ${ok} | Fallidas: ${failed.length}`);
  if (failed.length) console.log(failed.slice(0, 20));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
