import openpyxl, urllib.request, re, ssl, time, json
from concurrent.futures import ThreadPoolExecutor

ctx = ssl._create_unverified_context()

wb = openpyxl.load_workbook('LISTA MP PARA WEB.xlsx')
sheet = wb.active

CAT_PREFIX = {
    'NOTEBOOKS': 'NB',
    'CONSOLAS Y GAMERS': 'GAM',
    'POLIRUBRO / HOGAR': 'POLI',
    'VARIOS': 'VAR',
    'SMARTWACHES': 'WAT',
    'STREAMING': 'STR',
    'CELULARES / PS5': 'CEL',
    'ALMACENAMIENTO': 'ALM',
    'INSUMOS': 'INS',
    'CARGADORES NB': 'CNB',
    'CARGADOR Y CABLE CELULAR V8': 'CV8',
    'CARGADOR Y CABLE CELULAR TIPO C': 'CTC',
    'CARGADOR Y CABLE CELULAR IPHONE': 'CIPH',
    'CABEZALES, CARGADORES AUTO Y TRANSMISORES DE AUTO': 'AUTO',
    'ACCESORIOS, ADAPTADORES Y CABLES': 'CAB',
    'AURICULARES (IN EAR/VINCHA/BLUETOOTH/GAMER)': 'AUR',
    'CONECTIVIDAD': 'CON',
    'SEGURIDAD': 'SEG',
    'PERIFERICOS: (MOUSE, TECLADOS, PARLANTES, ETC)': 'PER',
    'HARDWARE': 'HDW',
}

BRANDS = [
    'ACER', 'HP', 'LENOVO', 'GFAST', 'NETMAK', 'SONY', 'LOGITECH', 'KINGSTON', 
    'SANDISK', 'WD', 'WESTERN DIGITAL', 'SEAGATE', 'TP-LINK', 'MERCUSYS', 'GENIUS', 
    'REDRAGON', 'DAHUA', 'HIKVISION', 'XIAOMI', 'SAMSUNG', 'MOTOROLA', 'APPLE', 
    'INTEL', 'AMD', 'ASUS', 'GIGABYTE', 'MSI', 'SENTEY', 'NOGA', 'KANJI', 'KOLKE', 
    'SOUL', 'NISUTA', 'SEISA', 'OVERTECH', 'PHILIPS', 'T-DAGGER', 'HYPERX', 'AEROCOOL',
    'COOLER MASTER', 'CORSAIR', 'RAZER', 'JBL', 'HAVIT', 'T&G', 'KOBE', 'SUONO', 
    'LEVEL UP', 'DYNACOM', 'XAEA', 'IBEK', 'MARVO', 'MEGABOX', 'STORM', 'ARCTIC'
]

raw_items = []
current_cat = 'VARIOS'
cat_counts = {}

for r in range(2, sheet.max_row + 1):
    cell_a = sheet.cell(row=r, column=1).value
    cell_b = sheet.cell(row=r, column=2).value
    cell_c = sheet.cell(row=r, column=3).value
    cell_d = sheet.cell(row=r, column=4).value
    cell_e = sheet.cell(row=r, column=5)

    if cell_b is None:
        continue

    # Category header
    if cell_a == 'STOCK' or cell_c is None:
        current_cat = str(cell_b).strip()
        continue

    name = str(cell_b).strip()
    if not name:
        continue

    # Stock
    try:
        stk = int(float(cell_a or 0))
    except:
        stk = 0

    # Price USD
    clean_p = str(cell_c).upper().replace('USD', '').replace('U$S', '').replace('$', '').strip()
    if '.' in clean_p and ',' in clean_p:
        clean_p = clean_p.replace('.', '').replace(',', '.')
    elif ',' in clean_p:
        clean_p = clean_p.replace(',', '.')
    try:
        price_usd = round(float(clean_p), 2)
    except:
        price_usd = 10.0

    # Cost
    try:
        cost = float(cell_d or 0)
    except:
        cost = 0

    url = cell_e.hyperlink.target if cell_e.hyperlink else (str(cell_e.value).strip() if cell_e.value and str(cell_e.value).startswith('http') else None)

    # Generate SKU
    prefix = CAT_PREFIX.get(current_cat, 'GEN')
    cat_counts[current_cat] = cat_counts.get(current_cat, 0) + 1
    sku = f"MP-{prefix}-{cat_counts[current_cat]:03d}"

    # Extract brand
    brand = 'Genérico'
    name_upper = name.upper()
    for b in BRANDS:
        if b in name_upper:
            brand = b.capitalize()
            break

    raw_items.append({
        'id': f"mp_prod_{len(raw_items) + 1:04d}",
        'sku': sku,
        'name': name,
        'brand': brand,
        'category': current_cat,
        'stock': stk,
        'price_usd': price_usd,
        'cost': cost,
        'original_url': url
    })

print(f"Extracted {len(raw_items)} items across {len(cat_counts)} categories.")

# Resolve URLs to high-speed CDN
def resolve_url(entry):
    idx, url = entry
    if not url:
        return idx, None
    if 'drive.google.com' in url:
        m = re.search(r'/d/([a-zA-Z0-9_-]+)', url) or re.search(r'id=([a-zA-Z0-9_-]+)', url)
        if m:
            return idx, f"https://lh3.googleusercontent.com/d/{m.group(1)}=s800"
        return idx, url
    if 'photos.app.goo.gl' in url or 'photos.google.com' in url:
        for _ in range(2):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'})
                with urllib.request.urlopen(req, context=ctx, timeout=6) as resp:
                    html = resp.read().decode('utf-8', errors='ignore')
                m = re.search(r'property=\"og:image\" content=\"([^\"]+)\"', html)
                if m:
                    direct = re.sub(r'=w\d+-h\d+.*$', '=s800', m.group(1))
                    return idx, direct
            except Exception:
                time.sleep(0.3)
    return idx, url

links_to_resolve = [(i, item['original_url']) for i, item in enumerate(raw_items) if item['original_url']]
print(f"Resolving {len(links_to_resolve)} photo links in parallel...")

t0 = time.time()
with ThreadPoolExecutor(max_workers=35) as ex:
    for idx, direct_url in ex.map(resolve_url, links_to_resolve):
        raw_items[idx]['direct_url'] = direct_url

print(f"URLs resolved in {time.time() - t0:.2f}s!")

# Prepare final Products
DEFAULT_PLACEHOLDER = "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80"
final_products = []

for item in raw_items:
    img = item.get('direct_url') or DEFAULT_PLACEHOLDER
    badge = None
    if item['stock'] > 25:
        badge = 'MÁS VENDIDO'
    elif item['stock'] > 15:
        badge = 'DESTACADO'

    final_products.append({
        'id': item['id'],
        'sku': item['sku'],
        'name': item['name'],
        'brand': item['brand'],
        'category': item['category'],
        'description': f"{item['name']}. Distribución oficial mayorista en Rosario, Santa Fe. Garantía oficial MP Distribuciones.",
        'specs': [
            f"Rubro: {item['category']}",
            f"Marca: {item['brand']}",
            "Disponibilidad Inmediata para Gremios y Revendedores",
            "Garantía oficial directa MP Distribuciones"
        ],
        'priceUSD': item['price_usd'],
        'priceCurrency': 'USD',
        'inStock': item['stock'] > 0,
        'stockQuantity': item['stock'],
        'minWholesaleQty': 1,
        'badge': badge,
        'imageUrl': img,
        'createdAt': "2026-11-03T20:00:00.000Z"
    })

# Write src/data/products.ts
ts_content = f"""import {{ Product }} from '../types';

// ==============================================================================
// CATÁLOGO OFICIAL MP DISTRIBUCIONES (ROSARIO, SANTA FE)
// Procesado y sincronizado automáticamente desde LISTA MP PARA WEB.xlsx
// Total Artículos: {len(final_products)}
// ==============================================================================
export const PRODUCTS: Product[] = {json.dumps(final_products, ensure_ascii=False, indent=2)};
"""

with open('src/data/products.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("Generated src/data/products.ts successfully!")

# Write clean processed Excel file: LISTA_MP_OFICIAL_PROCESADA.xlsx
new_wb = openpyxl.Workbook()
ws = new_wb.active
ws.title = "Lista de Precios Oficial"

headers = [
    "SKU", "Producto", "Marca", "Rubro", 
    "Precio USD", "Stock Mayorista", "Estado", "URL Foto"
]
ws.append(headers)

for p in final_products:
    ws.append([
        p['sku'],
        p['name'],
        p['brand'],
        p['category'],
        p['priceUSD'],
        p['stockQuantity'],
        "Disponible" if p['inStock'] else "Agotado",
        p['imageUrl']
    ])

# Adjust column widths
for col in ws.columns:
    max_len = max(len(str(cell.value or '')) for cell in col)
    col_letter = openpyxl.utils.get_column_letter(col[0].column)
    ws.column_dimensions[col_letter].width = min(max(max_len + 2, 12), 65)

new_wb.save('LISTA_MP_OFICIAL_PROCESADA.xlsx')
print("Generated LISTA_MP_OFICIAL_PROCESADA.xlsx successfully!")

# Generate SQL seed file for Supabase: seed_catalog.sql
sql_lines = [
    "-- Script de Carga Masiva Oficial de Catálogo MP Distribuciones",
    "-- Ejecutar en SQL Editor de Supabase",
    "TRUNCATE TABLE public.products;\n"
]

for p in final_products:
    esc_name = p['name'].replace("'", "''")
    esc_brand = p['brand'].replace("'", "''")
    esc_cat = p['category'].replace("'", "''")
    esc_desc = p['description'].replace("'", "''")
    esc_specs = json.dumps(p['specs']).replace("'", "''")
    badge_val = f"'{p['badge']}'" if p['badge'] else "NULL"
    in_stk_val = "true" if p['inStock'] else "false"
    
    sql_lines.append(
        f"INSERT INTO public.products (id, sku, name, brand, category, description, specs, price_usd, price_ars, price_currency, in_stock, stock_quantity, min_wholesale_qty, badge, image_url, created_at, updated_at) "
        f"VALUES ('{p['id']}', '{p['sku']}', '{esc_name}', '{esc_brand}', '{esc_cat}', '{esc_desc}', '{esc_specs}'::jsonb, {p['priceUSD']}, 0, 'USD', {in_stk_val}, {p['stockQuantity']}, 1, {badge_val}, '{p['imageUrl']}', NOW(), NOW());"
    )

with open('seed_catalog.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"Generated seed_catalog.sql with {len(final_products)} inserts!")
