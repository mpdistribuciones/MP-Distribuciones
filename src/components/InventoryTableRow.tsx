import React, { useState, useEffect, useRef } from 'react';
import { Product, DollarRateKey, DollarRatesMap } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import { Check, Edit, Trash2, Loader2, CheckCircle2 } from 'lucide-react';

interface InventoryTableRowProps {
  product: Product;
  exchangeRate: number;
  dollarRates: DollarRatesMap;
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
      dollarRateKey?: DollarRateKey;
    }
  ) => Promise<void>;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const InventoryTableRow: React.FC<InventoryTableRowProps> = React.memo(({
  product,
  exchangeRate,
  dollarRates,
  priceDisplayMode,
  onUpdateStock,
  onUpdateFinancials,
  onEdit,
  onDelete,
  showToast,
}) => {
  const currentCurrency: 'USD' | 'ARS' = product.priceCurrency === 'ARS' ? 'ARS' : 'USD';
  const currentDollarKey: DollarRateKey =
    product.dollarRateKey === 'dolar2' || product.dollarRateKey === 'dolar3'
      ? product.dollarRateKey
      : 'dolar1';

  const productRate =
    dollarRates[currentDollarKey]?.rate || dollarRates.dolar1?.rate || exchangeRate || 1350;

  const isCostArs = currentCurrency === 'ARS';

  const defaultMargin = product.profitMargin != null ? product.profitMargin : 15;
  const defaultPriceUSD = product.priceUSD;
  const defaultPriceARS = product.priceARS || Math.round(product.priceUSD * productRate);
  const defaultCostUSD =
    product.costUSD != null && (product.costUSD > 0 || defaultPriceUSD === 0)
      ? product.costUSD
      : defaultPriceUSD > 0
      ? Number((defaultPriceUSD / (1 + defaultMargin / 100)).toFixed(2))
      : 0;
  const defaultCostARS =
    product.costARS != null && (product.costARS > 0 || defaultPriceARS === 0)
      ? product.costARS
      : product.priceARS
      ? Math.round(product.priceARS / (1 + defaultMargin / 100))
      : Math.round(defaultCostUSD * productRate);

  const [costInput, setCostInput] = useState<number>(
    isCostArs ? defaultCostARS : defaultCostUSD
  );
  const [marginInput, setMarginInput] = useState<number>(defaultMargin);
  const [priceArsInput, setPriceArsInput] = useState<number>(defaultPriceARS);

  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDirtyRef.current) {
      setCostInput(isCostArs ? defaultCostARS : defaultCostUSD);
      setMarginInput(defaultMargin);
      setPriceArsInput(defaultPriceARS);
    }
  }, [
    product.priceUSD,
    product.priceARS,
    product.costUSD,
    product.costARS,
    product.profitMargin,
    product.priceCurrency,
    product.dollarRateKey,
    priceDisplayMode,
    productRate,
    isCostArs,
    defaultCostARS,
    defaultCostUSD,
    defaultMargin,
    defaultPriceARS,
  ]);

  const saveFinancials = async (
    overrideCost = costInput,
    overrideMargin = marginInput,
    overridePriceArs = priceArsInput,
    overrideCurrency: 'USD' | 'ARS' = currentCurrency,
    overrideDollarKey: DollarRateKey = currentDollarKey
  ) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    isDirtyRef.current = false;

    const rate =
      dollarRates[overrideDollarKey]?.rate || dollarRates.dolar1?.rate || exchangeRate || 1350;

    setIsSaving(true);
    try {
      let finalPriceUSD = 0;
      let finalPriceARS = Math.max(1, Math.round(overridePriceArs));
      let finalCostUSD = 0;
      let finalCostARS = 0;

      if (overrideCurrency === 'ARS') {
        finalCostARS = Math.max(0, Math.round(overrideCost));
        finalCostUSD = Number((finalCostARS / rate).toFixed(2));
        finalPriceUSD = Number((finalPriceARS / rate).toFixed(2));
      } else {
        finalCostUSD = Math.max(0, Number(overrideCost.toFixed(2)));
        finalCostARS = Math.round(finalCostUSD * rate);
        finalPriceUSD = Math.max(0.01, Number((finalPriceARS / rate).toFixed(2)));
      }

      await onUpdateFinancials(product.id, {
        priceUSD: finalPriceUSD,
        priceARS: finalPriceARS,
        costUSD: finalCostUSD,
        costARS: finalCostARS,
        profitMargin: Number(overrideMargin.toFixed(2)),
        priceCurrency: overrideCurrency,
        dollarRateKey: overrideDollarKey,
      });

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1600);
    } catch (err: any) {
      console.error('[InventoryTableRow] Error al guardar cambios:', err);
      showToast(`Error al guardar cambios de "${product.name.slice(0, 24)}"`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const scheduleDebouncedSave = (newCost: number, newMargin: number, newPriceArs: number) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      saveFinancials(newCost, newMargin, newPriceArs);
    }, 800);
  };

  const handleCostChange = (val: number) => {
    const newCost = Math.max(0, val);
    setCostInput(newCost);
    isDirtyRef.current = true;
    const factor = 1 + marginInput / 100;
    const newPriceArs = isCostArs
      ? Math.round(newCost * factor)
      : Math.round(newCost * productRate * factor);
    setPriceArsInput(newPriceArs);
    scheduleDebouncedSave(newCost, marginInput, newPriceArs);
  };

  const handleMarginChange = (val: number) => {
    setMarginInput(val);
    isDirtyRef.current = true;
    const factor = 1 + val / 100;
    const newPriceArs = isCostArs
      ? Math.round(costInput * factor)
      : Math.round(costInput * productRate * factor);
    setPriceArsInput(newPriceArs);
    scheduleDebouncedSave(costInput, val, newPriceArs);
  };

  const handlePriceArsChange = (val: number) => {
    const newPriceArs = Math.max(1, Math.round(val));
    setPriceArsInput(newPriceArs);
    isDirtyRef.current = true;
    const baseCostArs = isCostArs ? costInput : costInput * productRate;
    let newMargin = 0;
    if (baseCostArs > 0) {
      newMargin = Number((((newPriceArs - baseCostArs) / baseCostArs) * 100).toFixed(2));
    }
    setMarginInput(newMargin);
    scheduleDebouncedSave(costInput, newMargin, newPriceArs);
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
    if (newCurr === currentCurrency) return;
    const factor = 1 + marginInput / 100;
    if (newCurr === 'ARS') {
      const nextCostArs = Math.round(costInput * productRate);
      const nextPriceArs = Math.round(nextCostArs * factor);
      setCostInput(nextCostArs);
      setPriceArsInput(nextPriceArs);
      await saveFinancials(nextCostArs, marginInput, nextPriceArs, 'ARS', currentDollarKey);
    } else {
      const nextCostUsd = Number((costInput / productRate).toFixed(4));
      const nextPriceArs = Math.round(nextCostUsd * productRate * factor);
      setCostInput(nextCostUsd);
      setPriceArsInput(nextPriceArs);
      await saveFinancials(nextCostUsd, marginInput, nextPriceArs, 'USD', currentDollarKey);
    }
  };

  const handleChangeDollarKey = async (newKey: DollarRateKey) => {
    if (newKey === currentDollarKey) return;
    const nextRate = dollarRates[newKey]?.rate || productRate;
    const factor = 1 + marginInput / 100;
    const nextPriceArs = isCostArs
      ? priceArsInput
      : Math.round(costInput * nextRate * factor);
    setPriceArsInput(nextPriceArs);
    await saveFinancials(costInput, marginInput, nextPriceArs, currentCurrency, newKey);
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

      {/* Name & Category */}
      <td className="p-3">
        <p className="font-bold text-slate-900 line-clamp-2 leading-snug">{product.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            {product.category}
          </span>
          {product.subcategory && (
            <span className="text-[10px] text-slate-500 font-medium">
              • {product.subcategory}
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

      {/* Costo + Moneda Base + Selector de Dólar (1/2/3) */}
      <td className="p-3 text-right">
        <div className="space-y-1 inline-block text-right">
          {/* Selector de moneda de costo */}
          <div className="flex items-center justify-end gap-1">
            <span className="text-[9px] text-slate-400 font-semibold">Costo en:</span>
            <div className="inline-flex rounded-md bg-slate-100 border border-slate-200 p-0.5 text-[9px] font-bold">
              <button
                type="button"
                onClick={() => handleToggleBaseCurrency('USD')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  currentCurrency === 'USD'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cargar costo en Dólares (USD)"
              >
                u$s USD
              </button>
              <button
                type="button"
                onClick={() => handleToggleBaseCurrency('ARS')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  currentCurrency === 'ARS'
                    ? 'bg-emerald-600 text-white font-black shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cargar costo directamente en Pesos ($ ARS)"
              >
                $ ARS
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1">
            <span className="font-mono text-slate-500 text-xs font-bold">
              {isCostArs ? '$' : 'u$s'}
            </span>
            <input
              type="number"
              step={isCostArs ? '10' : '0.01'}
              min="0"
              value={costInput}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-24 px-2 py-1 text-right font-mono font-bold text-xs text-slate-800 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-2xs"
              title="Costo base de compra (Enter para guardar)"
            />
          </div>

          {/* Selector de cuál de los 3 dólares usa este producto */}
          {!isCostArs ? (
            <div className="flex items-center justify-end gap-1">
              <select
                value={currentDollarKey}
                onChange={(e) => handleChangeDollarKey(e.target.value as DollarRateKey)}
                className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-800 outline-none cursor-pointer"
                title="Cotización de dólar asignada a este artículo"
              >
                {(['dolar1', 'dolar2', 'dolar3'] as DollarRateKey[]).map((k) => (
                  <option key={k} value={k}>
                    {dollarRates[k].label} (${dollarRates[k].rate})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[10px] text-emerald-700 font-semibold pr-0.5">
              Costo fijo en Pesos
            </p>
          )}
        </div>
      </td>

      {/* % Porcentaje Puntual (Editable Inline) */}
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
              title="Porcentaje puntual sobre el costo (Enter para guardar)"
            />
            <span className="text-[10px] font-bold text-slate-400 ml-0.5">%</span>
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 font-medium">porcentaje</span>
        </div>
      </td>

      {/* Precio de Venta al Cliente en Pesos ($ ARS) */}
      <td className="p-3 text-right">
        <div className="space-y-1">
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
            <span className="text-[10px] font-bold text-emerald-700">Precio Cliente ($ ARS)</span>
          </div>

          <div className="flex items-center justify-end gap-1">
            <span className="font-mono text-xs font-bold text-emerald-700">$</span>
            <input
              type="number"
              step="10"
              min="1"
              value={priceArsInput}
              onChange={(e) => handlePriceArsChange(parseFloat(e.target.value) || 1)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-28 px-2 py-1 text-right font-mono font-black text-xs text-slate-900 rounded-lg border bg-emerald-50/50 border-emerald-300 focus:border-emerald-600 focus:bg-white outline-none transition-all shadow-2xs"
              title="Precio final en Pesos ($ ARS) visible para el cliente"
            />
          </div>
          {!isCostArs && (
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Ref: u$s {(priceArsInput / productRate).toFixed(2)} ({dollarRates[currentDollarKey].label})
            </p>
          )}
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
            title="Editar ficha completa"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            title="Eliminar producto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});
