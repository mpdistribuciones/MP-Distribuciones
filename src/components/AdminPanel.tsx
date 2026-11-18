import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Product, Category } from '../types';
import { AdminProductModal } from './AdminProductModal';
import { StockEntryModal } from './StockEntryModal';
import { SupabaseModal } from './SupabaseModal';
import { InventoryTableRow } from './InventoryTableRow';
import { DEFAULT_PRODUCT_IMAGE, cleanFloat, formatARS } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { exportStockCatalog } from '../utils/exportUtils';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminUsersView } from './AdminUsersView';
import {
  Search,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Store,
  DollarSign,
  Boxes,
  CheckCircle2,
  TrendingUp,
  Percent,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  FileSpreadsheet,
  FileText,
  Database,
  PackagePlus,
  Sparkles,
  ClipboardList,
  Package,
  Bell,
  Users,
  Plus,
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
    resetProductsToDefault,
    exchangeRate,
    dollarRates,
    openExchangeRateModal,
    setIsAdminView,
    logoutAdmin,
    showToast,
    isSupabaseConnected,
    orders,
    b2bUsers,
    categories,
    addCategory,
  } = useApp();

  // Active view tab: 'inventory' | 'orders' | 'users'
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'users'>('inventory');
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'pendiente' || o.status === 'enviado').length,
    [orders]
  );
  const pendingUsersCount = useMemo(
    () => b2bUsers.filter((u) => u.status === 'pendiente').length,
    [b2bUsers]
  );

  // Search & Filter state for the table
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'currency_ars' | 'currency_usd'>('all');

  // Pagination & Sorting state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [sortBy, setSortBy] = useState<
    'default' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'
  >('default');
  const tableTopRef = useRef<HTMLDivElement>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [prefillProductData, setPrefillProductData] = useState<Partial<Product> | null>(null);
  const [isStockEntryModalOpen, setIsStockEntryModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentPercentage, setAdjustmentPercentage] = useState<number>(5);
  const priceDisplayMode: 'ARS' = 'ARS';
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

  // Reset pagination to first page whenever search, filter, sort or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, sortBy, pageSize]);

  // Stats calculation
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stockQuantity > 0).length;
  const outOfStockCount = totalProducts - inStockCount;
  const totalInventoryARS = products.reduce(
    (acc, p) => acc + (p.priceARS || cleanFloat(p.priceUSD * exchangeRate)) * p.stockQuantity,
    0
  );

  // Filtered and sorted products list (evaluated over full catalog)
  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => {
      // Category filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }
      // Status & Currency filter
      if (statusFilter === 'in_stock' && p.stockQuantity <= 0) return false;
      if (statusFilter === 'out_of_stock' && p.stockQuantity > 0) return false;
      if (statusFilter === 'currency_ars' && p.priceCurrency !== 'ARS') return false;
      if (statusFilter === 'currency_usd' && p.priceCurrency === 'ARS') return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          Boolean(p.subcategory && p.subcategory.toLowerCase().includes(q))
        );
      }
      return true;
    });

    if (sortBy !== 'default') {
      const sorted = [...list];
      switch (sortBy) {
        case 'name_asc':
          sorted.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
          break;
        case 'name_desc':
          sorted.sort((a, b) => b.name.localeCompare(a.name, 'es', { sensitivity: 'base' }));
          break;
        case 'price_asc':
          sorted.sort(
            (a, b) =>
              (a.priceARS || a.priceUSD * exchangeRate) -
              (b.priceARS || b.priceUSD * exchangeRate)
          );
          break;
        case 'price_desc':
          sorted.sort(
            (a, b) =>
              (b.priceARS || b.priceUSD * exchangeRate) -
              (a.priceARS || a.priceUSD * exchangeRate)
          );
          break;
        case 'stock_asc':
          sorted.sort((a, b) => a.stockQuantity - b.stockQuantity);
          break;
        case 'stock_desc':
          sorted.sort((a, b) => b.stockQuantity - a.stockQuantity);
          break;
      }
      return sorted;
    }

    return list;
  }, [products, categoryFilter, statusFilter, searchTerm, sortBy, exchangeRate]);

  // Pagination calculations
  const totalItems = filteredProducts.length;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedProducts = useMemo(() => {
    if (pageSize === 'all') return filteredProducts;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, safeCurrentPage, pageSize]);

  const startIndex = totalItems === 0 ? 0 : (pageSize === 'all' ? 1 : (safeCurrentPage - 1) * (pageSize as number) + 1);
  const endIndex = pageSize === 'all' ? totalItems : Math.min(safeCurrentPage * (pageSize as number), totalItems);

  const handlePageChange = (newPage: number) => {
    const target = Math.min(Math.max(1, newPage), totalPages);
    setCurrentPage(target);
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Smart page numbers array with ellipses
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (safeCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (safeCurrentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(safeCurrentPage - 1);
      pages.push(safeCurrentPage);
      pages.push(safeCurrentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [safeCurrentPage, totalPages]);

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

        const parseExcelNumber = (val: any): number => {
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          let s = String(val ?? '')
            .replace(/USD|ARS|u\$s|\$|\s/gi, '')
            .trim();
          if (!s) return 0;
          if (s.includes(',') && s.includes('.')) {
            if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
              s = s.replace(/\./g, '').replace(',', '.');
            } else {
              s = s.replace(/,/g, '');
            }
          } else if (s.includes(',')) {
            s = s.replace(',', '.');
          }
          const n = parseFloat(s);
          return isNaN(n) ? 0 : n;
        };

        // Detectar formato oficial LISTA MP PARA WEB.xlsx (Cols: STOCK | NOMBRE | PRECIO DE VENTA | COSTO | FOTO)
        const matrixRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const headerRow = (matrixRows[0] || []).map((c) => String(c || '').trim().toUpperCase());
        const secondRowFirstCell = String((matrixRows[1] || [])[0] || '').trim().toUpperCase();
        const isListaMpFormat =
          (headerRow.includes('PRECIO DE VENTA') && headerRow.includes('COSTO')) ||
          secondRowFirstCell === 'STOCK';

        if (isListaMpFormat) {
          const isConfirmReplace = products.length > 0 && window.confirm(
            `Se detectó la planilla oficial (PRECIO DE VENTA / COSTO).\n\n¿Desea REEMPLAZAR todo el catálogo anterior con este archivo?\n\n• Aceptar: Deja ÚNICAMENTE los artículos de este Excel (respetando fotos e historial).\n• Cancelar: Actualiza precios de venta, costos, porcentajes reales y stock manteniendo el resto del catálogo.`
          );

          const existingByName = new Map(
            products.map((p) => [p.name.trim().toLowerCase(), p])
          );
          const updated: Product[] = isConfirmReplace ? [] : [...products];
          let updatedCount = 0;
          let createdCount = 0;
          let currentCat: Category = 'VARIOS';
          let itemSeq = 0;

          for (let r = 1; r < matrixRows.length; r++) {
            const [colA, colB, colC, colD] = matrixRows[r] || [];
            const rawA = String(colA ?? '').trim();
            const rawB = String(colB ?? '').trim();
            if (!rawB) continue;

            if (rawA.toUpperCase() === 'STOCK' || colC === '' || colC == null) {
              currentCat = rawB as Category;
              continue;
            }

            itemSeq++;
            const rowName = rawB;
            const normName = rowName.toLowerCase();
            const rowStock = Math.max(0, Math.round(parseExcelNumber(colA)));
            const rawSaleStr = String(colC ?? '').trim().toUpperCase();
            const isExplicitArs = rawSaleStr.includes('ARS') || (rawSaleStr.startsWith('$') && !rawSaleStr.includes('U$S'));
            const saleVal = parseExcelNumber(colC);
            const costVal = parseExcelNumber(colD);

            const prevProd = existingByName.get(normName);
            const rowDollarKey = prevProd?.dollarRateKey || 'dolar1';
            const rateForRow = dollarRates[rowDollarKey]?.rate || exchangeRate;

            let rowPriceUSD = 0;
            let rowPriceARS = 0;
            let rowCostUSD = 0;
            let rowCostARS = 0;
            let calcMargin = 0;

            if (isExplicitArs) {
              rowPriceARS = Math.max(0.01, cleanFloat(saleVal));
              rowCostARS = costVal > 0 ? cleanFloat(costVal) : 0;
              rowPriceUSD = cleanFloat(rowPriceARS / rateForRow);
              rowCostUSD = cleanFloat(rowCostARS / rateForRow);
              calcMargin = rowCostARS > 0 ? cleanFloat(((rowPriceARS - rowCostARS) / rowCostARS) * 100) : 0;
            } else {
              rowPriceUSD = Math.max(0.0001, cleanFloat(saleVal));
              rowCostUSD = costVal > 0 ? cleanFloat(costVal) : rowPriceUSD;
              calcMargin = rowCostUSD > 0 ? cleanFloat(((rowPriceUSD - rowCostUSD) / rowCostUSD) * 100) : 0;
              rowCostARS = cleanFloat(rowCostUSD * rateForRow);
              rowPriceARS = Math.max(0.01, cleanFloat(rowPriceUSD * rateForRow));
            }

            const existingIdx = updated.findIndex(
              (p) => p.name.trim().toLowerCase() === normName
            );

            if (existingIdx !== -1) {
              updated[existingIdx] = {
                ...updated[existingIdx],
                name: rowName,
                category: currentCat || updated[existingIdx].category,
                priceUSD: rowPriceUSD,
                costUSD: rowCostUSD,
                priceARS: rowPriceARS,
                costARS: rowCostARS,
                profitMargin: calcMargin,
                priceCurrency: isExplicitArs ? 'ARS' : 'USD',
                dollarRateKey: rowDollarKey,
                stockQuantity: rowStock,
                inStock: rowStock > 0,
              };
              updatedCount++;
            } else {
              const fallbackId =
                prevProd?.id || `mp_prod_${String(itemSeq).padStart(4, '0')}`;
              updated.push({
                id: fallbackId,
                name: rowName,
                category: currentCat,
                subcategory: prevProd?.subcategory || '',
                description: prevProd?.description || rowName,
                specs: prevProd?.specs || ['Garantía oficial MP Distribuciones'],
                priceUSD: rowPriceUSD,
                costUSD: rowCostUSD,
                priceARS: rowPriceARS,
                costARS: rowCostARS,
                profitMargin: calcMargin,
                priceCurrency: isExplicitArs ? 'ARS' : 'USD',
                dollarRateKey: rowDollarKey,
                stockQuantity: rowStock,
                inStock: rowStock > 0,
                imageUrl: prevProd?.imageUrl || DEFAULT_PRODUCT_IMAGE,
                minWholesaleQty: prevProd?.minWholesaleQty || 1,
                createdAt: prevProd?.createdAt || new Date().toISOString(),
              });
              createdCount++;
            }
          }

          if (isConfirmReplace) {
            await replaceProducts(updated);
          } else {
            await bulkUpdateProducts(updated);
            showToast(
              `Planilla importada: ${updatedCount} actualizados, ${createdCount} nuevos (precios, costos y % calculados exactamente).`,
              'success'
            );
          }
          return;
        }

        const sampleRow = rawRows[0];
        const rowKeys = Object.keys(sampleRow);
        const findKey = (candidates: string[]) => {
          return rowKeys.find((k) => candidates.includes(k.trim().toLowerCase()));
        };

        const idKey = findKey(['id', 'sku', 'código sku', 'codigo sku', 'código', 'codigo']);
        const nameKey = findKey(['name', 'nombre', 'producto', 'artículo', 'articulo', 'nombre del producto']);

        if (!nameKey) {
          showToast('El archivo debe contener la columna "name" o "Producto".', 'error');
          return;
        }

        const categoryKey = findKey(['category', 'rubro', 'categoría', 'categoria']);
        const subcategoryKey = findKey(['subcategory', 'subrubro', 'subcategoría', 'subcategoria']);
        const priceUsdKey = findKey(['priceusd', 'precio usd', 'precio u$s', 'usd', 'precio de venta']);
        const priceArsKey = findKey(['pricears', 'precio ars', 'precio pesos', 'ars', 'precio mayorista ($ ars)']);
        const costUsdKey = findKey(['costusd', 'costo usd', 'costo', 'cost']);
        const costArsKey = findKey(['costars', 'costo ars', 'costo pesos']);
        const marginKey = findKey(['profitmargin', 'margen', 'porcentaje', 'ganancia']);
        const priceCurrencyKey = findKey(['pricecurrency', 'costcurrency', 'moneda', 'moneda base']);
        const dollarRateKeyCol = findKey(['dollarratekey', 'dolar', 'dólar']);
        const stockKey = findKey(['stockquantity', 'stock', 'cantidad', 'stock mayorista', 'stock disponible']);
        const imageKey = findKey(['imageurl', 'imagen', 'foto', 'url foto']);
        const descKey = findKey(['description', 'descripción', 'descripcion']);

        const isConfirmReplace = products.length > 0 && window.confirm(
          `Se procesará el archivo Excel / CSV.\n\n¿Desea REEMPLAZAR todo el catálogo anterior con este nuevo archivo?\n\n• Aceptar: Borra los productos anteriores y carga ÚNICAMENTE los de este Excel.\n• Cancelar: Mantiene los anteriores y combina/actualiza con los del archivo.`
        );

        const updated = isConfirmReplace ? [] : [...products];
        let updatedCount = 0;
        let createdCount = 0;

        for (const row of rawRows) {
          const rowId = idKey ? String(row[idKey] || '').trim() : '';
          const rowName = String(row[nameKey] || '').trim();
          if (!rowName) continue;

          // Parse currency & prices
          const rawCurrency = priceCurrencyKey ? String(row[priceCurrencyKey] || '').toUpperCase() : '';
          const rowPriceCurrency: 'USD' | 'ARS' =
            rawCurrency.includes('ARS') || rawCurrency.includes('PESO') ? 'ARS' : 'USD';

          const rawDollarKey = dollarRateKeyCol ? String(row[dollarRateKeyCol] || '').trim().toLowerCase() : 'dolar1';
          const rowDollarKey =
            rawDollarKey === 'dolar2' || rawDollarKey === '2'
              ? 'dolar2'
              : rawDollarKey === 'dolar3' || rawDollarKey === '3'
              ? 'dolar3'
              : 'dolar1';
          const rateForRow = dollarRates[rowDollarKey]?.rate || exchangeRate;

          let rowPriceUSD = 0;
          let rowPriceARS: number | undefined = undefined;
          let rowCostUSD: number | undefined = undefined;
          let rowCostARS: number | undefined = undefined;
          let rowMargin: number | undefined = undefined;

          if (priceArsKey && row[priceArsKey] !== '') {
            rowPriceARS = cleanFloat(parseExcelNumber(row[priceArsKey]));
          }

          if (priceUsdKey && row[priceUsdKey] !== '') {
            rowPriceUSD = parseExcelNumber(row[priceUsdKey]);
          }

          if (costUsdKey && row[costUsdKey] !== '') {
            const parsedCostUsd = parseExcelNumber(row[costUsdKey]);
            if (parsedCostUsd > 0) rowCostUSD = cleanFloat(parsedCostUsd);
          }

          if (costArsKey && row[costArsKey] !== '') {
            const parsedCostArs = parseExcelNumber(row[costArsKey]);
            if (parsedCostArs > 0) rowCostARS = cleanFloat(parsedCostArs);
          }

          if (marginKey && row[marginKey] !== '') {
            rowMargin = cleanFloat(parseExcelNumber(row[marginKey]));
          }

          if (rowPriceCurrency === 'ARS' && rowPriceARS) {
            rowPriceUSD = cleanFloat(rowPriceARS / rateForRow);
            if (rowCostARS == null && rowCostUSD != null) {
              rowCostARS = cleanFloat(rowCostUSD * rateForRow);
            }
            if (rowCostARS != null && rowCostUSD == null) {
              rowCostUSD = cleanFloat(rowCostARS / rateForRow);
            }
            if (rowMargin == null && rowCostARS && rowCostARS > 0) {
              rowMargin = cleanFloat(((rowPriceARS - rowCostARS) / rowCostARS) * 100);
            }
          } else {
            if (!rowPriceARS && rowPriceUSD > 0) {
              rowPriceARS = cleanFloat(rowPriceUSD * rateForRow);
            }
            if (rowPriceUSD <= 0 && rowPriceARS) {
              rowPriceUSD = cleanFloat(rowPriceARS / rateForRow);
            }
            if (rowCostUSD != null && rowCostARS == null) {
              rowCostARS = cleanFloat(rowCostUSD * rateForRow);
            }
            if (rowCostARS != null && rowCostUSD == null) {
              rowCostUSD = cleanFloat(rowCostARS / rateForRow);
            }
            if (rowMargin == null && rowCostUSD && rowCostUSD > 0 && rowPriceUSD > 0) {
              rowMargin = cleanFloat(((rowPriceUSD - rowCostUSD) / rowCostUSD) * 100);
            }
          }

          const rawStock = stockKey ? String(row[stockKey]) : '0';
          const rowStock = Math.max(0, parseInt(rawStock, 10) || 0);

          const existingIndex = updated.findIndex(
            (p) =>
              (rowId && p.id.toLowerCase() === rowId.toLowerCase()) ||
              p.name.trim().toLowerCase() === rowName.toLowerCase()
          );
          if (existingIndex !== -1) {
            const prevProd = updated[existingIndex];
            updated[existingIndex] = {
              ...prevProd,
              name: rowName,
              priceUSD: rowPriceUSD || prevProd.priceUSD,
              costUSD: rowCostUSD ?? prevProd.costUSD,
              priceARS: rowPriceARS ?? prevProd.priceARS,
              costARS: rowCostARS ?? prevProd.costARS,
              profitMargin: rowMargin ?? prevProd.profitMargin,
              priceCurrency: rowPriceCurrency,
              dollarRateKey: dollarRateKeyCol ? rowDollarKey : prevProd.dollarRateKey,
              stockQuantity: rowStock,
              inStock: rowStock > 0,
            };
            updatedCount++;
          } else {
            const newProd: Product = {
              id: rowId || 'prod_imp_' + Date.now() + Math.random().toString(36).substring(2, 5),
              name: rowName,
              category: ((categoryKey && String(row[categoryKey])) as Category) || 'ACCESORIOS, ADAPTADORES Y CABLES',
              subcategory: (subcategoryKey && String(row[subcategoryKey])) || '',
              description: (descKey && String(row[descKey])) || rowName,
              specs: ['Garantía oficial MP Distribuciones'],
              priceUSD: rowPriceUSD,
              costUSD: rowCostUSD ?? rowPriceUSD,
              priceARS: rowPriceARS,
              costARS: rowCostARS ?? rowPriceARS,
              profitMargin: rowMargin ?? 0,
              priceCurrency: rowPriceCurrency,
              dollarRateKey: rowDollarKey,
              stockQuantity: rowStock,
              inStock: rowStock > 0,
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

  const handleOpenEdit = (p: Product) => {
    setProductToEdit(p);
    setPrefillProductData(null);
    setIsProductModalOpen(true);
  };

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setPrefillProductData(null);
    setIsProductModalOpen(true);
  };

  const handleOpenStockEntry = () => {
    setIsStockEntryModalOpen(true);
  };

  const handleOpenCreateFromRescue = (prefillQuery?: string) => {
    setIsStockEntryModalOpen(false);
    setProductToEdit(null);
    setPrefillProductData(prefillQuery ? { name: prefillQuery } : null);
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

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Pending Orders Notification Badge */}
            {pendingOrdersCount > 0 && (
              <button
                onClick={() => setActiveTab('orders')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-xs shadow-md transition-all cursor-pointer animate-pulse"
                title="Hay pedidos pendientes de confirmación"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {pendingOrdersCount} {pendingOrdersCount === 1 ? 'Pedido Pendiente' : 'Pedidos Pendientes'}
                </span>
              </button>
            )}

            {/* Pending Clients Notification Badge */}
            {pendingUsersCount > 0 && (
              <button
                onClick={() => setActiveTab('users')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer animate-pulse"
                title="Hay solicitudes de cuentas B2B por validar"
              >
                <Users className="w-3.5 h-3.5" />
                <span>
                  {pendingUsersCount} {pendingUsersCount === 1 ? 'Cliente por Validar' : 'Clientes por Validar'}
                </span>
              </button>
            )}

            {/* Supabase Cloud Connection Status Button */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isSupabaseConnected
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-400/30 shadow-xs'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-400/30'
              }`}
              title="Configuración de base de datos Supabase Cloud (sincronización en tiempo real)"
            >
              <Database className="w-3.5 h-3.5 text-emerald-300" />
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">{isSupabaseConnected ? 'Supabase Conectado' : 'Conectar Supabase'}</span>
                <span className="sm:hidden">{isSupabaseConnected ? 'Conectado' : 'Conectar'}</span>
              </span>
            </button>

            <button
              onClick={() => setIsAdminView(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition-all cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>Ver Catálogo Público</span>
            </button>

            <button
              onClick={logoutAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 hover:bg-red-950 hover:text-red-300 border border-blue-800 text-blue-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs between Catalog & Orders */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventario y Catálogo</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  activeTab === 'inventory' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Pedidos Recibidos</span>
              {pendingOrdersCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingOrdersCount} pendiente{pendingOrdersCount === 1 ? '' : 's'}
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    activeTab === 'orders' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {orders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes B2B</span>
              {pendingUsersCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingUsersCount} por validar
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    activeTab === 'users' ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {b2bUsers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <AdminOrdersView />
        ) : activeTab === 'users' ? (
          <AdminUsersView />
        ) : (
          <>
            {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Products */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Artículos</p>
              <h4 className="text-2xl font-black text-slate-900 mt-0.5">{totalProducts}</h4>
              <p className="text-[11px] text-blue-600 font-medium">{categories.length} rubros activos</p>
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
                $ {formatARS(totalInventoryARS)}
              </h4>
              <p className="text-[10px] text-slate-500 font-mono">
                Valuado en Pesos Argentinos ($ ARS)
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: 3 Dollar Rates Reference */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500">3 Cotizaciones de Dólar (Admin)</p>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {(['dolar1', 'dolar2', 'dolar3'] as const).map((k) => (
                  <div
                    key={k}
                    className="px-2 py-1 rounded-lg bg-blue-50/80 border border-blue-100 text-left"
                  >
                    <div className="text-[9px] font-bold text-slate-500 truncate">
                      {dollarRates[k].label}
                    </div>
                    <div className="text-xs font-mono font-black text-blue-700">
                      ${dollarRates[k].rate.toLocaleString('es-AR')}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={openExchangeRateModal}
                className="mt-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Configurar los 3 dólares
              </button>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">Herramientas de Gestión de Catálogo</h3>
              <p className="text-xs text-slate-500">
                Alta de productos, reabastecimiento rápido y sincronización por Excel / CSV
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Grupo Izquierdo: Acciones principales de inventario */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenStockEntry}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Cargar y reabastecer stock de artículos existentes de forma rápida"
              >
                <PackagePlus className="w-4 h-4" />
                <span>📦 Ingreso de Stock</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Dar de alta un producto nuevo desde cero"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>✨ Nuevo Producto</span>
              </button>
            </div>

            {/* Grupo Derecho: Operaciones masivas y sincronización */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mass Price Percentage Adjustment */}
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                title="Aumentar o rebajar todos los precios en un porcentaje"
              >
                <Percent className="w-3.5 h-3.5 text-amber-600" />
                <span>% Ajuste Masivo %</span>
              </button>

              {/* Export Stock Dropdown (XLSX / CSV) */}
              <div className="relative inline-block" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                  title="Descargar catálogo completo en formato Excel (.xlsx) o CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Exportar Stock</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs shadow-xs transition-colors cursor-pointer"
                title="Subir archivo Excel (.xlsx, .xls) o CSV para actualizar masivamente"
              >
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Importar Excel / CSV</span>
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Refresh / Reset Button */}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Desea restablecer el catálogo a los 767 artículos oficiales de MP Distribuciones? Se actualizarán todos los productos con las fotos de Google Photos.')) {
                    resetProductsToDefault();
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
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
                placeholder="Buscar por nombre del producto o rubro..."
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
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    const name = window.prompt('Ingresá el nombre del nuevo rubro mayorista:');
                    if (name && name.trim()) {
                      const created = addCategory(name.trim());
                      setCategoryFilter(created.id);
                    }
                  } else {
                    setCategoryFilter(e.target.value);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="ALL">Todos los Rubros ({totalProducts})</option>
                <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">
                  ➕ + Crear Nuevo Rubro...
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.shortName}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const name = window.prompt('Ingresá el nombre del nuevo rubro mayorista:');
                  if (name && name.trim()) {
                    const created = addCategory(name.trim());
                    setCategoryFilter(created.id);
                  }
                }}
                className="px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Crear un nuevo rubro oficial"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo Rubro</span>
              </button>

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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>
                Mostrando <strong className="text-slate-800 font-bold">{startIndex} - {endIndex}</strong> de{' '}
                <strong className="text-slate-800 font-bold">{totalItems}</strong> artículos
                {totalItems !== totalProducts && (
                  <span className="text-slate-400"> ({totalProducts} en catálogo)</span>
                )}
              </span>
              {pageSize !== 'all' && totalPages > 1 && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  Pág {safeCurrentPage} / {totalPages}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Order / Sort Selector */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-500 font-medium">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
                >
                  <option value="default">Por Defecto</option>
                  <option value="name_asc">Nombre (A → Z)</option>
                  <option value="name_desc">Nombre (Z → A)</option>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                  <option value="stock_asc">Stock: Menor a Mayor</option>
                  <option value="stock_desc">Stock: Mayor a Menor</option>
                </select>
              </div>

              {/* Items Per Page Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Por pág:</span>
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
                  {([25, 50, 100, 'all'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPageSize(size)}
                      className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        pageSize === size
                          ? 'bg-blue-600 text-white shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {size === 'all' ? 'Todos' : size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Editable Inventory Table */}
        <div ref={tableTopRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto scroll-mt-6">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase font-black text-[10px] tracking-wider">
                <th className="p-3 text-center w-14">Foto</th>
                <th className="p-3">Nombre del Producto & Rubro</th>
                <th className="p-3 w-36 text-center">Stock Actual</th>
                <th className="p-3 w-44 text-right">Costo & Dólar</th>
                <th className="p-3 w-28 text-center">% Puntual</th>
                <th className="p-3 w-44 text-right">Precio Cliente ($ ARS)</th>
                <th className="p-3 w-28 text-center">Estado</th>
                <th className="p-3 text-center w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => (
                  <InventoryTableRow
                    key={p.id}
                    product={p}
                    exchangeRate={exchangeRate}
                    dollarRates={dollarRates}
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
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No se encontraron productos coincidentes con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Controls Bar */}
        {totalItems > 0 && pageSize !== 'all' && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>
                Mostrando <strong className="text-slate-800 font-bold">{startIndex} - {endIndex}</strong> de{' '}
                <strong className="text-slate-800 font-bold">{totalItems}</strong> productos
              </span>
              <span className="text-slate-400">• Página {safeCurrentPage} de {totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Primera página */}
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Primera página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Anterior */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Números de página */}
              <div className="flex items-center gap-1 mx-1">
                {pageNumbers.map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold select-none">
                      ...
                    </span>
                  ) : (
                    <button
                      key={`page-${p}`}
                      type="button"
                      onClick={() => handlePageChange(p as number)}
                      className={`min-w-[32px] h-8 px-2 rounded-xl font-bold transition-all cursor-pointer ${
                        safeCurrentPage === p
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              {/* Siguiente */}
              <button
                type="button"
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Última página */}
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Selector rápido de página */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="text-[11px] text-slate-400">Ir a pág:</span>
              <select
                value={safeCurrentPage}
                onChange={(e) => handlePageChange(Number(e.target.value))}
                className="px-2 py-1 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    Pág {num}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        </>
      )}

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
        onClose={() => {
          setIsProductModalOpen(false);
          setPrefillProductData(null);
        }}
        productToEdit={productToEdit}
        initialValues={prefillProductData}
      />

      {/* Quick Stock Entry Restocking Modal */}
      <StockEntryModal
        isOpen={isStockEntryModalOpen}
        onClose={() => setIsStockEntryModalOpen(false)}
        onOpenCreateProduct={handleOpenCreateFromRescue}
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
