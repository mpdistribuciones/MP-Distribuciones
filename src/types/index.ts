export type Currency = 'ARS' | 'USD';
export type ViewMode = 'grid' | 'list';
export type SortByOption =
  | 'featured'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'date_desc'
  | 'date_asc';

export type Category =
  | 'NOTEBOOKS'
  | 'CONSOLAS Y GAMERS'
  | 'POLIRUBRO / HOGAR'
  | 'VARIOS'
  | 'SMARTWACHES'
  | 'STREAMING'
  | 'CELULARES / PS5'
  | 'ALMACENAMIENTO'
  | 'INSUMOS'
  | 'CARGADORES NB'
  | 'CARGADOR Y CABLE CELULAR V8'
  | 'CARGADOR Y CABLE CELULAR TIPO C'
  | 'CARGADOR Y CABLE CELULAR IPHONE'
  | 'CABEZALES, CARGADORES AUTO Y TRANSMISORES DE AUTO'
  | 'ACCESORIOS, ADAPTADORES Y CABLES'
  | 'AURICULARES (IN EAR/VINCHA/BLUETOOTH/GAMER)'
  | 'CONECTIVIDAD'
  | 'SEGURIDAD'
  | 'PERIFERICOS: (MOUSE, TECLADOS, PARLANTES, ETC)'
  | 'HARDWARE'
  | string;

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: Category;
  subcategory?: string;
  description: string;
  specs: string[];
  priceUSD: number; // Wholesale price in USD (canonical or converted)
  costUSD?: number; // Cost in USD (private admin field)
  priceCurrency?: 'USD' | 'ARS'; // Currency in which the price was set
  priceARS?: number; // Price in ARS if set in pesos
  costARS?: number; // Cost in ARS (private admin field)
  profitMargin?: number; // Margin % over cost (e.g. 15 for 15%)
  inStock: boolean;
  stockQuantity: number;
  badge?: 'NUEVO' | 'DESTACADO' | 'OFERTA' | 'MÁS VENDIDO' | null;
  imageUrl: string;
  minWholesaleQty?: number;
  createdAt?: string; // ISO date timestamp for sorting
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type UserStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'suspendido';

export interface User {
  id: string;
  businessName: string; // Nombre / Razón Social
  cuit: string; // CUIT / DNI
  city: string; // Localidad / Provincia
  phone: string; // Teléfono / WhatsApp
  email: string;
  isAuthenticated: boolean;
  status: UserStatus;
  registeredAt?: string;
  approvedAt?: string;
  notes?: string;
}

export type InvoiceType = 'Factura A' | 'Factura B' | 'Consumidor Final';

export type DeliveryMethod =
  | 'pickup' // Retiro en local (San Nicolás 2277, Rosario)
  | 'rosario_delivery' // Cadetería / Reparto en Rosario
  | 'interior_shipping'; // Expreso / Encomienda al interior

export interface OrderCheckoutData {
  buyerName: string;
  cuit: string;
  phone: string;
  deliveryMethod: DeliveryMethod;
  shippingAddress: string;
  invoiceType: InvoiceType;
  notes?: string;
}

export type OrderStatus =
  | 'pendiente'
  | 'confirmado'
  | 'cancelado'
  | 'enviado'
  | 'en_preparacion'
  | 'completado';

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  userBusinessName: string;
  buyerName?: string;
  cuit?: string;
  phone?: string;
  date: string; // ISO string
  items: CartItem[];
  totalUSD: number;
  totalARS: number;
  deliveryMethod: DeliveryMethod;
  invoiceType: InvoiceType;
  shippingAddress?: string;
  notes?: string;
  status: OrderStatus;
  confirmedAt?: string;
}

