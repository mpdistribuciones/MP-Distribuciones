import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Order, User, UserStatus } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from './constants';

export { DEFAULT_PRODUCT_IMAGE };

const STORAGE_KEY_SUPABASE_URL = 'mp_supabase_url';
const STORAGE_KEY_SUPABASE_KEY = 'mp_supabase_anon_key';

// Read configuration from Vite env or localStorage override
export const getSupabaseConfig = (): { url: string; key: string } => {
  const metaEnv = (import.meta as any).env || {};
  const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
  const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();
  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_URL) || '' : '').trim();
  const localKey = (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE_KEY) || '' : '').trim();

  return {
    url: localUrl || envUrl,
    key: localKey || envKey,
  };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return (
    Boolean(url) &&
    Boolean(key) &&
    url.startsWith('https://') &&
    url.includes('supabase.co') &&
    key.length > 20
  );
};

let cachedClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;
  const { url, key } = getSupabaseConfig();
  if (isSupabaseConfigured()) {
    try {
      cachedClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return cachedClient;
    } catch (e) {
      console.warn('[Supabase] Error al inicializar cliente:', e);
      return null;
    }
  }
  return null;
};

export const saveSupabaseConfig = (url: string, key: string) => {
  const cleanUrl = url.trim();
  const cleanKey = key.trim();
  localStorage.setItem(STORAGE_KEY_SUPABASE_URL, cleanUrl);
  localStorage.setItem(STORAGE_KEY_SUPABASE_KEY, cleanKey);
  cachedClient = null; // Reset cached client to force re-instantiation
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEY_SUPABASE_KEY);
  cachedClient = null;
};

// ==========================================
// Mappers: Product <-> Supabase DB Row
// ==========================================
export const productToDb = (p: Product) => {
  const priceUSD = Number(p.priceUSD) || 0;
  const priceARS = Math.round(Number(p.priceARS) || (priceUSD ? priceUSD * 1350 : 0));

  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand || 'Genérico',
    category: p.category,
    subcategory: p.subcategory || null,
    description: p.description || '',
    specs: p.specs || [],
    price_usd: priceUSD,
    price_ars: priceARS,
    price_currency: p.priceCurrency || (priceUSD ? 'USD' : 'ARS'),
    in_stock: Boolean(p.inStock),
    stock_quantity: Math.max(0, Number(p.stockQuantity) || 0),
    min_wholesale_qty: Number(p.minWholesaleQty) || 1,
    badge: p.badge || null,
    image_url: p.imageUrl || DEFAULT_PRODUCT_IMAGE,
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const productCostToDb = (p: Product) => {
  const margin = p.profitMargin != null ? Number(p.profitMargin) : 15;
  const priceUSD = Number(p.priceUSD) || 0;
  const priceARS = Number(p.priceARS) || Math.round(priceUSD * 1350);
  const costUSD =
    p.costUSD != null
      ? Number(p.costUSD)
      : priceUSD > 0
      ? Number((priceUSD / (1 + margin / 100)).toFixed(2))
      : 0;
  const costARS =
    p.costARS != null
      ? Number(p.costARS)
      : priceARS > 0
      ? Math.round(priceARS / (1 + margin / 100))
      : 0;

  return {
    product_id: p.id,
    cost_usd: costUSD,
    cost_ars: costARS,
    profit_margin: margin,
    updated_at: new Date().toISOString(),
  };
};

export const dbToProduct = (row: any, costRow?: any): Product => {
  const priceUSD = Number(row.price_usd) || 0;
  const priceARS = Number(row.price_ars) || undefined;
  const profitMargin =
    costRow?.profit_margin != null
      ? Number(costRow.profit_margin)
      : row.profit_margin != null
      ? Number(row.profit_margin)
      : undefined;
  const costUSD =
    costRow?.cost_usd != null
      ? Number(costRow.cost_usd)
      : row.cost_usd != null
      ? Number(row.cost_usd)
      : undefined;
  const costARS =
    costRow?.cost_ars != null
      ? Number(costRow.cost_ars)
      : row.cost_ars != null
      ? Number(row.cost_ars)
      : undefined;

  return {
    id: String(row.id),
    sku: String(row.sku),
    name: String(row.name),
    brand: String(row.brand || 'Genérico'),
    category: row.category,
    subcategory: row.subcategory || undefined,
    description: row.description || '',
    specs: Array.isArray(row.specs) ? row.specs : [],
    priceUSD,
    costUSD,
    priceARS,
    costARS,
    profitMargin,
    priceCurrency: row.price_currency === 'USD' ? 'USD' : 'ARS',
    inStock: Boolean(row.in_stock),
    stockQuantity: Number(row.stock_quantity) || 0,
    minWholesaleQty: Number(row.min_wholesale_qty) || 1,
    badge: row.badge || undefined,
    imageUrl:
      row.image_url && !row.image_url.includes('unsplash.com')
        ? row.image_url
        : DEFAULT_PRODUCT_IMAGE,
    createdAt: row.created_at || new Date().toISOString(),
  };
};

// ==========================================
// Mappers: Order <-> Supabase DB Row
// ==========================================
export const orderToDb = (o: Order) => {
  return {
    id: o.id,
    order_number: o.orderNumber,
    user_id: o.userId || null,
    user_business_name: o.userBusinessName || o.buyerName || '',
    customer_name: o.buyerName || o.userBusinessName || '',
    customer_phone: o.phone || '',
    customer_cuit: o.cuit || '',
    shipping_address: o.shippingAddress || '',
    notes: o.notes || '',
    items: o.items || [],
    total_usd: Number(o.totalUSD) || 0,
    total_ars: Math.round(Number(o.totalARS) || 0),
    delivery_method: o.deliveryMethod || 'pickup',
    invoice_type: o.invoiceType || 'B',
    status: o.status || 'pendiente',
    date: o.date || new Date().toISOString(),
  };
};

export const dbToOrder = (row: any): Order => {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    userId: row.user_id || undefined,
    userBusinessName: row.user_business_name || row.customer_name || 'Comercio B2B',
    buyerName: row.customer_name || row.user_business_name || 'Comercio B2B',
    cuit: row.customer_cuit || '',
    phone: row.customer_phone || '',
    shippingAddress: row.shipping_address || undefined,
    notes: row.notes || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    totalUSD: Number(row.total_usd) || 0,
    totalARS: Number(row.total_ars) || 0,
    deliveryMethod: row.delivery_method || 'pickup',
    invoiceType: row.invoice_type || 'B',
    status: (row.status as any) || 'pendiente',
    date: row.date || new Date().toISOString(),
  };
};

// ==========================================
// Mappers: B2B User / Customer <-> Supabase DB Row
// ==========================================
export const b2bUserToDb = (u: User) => {
  return {
    id: u.id,
    business_name: u.businessName,
    cuit: u.cuit,
    city: u.city || '',
    phone: u.phone,
    email: u.email,
    status: u.status || 'pendiente',
    notes: u.notes || '',
    created_at: u.registeredAt || new Date().toISOString(),
    approved_at: u.approvedAt || null,
  };
};

export const dbToB2bUser = (row: any): User => {
  return {
    id: String(row.id),
    businessName: row.business_name || 'Comercio B2B',
    cuit: row.cuit || '',
    city: row.city || '',
    phone: row.phone || '',
    email: row.email || '',
    status: (row.status as UserStatus) || 'pendiente',
    notes: row.notes || undefined,
    isAuthenticated: row.status === 'aprobado',
    registeredAt: row.created_at || new Date().toISOString(),
    approvedAt: row.approved_at || undefined,
  };
};

// ==========================================
// Storage: Subida de imágenes a Supabase
// ==========================================
export const uploadProductImage = async (fileOrBlob: Blob, filename?: string): Promise<string | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const ext = 'jpg';
    const cleanName = `${Date.now()}_${(filename || 'prod').replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    const filePath = `products/${cleanName}`;

    const { error: uploadError } = await client.storage
      .from('product-images')
      .upload(filePath, fileOrBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Supabase Storage] No se pudo subir imagen a Storage:', uploadError.message);
      return null;
    }

    const { data } = client.storage.from('product-images').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (err) {
    console.warn('[Supabase Storage] Error inesperado en upload:', err);
    return null;
  }
};
