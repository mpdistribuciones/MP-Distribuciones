import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Layers,
  CheckCircle2,
  Flame,
  RotateCcw,
  Sparkles,
  Laptop,
  Cpu,
  HardDrive,
  Keyboard,
  Headphones,
  Gamepad2,
  Wifi,
  ShieldCheck,
  Watch,
  Radio,
  BatteryCharging,
  Zap,
  Smartphone,
  Cable,
  Car,
  Share2,
  Boxes,
  Grid,
  Filter,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Laptop,
  Cpu,
  HardDrive,
  Keyboard,
  Headphones,
  Gamepad2,
  Wifi,
  ShieldCheck,
  Layers,
  Watch,
  Radio,
  BatteryCharging,
  Zap,
  Smartphone,
  Cable,
  Car,
  Share2,
  Boxes,
  Grid,
};

interface SidebarFiltersProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarFilters: React.FC<SidebarFiltersProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const {
    products,
    selectedCategory,
    setSelectedCategory,
    categories,
    stockFilter,
    setStockFilter,
    isOutletOnly,
    setIsOutletOnly,
    searchQuery,
    setSearchQuery,
  } = useApp();

  // Product counts per category calculated from current dynamic products
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    counts['ALL'] = products.length;
    categories.forEach((cat) => {
      counts[cat.id] = products.filter((p) => p.category === cat.id).length;
    });
    return counts;
  }, [products, categories]);

  // Count in-stock products
  const inStockCount = React.useMemo(() => {
    return products.filter((p) => p.inStock).length;
  }, [products]);

  // Count outlet products
  const outletCount = React.useMemo(() => {
    return products.filter((p) => p.badge === 'OFERTA' || p.badge === 'MÁS VENDIDO').length;
  }, [products]);

  const hasActiveFilters =
    selectedCategory !== 'ALL' ||
    stockFilter !== 'all' ||
    isOutletOnly ||
    searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setSelectedCategory('ALL');
    setStockFilter('all');
    setIsOutletOnly(false);
    setSearchQuery('');
  };

  const content = (
    <div className="space-y-5">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Filtros
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Catálogo Mayorista</p>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            title="Restablecer todos los filtros"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Sección Especial: Outlet / Liquidación */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          Promociones
        </span>
        <button
          onClick={() => {
            setIsOutletOnly(!isOutletOnly);
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isOutletOnly
              ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white border-red-600 shadow-sm shadow-red-200'
              : 'bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Flame className={`w-4 h-4 ${isOutletOnly ? 'text-amber-200' : 'text-red-600'}`} />
            <span>OUTLET / LIQUIDACIÓN</span>
          </div>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              isOutletOnly
                ? 'bg-white/20 text-white'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {outletCount}
          </span>
        </button>
      </div>

      {/* Disponibilidad / Stock Filter */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          Disponibilidad
        </span>
        <div className="bg-slate-50 rounded-xl p-1.5 border border-slate-200/80 space-y-1">
          <button
            onClick={() => {
              setStockFilter('all');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              stockFilter === 'all'
                ? 'bg-white text-blue-700 font-bold shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${stockFilter === 'all' ? 'bg-blue-600' : 'bg-slate-300'}`} />
              <span>Todos los artículos</span>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{products.length}</span>
          </button>

          <button
            onClick={() => {
              setStockFilter('in_stock');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              stockFilter === 'in_stock'
                ? 'bg-white text-emerald-700 font-bold shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Solo Disponibles</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
              {inStockCount}
            </span>
          </button>
        </div>
      </div>

      {/* Rubros / Categorías (Vertical List) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Rubros ({categories.length})
          </span>
          <span className="text-[10px] text-slate-400">Seleccionar</span>
        </div>

        <div className="space-y-0.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1 scrollbar-thin">
          {/* Opción "Todos los Rubros" */}
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
              selectedCategory === 'ALL'
                ? 'bg-[#0055b8] text-white font-black shadow-sm'
                : 'text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 font-medium'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Boxes className={`w-4 h-4 flex-shrink-0 ${selectedCategory === 'ALL' ? 'text-white' : 'text-blue-600'}`} />
              <span className="truncate">Todos los Rubros</span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {categoryCounts['ALL'] || 0}
            </span>
          </button>

          {/* Listado de categorías */}
          {categories.map((cat) => {
            const Icon = iconMap[cat.iconName] || Boxes;
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer text-left group ${
                  isSelected
                    ? 'bg-[#0055b8] text-white font-black shadow-sm'
                    : 'text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isSelected
                        ? 'text-white'
                        : 'text-blue-600 group-hover:text-blue-700'
                    }`}
                  />
                  <span className="truncate">{cat.shortName || cat.name}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : count > 0
                      ? 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-800'
                      : 'bg-slate-50 text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info footer box */}
      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-800">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Venta Mayorista</span>
        </div>
        <p className="text-blue-700/80 leading-relaxed text-[10px]">
          Precios por bulto y gremio con stock en depósito Rosario.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Left Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
        <div className="sticky top-20 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-2xl p-5 overflow-y-auto z-50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase text-blue-900 tracking-wider">
                  Filtrar Catálogo
                </span>
                <button
                  onClick={onCloseMobile}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>
              {content}
            </div>
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={onCloseMobile}
                className="w-full py-2.5 bg-[#0055b8] text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                Ver Artículos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
