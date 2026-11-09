import React, { createContext, useContext, useState, useEffect } from 'react';
import { Currency, Product, CartItem, User, UserStatus, SortByOption, ViewMode, Order, OrderStatus } from '../types';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  productToDb,
  dbToProduct,
  orderToDb,
  dbToOrder,
  b2bUserToDb,
  dbToB2bUser,
  saveSupabaseConfig,
} from '../lib/supabase';

interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  message: string;
}

interface AppContextType {
  // Currency & Exchange Rate
  currency: Currency;
  setCurrency: (c: Currency) => void;
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  formatPrice: (priceUSD: number, customCurrency?: Currency) => string;
  fetchBnaRate: () => Promise<number | null>;
  isFetchingBnaRate: boolean;
  lastBnaSyncDate?: string;

  // Products Management
  products: Product[];
  addProduct: (newProduct: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: string, updatedData: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateStock: (id: string, newStock: number) => Promise<boolean>;
  updatePrice: (id: string, newPrice: number, priceCurrency?: 'USD' | 'ARS') => Promise<boolean>;
  updateProductFinancials: (
    id: string,
    financials: {
      priceUSD: number;
      priceARS: number;
      costUSD: number;
      costARS: number;
      profitMargin: number;
      priceCurrency?: 'USD' | 'ARS';
    }
  ) => Promise<void>;
  applyPercentagePriceAdjustment: (percentage: number) => Promise<boolean>;
  bulkUpdateProducts: (updatedList: Product[]) => Promise<boolean>;
  replaceProducts: (updatedList: Product[]) => Promise<void>;
  clearAllProducts: () => Promise<void>;
  isCatalogLoading: boolean;
  resetProductsToDefault: () => void;

  // Admin Session
  isAdminLoggedIn: boolean;
  isAdminModalOpen: boolean;
  isAdminView: boolean;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  loginAdmin: (email: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  setIsAdminView: (val: boolean) => void;

  // Auth / B2B User & Customer Accounts Management
  user: User | null;
  b2bUsers: User[];
  login: (identifierOrData: string | Partial<User>) => Promise<{
    success: boolean;
    user?: User;
    message?: string;
    status?: UserStatus | 'not_found';
  }>;
  register: (userData: Omit<User, 'id' | 'isAuthenticated' | 'status'>) => Promise<{
    success: boolean;
    user?: User;
    message?: string;
  }>;
  logout: () => void;
  approveUser: (userId: string) => Promise<boolean>;
  rejectUser: (userId: string) => Promise<boolean>;
  suspendUser: (userId: string) => Promise<boolean>;
  deleteB2bUser: (userId: string) => Promise<boolean>;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;

  // Order History & Management
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'>) => Order;
  repeatOrder: (order: Order) => void;
  confirmOrder: (
    orderId: string,
    options?: {
      allowNegativeStock?: boolean;
      adjustedItems?: { productId: string; quantity: number }[];
    }
  ) => Promise<{
    success: boolean;
    error?: string;
    shortages?: { item: CartItem; available: number; requested: number }[];
  }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  isOrderHistoryModalOpen: boolean;
  openOrderHistoryModal: () => void;
  closeOrderHistoryModal: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  setItemQuantity: (product: Product, quantity: number) => void;
  cartTotalUSD: number;
  cartTotalARS: number;
  cartCount: number;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;

  // Checkout
  isCheckoutModalOpen: boolean;
  openCheckoutModal: () => void;
  closeCheckoutModal: () => void;

  // Exchange rate modal
  isExchangeRateModalOpen: boolean;
  openExchangeRateModal: () => void;
  closeExchangeRateModal: () => void;

  // Product detail modal
  selectedProduct: Product | null;
  openProductDetail: (p: Product) => void;
  closeProductDetail: () => void;

  // View Mode & Filter state
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  isOutletOnly: boolean;
  setIsOutletOnly: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string; // 'ALL' or Category
  setSelectedCategory: (c: string) => void;
  stockFilter: 'all' | 'in_stock';
  setStockFilter: (f: 'all' | 'in_stock') => void;
  sortBy: SortByOption;
  setSortBy: (s: SortByOption) => void;

  // Supabase Cloud Sync
  isSupabaseConnected: boolean;
  isSyncingSupabase: boolean;
  syncWithSupabase: () => Promise<void>;
  uploadAllToSupabase: () => Promise<void>;
  updateSupabaseCredentials: (url: string, key: string) => Promise<boolean>;

  // Toasts
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_USER = 'mp_distribuciones_user_v1';
const LOCAL_STORAGE_KEY_CART = 'mp_distribuciones_cart_v1';
const LOCAL_STORAGE_KEY_CURRENCY = 'mp_distribuciones_currency_v1';
const LOCAL_STORAGE_KEY_EXCHANGE = 'mp_distribuciones_exchange_rate_v1';
const LOCAL_STORAGE_KEY_PRODUCTS = 'mp_distribuciones_products_v2';
const LOCAL_STORAGE_KEY_ORDERS = 'mp_distribuciones_orders_v1';
const LOCAL_STORAGE_KEY_B2B_USERS = 'mp_distribuciones_b2b_users_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Currency State
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENCY);
    return saved === 'USD' ? 'USD' : 'ARS';
  });

  const [exchangeRate, setExchangeRateState] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY_EXCHANGE);
    return saved ? Number(saved) : 1350;
  });

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem(LOCAL_STORAGE_KEY_CURRENCY, c);
  };

  const setExchangeRate = (rate: number) => {
    const safeRate = Math.max(1, rate);
    setExchangeRateState(safeRate);
    localStorage.setItem(LOCAL_STORAGE_KEY_EXCHANGE, safeRate.toString());
  };

  // Banco Nación Official Dollar Auto-Sync
  const [isFetchingBnaRate, setIsFetchingBnaRate] = useState<boolean>(false);
  const [lastBnaSyncDate, setLastBnaSyncDate] = useState<string | undefined>();

  const fetchBnaRate = async (): Promise<number | null> => {
    setIsFetchingBnaRate(true);
    try {
      const res = await fetch('https://dolarapi.com/v1/dolares/oficial');
      if (res.ok) {
        const data = await res.json();
        const venta = data.venta;
        if (typeof venta === 'number' && venta > 0) {
          setExchangeRateState(venta);
          localStorage.setItem(LOCAL_STORAGE_KEY_EXCHANGE, venta.toString());
          setLastBnaSyncDate(data.fechaActualizacion || new Date().toISOString());
          return venta;
        }
      }
      return null;
    } catch (err) {
      console.warn('[BNA Auto-Sync] Error al obtener cotización del Banco Nación, se mantiene cotización actual.', err);
      return null;
    } finally {
      setIsFetchingBnaRate(false);
    }
  };

  useEffect(() => {
    fetchBnaRate();
  }, []);

  // Products State & Persistence
  // La fuente de verdad es Supabase. localStorage solo actúa como caché para mostrar el catálogo al instante.
  const [products, setProducts] = useState<Product[]>(() => {
    const initialRate = Number(localStorage.getItem(LOCAL_STORAGE_KEY_EXCHANGE)) || 1350;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_PRODUCTS);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: Product, index: number) => {
            const fallbackDate = new Date(Date.now() - index * 86400000 * 2).toISOString();
            const createdAt = item.createdAt || fallbackDate;
            const priceCurrency = item.priceCurrency || (item.priceARS && !item.priceUSD ? 'ARS' : 'USD');
            const priceUSD = typeof item.priceUSD === 'number' && item.priceUSD > 0
              ? item.priceUSD
              : item.priceARS
              ? Number((item.priceARS / initialRate).toFixed(2))
              : 10;
            const priceARS = typeof item.priceARS === 'number' && item.priceARS > 0
              ? item.priceARS
              : Math.round(priceUSD * initialRate);

            return {
              ...item,
              createdAt,
              priceCurrency,
              priceUSD,
              priceARS,
            };
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.warn('Could not save products to localStorage:', e);
    }
  }, [products]);

  // Sincronizar carrito cuando se actualizan precios o stock desde el catálogo
  useEffect(() => {
    setCart((prevCart) => {
      let changed = false;
      const updatedCart = prevCart
        .map((item) => {
          const liveProduct = products.find((p) => p.id === item.product.id);
          if (!liveProduct) return item;
          const newQty = Math.min(item.quantity, liveProduct.stockQuantity);
          if (
            liveProduct.priceUSD !== item.product.priceUSD ||
            liveProduct.stockQuantity !== item.product.stockQuantity ||
            liveProduct.inStock !== item.product.inStock ||
            newQty !== item.quantity
          ) {
            changed = true;
            return { product: liveProduct, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0 && item.product.inStock);
      return changed ? updatedCart : prevCart;
    });
  }, [products]);

  // Admin Session (Supabase Auth). Solo cuenta como administrador un usuario autenticado
  // cuyo app_metadata.role sea 'admin' (el mismo criterio que usan las políticas RLS).
  const isAdminUser = (u: { app_metadata?: Record<string, any> } | null | undefined): boolean =>
    u?.app_metadata?.role === 'admin';

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setIsAdminLoggedIn(isAdminUser(data.session?.user));
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      const isAdmin = isAdminUser(session?.user);
      setIsAdminLoggedIn(isAdmin);
      if (!isAdmin) setIsAdminView(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const openAdminModal = () => setIsAdminModalOpen(true);
  const closeAdminModal = () => setIsAdminModalOpen(false);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    const client = getSupabaseClient();
    if (!client) {
      showToast('No hay conexión configurada con Supabase.', 'error');
      return false;
    }
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      showToast('Email o contraseña de administrador incorrectos.', 'error');
      return false;
    }
    if (!isAdminUser(data.user)) {
      await client.auth.signOut();
      showToast('Esta cuenta no tiene permisos de administrador.', 'error');
      return false;
    }
    setIsAdminLoggedIn(true);
    setIsAdminModalOpen(false);
    setIsAdminView(true);
    showToast('Acceso de Administrador verificado con éxito.', 'success');
    syncWithSupabase();
    return true;
  };

  const logoutAdmin = () => {
    getSupabaseClient()?.auth.signOut();
    setIsAdminLoggedIn(false);
    setIsAdminView(false);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        costUSD: undefined,
        costARS: undefined,
        profitMargin: undefined,
      }))
    );
    setOrders([]);
    showToast('Sesión de Administrador cerrada.', 'info');
  };

  const addProduct = async (newProductData: Omit<Product, 'id'>): Promise<boolean> => {
    const id = 'prod_' + Date.now() + Math.random().toString(36).substring(2, 6);
    const newProduct: Product = {
      ...newProductData,
      id,
      createdAt: newProductData.createdAt || new Date().toISOString(),
    };

    // Supabase Cloud Persist
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: prodErr } = await client
          .from('products')
          .insert([productToDb(newProduct)]);

        if (prodErr) {
          console.error('[Supabase Add Product Error]:', prodErr);
          showToast(`Error al guardar en Supabase: ${prodErr.message}`, 'error');
          await syncWithSupabase();
          return false;
        }

        if (newProduct.costUSD != null || newProduct.profitMargin != null) {
          const { error: costErr } = await client
            .from('product_costs')
            .upsert({
              product_id: id,
              cost_usd: newProduct.costUSD || 0,
              cost_ars: newProduct.costARS || 0,
              profit_margin: newProduct.profitMargin ?? 15,
              updated_at: new Date().toISOString(),
            });

          if (costErr) {
            console.error('[Supabase Add Product Costs Error]:', costErr);
            showToast(`Producto creado, pero falló el registro de costos: ${costErr.message}`, 'warning');
          }
        }
      } catch (err: any) {
        console.error('[Network Error on Add Product]:', err);
        showToast(`Fallo de conexión al guardar producto: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts((prev) => [newProduct, ...prev]);
    showToast(`Artículo "${newProduct.name.slice(0, 28)}..." creado exitosamente.`, 'success');
    return true;
  };

  const updateProduct = async (id: string, updatedData: Partial<Product>): Promise<boolean> => {
    const existing = products.find((p) => p.id === id);
    const targetUpdated: Product | null = existing ? { ...existing, ...updatedData } : null;

    if (!targetUpdated) {
      showToast('Producto no encontrado en inventario.', 'error');
      return false;
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: prodErr } = await client
          .from('products')
          .upsert(productToDb(targetUpdated));

        if (prodErr) {
          console.error('[Supabase Update Product Error]:', prodErr);
          showToast(`Error al actualizar en Supabase: ${prodErr.message}`, 'error');
          await syncWithSupabase();
          return false;
        }

        if (targetUpdated.costUSD != null || targetUpdated.profitMargin != null) {
          const { error: costErr } = await client
            .from('product_costs')
            .upsert({
              product_id: id,
              cost_usd: targetUpdated.costUSD || 0,
              cost_ars: targetUpdated.costARS || 0,
              profit_margin: targetUpdated.profitMargin ?? 15,
              updated_at: new Date().toISOString(),
            });

          if (costErr) {
            console.error('[Supabase Update Product Costs Error]:', costErr);
            showToast(`Producto actualizado, pero falló el guardado de costos: ${costErr.message}`, 'warning');
          }
        }
      } catch (err: any) {
        console.error('[Network Error on Update Product]:', err);
        showToast(`Fallo de conexión al actualizar producto: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return targetUpdated || p;
        }
        return p;
      })
    );
    showToast('Producto actualizado en catálogo.', 'success');
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[Supabase Delete Product Error]:', error);
          showToast(`Error al eliminar en Supabase: ${error.message}`, 'error');
          await syncWithSupabase();
          return false;
        }
      } catch (err: any) {
        console.error('[Network Error on Delete Product]:', err);
        showToast(`Fallo de conexión al eliminar: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCart((prev) => prev.filter((item) => item.product.id !== id));
    showToast('Producto eliminado del inventario.', 'info');
    return true;
  };

  const updateStock = async (id: string, newStock: number): Promise<boolean> => {
    const safeStock = Math.max(0, newStock);
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('products')
          .update({
            stock_quantity: safeStock,
            in_stock: safeStock > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) {
          console.error('[Supabase Update Stock Error]:', error);
          showToast(`Error al actualizar stock en Supabase: ${error.message}`, 'error');
          await syncWithSupabase();
          return false;
        }
      } catch (err: any) {
        console.error('[Network Error on Update Stock]:', err);
        showToast(`Fallo de conexión al actualizar stock: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, stockQuantity: safeStock, inStock: safeStock > 0 }
          : p
      )
    );
    return true;
  };

  const updatePrice = async (
    id: string,
    newPrice: number,
    priceCurrency: 'USD' | 'ARS' = 'USD'
  ): Promise<boolean> => {
    const safePrice = Math.max(0.01, newPrice);
    const existing = products.find((p) => p.id === id);
    if (!existing) {
      showToast('Producto no encontrado.', 'error');
      return false;
    }

    let safeUSD = 0;
    let safeARS = 0;
    let actualCurrency: 'USD' | 'ARS' = priceCurrency;
    let newMargin = 15;

    const costUSD = existing.costUSD != null
      ? existing.costUSD
      : (existing.priceUSD > 0 ? Number((existing.priceUSD / 1.15).toFixed(2)) : 0);
    const costARS = existing.costARS != null
      ? existing.costARS
      : (existing.priceARS ? Math.round(existing.priceARS / 1.15) : Math.round(costUSD * exchangeRate));

    if (priceCurrency === 'ARS') {
      safeARS = Math.round(safePrice);
      safeUSD = Number((safeARS / exchangeRate).toFixed(2));
      actualCurrency = 'ARS';
      newMargin = costARS > 0 ? Number((((safeARS - costARS) / costARS) * 100).toFixed(2)) : 0;
    } else {
      safeUSD = Number(safePrice.toFixed(2));
      safeARS = Math.round(safeUSD * exchangeRate);
      actualCurrency = 'USD';
      newMargin = costUSD > 0 ? Number((((safeUSD - costUSD) / costUSD) * 100).toFixed(2)) : 0;
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error: pErr } = await client
          .from('products')
          .update({
            price_usd: safeUSD,
            price_ars: safeARS,
            price_currency: actualCurrency,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (pErr) {
          console.error('[Supabase Update Price Error]:', pErr);
          showToast(`Error al actualizar precio en Supabase: ${pErr.message}`, 'error');
          await syncWithSupabase();
          return false;
        }

        const { error: cErr } = await client
          .from('product_costs')
          .upsert({
            product_id: id,
            cost_usd: costUSD,
            cost_ars: costARS,
            profit_margin: newMargin,
            updated_at: new Date().toISOString(),
          });

        if (cErr) {
          console.error('[Supabase Update Cost Error]:', cErr);
        }
      } catch (err: any) {
        console.error('[Network Error on Update Price]:', err);
        showToast(`Fallo de conexión al actualizar precio: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              priceUSD: safeUSD,
              priceARS: safeARS,
              costUSD,
              costARS,
              profitMargin: newMargin,
              priceCurrency: actualCurrency,
            }
          : p
      )
    );
    return true;
  };

  const updateProductFinancials = async (
    id: string,
    financials: {
      priceUSD: number;
      priceARS: number;
      costUSD: number;
      costARS: number;
      profitMargin: number;
      priceCurrency?: 'USD' | 'ARS';
    }
  ) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          priceUSD: financials.priceUSD,
          priceARS: financials.priceARS,
          costUSD: financials.costUSD,
          costARS: financials.costARS,
          profitMargin: financials.profitMargin,
          priceCurrency: financials.priceCurrency || p.priceCurrency,
        };
      })
    );

    const client = getSupabaseClient();
    if (client) {
      const updatePayload: Record<string, any> = {
        price_usd: financials.priceUSD,
        price_ars: financials.priceARS,
        updated_at: new Date().toISOString(),
      };
      if (financials.priceCurrency) {
        updatePayload.price_currency = financials.priceCurrency;
      }
      const { error: prodError } = await client
        .from('products')
        .update(updatePayload)
        .eq('id', id);

      if (prodError) {
        console.error('[Supabase Update Product Error]:', prodError);
        throw prodError;
      }

      const { error: costError } = await client
        .from('product_costs')
        .upsert({
          product_id: id,
          cost_usd: financials.costUSD,
          cost_ars: financials.costARS,
          profit_margin: financials.profitMargin,
          updated_at: new Date().toISOString(),
        });

      if (costError) {
        console.error('[Supabase Update Product Costs Error]:', costError);
        throw costError;
      }
    }
  };

  const applyPercentagePriceAdjustment = async (percentage: number): Promise<boolean> => {
    const factor = 1 + percentage / 100;
    const updatedList = products.map((p) => {
      const newUSD = Number((p.priceUSD * factor).toFixed(2));
      const newARS = p.priceARS
        ? Math.round(p.priceARS * factor)
        : Math.round(newUSD * exchangeRate);
      return {
        ...p,
        priceUSD: newUSD,
        priceARS: newARS,
      };
    });

    const client = getSupabaseClient();
    if (client) {
      try {
        const dbRows = updatedList.map(productToDb);
        for (let i = 0; i < dbRows.length; i += 100) {
          const batch = dbRows.slice(i, i + 100);
          const { error } = await client.from('products').upsert(batch);
          if (error) {
            console.error('[Supabase Mass Price Adjustment Error]:', error);
            showToast(`Error al aplicar ajuste masivo en Supabase: ${error.message}`, 'error');
            await syncWithSupabase();
            return false;
          }
        }
      } catch (err: any) {
        console.error('[Network Error on Mass Price Adjustment]:', err);
        showToast(`Fallo de conexión en ajuste de precios: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts(updatedList);
    showToast(
      `Precios actualizados un ${percentage > 0 ? '+' : ''}${percentage}% en todo el catálogo.`,
      'success'
    );
    return true;
  };

  const bulkUpdateProducts = async (updatedList: Product[]): Promise<boolean> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const dbRows = updatedList.map(productToDb);
        for (let i = 0; i < dbRows.length; i += 100) {
          const batch = dbRows.slice(i, i + 100);
          const { error } = await client.from('products').upsert(batch);
          if (error) {
            console.error('[Supabase Bulk Upsert Error]:', error);
            showToast(`Error al actualizar lote masivo en Supabase: ${error.message}`, 'error');
            await syncWithSupabase();
            return false;
          }
        }

        const costRows = updatedList
          .filter((p) => p.costUSD != null || p.profitMargin != null)
          .map((p) => ({
            product_id: p.id,
            cost_usd: p.costUSD || 0,
            cost_ars: p.costARS || 0,
            profit_margin: p.profitMargin ?? 15,
            updated_at: new Date().toISOString(),
          }));

        for (let i = 0; i < costRows.length; i += 100) {
          const batch = costRows.slice(i, i + 100);
          const { error: costErr } = await client.from('product_costs').upsert(batch);
          if (costErr) console.error('[Supabase Bulk Cost Upsert Error]:', costErr);
        }
      } catch (err: any) {
        console.error('[Network Error on Bulk Update]:', err);
        showToast(`Fallo de conexión en actualización masiva: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return false;
      }
    }

    setProducts(updatedList);
    showToast(`Catálogo actualizado masivamente (${updatedList.length} productos).`, 'success');
    return true;
  };

  const replaceProducts = async (newList: Product[]): Promise<void> => {
    const client = getSupabaseClient();
    if (client) {
      try {
        // 1. Insertar / Actualizar en lotes de 100 los nuevos productos
        const dbRows = newList.map(productToDb);
        for (let i = 0; i < dbRows.length; i += 100) {
          const batch = dbRows.slice(i, i + 100);
          const { error: insErr } = await client.from('products').upsert(batch);
          if (insErr) {
            console.error('[Supabase Batch Upsert Error on Replace]:', insErr);
            showToast(`Error al subir productos (lote ${Math.floor(i / 100) + 1}): ${insErr.message}`, 'error');
            await syncWithSupabase();
            return;
          }
        }

        // 2. Guardar costos en lotes de 100
        const costRows = newList
          .filter((p) => p.costUSD != null || p.profitMargin != null)
          .map((p) => ({
            product_id: p.id,
            cost_usd: p.costUSD || 0,
            cost_ars: p.costARS || 0,
            profit_margin: p.profitMargin ?? 15,
            updated_at: new Date().toISOString(),
          }));

        for (let i = 0; i < costRows.length; i += 100) {
          const batch = costRows.slice(i, i + 100);
          const { error: costErr } = await client.from('product_costs').upsert(batch);
          if (costErr) {
            console.error('[Supabase Batch Costs Error on Replace]:', costErr);
          }
        }

        // 3. Únicamente tras completar todos los lotes con éxito: depurar IDs obsoletos
        const { data: currentRows, error: fetchErr } = await client
          .from('products')
          .select('id');

        if (fetchErr) {
          console.error('[Supabase Fetch Existing IDs Error]:', fetchErr);
        } else if (currentRows && currentRows.length > 0) {
          const newIdSet = new Set(newList.map((p) => p.id));
          const obsoleteIds = currentRows
            .map((r: { id: string }) => r.id)
            .filter((id: string) => !newIdSet.has(id));

          if (obsoleteIds.length > 0) {
            for (let i = 0; i < obsoleteIds.length; i += 100) {
              const chunk = obsoleteIds.slice(i, i + 100);
              const { error: delErr } = await client
                .from('products')
                .delete()
                .in('id', chunk);

              if (delErr) {
                console.error('[Supabase Prune Obsolete IDs Error]:', delErr);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[Network Error on Replace Products]:', err);
        showToast(`Fallo de conexión al reemplazar catálogo: ${err.message || 'Error desconocido'}`, 'error');
        await syncWithSupabase();
        return;
      }
    }

    // 4. Actualizar estado local y localStorage sanitizado (sin costos privados)
    setProducts(newList);
    try {
      const sanitized = newList.map((p) => {
        const { costUSD, costARS, profitMargin, ...rest } = p;
        return rest;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(sanitized));
    } catch (e) {}

    showToast(`Catálogo reemplazado exitosamente: ${newList.length} productos cargados.`, 'success');
  };

  const clearAllProducts = async () => {
    setProducts([]);
    setCart([]);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify([]));
    } catch (e) {}

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('products').delete().neq('id', 'keep_none');
      if (error) {
        console.error('[Supabase Clear All Error]:', error);
        showToast('Error al vaciar en Supabase: ' + error.message, 'error');
        await syncWithSupabase();
        return;
      }
    }
    showToast('Catálogo vaciado completamente. Listo para cargar productos reales.', 'info');
  };

  // Vuelve a descargar el catálogo completo desde Supabase (fuente de verdad)
  const resetProductsToDefault = () => {
    syncWithSupabase();
    showToast('Catálogo recargado desde Supabase Cloud.', 'info');
  };

  // Auth State (Current logged in user session)
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  // B2B Registered Customers / Accounts directory
  const [b2bUsers, setB2bUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_B2B_USERS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_B2B_USERS, JSON.stringify(b2bUsers));
    } catch (e) {
      console.warn('Error guardando clientes B2B en localStorage:', e);
    }
  }, [b2bUsers]);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (
    identifierOrData: string | Partial<User>
  ): Promise<{
    success: boolean;
    user?: User;
    message?: string;
    status?: UserStatus | 'not_found';
  }> => {
    const rawIdentifier =
      typeof identifierOrData === 'string'
        ? identifierOrData.trim().toLowerCase()
        : (identifierOrData.email || identifierOrData.cuit || identifierOrData.businessName || '').trim().toLowerCase();

    if (!rawIdentifier) {
      return { success: false, status: 'not_found', message: 'Por favor ingrese su email o CUIT.' };
    }

    // 1. Check in local b2bUsers state
    let target = b2bUsers.find(
      (u) =>
        u.email.toLowerCase() === rawIdentifier ||
        u.cuit.toLowerCase() === rawIdentifier ||
        u.businessName.toLowerCase() === rawIdentifier
    );

    // 2. Query Supabase if not found locally
    const client = getSupabaseClient();
    if (!target && client) {
      try {
        const { data, error } = await client
          .from('b2b_users')
          .select('*')
          .or(`email.ilike.${rawIdentifier},cuit.eq.${rawIdentifier}`)
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          target = dbToB2bUser(data);
          setB2bUsers((prev) => [target!, ...prev.filter((u) => u.id !== target!.id)]);
        }
      } catch (err) {
        console.warn('[Supabase Check User Status Error]:', err);
      }
    }

    // 3. Not found anywhere
    if (!target) {
      return {
        success: false,
        status: 'not_found',
        message: 'No encontramos ninguna cuenta con ese email o CUIT. Por favor registrate como cliente mayorista.',
      };
    }

    // 4. Check approval status
    if (target.status === 'pendiente') {
      return {
        success: false,
        status: 'pendiente',
        user: target,
        message: `Tu solicitud para "${target.businessName}" se encuentra en proceso de revisión por administración. Te notificaremos por WhatsApp en cuanto esté aprobada.`,
      };
    }

    if (target.status === 'rechazado' || target.status === 'suspendido') {
      return {
        success: false,
        status: target.status,
        user: target,
        message: `Tu cuenta se encuentra en estado "${target.status}". Por favor contactate con administración de MP Distribuciones para reactivarla.`,
      };
    }

    // 5. Approved
    const activeUser: User = {
      ...target,
      isAuthenticated: true,
    };
    setUser(activeUser);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(activeUser));
    } catch {}
    setIsAuthModalOpen(false);
    showToast(`¡Bienvenido de nuevo, ${activeUser.businessName}!`, 'success');
    return { success: true, user: activeUser };
  };

  const register = async (
    userData: Omit<User, 'id' | 'isAuthenticated' | 'status'>
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    const newUser: User = {
      ...userData,
      id: 'usr_' + Date.now() + Math.random().toString(36).substring(2, 6),
      status: 'pendiente',
      isAuthenticated: false,
      registeredAt: new Date().toISOString(),
    };

    setB2bUsers((prev) => [newUser, ...prev]);

    // Supabase persist
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('b2b_users').insert([b2bUserToDb(newUser)]);
        if (error) {
          console.warn('[Supabase Insert b2b_user Error]:', error.message);
        }
      } catch (err) {
        console.warn('[Network Error on Register b2b_user]:', err);
      }
    }

    return {
      success: true,
      user: newUser,
      message: 'Solicitud de cuenta recibida con éxito.',
    };
  };

  const approveUser = async (userId: string): Promise<boolean> => {
    const target = b2bUsers.find((u) => u.id === userId);
    if (!target) return false;

    const approvedAt = new Date().toISOString();
    const updatedUser: User = {
      ...target,
      status: 'aprobado',
      approvedAt,
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('b2b_users')
          .update({
            status: 'aprobado',
            approved_at: approvedAt,
          })
          .eq('id', userId);
      } catch (e) {
        console.error('[Supabase Approve User Error]:', e);
      }
    }

    setB2bUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (user && user.id === userId) {
      setUser({ ...updatedUser, isAuthenticated: true });
    }
    showToast(`Cliente "${target.businessName}" aprobado con éxito.`, 'success');
    return true;
  };

  const rejectUser = async (userId: string): Promise<boolean> => {
    const target = b2bUsers.find((u) => u.id === userId);
    if (!target) return false;

    const updatedUser: User = {
      ...target,
      status: 'rechazado',
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('b2b_users')
          .update({ status: 'rechazado' })
          .eq('id', userId);
      } catch (e) {
        console.error('[Supabase Reject User Error]:', e);
      }
    }

    setB2bUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (user && user.id === userId) {
      setUser({ ...updatedUser, isAuthenticated: false });
    }
    showToast(`Cliente "${target.businessName}" rechazado.`, 'info');
    return true;
  };

  const suspendUser = async (userId: string): Promise<boolean> => {
    const target = b2bUsers.find((u) => u.id === userId);
    if (!target) return false;

    const updatedUser: User = {
      ...target,
      status: 'suspendido',
    };

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('b2b_users')
          .update({ status: 'suspendido' })
          .eq('id', userId);
      } catch (e) {
        console.error('[Supabase Suspend User Error]:', e);
      }
    }

    setB2bUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (user && user.id === userId) {
      setUser({ ...updatedUser, isAuthenticated: false });
    }
    showToast(`Cuenta de "${target.businessName}" suspendida.`, 'warning');
    return true;
  };

  const deleteB2bUser = async (userId: string): Promise<boolean> => {
    const target = b2bUsers.find((u) => u.id === userId);
    if (!target) return false;

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('b2b_users').delete().eq('id', userId);
      } catch (e) {
        console.error('[Supabase Delete User Error]:', e);
      }
    }

    setB2bUsers((prev) => prev.filter((u) => u.id !== userId));
    showToast(`Cliente "${target.businessName}" eliminado.`, 'info');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
    showToast('Sesión cerrada.', 'info');
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_CART);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY_CART, JSON.stringify(cart));
  }, [cart]);

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (!product.inStock || product.stockQuantity <= 0) {
      showToast('Producto sin stock disponible', 'warning');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          showToast(`Stock máximo alcanzado (${product.stockQuantity} un.)`, 'warning');
          return prev;
        }
        const targetQty = Math.min(product.stockQuantity, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: targetQty } : item
        );
      }
      const initialQty = Math.min(product.stockQuantity, Math.max(1, quantity));
      return [...prev, { product, quantity: initialQty }];
    });

    showToast(`Se agregó "${product.name.slice(0, 32)}..." al pedido.`, 'success');
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const maxStock = item.product.stockQuantity;
        const safeQty = Math.min(maxStock, quantity);
        if (quantity > maxStock) {
          showToast(`Stock máximo alcanzado (${maxStock} un.)`, 'warning');
        }
        return { ...item, quantity: safeQty };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Producto eliminado del pedido', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  const getItemQuantity = (productId: string): number => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const setItemQuantity = (product: Product, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== product.id));
      return;
    }
    const maxStock = product.stockQuantity;
    const safeQty = Math.min(maxStock, quantity);
    if (quantity > maxStock) {
      showToast(`Stock máximo disponible para este artículo: ${maxStock} un.`, 'warning');
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: safeQty } : i
        );
      }
      return [...prev, { product, quantity: safeQty }];
    });
  };

  const cartTotalUSD = cart.reduce(
    (sum, item) => sum + item.product.priceUSD * item.quantity,
    0
  );
  const cartTotalARS = cartTotalUSD * exchangeRate;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Formatting utility
  const formatPrice = (priceUSD: number, customCurrency?: Currency): string => {
    const curr = customCurrency || currency;
    if (curr === 'USD') {
      return `u$s ${priceUSD.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else {
      const ars = Math.round(priceUSD * exchangeRate);
      return `$ ${ars.toLocaleString('es-AR')}`;
    }
  };

  // Order History State & Persistence
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(orders));
    } catch (e) {
      console.warn('Error guardando pedidos en localStorage:', e);
    }
  }, [orders]);

  const [isOrderHistoryModalOpen, setIsOrderHistoryModalOpen] = useState(false);
  const openOrderHistoryModal = () => setIsOrderHistoryModalOpen(true);
  const closeOrderHistoryModal = () => setIsOrderHistoryModalOpen(false);

  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'>): Order => {
    const orderCount = orders.length + 1;
    const orderNumber = `MP-${new Date().getFullYear()}-${orderCount.toString().padStart(4, '0')}`;
    const newOrder: Order = {
      ...orderData,
      id: 'ord_' + Date.now() + Math.random().toString(36).substring(2, 6),
      orderNumber,
      date: new Date().toISOString(),
      status: 'pendiente',
    };
    setOrders((prev) => [newOrder, ...prev]);

    // Supabase Cloud Persist
    const client = getSupabaseClient();
    if (client) {
      client
        .from('orders')
        .insert([orderToDb(newOrder)])
        .then(({ error }) => {
          if (error) console.error('[Supabase Create Order Error]:', error);
        });
    }

    return newOrder;
  };

  const confirmOrder = async (
    orderId: string,
    options?: {
      allowNegativeStock?: boolean;
      adjustedItems?: { productId: string; quantity: number }[];
    }
  ): Promise<{
    success: boolean;
    error?: string;
    shortages?: { item: CartItem; available: number; requested: number }[];
  }> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido no encontrado' };
    if (order.status === 'confirmado') return { success: false, error: 'El pedido ya fue confirmado previamente.' };

    // Determine the items to process (with adjustments if requested)
    let itemsToProcess = order.items;
    if (options?.adjustedItems) {
      itemsToProcess = order.items
        .map((it) => {
          const adj = options.adjustedItems!.find((a) => a.productId === it.product.id);
          if (adj !== undefined) {
            return { ...it, quantity: adj.quantity };
          }
          return it;
        })
        .filter((it) => it.quantity > 0);
    }

    // Check shortages if not allowing negative stock and not using already adjusted items
    if (!options?.allowNegativeStock && !options?.adjustedItems) {
      const shortages: { item: CartItem; available: number; requested: number }[] = [];
      for (const item of itemsToProcess) {
        const prod = products.find((p) => p.id === item.product.id || p.sku === item.product.sku);
        const available = prod?.stockQuantity ?? 0;
        if (available < item.quantity) {
          shortages.push({
            item,
            available,
            requested: item.quantity,
          });
        }
      }

      if (shortages.length > 0) {
        return {
          success: false,
          error: 'stock_shortage',
          shortages,
        };
      }
    }

    // Stock deduction
    const client = getSupabaseClient();
    const stockUpdates: { id: string; newStock: number }[] = [];

    for (const item of itemsToProcess) {
      const prod = products.find((p) => p.id === item.product.id || p.sku === item.product.sku);
      if (prod) {
        const currentStock = prod.stockQuantity ?? 0;
        const newStock = options?.allowNegativeStock
          ? currentStock - item.quantity
          : Math.max(0, currentStock - item.quantity);
        stockUpdates.push({ id: prod.id, newStock });

        if (client) {
          try {
            await client
              .from('products')
              .update({
                stock_quantity: newStock,
                in_stock: newStock > 0,
                updated_at: new Date().toISOString(),
              })
              .eq('id', prod.id);
          } catch (e) {
            console.error('[Supabase Stock Update on Confirm Order Error]:', e);
          }
        }
      }
    }

    // Update local products state
    if (stockUpdates.length > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const update = stockUpdates.find((u) => u.id === p.id);
          if (update) {
            return {
              ...p,
              stockQuantity: update.newStock,
              inStock: update.newStock > 0,
            };
          }
          return p;
        })
      );
    }

    // Recalculate totals if adjusted
    let finalTotalUSD = order.totalUSD;
    let finalTotalARS = order.totalARS;
    if (options?.adjustedItems) {
      finalTotalUSD = itemsToProcess.reduce((acc, it) => acc + it.product.priceUSD * it.quantity, 0);
      finalTotalARS = itemsToProcess.reduce(
        (acc, it) => acc + (it.product.priceARS || it.product.priceUSD * exchangeRate) * it.quantity,
        0
      );
    }

    const confirmedAt = new Date().toISOString();
    const updatedOrder: Order = {
      ...order,
      items: itemsToProcess,
      totalUSD: finalTotalUSD,
      totalARS: finalTotalARS,
      status: 'confirmado',
      confirmedAt,
    };

    if (client) {
      try {
        await client
          .from('orders')
          .update({
            status: 'confirmado',
            items: itemsToProcess,
            total_usd: Number(finalTotalUSD.toFixed(2)),
            total_ars: Math.round(finalTotalARS),
          })
          .eq('id', orderId);
      } catch (e) {
        console.error('[Supabase Order Status Update Error]:', e);
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
    showToast(`Pedido #${order.orderNumber} confirmado. Stock descontado correctamente.`, 'success');
    return { success: true };
  };

  const cancelOrder = async (orderId: string): Promise<{ success: boolean; error?: string }> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido no encontrado' };

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('orders')
          .update({ status: 'cancelado' })
          .eq('id', orderId);

        if (error) {
          console.error('[Supabase Cancel Order Error]:', error);
          showToast(`Error al cancelar en Supabase: ${error.message}`, 'error');
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('[Network Error Cancel Order]:', err);
        showToast('Error de conexión al cancelar pedido', 'error');
        return { success: false, error: err.message };
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelado' } : o)));
    showToast(`Pedido #${order.orderNumber} cancelado.`, 'info');
    return { success: true };
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<boolean> => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client
          .from('orders')
          .update({ status })
          .eq('id', orderId);
        if (error) {
          console.error('[Supabase Update Order Status Error]:', error);
          return false;
        }
      } catch (err) {
        console.error('[Network Error Update Order Status]:', err);
        return false;
      }
    }

    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    return true;
  };

  const repeatOrder = (order: Order) => {
    let count = 0;
    order.items.forEach((item) => {
      const liveProduct = products.find((p) => p.id === item.product.id || p.sku === item.product.sku);
      if (liveProduct && liveProduct.inStock) {
        setItemQuantity(liveProduct, item.quantity);
        count++;
      }
    });
    setIsOrderHistoryModalOpen(false);
    setIsCartDrawerOpen(true);
    showToast(`Se cargaron los artículos del pedido #${order.orderNumber} a tu carrito.`, 'success');
  };

  // ========================================================
  // Supabase Cloud Synchronization & Realtime Sync
  // ========================================================
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);
  // true mientras se resuelve la primera descarga del catálogo y aún no hay productos en caché
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(
    () => products.length === 0 && isSupabaseConfigured()
  );

  // Sync products and orders from Supabase
  const syncWithSupabase = async () => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseConnected(false);
      setIsCatalogLoading(false);
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setIsCatalogLoading(false);
      return;
    }

    setIsSyncingSupabase(true);
    try {
      // 1. Fetch products
      // Paginación explícita: PostgREST limita a 1000 filas por request
      const PAGE_SIZE = 1000;
      const dbProducts: any[] = [];
      let prodErr: any = null;
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) {
          prodErr = error;
          break;
        }
        dbProducts.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
      }

      // Consulta complementaria a product_costs si el usuario tiene rol admin
      const sessionUser = (await client.auth.getSession()).data.session?.user;
      const hasAdminRole = isAdminUser(sessionUser);

      const costMap = new Map<string, any>();
      if (hasAdminRole) {
        try {
          const { data: costRows, error: costErr } = await client
            .from('product_costs')
            .select('*');
          if (!costErr && costRows) {
            for (const c of costRows) {
              costMap.set(c.product_id, c);
            }
          }
        } catch (cErr) {
          console.warn('[Supabase Sync Costs]:', cErr);
        }
      }

      if (prodErr) {
        console.error('[Supabase Sync Products Error]:', prodErr);
      } else {
        if (dbProducts.length > 0) {
          const mapped = dbProducts.map((p) => dbToProduct(p, costMap.get(p.id)));
          setProducts(mapped);
          try {
            // En localStorage NUNCA guardamos datos de costos ni márgenes
            const publicCached = mapped.map((p) => ({
              ...p,
              costUSD: undefined,
              costARS: undefined,
              profitMargin: undefined,
            }));
            localStorage.setItem(LOCAL_STORAGE_KEY_PRODUCTS, JSON.stringify(publicCached));
          } catch (e) {
            // ignore
          }
        }
      }

      // 2. Fetch orders: SOLO si es administrador
      if (hasAdminRole) {
        const { data: dbOrders, error: ordErr } = await client
          .from('orders')
          .select('*')
          .order('date', { ascending: false });

        if (!ordErr && dbOrders && dbOrders.length > 0) {
          const mappedOrders = dbOrders.map(dbToOrder);
          setOrders(mappedOrders);
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(mappedOrders));
          } catch (e) {
            // ignore
          }
        }

        // 3. Fetch b2b_users (Clientes mayoristas)
        try {
          const { data: dbUsers, error: usersErr } = await client
            .from('b2b_users')
            .select('*')
            .order('created_at', { ascending: false });

          if (!usersErr && dbUsers && dbUsers.length > 0) {
            const mappedUsers = dbUsers.map(dbToB2bUser);
            setB2bUsers(mappedUsers);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY_B2B_USERS, JSON.stringify(mappedUsers));
            } catch (e) {
              // ignore
            }
          }
        } catch (uErr) {
          console.warn('[Supabase Sync B2B Users]:', uErr);
        }
      }

      setIsSupabaseConnected(true);
    } catch (err: any) {
      console.error('[Supabase Sync Error]:', err);
    } finally {
      setIsSyncingSupabase(false);
      setIsCatalogLoading(false);
    }
  };

  // Upload full local catalog to Supabase in batches
  const uploadAllToSupabase = async () => {
    const client = getSupabaseClient();
    if (!client) {
      if (isAdminLoggedIn || isAdminView) {
        showToast('Supabase no está configurado aún.', 'warning');
      }
      return;
    }
    setIsSyncingSupabase(true);
    try {
      const listToUpload = products;
      const rows = listToUpload.map(productToDb);
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        const { error } = await client.from('products').upsert(batch, { onConflict: 'id' });
        if (error) throw error;
      }

      const costRows = listToUpload
        .filter((p) => p.costUSD != null || p.profitMargin != null)
        .map((p) => ({
          product_id: p.id,
          cost_usd: p.costUSD || 0,
          cost_ars: p.costARS || 0,
          profit_margin: p.profitMargin ?? 15,
          updated_at: new Date().toISOString(),
        }));
      for (let i = 0; i < costRows.length; i += 100) {
        const batch = costRows.slice(i, i + 100);
        const { error: costErr } = await client.from('product_costs').upsert(batch);
        if (costErr) console.error('[Supabase Batch Upload Costs Error]:', costErr);
      }

      setIsSupabaseConnected(true);
      if (isAdminLoggedIn || isAdminView) {
        showToast(`¡Se subieron ${rows.length} productos a Supabase Cloud exitosamente!`, 'success');
      }
    } catch (err: any) {
      console.error('[Supabase Upload Error]:', err);
      if (isAdminLoggedIn || isAdminView) {
        showToast('Error al subir catálogo a Supabase: ' + err.message, 'error');
      }
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  // Update credentials and test connection
  const updateSupabaseCredentials = async (newUrl: string, newKey: string): Promise<boolean> => {
    saveSupabaseConfig(newUrl, newKey);
    const client = getSupabaseClient();
    if (!client) {
      showToast('Credenciales de Supabase incompletas o inválidas.', 'error');
      return false;
    }

    try {
      const { error } = await client.from('products').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        if (error.message.includes('relation "public.products" does not exist')) {
          showToast('Conectado a Supabase. Falta crear las tablas (ejecutá supabase-schema.sql).', 'warning');
          setIsSupabaseConnected(true);
          return true;
        }
        showToast('Error de conexión con Supabase: ' + error.message, 'error');
        return false;
      }
      setIsSupabaseConnected(true);
      showToast('¡Conectado exitosamente con Supabase Cloud!', 'success');
      await syncWithSupabase();
      return true;
    } catch (err: any) {
      showToast('Error de red al conectar con Supabase: ' + (err.message || 'Error desconocido'), 'error');
      return false;
    }
  };

  // Realtime Supabase Subscription
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsSupabaseConnected(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    // Primer sync al cargar
    syncWithSupabase();

    // Suscripción Realtime pública a cambios en products (stock, precios)
    const channel = client
      .channel('mp_catalog_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProd = dbToProduct(payload.new);
            setProducts((prev) => {
              if (prev.some((p) => p.id === newProd.id)) {
                return prev.map((p) => (p.id === newProd.id ? { ...p, ...newProd } : p));
              }
              return [newProd, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToProduct(payload.new);
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = String(payload.old?.id);
            if (deletedId) {
              setProducts((prev) => prev.filter((p) => p.id !== deletedId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsSupabaseConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsSupabaseConnected(false);
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // Suscripción Realtime privada para administradores (pedidos y costos)
  useEffect(() => {
    if (!isSupabaseConfigured() || !isAdminLoggedIn) return;
    const client = getSupabaseClient();
    if (!client) return;

    // Sincronizar costos y pedidos al detectar sesión de admin
    syncWithSupabase();

    const adminChannel = client
      .channel('mp_admin_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = dbToOrder(payload.new);
            setOrders((prev) => {
              if (prev.some((o) => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToOrder(payload.new);
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_costs' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const costData = payload.new;
            if (costData?.product_id) {
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === costData.product_id
                    ? {
                        ...p,
                        costUSD: Number(costData.cost_usd),
                        costARS: Number(costData.cost_ars),
                        profitMargin: Number(costData.profit_margin),
                      }
                    : p
                )
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'b2b_users' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newUser = dbToB2bUser(payload.new);
            setB2bUsers((prev) => {
              if (prev.some((u) => u.id === newUser.id)) return prev;
              return [newUser, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = dbToB2bUser(payload.new);
            setB2bUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
          } else if (payload.eventType === 'DELETE') {
            const delId = payload.old?.id;
            if (delId) {
              setB2bUsers((prev) => prev.filter((u) => u.id !== delId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(adminChannel);
    };
  }, [isAdminLoggedIn]);

  // Modals
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const openCheckoutModal = () => setIsCheckoutModalOpen(true);
  const closeCheckoutModal = () => setIsCheckoutModalOpen(false);

  const [isExchangeRateModalOpen, setIsExchangeRateModalOpen] = useState(false);
  const openExchangeRateModal = () => setIsExchangeRateModalOpen(true);
  const closeExchangeRateModal = () => setIsExchangeRateModalOpen(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const openProductDetail = (p: Product) => setSelectedProduct(p);
  const closeProductDetail = () => setSelectedProduct(null);

  // View Mode & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isOutletOnly, setIsOutletOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock'>('all');
  const [sortBy, setSortBy] = useState<SortByOption>('featured');

  return (
    <AppContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
        formatPrice,
        fetchBnaRate,
        isFetchingBnaRate,
        lastBnaSyncDate,
        orders,
        createOrder,
        repeatOrder,
        confirmOrder,
        cancelOrder,
        updateOrderStatus,
        isOrderHistoryModalOpen,
        openOrderHistoryModal,
        closeOrderHistoryModal,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        updateStock,
        updatePrice,
        updateProductFinancials,
        applyPercentagePriceAdjustment,
        bulkUpdateProducts,
        replaceProducts,
        clearAllProducts,
        isCatalogLoading,
        resetProductsToDefault,
        isAdminLoggedIn,
        isAdminModalOpen,
        isAdminView,
        openAdminModal,
        closeAdminModal,
        loginAdmin,
        logoutAdmin,
        setIsAdminView,
        user,
        b2bUsers,
        login,
        register,
        logout,
        approveUser,
        rejectUser,
        suspendUser,
        deleteB2bUser,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        setItemQuantity,
        cartTotalUSD,
        cartTotalARS,
        cartCount,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
        isCheckoutModalOpen,
        openCheckoutModal,
        closeCheckoutModal,
        isExchangeRateModalOpen,
        openExchangeRateModal,
        closeExchangeRateModal,
        selectedProduct,
        openProductDetail,
        closeProductDetail,
        viewMode,
        setViewMode,
        isOutletOnly,
        setIsOutletOnly,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        stockFilter,
        setStockFilter,
        sortBy,
        setSortBy,
        toasts,
        showToast,
        isSupabaseConnected,
        isSyncingSupabase,
        syncWithSupabase,
        uploadAllToSupabase,
        updateSupabaseCredentials,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
