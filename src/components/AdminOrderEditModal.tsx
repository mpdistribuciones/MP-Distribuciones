import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Search,
  Save,
  PackagePlus,
} from 'lucide-react';
import { Order, CartItem, Product } from '../types';

interface AdminOrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  exchangeRate: number;
  formatPrice: (priceUSD: number) => string;
  onSave: (
    orderId: string,
    updatedData: { items: CartItem[]; totalUSD: number; totalARS: number; notes?: string }
  ) => Promise<void>;
  isSaving?: boolean;
}

export const AdminOrderEditModal: React.FC<AdminOrderEditModalProps> = ({
  isOpen,
  onClose,
  order,
  products,
  exchangeRate,
  formatPrice,
  onSave,
  isSaving = false,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);

  useEffect(() => {
    if (order) {
      setItems(order.items.map((it) => ({ ...it })));
      setNotes(order.notes || '');
      setCatalogQuery('');
      setShowCatalogSearch(false);
    }
  }, [order, isOpen]);

  // Recalculate totals
  const totalUSD = useMemo(() => {
    return items.reduce((acc, it) => acc + it.product.priceUSD * it.quantity, 0);
  }, [items]);

  const totalARS = useMemo(() => {
    return items.reduce((acc, it) => {
      const unitARS = it.product.priceARS || it.product.priceUSD * exchangeRate;
      return acc + unitARS * it.quantity;
    }, 0);
  }, [items, exchangeRate]);

  // Catalog search filtering for adding new products
  const searchResults = useMemo(() => {
    if (!catalogQuery.trim()) return [];
    const q = catalogQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [catalogQuery, products]);

  if (!isOpen || !order) return null;

  const handleQuantityChange = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.product.id === productId ? { ...it, quantity: newQty } : it))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const handleAddProduct = (prod: Product) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === prod.id || it.product.sku === prod.sku);
      if (existing) {
        return prev.map((it) =>
          it.product.id === prod.id || it.product.sku === prod.sku
            ? { ...it, quantity: it.quantity + 1 }
            : it
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert('El pedido no puede quedar vacío. Si desea anularlo, utilice la opción "Cancelar Pedido".');
      return;
    }
    await onSave(order.id, {
      items,
      totalUSD: Number(totalUSD.toFixed(2)),
      totalARS: Math.round(totalARS),
      notes,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Editar Pedido #{order.orderNumber}
              </h3>
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {order.buyerName || order.userBusinessName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Modificá cantidades, eliminá productos o agregá nuevos artículos del catálogo.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section: Add Products from Catalog */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <PackagePlus className="w-4 h-4 text-blue-600" />
                <span>Agregar Producto del Catálogo</span>
              </label>

              <button
                type="button"
                onClick={() => setShowCatalogSearch(!showCatalogSearch)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
              >
                {showCatalogSearch ? 'Ocultar Buscador' : '+ Buscar Productos'}
              </button>
            </div>

            {showCatalogSearch && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                    placeholder="Buscar por nombre, SKU o marca..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                    autoFocus
                  />
                </div>

                {catalogQuery.trim() && (
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-sm">
                    {searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No se encontraron productos coincidentes en el catálogo.
                      </div>
                    ) : (
                      searchResults.map((prod) => {
                        const inOrder = items.find(
                          (it) => it.product.id === prod.id || it.product.sku === prod.sku
                        );
                        return (
                          <div
                            key={prod.id}
                            className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {prod.imageUrl ? (
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  className="w-8 h-8 object-contain rounded border border-slate-200 bg-white shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono shrink-0">
                                  {prod.sku.substring(0, 3)}
                                </div>
                              )}
                              <div className="truncate">
                                <div className="font-bold text-slate-900 truncate">{prod.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  SKU: {prod.sku} • Stock: {prod.stockQuantity} un.
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-slate-800">
                                {formatPrice(prod.priceUSD)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddProduct(prod)}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{inOrder ? `Agregar (${inOrder.quantity})` : 'Agregar'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Order Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Productos en el Pedido ({items.length})</span>
              <span>Subtotal</span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500 text-xs">
                No hay productos en el pedido. Agregá alguno desde el buscador superior.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                {items.map((it) => (
                  <div
                    key={it.product.id}
                    className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-[200px] flex-1">
                      {it.product.imageUrl ? (
                        <img
                          src={it.product.imageUrl}
                          alt={it.product.name}
                          className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                          {it.product.sku.substring(0, 3)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{it.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          SKU: {it.product.sku} • {formatPrice(it.product.priceUSD)} c/u
                        </div>
                      </div>
                    </div>

                    {/* Quantity Controls & Delete */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(it.product.id, it.quantity - 1)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Disminuir cantidad"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleQuantityChange(it.product.id, isNaN(val) ? 1 : val);
                          }}
                          className="w-12 text-center text-xs font-bold text-slate-900 font-mono outline-none py-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(it.product.id, it.quantity + 1)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-right min-w-[90px]">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatPrice(it.product.priceUSD * it.quantity)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.product.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar producto del pedido"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-700">Notas / Observaciones del Pedido</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Aclaraciones de envío, modificaciones coordinadas, etc."
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* New Totals Box */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nuevo Total Recalculado
              </span>
              <p className="text-[11px] text-slate-500">
                T.C.: $ {exchangeRate.toLocaleString('es-AR')} ARS
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-slate-900">
                $ {Math.round(totalARS).toLocaleString('es-AR')} ARS
              </div>
              <div className="text-xs font-extrabold text-blue-700">
                u$s {totalUSD.toFixed(2).replace('.', ',')} USD
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-50"
          >
            Descartar Cambios
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
