import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import { Check, Edit, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

interface InventoryTableRowProps {
  product: Product;
  exchangeRate: number;
  priceDisplayMode: 'AUTO' | 'ARS' | 'USD';
  onUpdateStock: (id: string, newStock: number) => void;
  onUpdateFinancials: (
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
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const InventoryTableRow: React.FC<InventoryTableRowProps> = React.memo(({
  product,
  exchangeRate,
  priceDisplayMode,
  onUpdateStock,
  onUpdateFinancials,
  onEdit,
  onDelete,
  showToast,
}) => {
  const isArs =
    priceDisplayMode === 'ARS'
      ? true
      : priceDisplayMode === 'USD'
      ? false
      : product.priceCurrency === 'ARS';

  const currentCurrency = product.priceCurrency || 'USD';

  const defaultMargin = product.profitMargin != null ? product.profitMargin : 15;
  const defaultPriceUSD = product.priceUSD;
  const defaultPriceARS = product.priceARS || Math.round(product.priceUSD * exchangeRate);
  const defaultCostUSD =
    product.costUSD != null
      ? product.costUSD
      : defaultPriceUSD > 0
      ? Number((defaultPriceUSD / (1 + defaultMargin / 100)).toFixed(2))
      : 0;
  const defaultCostARS =
    product.costARS != null
      ? product.costARS
      : product.priceARS
      ? Math.round(product.priceARS / (1 + defaultMargin / 100))
      : Math.round(defaultCostUSD * exchangeRate);

  const [costInput, setCostInput] = useState<number>(isArs ? defaultCostARS : defaultCostUSD);
  const [marginInput, setMarginInput] = useState<number>(defaultMargin);
  const [priceInput, setPriceInput] = useState<number>(isArs ? defaultPriceARS : defaultPriceUSD);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar estado local si el producto o la moneda cambian desde afuera y no se está editando
  useEffect(() => {
    if (!isDirtyRef.current) {
      setCostInput(isArs ? defaultCostARS : defaultCostUSD);
      setMarginInput(defaultMargin);
      setPriceInput(isArs ? defaultPriceARS : defaultPriceUSD);
    }
  }, [
    product.priceUSD,
    product.priceARS,
    product.costUSD,
    product.costARS,
    product.profitMargin,
    product.priceCurrency,
    priceDisplayMode,
    exchangeRate,
    isArs,
    defaultCostARS,
    defaultCostUSD,
    defaultMargin,
    defaultPriceARS,
    defaultPriceUSD,
  ]);

  // Persistir en Supabase
  const saveFinancials = async (
    overrideCost = costInput,
    overrideMargin = marginInput,
    overridePrice = priceInput
  ) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!isDirtyRef.current) return;
    isDirtyRef.current = false;

    setIsSaving(true);
    try {
      let finalPriceUSD = 0;
      let finalPriceARS = 0;
      let finalCostUSD = 0;
      let finalCostARS = 0;

      if (isArs) {
        finalPriceARS = Math.max(1, Math.round(overridePrice));
        finalPriceUSD = Number((finalPriceARS / exchangeRate).toFixed(2));
        finalCostARS = Math.max(0, Math.round(overrideCost));
        finalCostUSD = Number((finalCostARS / exchangeRate).toFixed(2));
      } else {
        finalPriceUSD = Math.max(0.01, Number(overridePrice.toFixed(2)));
        finalPriceARS = Math.round(finalPriceUSD * exchangeRate);
        finalCostUSD = Math.max(0, Number(overrideCost.toFixed(2)));
        finalCostARS = Math.round(finalCostUSD * exchangeRate);
      }

      await onUpdateFinancials(product.id, {
        priceUSD: finalPriceUSD,
        priceARS: finalPriceARS,
        costUSD: finalCostUSD,
        costARS: finalCostARS,
        profitMargin: Number(overrideMargin.toFixed(2)),
        priceCurrency: product.priceCurrency,
      });

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
    } catch (err: any) {
      console.error('[InventoryTableRow] Error al guardar cambios:', err);
      showToast(`Error al guardar cambios de ${product.sku}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleDebouncedSave = (newCost: number, newMargin: number, newPrice: number) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveFinancials(newCost, newMargin, newPrice);
    }, 800);
  };

  // 1. Modificación de Costo:
  // Precio = Costo * (1 + Margen / 100)
  const handleCostChange = (val: number) => {
    const newCost = Math.max(0, val);
    setCostInput(newCost);
    isDirtyRef.current = true;
    const factor = 1 + marginInput / 100;
    const newPrice = isArs ? Math.round(newCost * factor) : Number((newCost * factor).toFixed(2));
    setPriceInput(newPrice);
    scheduleDebouncedSave(newCost, marginInput, newPrice);
  };

  // 2. Modificación de Margen %:
  // Precio = Costo * (1 + Margen / 100)
  const handleMarginChange = (val: number) => {
    setMarginInput(val);
    isDirtyRef.current = true;
    const factor = 1 + val / 100;
    const newPrice = isArs ? Math.round(costInput * factor) : Number((costInput * factor).toFixed(2));
    setPriceInput(newPrice);
    scheduleDebouncedSave(costInput, val, newPrice);
  };

  // 3. Modificación de Precio de Venta:
  // Costo QUEDA FIJO y se recalcula el Margen:
  // Margen % = ((Precio - Costo) / Costo) * 100
  const handlePriceChange = (val: number) => {
    const newPrice = Math.max(0.01, val);
    setPriceInput(newPrice);
    isDirtyRef.current = true;
    let newMargin = 0;
    if (costInput > 0) {
      newMargin = Number((((newPrice - costInput) / costInput) * 100).toFixed(2));
    }
    setMarginInput(newMargin);
    scheduleDebouncedSave(costInput, newMargin, newPrice);
  };

  const handleBlur = () => {
    if (isDirtyRef.current) {
      saveFinancials();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      saveFinancials();
    }
  };

  const handleToggleBaseCurrency = async (newCurr: 'USD' | 'ARS') => {
    if (newCurr === product.priceCurrency) return;
    setIsSaving(true);
    try {
      await onUpdateFinancials(product.id, {
        priceUSD: defaultPriceUSD,
        priceARS: defaultPriceARS,
        costUSD: defaultCostUSD,
        costARS: defaultCostARS,
        profitMargin: marginInput,
        priceCurrency: newCurr,
      });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
    } finally {
      setIsSaving(false);
    }
  };

  const isPositiveMargin = marginInput > 0;
  const isNeutralMargin = marginInput === 0;

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      {/* Thumbnail */}
      <td className="p-3 text-center">
        <div className="w-11 h-11 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden mx-auto">
          <img
            src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
            alt={product.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
            }}
          />
        </div>
      </td>

      {/* SKU & Brand */}
      <td className="p-3">
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
          {product.sku}
        </span>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">{product.brand}</p>
      </td>

      {/* Name & Category */}
      <td className="p-3">
        <p className="font-bold text-slate-900 line-clamp-1 leading-snug">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {product.category}
          </span>
          {product.badge && (
            <span className="text-[9px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.2 rounded">
              {product.badge}
            </span>
          )}
        </div>
      </td>

      {/* Stock (Inline Editable) */}
      <td className="p-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <input
            type="number"
            min="0"
            value={product.stockQuantity}
            onChange={(e) => onUpdateStock(product.id, parseInt(e.target.value) || 0)}
            className={`w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border text-xs outline-none transition-all ${
              product.stockQuantity > 0
                ? 'bg-slate-50 border-slate-300 focus:border-emerald-500 focus:bg-white text-slate-900'
                : 'bg-red-50 border-red-300 text-red-600 font-black'
            }`}
          />
          <span className="text-[11px] text-slate-400">un.</span>
        </div>
        <div className="flex items-center justify-center gap-1 mt-1 text-[10px]">
          <button
            onClick={() => onUpdateStock(product.id, product.stockQuantity + 5)}
            className="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            +5
          </button>
          <button
            onClick={() => onUpdateStock(product.id, product.stockQuantity + 20)}
            className="px-1.5 py-0.2 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
          >
            +20
          </button>
          <button
            onClick={() => onUpdateStock(product.id, 0)}
            className="px-1.5 py-0.2 rounded bg-red-50 hover:bg-red-100 text-red-600 font-bold cursor-pointer"
            title="Pausar stock a 0"
          >
            0
          </button>
        </div>
      </td>

      {/* Costo (Editable Inline) */}
      <td className="p-3 text-right">
        <div className="space-y-0.5 inline-block text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="font-mono text-slate-500 text-xs font-bold">
              {isArs ? '$' : 'u$s'}
            </span>
            <input
              type="number"
              step={isArs ? '10' : '0.01'}
              min="0"
              value={costInput}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-24 px-2 py-1 text-right font-mono font-bold text-xs text-slate-800 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-2xs"
              title="Costo base de compra (Enter para guardar)"
            />
          </div>
          <p className="text-[10px] text-slate-400 font-mono pr-0.5">
            {isArs
              ? `≈ u$s ${(costInput / exchangeRate).toFixed(2)} USD`
              : `≈ $ ${Math.round(costInput * exchangeRate).toLocaleString('es-AR')} ARS`}
          </p>
        </div>
      </td>

      {/* % Margen Ganancia (Editable Inline) */}
      <td className="p-3 text-center">
        <div className="inline-flex flex-col items-center">
          <div className="relative inline-flex items-center">
            <input
              type="number"
              step="0.5"
              value={marginInput}
              onChange={(e) => handleMarginChange(parseFloat(e.target.value) || 0)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-20 px-1.5 py-1 text-center font-mono font-black text-xs rounded-lg border outline-none transition-all shadow-2xs ${
                isPositiveMargin
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-800 focus:border-emerald-600 focus:bg-white'
                  : isNeutralMargin
                  ? 'bg-slate-50 border-slate-300 text-slate-700 focus:border-slate-500 focus:bg-white'
                  : 'bg-red-50/80 border-red-300 text-red-700 focus:border-red-600 focus:bg-white'
              }`}
              title="Porcentaje de ganancia sobre costo (Enter para guardar)"
            />
            <span className="text-[10px] font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 font-medium">rentab.</span>
        </div>
      </td>

      {/* Precio de Venta (Editable Inline & Selector de Moneda Base) */}
      <td className="p-3 text-right">
        <div className="space-y-1">
          {/* Base currency selector for this product */}
          <div className="flex items-center justify-end gap-1">
            {isSaving ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 animate-pulse mr-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Guardando...</span>
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mr-1 animate-fadeIn">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Guardado</span>
              </span>
            ) : null}

            <span className="text-[10px] text-slate-400 font-semibold">Base:</span>
            <div className="inline-flex rounded-md bg-slate-100 border border-slate-200 p-0.5 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => handleToggleBaseCurrency('ARS')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  currentCurrency === 'ARS'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Fijar moneda de este producto en Pesos ($)"
              >
                $ ARS
              </button>
              <button
                type="button"
                onClick={() => handleToggleBaseCurrency('USD')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  currentCurrency === 'USD'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Fijar moneda de este producto en Dólares (USD)"
              >
                u$s USD
              </button>
            </div>
          </div>

          {/* Editable price input */}
          <div className="flex items-center justify-end gap-1">
            <span
              className={`font-mono text-xs font-bold ${
                isArs ? 'text-emerald-700' : 'text-blue-700'
              }`}
            >
              {isArs ? '$' : 'u$s'}
            </span>
            <input
              type="number"
              step={isArs ? '10' : '0.01'}
              min="0.01"
              value={priceInput}
              onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0.01)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className={`w-24 px-2 py-1 text-right font-mono font-black text-xs text-slate-900 rounded-lg border outline-none transition-all shadow-2xs ${
                isArs
                  ? 'bg-emerald-50/50 border-emerald-300 focus:border-emerald-600 focus:bg-white'
                  : 'bg-blue-50/50 border-blue-300 focus:border-blue-600 focus:bg-white'
              }`}
              title="Precio de venta mayorista (Enter para guardar)"
            />
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            {isArs
              ? `≈ u$s ${(priceInput / exchangeRate).toFixed(2)} USD`
              : `≈ $ ${Math.round(priceInput * exchangeRate).toLocaleString('es-AR')} ARS`}
          </p>
        </div>
      </td>

      {/* Status Badge */}
      <td className="p-3 text-center">
        <button
          onClick={() => onUpdateStock(product.id, product.stockQuantity > 0 ? 0 : 10)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
            product.stockQuantity > 0
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}
          title="Click para alternar estado de stock"
        >
          {product.stockQuantity > 0 ? (
            <>
              <Check className="w-3 h-3 text-emerald-600" />
              <span>Activo</span>
            </>
          ) : (
            <span>Pausado</span>
          )}
        </button>
      </td>

      {/* Action Buttons */}
      <td className="p-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
            title="Editar producto completo en modal"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Eliminar producto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

InventoryTableRow.displayName = 'InventoryTableRow';
