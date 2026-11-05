import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category } from '../types';
import { CATEGORIES } from '../data/categories';
import { AdminProductModal } from './AdminProductModal';
import { SupabaseModal } from './SupabaseModal';
import { InventoryTableRow } from './InventoryTableRow';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import * as XLSX from 'xlsx';
import { exportStockCatalog } from '../utils/exportUtils';
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Store,
  DollarSign,
  Boxes,
  CheckCircle2,
  Trash2,
  TrendingUp,
  Percent,
  X,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Database,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    products,
    updateStock,
    updateProductFinancials,
    deleteProduct,
    applyPercentagePriceAdjustment,
    bulkUpdateProducts,
    replaceProducts,
    clearAllProducts,
    resetProductsToDefault,
    exchangeRate,
    openExchangeRateModal,
    setIsAdminView,
    logoutAdmin,
    showToast,
    isSupabaseConnected,
  } = useApp();

  // Search & Filter state for the table
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'outlet' | 'currency_ars' | 'currency_usd'>('all');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(5);
  const [priceDisplayMode, setPriceDisplayMode] = useState<'AUTO' | 'ARS' | 'USD'>('AUTO');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // File upload ref for CSV / XLSX import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Stats calculation
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stockQuantity > 0).length;
  const outOfStockCount = totalProducts - inStockCount;
  const totalInventoryUSD = products.reduce((acc, p) => acc + p.priceUSD * p.stockQuantity, 0);
  const totalInventoryARS = totalInventoryUSD * exchangeRate;

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      // Status & Currency filter
      if (statusFilter === 'in_stock' && p.stockQuantity <= 0) return false;
      if (statusFilter === 'out_of_stock' && p.stockQuantity > 0) return false;
      if (statusFilter === 'outlet' && p.badge !== 'OFERTA' && p.badge !== 'MÁS VENDIDO') return false;
      if (statusFilter === 'currency_ars' && p.priceCurrency !== 'ARS') return false;
      if (statusFilter === 'currency_usd' && p.priceCurrency === 'ARS') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, categoryFilter, statusFilter, searchTerm]);

  // Handle Export (XLSX or CSV)
  const handleExport = (format: 'xlsx' | 'csv') => {
    exportStockCatalog(products, exchangeRate, format);
    setIsExportMenuOpen(false);
    showToast(
      `Catálogo de stock exportado exitosamente en formato ${format === 'xlsx' ? 'Excel (.xlsx)' : 'CSV (.csv)'}.`,
      'success'
    );
  };

  // Handle Import (XLSX, XLS or CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          showToast('El archivo no contiene ninguna hoja con datos.', 'warning');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          showToast('El archivo no contiene filas de datos.', 'warning');
          return;
        }

        const sampleRow = rawRows[0];
        const rowKeys = Object.keys(sampleRow);
        const findKey = (candidates: string[]) => {
          return rowKeys.find((k) => candidates.includes(k.trim().toLowerCase()));
        };

        const skuKey = findKey(['sku', 'código sku', 'codigo sku', 'código', 'codigo', 'id']);
        const nameKey = findKey(['name', 'nombre', 'producto', 'artículo', 'articulo', 'nombre del producto']);

        if (!skuKey || !nameKey) {
          showToast('El archivo debe contener al menos las columnas "sku" y "name" (o Producto).', 'error');
          return;
        }

        const brandKey = findKey(['brand', 'marca']);
        const categoryKey = findKey(['category', 'rubro', 'categoría', 'categoria']);
        const subcategoryKey = findKey(['subcategory', 'subrubro', 'subcategoría', 'subcategoria']);
        const priceUsdKey = findKey(['priceusd', 'precio usd', 'precio u$s', 'usd']);
        const priceArsKey = findKey(['pricears', 'precio ars', 'precio pesos', 'ars']);
        const priceCurrencyKey = findKey(['pricecurrency', 'moneda', 'moneda base']);
        const stockKey = findKey(['stockquantity', 'stock', 'cantidad', 'stock mayorista', 'stock disponible']);
        const badgeKey = findKey(['badge', 'etiqueta']);
        const imageKey = findKey(['imageurl', 'imagen', 'foto', 'url foto']);
        const descKey = findKey(['description', 'descripción', 'descripcion']);

        const isConfirmReplace = products.length > 0 && window.confirm(
          `Se procesará el archivo Excel / CSV.\n\n¿Desea REEMPLAZAR todo el catálogo anterior con este nuevo archivo?\n\n• Aceptar: Borra los productos anteriores y carga ÚNICAMENTE los de este Excel.\n• Cancelar: Mantiene los anteriores y combina/actualiza con los del archivo.`
        );

        const updated = isConfirmReplace ? [] : [...products];
        let updatedCount = 0;
        let createdCount = 0;

        for (const row of rawRows) {
          const rowSku = String(row[skuKey] || '').trim();
          const rowName = String(row[nameKey] || '').trim();
          if (!rowSku || !rowName) continue;

          // Parse currency & prices
          const rawCurrency = priceCurrencyKey ? String(row[priceCurrencyKey] || '').toUpperCase() : '';
          const rowPriceCurrency: 'USD' | 'ARS' =
            rawCurrency.includes('ARS') || rawCurrency.includes('PESO') ? 'ARS' : 'USD';

          let rowPriceUSD = 10;
          let rowPriceARS: number | undefined = undefined;

          if (priceArsKey && row[priceArsKey] !== '') {
            const rawArs = String(row[priceArsKey]).replace('$', '').replace(/\s/g, '').replace(',', '.');
            rowPriceARS = Math.round(parseFloat(rawArs) || 0);
          }

          if (priceUsdKey && row[priceUsdKey] !== '') {
            const rawPrice = String(row[priceUsdKey])
              .replace('$', '')
              .replace(/u\$s/i, '')
              .replace(/\s/g, '')
              .replace(',', '.');
            rowPriceUSD = parseFloat(rawPrice) || 10;
          }

          if (rowPriceCurrency === 'ARS' && rowPriceARS) {
            rowPriceUSD = Number((rowPriceARS / exchangeRate).toFixed(2));
          } else if (!rowPriceARS && rowPriceUSD) {
            rowPriceARS = Math.round(rowPriceUSD * exchangeRate);
          }

          const rawStock = stockKey ? String(row[stockKey]) : '0';
          const rowStock = Math.max(0, parseInt(rawStock, 10) || 0);

          const existingIndex = updated.findIndex((p) => p.sku.toLowerCase() === rowSku.toLowerCase());
          if (existingIndex !== -1) {
            // Update existing
            updated[existingIndex] = {
              ...updated[existingIndex],
              name: rowName,
              priceUSD: rowPriceUSD,
              costUSD: rowPriceUSD > 0 ? Number((rowPriceUSD / 1.15).toFixed(2)) : 0,
              priceARS: rowPriceARS,
              costARS: rowPriceARS ? Math.round(rowPriceARS / 1.15) : Math.round((rowPriceUSD / 1.15) * exchangeRate),
              profitMargin: 15,
              priceCurrency: rowPriceCurrency,
              stockQuantity: rowStock,
              inStock: rowStock > 0,
            };
            updatedCount++;
          } else {
            // Create new
            const newProd: Product = {
              id: 'prod_imp_' + Date.now() + Math.random().toString(36).substring(2, 5),
              sku: rowSku,
              name: rowName,
              brand: (brandKey && String(row[brandKey])) || 'Genérico',
              category: ((categoryKey && String(row[categoryKey])) as Category) || 'ACCESORIOS, ADAPTADORES Y CABLES',
              subcategory: (subcategoryKey && String(row[subcategoryKey])) || '',
              description: (descKey && String(row[descKey])) || rowName,
              specs: ['Garantía oficial MP Distribuciones'],
              priceUSD: rowPriceUSD,
              costUSD: rowPriceUSD > 0 ? Number((rowPriceUSD / 1.15).toFixed(2)) : 0,
              priceARS: rowPriceARS,
              costARS: rowPriceARS ? Math.round(rowPriceARS / 1.15) : Math.round((rowPriceUSD / 1.15) * exchangeRate),
              profitMargin: 15,
              priceCurrency: rowPriceCurrency,
              stockQuantity: rowStock,
              inStock: rowStock > 0,
              badge: (badgeKey && (row[badgeKey] as any)) || undefined,
              imageUrl:
                (imageKey && String(row[imageKey])) ||
                DEFAULT_PRODUCT_IMAGE,
              minWholesaleQty: 1,
              createdAt: new Date().toISOString(),
            };
            updated.push(newProd);
            createdCount++;
          }
        }

        if (isConfirmReplace) {
          await replaceProducts(updated);
        } else {
          bulkUpdateProducts(updated);
          showToast(
            `Importación completada: ${updatedCount} actualizados, ${createdCount} nuevos agregados.`,
            'success'
          );
        }
      } catch (err) {
        console.error(err);
        showToast('Hubo un error al leer el archivo Excel / CSV. Verifique el formato.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = '';
  };

  const handleClearAll = async () => {
    if (products.length === 0) {
      showToast('El catálogo ya se encuentra vacío.', 'info');
      return;
    }
    const confirmed = window.confirm(
      `⚠️ ATENCIÓN: ¿Seguro que deseás borrar los ${products.length} productos del catálogo?\n\nEsta acción eliminará todos los artículos de la base de datos de Supabase para permitir una carga limpia desde cero.`
    );
    if (confirmed) {
      await clearAllProducts();
    }
  };

  const handleOpenEdit = (p: Product) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Está seguro de eliminar "${name}" del catálogo? Esta acción no se puede deshacer.`)) {
      deleteProduct(id);
    }
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustmentPercentage === 0) return;
    if (
      window.confirm(
        `¿Desea aplicar un ajuste de ${adjustmentPercentage > 0 ? '+' : ''}${adjustmentPercentage}% a TODOS los ${
          products.length
        } productos del catálogo?`
      )
    ) {
      applyPercentagePriceAdjustment(adjustmentPercentage);
      setIsAdjustmentModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-800 pb-16">
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#07245b] text-white border-b border-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="MP Distribuciones"
              className="w-10 h-10 object-contain rounded-full bg-black/40 border border-white/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight">MP DISTRIBUCIONES</span>
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px] uppercase tracking-wider">
                  Panel de Gestión
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                Sistema de Control de Stock, Precios y Carga Masiva
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Cloud Connection Status Button */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isSupabaseConnected
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border-emerald-400/40 shadow-sm'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/40'
              }`}
              title="Configuración de base de datos Supabase Cloud (sincronización en tiempo real)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">{isSupabaseConnected ? 'Supabase Cloud Activo' : 'Conectar Supabase'}</span>
                <span className="sm:hidden">{isSupabaseConnected ? 'Cloud' : 'Conectar'}</span>
              </span>
            </button>

            <button
              onClick={() => setIsAdminView(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all"
            >
              <Store className="w-4 h-4" />
              <span>Ver Catálogo Público</span>
            </button>

            <button
              onClick={logoutAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 hover:bg-red-950 hover:text-red-300 border border-blue-800 text-blue-200 font-semibold text-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Products */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Artículos</p>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{totalProducts}</h4>
              <p className="text-[11px] text-blue-600 font-medium">{CATEGORIES.length} rubros activos</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Stock Availability */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Disponibilidad Stock</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-emerald-700">{inStockCount}</span>
                <span className="text-xs text-slate-400">/ {outOfStockCount} pausados</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {Math.round((inStockCount / (totalProducts || 1)) * 100)}% con stock
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Inventory Valuation */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Valor de Inventario</p>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                u$s {Math.round(totalInventoryUSD).toLocaleString('es-AR')}
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                ≈ $ {Math.round(totalInventoryARS).toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Exchange Rate Reference */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Dólar Mayorista Ref.</p>
              <h4 className="text-2xl font-black text-blue-700 mt-0.5">${exchangeRate} ARS</h4>
              <button
                onClick={openExchangeRateModal}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Cambiar cotización global
              </button>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">Herramientas de Gestión de Catálogo</h3>
              <p className="text-xs text-slate-500">
                Alta de productos, actualización masiva y sincronización por Excel / CSV
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Add New Product Button */}
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Producto</span>
              </button>

              {/* Mass Price Percentage Adjustment */}
              <button
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold text-xs transition-colors cursor-pointer"
                title="Aumentar o rebajar todos los precios en un porcentaje"
              >
                <Percent className="w-3.5 h-3.5 text-amber-600" />
                <span>Ajuste Masivo %</span>
              </button>

              {/* Export Stock Dropdown (XLSX / CSV) */}
              <div className="relative inline-block" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                  title="Descargar catálogo completo en formato Excel (.xlsx) o CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exportar Stock</span>
                  <ChevronDown className="w-3 h-3 text-emerald-700" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                      <span>Exportar Inventario</span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{products.length} Artículos</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExport('xlsx')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors text-left cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">Excel (.xlsx)</div>
                        <span className="text-[10px] text-slate-400 font-normal">Con formato para Microsoft Excel</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold">CSV (.csv)</div>
                        <span className="text-[10px] text-slate-400 font-normal">Compatible con ERP y sistemas</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Import Excel / CSV */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                title="Subir archivo Excel (.xlsx, .xls) o CSV para actualizar masivamente"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Importar Excel / CSV</span>
              </button>

              {/* Clear Catalog Button */}
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition-colors cursor-pointer"
                title="Eliminar todos los productos actuales de la base de datos para cargar catálogo nuevo"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Vaciar Catálogo</span>
              </button>

              {/* Supabase Cloud Sync Button */}
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-bold text-xs transition-colors cursor-pointer ${
                  isSupabaseConnected
                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
                }`}
                title="Configuración de base de datos Supabase y sincronización en tiempo real"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSupabaseConnected ? 'Supabase Cloud' : 'Conectar Supabase'}</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Reset to Factory Demo */}
              <button
                onClick={() => {
                  if (window.confirm('¿Desea restablecer el catálogo a los 767 artículos oficiales de MP Distribuciones? Se actualizarán todos los productos con las fotos de Google Photos.')) {
                    resetProductsToDefault();
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                title="Restablecer a los 767 artículos oficiales con fotos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar for Table */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código SKU, producto o marca..."
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 placeholder-slate-400 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="ALL">Todos los Rubros ({totalProducts})</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.shortName}
                  </option>
                ))}
              </select>

              {/* Status pills */}
              <div className="flex flex-wrap items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold gap-0.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('in_stock')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Con Stock
                </button>
                <button
                  onClick={() => setStatusFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'out_of_stock' ? 'bg-white text-red-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Agotados
                </button>
                <button
                  onClick={() => setStatusFilter('currency_ars')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'currency_ars' ? 'bg-emerald-600 text-white shadow-sm font-bold' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                  title="Mostrar únicamente productos fijados en Pesos Argentinos ($)"
                >
                  En Pesos ($)
                </button>
                <button
                  onClick={() => setStatusFilter('currency_usd')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    statusFilter === 'currency_usd' ? 'bg-blue-600 text-white shadow-sm font-bold' : 'text-blue-700 hover:bg-blue-50'
                  }`}
                  title="Mostrar únicamente productos fijados en Dólares (USD)"
                >
                  En Dólares (u$s)
                </button>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>
              Mostrando <strong className="text-slate-800 font-bold">{filteredProducts.length}</strong> artículos
              coincidentes
            </span>
            <span className="text-[11px] text-slate-400">
              💡 Tip: Podés editar el stock y el precio directamente en los casilleros de la tabla.
            </span>
          </div>
        </div>

        {/* Live Editable Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-black text-[10px] tracking-wider">
                <th className="p-3 text-center w-14">Foto</th>
                <th className="p-3 w-32">SKU / Marca</th>
                <th className="p-3">Nombre del Producto & Rubro</th>
                <th className="p-3 w-36 text-center">Stock Actual</th>
                <th className="p-3 w-36 text-right">Costo</th>
                <th className="p-3 w-28 text-center">% Ganancia</th>
                <th className="p-3 w-56 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Precio</span>
                    <div className="inline-flex rounded-lg bg-slate-200 p-0.5 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPriceDisplayMode('AUTO')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          priceDisplayMode === 'AUTO'
                            ? 'bg-blue-600 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Ver cada producto en su moneda guardada (Pesos o Dólares)"
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceDisplayMode('ARS')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          priceDisplayMode === 'ARS'
                            ? 'bg-emerald-600 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Ver todos en Pesos Argentinos"
                      >
                        ARS ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriceDisplayMode('USD')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          priceDisplayMode === 'USD'
                            ? 'bg-blue-600 text-white font-black shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        title="Ver todos en Dólares USD"
                      >
                        USD (u$s)
                      </button>
                    </div>
                  </div>
                </th>
                <th className="p-3 w-28 text-center">Estado</th>
                <th className="p-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => (
                  <InventoryTableRow
                    key={p.id}
                    product={p}
                    exchangeRate={exchangeRate}
                    priceDisplayMode={priceDisplayMode}
                    onUpdateStock={updateStock}
                    onUpdateFinancials={updateProductFinancials}
                    onEdit={handleOpenEdit}
                    onDelete={(id) => handleDelete(id, p.name)}
                    showToast={showToast}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    No se encontraron productos coincidentes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Developer Credit */}
        <div className="pt-6 pb-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span>Desarrollado por</span>
          <a
            href="https://www.shurianlabs.com.ar/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-mp-primary font-bold transition-colors underline underline-offset-2"
          >
            Shurian Labs
          </a>
        </div>
      </main>

      {/* Product Creation / Edit Modal */}
      <AdminProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Percentage Price Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Ajuste Porcentual de Precios</h3>
                <p className="text-xs text-slate-500">
                  Modifica en bloque todos los precios de los {products.length} productos
                </p>
              </div>
            </div>

            <form onSubmit={handleApplyAdjustment} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Porcentaje a aplicar a todo el catálogo (%):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={adjustmentPercentage}
                    onChange={(e) => setAdjustmentPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="Ej: 5 para aumentar 5%, o -5 para rebajar"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-base font-mono font-bold text-slate-900 outline-none"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* Quick preset buttons */}
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500 font-semibold">Atajos habituales:</p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentPercentage(3)}
                    className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    +3%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentPercentage(5)}
                    className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentPercentage(10)}
                    className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentPercentage(-5)}
                    className="py-1 px-2 rounded-lg bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700"
                  >
                    -5%
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                Atención: Esta acción modificará de forma inmediata los valores en USD de todos los productos en el catálogo de los clientes.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md"
                >
                  Aplicar Ajuste Masivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supabase Cloud Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
