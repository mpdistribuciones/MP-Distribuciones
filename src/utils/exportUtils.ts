import * as XLSX from 'xlsx';
import { Product } from '../types';
import { getProductPriceARS, cleanFloat } from '../lib/supabase';

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
 * Export wholesale price list in either XLSX or CSV format (100% en Pesos $ ARS para el cliente)
 */
export const exportPriceList = (
  products: Product[],
  exchangeRate: number,
  format: 'xlsx' | 'csv'
) => {
  const rows = products.map((p) => {
    const priceARS = getProductPriceARS(p, exchangeRate);

    return {
      'Producto': sanitizeForExport(p.name),
      'Rubro': sanitizeForExport(p.category),
      'Subcategoría': sanitizeForExport(p.subcategory || ''),
      'Precio Mayorista ($ ARS)': priceARS,
      'Stock Mayorista': p.stockQuantity,
      'Estado': p.inStock ? 'En Stock' : 'Agotado',
    };
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const baseName = `lista_de_precios_mp_distribuciones_${dateStr}`;

  if (format === 'xlsx') {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 48 }, // Producto
      { wch: 34 }, // Rubro
      { wch: 22 }, // Subcategoría
      { wch: 24 }, // Precio ARS
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
 * Export inventory / stock catalog in either XLSX or CSV format (Solo Admin)
 */
export const exportStockCatalog = (
  products: Product[],
  exchangeRate: number,
  format: 'xlsx' | 'csv'
) => {
  const rows = products.map((p) => {
    const priceARS = getProductPriceARS(p, exchangeRate);
    const margin = p.profitMargin != null ? p.profitMargin : 15;
    const costUSD =
      p.costUSD != null
        ? p.costUSD
        : p.priceUSD > 0
        ? cleanFloat(p.priceUSD / (1 + margin / 100))
        : 0;
    const costARS =
      p.costARS != null
        ? p.costARS
        : p.priceARS
        ? cleanFloat(p.priceARS / (1 + margin / 100))
        : cleanFloat(costUSD * exchangeRate);

    return {
      id: sanitizeForExport(p.id),
      name: sanitizeForExport(p.name),
      category: sanitizeForExport(p.category),
      subcategory: sanitizeForExport(p.subcategory || ''),
      costCurrency: sanitizeForExport(p.priceCurrency || 'USD'),
      dollarRateKey: sanitizeForExport(p.dollarRateKey || 'dolar1'),
      costUSD,
      costARS,
      profitMargin: margin,
      priceARS,
      stockQuantity: p.stockQuantity,
      inStock: p.inStock ? 'true' : 'false',
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
      { wch: 48 }, // name
      { wch: 34 }, // category
      { wch: 22 }, // subcategory
      { wch: 14 }, // costCurrency
      { wch: 14 }, // dollarRateKey
      { wch: 12 }, // costUSD
      { wch: 14 }, // costARS
      { wch: 14 }, // profitMargin
      { wch: 16 }, // priceARS
      { wch: 14 }, // stockQuantity
      { wch: 10 }, // inStock
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
