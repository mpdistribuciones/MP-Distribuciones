export type Currency = 'ARS' | 'USD';
export type DollarRateKey = 'dolar1' | 'dolar2' | 'dolar3';

export interface DollarRateConfig {
  key: DollarRateKey;
  label: string;
  rate: number;
}

export type DollarRatesMap = Record<DollarRateKey, DollarRateConfig>;

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
  name: string;
  category: Category;
  subcategory?: string;
  description: string;
  specs: string[];
  priceUSD: number; // Wholesale price in USD (internal admin reference)
  costUSD?: number; // Cost in USD (private admin field)
  priceCurrency?: 'USD' | 'ARS'; // Currency in which the cost/price was set ('USD' or 'ARS')
  dollarRateKey?: DollarRateKey; // Which of the 3 admin dollar rates applies (private admin field)
  priceARS?: number; // Final wholesale selling price in Pesos ($ ARS) shown to customer
  costARS?: number; // Cost in ARS (private admin field)
  profitMargin?: number; // Punctual percentage % over cost (private admin field)
  inStock: boolean;
  stockQuantity: number;
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

