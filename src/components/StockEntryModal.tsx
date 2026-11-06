import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import {
  X,
  Search,
  PackagePlus,
  PackageCheck,
  Boxes,
  ArrowLeft,
  Sparkles,
  DollarSign,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProduct: (prefillQuery?: string) => void;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  onOpenCreateProduct,
}) => {
  const { products, updateStock, updateProduct, exchangeRate, showToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optional Cost & Margin adjustment
  const [showCostAdjustment, setShowCostAdjustment] = useState(false);
  const [costInput, setCostInput] = useState<number>(0);
  const [marginInput, setMarginInput] = useState<number>(15);
  const [priceInput, setPriceInput] = useState<number>(0);
  const [isCostChanged, setIsCostChanged] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedProduct(null);
      setQuantityToAdd(1);
      setShowCostAdjustment(false);
      setIsCostChanged(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync cost and margin when product is selected
  useEffect(() => {
    if (selectedProduct) {
      const isArs = selectedProduct.priceCurrency === 'ARS';
      const margin = selectedProduct.profitMargin != null ? selectedProduct.profitMargin : 15;
      setMarginInput(margin);

      if (isArs) {
        const pArs = selectedProduct.priceARS || Math.round(selectedProduct.priceUSD * exchangeRate);
        const cArs = selectedProduct.costARS != null
          ? selectedProduct.costARS
          : (selectedProduct.costUSD != null
              ? Math.round(selectedProduct.costUSD * exchangeRate)
              : Math.round(pArs / (1 + margin / 100)));
        setCostInput(cArs);
        setPriceInput(pArs);
      } else {
        const pUsd = selectedProduct.priceUSD;
        const cUsd = selectedProduct.costUSD != null
          ? selectedProduct.costUSD
          : (pUsd > 0 ? Number((pUsd / (1 + margin / 100)).toFixed(2)) : 0);
        setCostInput(cUsd);
        setPriceInput(pUsd);
      }

      setIsCostChanged(false);
      setTimeout(() => {
        quantityInputRef.current?.focus();
        quantityInputRef.current?.select();
      }, 100);
    }
  }, [selectedProduct, exchangeRate]);

  // Search results
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [products, searchQuery]);

  // Handle selecting a product
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantityToAdd(1);
  };

  // Quick add helpers
  const handleQuickAdd = (amount: number) => {
    setQuantityToAdd((prev) => Math.max(1, prev + amount));
  };

  // Cost change calculations
  const handleCostInputChange = (val: number) => {
    const safeCost = Math.max(0, val);
    setCostInput(safeCost);
    setIsCostChanged(true);
    const factor = 1 + marginInput / 100;
    const isArs = selectedProduct?.priceCurrency === 'ARS';
    if (isArs) {
      setPriceInput(Math.round(safeCost * factor));
    } else {
      setPriceInput(Number((safeCost * factor).toFixed(2)));
    }
  };

  const handleMarginInputChange = (val: number) => {
    setMarginInput(val);
    setIsCostChanged(true);
    const factor = 1 + val / 100;
    const isArs = selectedProduct?.priceCurrency === 'ARS';
    if (isArs) {
      setPriceInput(Math.round(costInput * factor));
    } else {
      setPriceInput(Number((costInput * factor).toFixed(2)));
    }
  };

  // Submit stock entry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const safeQty = Math.max(1, Math.round(Number(quantityToAdd) || 0));
    const currentStock = selectedProduct.stockQuantity || 0;
    const newStock = currentStock + safeQty;

    setIsSubmitting(true);
    try {
      if (isCostChanged) {
        // Update both stock and financial values
        const isArs = selectedProduct.priceCurrency === 'ARS';
        let priceUSD = selectedProduct.priceUSD;
        let priceARS = selectedProduct.priceARS || Math.round(priceUSD * exchangeRate);
        let costUSD = selectedProduct.costUSD || 0;
        let costARS = selectedProduct.costARS || 0;

        if (isArs) {
          priceARS = Math.round(priceInput);
          costARS = Math.round(costInput);
          priceUSD = Number((priceARS / exchangeRate).toFixed(2));
          costUSD = Number((costARS / exchangeRate).toFixed(2));
        } else {
          priceUSD = Number(priceInput.toFixed(2));
          costUSD = Number(costInput.toFixed(2));
          priceARS = Math.round(priceUSD * exchangeRate);
          costARS = Math.round(costUSD * exchangeRate);
        }

        const success = await updateProduct(selectedProduct.id, {
          stockQuantity: newStock,
          inStock: newStock > 0,
          priceUSD,
          priceARS,
          costUSD,
          costARS,
          profitMargin: marginInput,
        });

        if (success) {
          showToast(
            `📦 Ingreso exitoso: Se sumaron +${safeQty} u. y se actualizaron los costos de "${selectedProduct.name.slice(0, 32)}". Nuevo stock: ${newStock} u.`,
            'success'
          );
        }
      } else {
        // Update stock only
        const success = await updateStock(selectedProduct.id, newStock);
        if (success) {
          showToast(
            `📦 Ingreso exitoso: Se sumaron +${safeQty} u. a "${selectedProduct.name.slice(0, 32)}". Nuevo stock: ${newStock} u.`,
            'success'
          );
        }
      }

      // Reset for next entry without closing modal
      setSelectedProduct(null);
      setSearchQuery('');
      setQuantityToAdd(1);
      setShowCostAdjustment(false);
      setIsCostChanged(false);

      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      console.error('[StockEntry Error]:', err);
      showToast(`Error al procesar ingreso de stock: ${err.message || 'Error desconocido'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStock = selectedProduct?.stockQuantity || 0;
  const resultingStock = currentStock + Math.max(1, Math.round(Number(quantityToAdd) || 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#07245b] text-white p-5 sm:p-6 pb-4 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">Ingreso de Stock Rápido</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Reabastecimiento
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Buscá un artículo para sumarle unidades y registrar aumentos de costo si corresponde
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Search or Switch Product */}
          {!selectedProduct ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Escribí código SKU, nombre o marca del artículo..."
                  className="w-full pl-10 pr-9 py-3 rounded-2xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Results List */}
              {searchQuery.trim().length > 0 ? (
                searchResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Resultados de búsqueda ({searchResults.length}):
                    </p>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-blue-50/60 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                              }}
                              className="w-11 h-11 object-contain rounded-xl bg-slate-50 border border-slate-200 shrink-0 p-1"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                                  {product.sku}
                                </span>
                                <span className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                                  {product.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {product.brand} • {product.category}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                product.stockQuantity > 0
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-600 border border-red-200'
                              }`}
                            >
                              Stock: {product.stockQuantity} u.
                            </span>
                            <span className="block text-[10px] text-blue-600 font-semibold group-hover:underline mt-0.5">
                              + Seleccionar
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* No results found & Rescue CTA */
                  <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        No se encontró ningún producto con "{searchQuery}"
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Verificá el código SKU o nombre. Si es un artículo nuevo que ingresa por primera vez, crealo desde cero:
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCreateProduct(searchQuery.trim());
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>+ Crear como Producto Nuevo</span>
                    </button>
                  </div>
                )
              ) : (
                /* Empty state guide */
                <div className="text-center py-8 px-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Búsqueda de Mercadería
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Escribí parte del nombre, código SKU o marca del artículo para registrar el ingreso de nuevas unidades.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Selected Product & Stock Addition Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selected Product Card */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={selectedProduct.imageUrl || DEFAULT_PRODUCT_IMAGE}
                    alt={selectedProduct.name}
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                    }}
                    className="w-14 h-14 object-contain rounded-xl bg-white border border-blue-200 shrink-0 p-1"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-blue-700 text-white font-mono text-[10px] font-bold">
                        {selectedProduct.sku}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedProduct.brand} • {selectedProduct.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {selectedProduct.name}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-100 text-xs font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                  title="Elegir otro producto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cambiar</span>
                </button>
              </div>

              {/* Stock Numbers Comparison Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Actual</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-700">
                    {currentStock} <span className="text-xs font-semibold text-slate-400">u.</span>
                  </p>
                </div>

                <div className="space-y-1 border-x border-slate-200 px-2">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">+ A Ingresar</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600">
                    +{Math.max(1, Math.round(Number(quantityToAdd) || 0))}{' '}
                    <span className="text-xs font-semibold text-emerald-500">u.</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Stock Final</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-700">
                    {resultingStock} <span className="text-xs font-semibold text-blue-400">u.</span>
                  </p>
                </div>
              </div>

              {/* Quantity Input & Quick Increment Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Cantidad de unidades que ingresan al depósito:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Valor numérico mayor a 0</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    ref={quantityInputRef}
                    type="number"
                    min="1"
                    step="1"
                    value={quantityToAdd}
                    onChange={(e) => setQuantityToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 px-4 py-2.5 rounded-xl bg-white border-2 border-emerald-500 focus:border-emerald-600 text-base font-black text-slate-900 outline-none text-center shadow-xs"
                    required
                  />

                  {/* Quick Increment Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-1">
                    {[1, 5, 10, 20, 50, 100].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleQuickAdd(amt)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        +{amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuantityToAdd(1)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors cursor-pointer ml-auto"
                    >
                      Reset (1)
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Cost Adjustment Accordion */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCostAdjustment((prev) => !prev)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Actualizar Costo de Compra / Precios (Opcional)
                    </span>
                    {isCostChanged && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Costo modificado
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-bold">
                    {showCostAdjustment ? 'Ocultar ▲' : 'Modificar ▼'}
                  </span>
                </button>

                {showCostAdjustment && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                    <p className="text-xs text-slate-500">
                      Si el nuevo lote ingresó con aumento del proveedor, ajustá el costo aquí. Se recalculará automáticamente el precio de venta en catálogo manteniendo el margen de ganancia.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Cost Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Costo ({selectedProduct.priceCurrency || 'USD'}):
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={costInput}
                          onChange={(e) => handleCostInputChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>

                      {/* Margin Input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          % Ganancia:
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={marginInput}
                          onChange={(e) => handleMarginInputChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 text-xs font-bold text-slate-900 outline-none"
                        />
                      </div>

                      {/* Recalculated Price */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Precio Venta Resultante:
                        </label>
                        <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-xs font-black text-blue-700">
                          {selectedProduct.priceCurrency === 'ARS'
                            ? `$ ${Math.round(priceInput).toLocaleString('es-AR')}`
                            : `u$s ${Number(priceInput).toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Volver a Búsqueda
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      <span>Confirmar Ingreso (+{quantityToAdd} u.)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
