import React, { useMemo, useState } from 'react';
import { useApp } from './context/AppContext';
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
import { ContactModal } from './components/ContactModal';
import { ToastContainer } from './components/ToastContainer';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import {
  PackageSearch,
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
    categories,
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

  const selectedCategoryMeta = categories.find((c) => c.id === selectedCategory);

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

      {/* Institutional Location & Contact Section */}
      <ContactSection />

      {/* Floating WhatsApp Sales Button */}
      <a
        href="https://wa.me/5493413408439?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 w-14 h-14 sm:w-14 sm:h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.45)] hover:shadow-[0_6px_26px_rgba(37,211,102,0.65)] hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
        aria-label="Contactar por WhatsApp"
        title="Contactar por WhatsApp"
      >
        <svg
          className="w-8 h-8 sm:w-8 sm:h-8 fill-white transition-transform group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
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
      <ContactModal />
      <AdminLoginModal />
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};
export default App;
