import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search,
  ShoppingCart,
  MapPin,
  Phone,
  X,
  ShieldCheck,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  History,
} from 'lucide-react';
import { exportPriceList } from '../utils/exportUtils';

export const Header: React.FC = () => {
  const {
    exchangeRate,
    user,
    logout,
    openAuthModal,
    openOrderHistoryModal,
    cartCount,
    openCartDrawer,
    searchQuery,
    setSearchQuery,
    setSelectedCategory,
    setIsOutletOnly,
    showToast,
    products,
    isAdminLoggedIn,
    openAdminModal,
    setIsAdminView,
  } = useApp();

  const [isPriceListMenuOpen, setIsPriceListMenuOpen] = useState(false);
  const priceListMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (priceListMenuRef.current && !priceListMenuRef.current.contains(e.target as Node)) {
        setIsPriceListMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full shadow-md">
      {/* LINE 1: Main Brand Bar (Vibrant MP Royal Blue) */}
      <div className="w-full bg-[#0052cc] text-white px-3 sm:px-4 py-2 sm:py-2.5 border-b border-blue-600/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo Brand Button */}
          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setIsOutletOnly(false);
              setSearchQuery('');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 group shrink-0 text-left cursor-pointer"
            title="MP Distribuciones - Volver al Inicio"
          >
            <img
              src="/logo.png"
              alt="MP Distribuciones"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-full bg-black/40 ring-1 sm:ring-2 ring-white/30 group-hover:ring-white group-hover:scale-105 transition-all shadow-sm"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-xs sm:text-base font-black tracking-tight text-white group-hover:text-blue-200 transition-colors">
                <span className="inline sm:hidden">MP DISTRIB.</span>
                <span className="hidden sm:inline">MP DISTRIBUCIONES</span>
              </span>
              <span className="hidden sm:block text-[9px] uppercase font-bold tracking-wider text-blue-200">
                Mayorista Informática B2B
              </span>
            </div>
          </button>

          {/* Unified Search Bar */}
          <div className="flex-1 max-w-xs sm:max-w-md lg:max-w-xl relative mx-1 sm:mx-3">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto, marca, código SKU..."
              className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 rounded-lg bg-blue-700/60 focus:bg-white focus:text-slate-900 border border-blue-400/40 text-xs text-white placeholder-blue-200 focus:placeholder-slate-400 outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Actions: Panel Dueño (Left of Ver Pedido) & Ver Pedido */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Panel Dueño (Desktop: placed to the left of Ver Pedido) */}
            <button
              onClick={() => {
                if (isAdminLoggedIn) {
                  setIsAdminView(true);
                } else {
                  openAdminModal();
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-300/40 font-bold text-amber-300 hover:text-white transition-all cursor-pointer shadow-xs text-xs"
              title="Panel de gestión de stock y precios exclusivo para el dueño"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Panel Dueño</span>
            </button>

            {/* Ver Pedido */}
            <button
              onClick={openCartDrawer}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0 cursor-pointer"
              title="Ver Carrito de Pedido"
            >
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ver Pedido</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-emerald-800 font-extrabold text-[10px] sm:text-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* LINE 2: Secondary Utility & Navigation Bar */}
      <div className="w-full bg-[#07245b] text-white px-3 sm:px-4 py-1 sm:py-1.5 border-b border-blue-950/50 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] sm:text-xs">
          {/* Left: User status, Historial, Lista Precios (and Mobile Panel Dueño) */}
          <div className="flex items-center gap-2 sm:gap-3 text-blue-100 whitespace-nowrap">
            <span className="flex items-center gap-1 font-medium">
              <span>Hola,</span>
              {user ? (
                <strong
                  className="text-white font-bold max-w-[120px] sm:max-w-none truncate inline-block"
                >
                  {user.businessName.split(' ')[0]}
                </strong>
              ) : (
                <strong className="text-white hidden xs:inline">Invitado</strong>
              )}
              <span className="text-blue-300">
                ({user ? (
                  <button onClick={logout} className="hover:underline text-blue-200 ml-0.5 cursor-pointer">
                    Salir
                  </button>
                ) : (
                  <button onClick={() => openAuthModal('login')} className="hover:underline text-white font-bold ml-0.5 cursor-pointer">
                    Ingresar
                  </button>
                )})
              </span>
            </span>

            <span className="text-blue-400/60">|</span>

            {/* Order History Button (Historial) */}
            <button
              onClick={() => {
                if (user) {
                  openOrderHistoryModal();
                } else {
                  openAuthModal('login');
                }
              }}
              className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer font-medium"
              title="Ver historial de pedidos y repetir compras"
            >
              <History className="w-3.5 h-3.5 text-blue-300" />
              <span>Historial</span>
            </button>

            <span className="text-blue-400/60">|</span>

            {/* Price List Export Dropdown (XLSX / CSV) */}
            <div className="relative inline-block" ref={priceListMenuRef}>
              <button
                onClick={() => setIsPriceListMenuOpen((prev) => !prev)}
                className="hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer font-medium"
                title="Descargar lista de precios mayorista en formato Excel (.xlsx) o CSV"
              >
                <span>Lista Precios</span>
                <ChevronDown className={`w-3 h-3 text-blue-300 transition-transform ${isPriceListMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPriceListMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-60 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-50 animate-fadeIn ring-1 ring-black/10">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                    <span>Descargar Precios</span>
                    <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                      {products.length} Arts.
                    </span>
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      onClick={() => {
                        exportPriceList(products, exchangeRate, 'xlsx');
                        setIsPriceListMenuOpen(false);
                        showToast('Lista de precios descargada en Excel (.xlsx)', 'success');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-emerald-800">
                          Excel (.xlsx)
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Con fórmulas y formato
                        </span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        exportPriceList(products, exchangeRate, 'csv');
                        setIsPriceListMenuOpen(false);
                        showToast('Lista de precios descargada en CSV (.csv)', 'success');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-all text-left cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-800">
                          CSV (.csv)
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Para importación en ERP
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile-only Panel Dueño button */}
            <span className="sm:hidden text-blue-400/60">|</span>
            <button
              onClick={() => {
                if (isAdminLoggedIn) {
                  setIsAdminView(true);
                } else {
                  openAdminModal();
                }
              }}
              className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-bold text-[10px]"
            >
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>Dueño</span>
            </button>
          </div>

          {/* Right: Contact & BNA Dollar info (Visible on Desktop / PC) */}
          <div className="hidden md:flex items-center gap-3 shrink-0 text-blue-200 text-[11px]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>San Nicolás 2277, Rosario</span>
            </span>

            <span className="text-blue-400/60">|</span>

            <a
              href="https://wa.me/5493413408439"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp: <strong>+54 9 341 340-8439</strong></span>
            </a>

            <span className="text-blue-400/60">|</span>

            <span className="flex items-center gap-1 text-blue-200">
              <span>Lun a Vie: 9:00 a 16:00 hs</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
