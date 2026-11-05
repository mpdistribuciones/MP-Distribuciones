import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceType, DeliveryMethod } from '../types';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Receipt,
  Truck,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartDrawerOpen,
    closeCartDrawer,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartTotalUSD,
    cartTotalARS,
    currency,
    exchangeRate,
    formatPrice,
    openCheckoutModal,
    user,
    openAuthModal,
  } = useApp();

  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Factura A');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');

  if (!isCartDrawerOpen) return null;

  const currentTotalFormatted =
    currency === 'USD'
      ? `u$s ${cartTotalUSD.toFixed(2).replace('.', ',')}`
      : `$ ${Math.round(cartTotalARS).toLocaleString('es-AR')}`;

  const secondaryTotalFormatted =
    currency === 'USD'
      ? `($ ${Math.round(cartTotalARS).toLocaleString('es-AR')} ARS)`
      : `(u$s ${cartTotalUSD.toFixed(2).replace('.', ',')} USD)`;

  const handleCheckoutClick = () => {
    if (!user) {
      closeCartDrawer();
      openAuthModal('login');
      return;
    }
    closeCartDrawer();
    openCheckoutModal();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between text-slate-800">
          {/* Header */}
          <div className="p-4 border-b border-blue-700 bg-[#0052cc] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/20 text-white">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Pedido Mayorista</h3>
                <p className="text-xs text-blue-100">
                  {cart.length} {cart.length === 1 ? 'producto' : 'productos'} cargados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 text-xs transition-colors"
                  title="Vaciar carrito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={closeCartDrawer}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">El pedido está vacío</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Seleccioná los artículos desde el catálogo para armar tu pedido de gremio.
                  </p>
                </div>
                <button
                  onClick={closeCartDrawer}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold transition-all"
                >
                  Explorar Catálogo
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const itemTotalUSD = item.product.priceUSD * item.quantity;
                return (
                  <div key={item.product.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                    <img
                      src={item.product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-lg object-contain bg-white border border-slate-200 p-1 shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                      }}
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                            {item.product.name.toUpperCase()}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.product.sku}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center rounded-lg border border-emerald-400 bg-white p-0.5">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 transition-colors font-bold cursor-pointer"
                            title="Disminuir cantidad"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.product.stockQuantity}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              updateCartQuantity(item.product.id, isNaN(val) ? 1 : val);
                            }}
                            className="w-10 text-center text-xs font-mono font-black text-slate-800 bg-transparent outline-none focus:bg-emerald-50 rounded"
                            title="Cantidad"
                          />
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stockQuantity}
                            className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 transition-colors font-bold cursor-pointer"
                            title={item.quantity >= item.product.stockQuantity ? 'Stock máximo alcanzado' : 'Aumentar cantidad'}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Line subtotal */}
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900">
                            {formatPrice(itemTotalUSD)}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            {formatPrice(item.product.priceUSD)} c/u
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Controls & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
              {/* Facturación y Despacho Selector */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Factura */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold">
                    <Receipt className="w-3 h-3 text-blue-600" />
                    <span>Facturación</span>
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="Factura A">Factura A (Resp. Inscripto)</option>
                    <option value="Factura B">Factura B (Monotributo/Final)</option>
                    <option value="Consumidor Final">Consumidor Final</option>
                  </select>
                </div>

                {/* Despacho */}
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-600 flex items-center gap-1 font-semibold">
                    <Truck className="w-3 h-3 text-emerald-600" />
                    <span>Despacho / Entrega</span>
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-blue-600"
                  >
                    <option value="pickup">Retiro en Local (San Nicolás 2277)</option>
                    <option value="rosario_delivery">Reparto en Rosario</option>
                    <option value="interior_shipping">Expreso al Interior</option>
                  </select>
                </div>
              </div>

              {/* Totals Box */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} u.):</span>
                  <span className="font-mono font-semibold text-slate-700">{currentTotalFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>T.C. de Referencia:</span>
                  <span className="font-mono font-semibold text-slate-700">${exchangeRate} ARS/USD</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-black text-slate-900">TOTAL ESTIMADO:</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-blue-700">
                      {currentTotalFormatted}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono">
                      {secondaryTotalFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confirm Order Button */}
              <button
                onClick={handleCheckoutClick}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Confirmar Pedido y Enviar a WhatsApp</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confirmación de stock y cuenta para transferencia directa</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
