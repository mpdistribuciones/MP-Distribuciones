import React, { useMemo, useState } from 'react';
import { useApp } from './context/AppContext';
import { CATEGORIES } from './data/categories';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { SidebarFilters } from './components/SidebarFilters';
import { ProductCard } from './components/ProductCard';
import { ProductListRow } from './components/ProductListRow';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ExchangeRateModal } from './components/ExchangeRateModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanel } from './components/AdminPanel';
import { OrderHistoryModal } from './components/OrderHistoryModal';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';
import {
  PackageSearch,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  Flame,
  Lock,
} from 'lucide-react';

export const AppContent: React.FC = () => {
  const {
    products,
    isCatalogLoading,
    isAdminView,
    isAdminLoggedIn,
    setIsAdminView,
    openAdminModal,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    stockFilter,
    setStockFilter,
    sortBy,
    viewMode,
    isOutletOnly,
    setIsOutletOnly,
  } = useApp();

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filter and sort products from dynamic state
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by outlet
    if (isOutletOnly) {
      list = list.filter((p) => p.badge === 'OFERTA' || p.badge === 'MÁS VENDIDO');
    }

    // Filter by category
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // Filter by stock
    if (stockFilter === 'in_stock') {
      list = list.filter((p) => p.inStock);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          p.description.toLowerCase().includes(q) ||
          (p.specs && p.specs.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Sort by price, alphabet, or date (no stock sorting)
    switch (sortBy) {
      case 'price_asc':
        list.sort((a, b) => a.priceUSD - b.priceUSD);
        break;
      case 'price_desc':
        list.sort((a, b) => b.priceUSD - a.priceUSD);
        break;
      case 'name_asc':
        list.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        break;
      case 'name_desc':
        list.sort((a, b) => b.name.localeCompare(a.name, 'es', { sensitivity: 'base' }));
        break;
      case 'date_desc': // Más nuevo
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        break;
      case 'date_asc': // Más viejo
        list.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });
        break;
      case 'featured':
      default:
        // Priority to items with badges
        list.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
        break;
    }

    // Regla de catálogo: Los productos disponibles van primero y los agotados siempre abajo de todo
    list.sort((a, b) => {
      const aAvailable = Boolean(a.inStock && a.stockQuantity > 0);
      const bAvailable = Boolean(b.inStock && b.stockQuantity > 0);
      if (aAvailable === bAvailable) return 0;
      return aAvailable ? -1 : 1;
    });

    return list;
  }, [products, selectedCategory, stockFilter, searchQuery, sortBy, isOutletOnly]);

  const selectedCategoryMeta = CATEGORIES.find((c) => c.id === selectedCategory);

  // If Owner is viewing Admin Panel, strictly require both isAdminView AND isAdminLoggedIn
  if (isAdminView) {
    if (!isAdminLoggedIn) {
      return (
        <div className="min-h-screen flex flex-col bg-[#f4f6fa] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
          <Header />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 max-w-md w-full text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Acceso Administrativo Requerido</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Debes iniciar sesión con credenciales de administrador para acceder al Panel de Control de MP Distribuciones.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setIsAdminView(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Volver al Catálogo
                </button>
                <button
                  onClick={openAdminModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
                >
                  Iniciar Sesión Admin
                </button>
              </div>
            </div>
          </div>
          <AdminLoginModal />
          <ToastContainer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f4f6fa] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
        <AdminPanel />
        <ExchangeRateModal />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa] text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Sticky Header with MP Blue Branding */}
      <Header />

      {/* Main Layout Area: Left Vertical Filters + Right Products Catalog */}
      <main className="flex-1 max-w-[1550px] w-full mx-auto px-2 sm:px-4 py-2 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-5 items-start">
          {/* Left Vertical Filters Sidebar */}
          <SidebarFilters
            isMobileOpen={isMobileFiltersOpen}
            onCloseMobile={() => setIsMobileFiltersOpen(false)}
          />

          {/* Right Main Catalog Content */}
          <div className="flex-1 w-full min-w-0 space-y-2 sm:space-y-4">
            {/* Top Toolbar: View Switcher & Sorting Controls */}
            <CategoryNav onOpenMobileFilters={() => setIsMobileFiltersOpen(true)} />

            {/* Breadcrumb & Filter status row */}
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs text-slate-500 pb-0.5 sm:pb-1 border-b border-slate-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400">Catálogo</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-blue-700">
                  {isOutletOnly
                    ? 'OUTLET Y LIQUIDACIÓN'
                    : selectedCategory === 'ALL'
                    ? 'Todos los Rubros'
                    : selectedCategoryMeta?.name}
                </span>
                {isOutletOnly && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                    <Flame className="w-3 h-3 text-red-600" />
                    <span>Precios Especiales</span>
                  </span>
                )}
                {stockFilter === 'in_stock' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    <span>En Stock</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span>
                  Mostrando <strong className="text-slate-800 font-bold">{filteredProducts.length}</strong> de {products.length} artículos
                </span>
                {(searchQuery || selectedCategory !== 'ALL' || stockFilter !== 'all' || isOutletOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('ALL');
                      setStockFilter('all');
                      setIsOutletOnly(false);
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </button>
                )}
              </div>
            </div>

            {/* Catalog Content (Grid / List View) */}
            {isCatalogLoading && products.length === 0 ? (
              /* Loading State: skeletons mientras se descarga el catálogo inicial */
              <div
                role="status"
                aria-live="polite"
                aria-label="Cargando catálogo"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4"
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-3 animate-pulse">
                    <div className="aspect-square rounded-lg bg-slate-200" />
                    <div className="h-3 w-3/4 rounded bg-slate-200" />
                    <div className="h-3 w-1/2 rounded bg-slate-200" />
                    <div className="h-5 w-1/3 rounded bg-slate-200" />
                    <div className="h-8 w-full rounded-lg bg-slate-100" />
                  </div>
                ))}
                <span className="sr-only">Cargando catálogo...</span>
              </div>
            ) : filteredProducts.length > 0 ? (
              viewMode === 'grid' ? (
                /* GALERIA DE FOTOS: Grid with responsive columns preventing cards from stretching */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                /* LISTADO: Dense Wholesale Table */
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-black text-[10px] tracking-wider">
                        <th className="p-3 text-center">Foto</th>
                        <th className="p-3">Código / Marca</th>
                        <th className="p-3">Descripción del Producto</th>
                        <th className="p-3 text-center">Stock</th>
                        <th className="p-3 text-right">Precio Unitario</th>
                        <th className="p-3 text-center">Cantidad a Pedir</th>
                        <th className="p-3 text-right hidden sm:table-cell">Subtotal</th>
                        <th className="p-3 text-center">Ficha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <ProductListRow key={product.id} product={product} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Empty Search / Filter State */
              <div className="py-16 text-center space-y-4 max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <PackageSearch className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    No se encontraron artículos coincidentes
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    No hay productos que coincidan con los criterios seleccionados.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                    setStockFilter('all');
                    setIsOutletOnly(false);
                  }}
                  className="px-4 py-2 bg-[#0055b8] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Restablecer filtros y ver todo
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating WhatsApp Sales Button */}
      <a
        href="https://wa.me/5493413408439?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta%20mayorista."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 left-5 z-30 flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-4 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all font-bold text-xs group cursor-pointer"
        aria-label="Contactar por WhatsApp"
      >
        <MessageCircle className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">WhatsApp Mayorista</span>
      </a>

      {/* Footer */}
      <Footer />

      {/* Modals & Slide-overs */}
      <ProductDetailModal />
      <CartDrawer />
      <CheckoutModal />
      <ExchangeRateModal />
      <AuthModal />
      <OrderHistoryModal />
      <AdminLoginModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
export default App;
