import * as XLSX from 'xlsx';
import { Product } from '../types';

/**
 * Neutralizes formula injection vulnerabilities (CSV/Excel injection)
 * Prepending a single quote (') if the string begins with =, +, -, or @
 */
const sanitizeForExport = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  const trimmed = str.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    return `'${str}`;
  }
  return str;
};

/**
 * Export wholesale price list in either XLSX or CSV format
 */
export const exportPriceList = (
  products: Product[],
  exchangeRate: number,
  format: 'xlsx' | 'csv'
) => {
  const rows = products.map((p) => {
    const priceARS =
      p.priceCurrency === 'ARS' && p.priceARS
        ? p.priceARS
        : Math.round(p.priceUSD * exchangeRate);

    return {
      'Código SKU': sanitizeForExport(p.sku),
      'Producto': sanitizeForExport(p.name),
      'Marca': sanitizeForExport(p.brand),
      'Rubro': sanitizeForExport(p.category),
      'Subcategoría': sanitizeForExport(p.subcategory || ''),
      'Precio USD': Number(p.priceUSD.toFixed(2)),
      'Precio ARS': priceARS,
      'Moneda Base': sanitizeForExport(p.priceCurrency || 'USD'),
      'Stock Mayorista': p.stockQuantity,
      'Estado': p.inStock ? 'En Stock' : 'Agotado',
    };
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const baseName = `lista_de_precios_mp_distribuciones_${dateStr}`;

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 14 }, // SKU
      { wch: 45 }, // Producto
      { wch: 16 }, // Marca
      { wch: 34 }, // Rubro
      { wch: 22 }, // Subcategoría
      { wch: 14 }, // Precio USD
      { wch: 22 }, // Precio ARS
      { wch: 14 }, // Moneda Base
      { wch: 18 }, // Stock
      { wch: 14 }, // Estado
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Precios');
    XLSX.writeFile(wb, `${baseName}.xlsx`);
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${baseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Export inventory / stock catalog in either XLSX or CSV format
 */
export const exportStockCatalog = (
  products: Product[],
  exchangeRate: number,
  format: 'xlsx' | 'csv'
) => {
  const rows = products.map((p) => {
    const priceARS =
      p.priceCurrency === 'ARS' && p.priceARS
        ? p.priceARS
        : Math.round(p.priceUSD * exchangeRate);

    const margin = p.profitMargin != null ? p.profitMargin : 15;
    const costUSD = p.costUSD != null ? p.costUSD : (p.priceUSD > 0 ? Number((p.priceUSD / (1 + margin / 100)).toFixed(2)) : 0);
    const costARS = p.costARS != null ? p.costARS : (p.priceARS ? Math.round(p.priceARS / (1 + margin / 100)) : Math.round(costUSD * exchangeRate));

    return {
      id: sanitizeForExport(p.id),
      sku: sanitizeForExport(p.sku),
      name: sanitizeForExport(p.name),
      brand: sanitizeForExport(p.brand),
      category: sanitizeForExport(p.category),
      subcategory: sanitizeForExport(p.subcategory || ''),
      costUSD,
      costARS,
      profitMargin: margin,
      priceUSD: p.priceUSD,
      priceARS: priceARS,
      priceCurrency: sanitizeForExport(p.priceCurrency || 'USD'),
      stockQuantity: p.stockQuantity,
      inStock: p.inStock ? 'true' : 'false',
      badge: sanitizeForExport(p.badge || ''),
      imageUrl: sanitizeForExport(p.imageUrl),
      description: sanitizeForExport(p.description || ''),
    };
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const baseName = `catalogo_stock_mp_distribuciones_${dateStr}`;

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 }, // id
      { wch: 14 }, // sku
      { wch: 45 }, // name
      { wch: 16 }, // brand
      { wch: 34 }, // category
      { wch: 22 }, // subcategory
      { wch: 12 }, // priceUSD
      { wch: 12 }, // priceARS
      { wch: 14 }, // priceCurrency
      { wch: 14 }, // stockQuantity
      { wch: 10 }, // inStock
      { wch: 14 }, // badge
      { wch: 35 }, // imageUrl
      { wch: 50 }, // description
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `${baseName}.xlsx`);
  } else {
    const ws = XLSX.utils.json_to_sheet(rows);
    const csvOutput = XLSX.utils.sheet_to_csv(ws, { FS: ',' });
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${baseName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
