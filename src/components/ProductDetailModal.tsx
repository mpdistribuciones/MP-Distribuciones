import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  ShoppingCart,
  Layers,
  Lock,
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    closeProductDetail,
    exchangeRate,
    getItemQuantity,
    setItemQuantity,
    user,
    openAuthModal,
  } = useApp();

  const [quantity, setQuantity] = useState(1);

  if (!selectedProduct) return null;

  const product = selectedProduct;
  const inCart = getItemQuantity(product.id);

  // Price formatting strictly based on owner's chosen product currency
  const isUSD = product.priceCurrency === 'USD';
  const unitPriceARS =
    product.priceCurrency === 'ARS' && product.priceARS
      ? product.priceARS
      : Math.round(product.priceUSD * exchangeRate);

  const mainPriceFormatted = isUSD
    ? `u$s ${product.priceUSD.toFixed(2)} USD`
    : `$ ${unitPriceARS.toLocaleString('es-AR')}`;

  const secondaryPriceText = isUSD
    ? `(aprox. $ ${(product.priceUSD * exchangeRate).toLocaleString('es-AR')} ARS)`
    : `(aprox. u$s ${(unitPriceARS / exchangeRate).toFixed(2)} USD)`;

  const handleIncrement = () => setQuantity((q) => q + 1);
  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleAdd = () => {
    setItemQuantity(product, inCart + quantity);
    closeProductDetail();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeProductDetail}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Image & Badges */}
          <div className="space-y-4">
            <div className="relative w-full pt-[85%] rounded-2xl bg-white overflow-hidden border border-slate-200 flex items-center justify-center p-4">
              <img
                src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-contain p-4"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                }}
              />
              {product.badge && (
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase bg-blue-600 text-white shadow-md">
                    {product.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Guarantees */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Garantía Oficial MP</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Despacho Inmediato</span>
              </div>
            </div>
          </div>

          {/* Details & Specs */}
          <div className="space-y-4 flex flex-col justify-between">
            <div>
              {/* Category & SKU */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-blue-600 uppercase tracking-wider">
                  {product.category}
                </span>
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                  SKU: {product.sku}
                </span>
              </div>

              {/* Title & Brand */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 leading-tight">
                {product.name.toUpperCase()}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Marca: <strong className="text-slate-800">{product.brand}</strong>
                {product.subcategory && ` • ${product.subcategory}`}
              </p>

              {/* Stock Status */}
              <div className="mt-3">
                {user ? (
                  product.inStock && product.stockQuantity > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Disponible para entrega inmediata
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-300 text-red-700 text-xs font-bold">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      Agotado momentáneamente
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    Stock exclusivo para clientes registrados
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                {product.description}
              </p>

              {/* Technical Specifications */}
              {product.specs && product.specs.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Especificaciones Técnicas:
                  </h4>
                  <ul className="space-y-1.5">
                    {product.specs.map((spec, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-700 flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0"></span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Wholesale Price Box & Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between p-3 rounded-2xl bg-blue-50/60 border border-blue-200">
                    <div>
                      <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">
                        Precio Mayorista
                      </span>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900">
                        {mainPriceFormatted}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-600 font-semibold">
                        {secondaryPriceText}
                      </span>
                      <p className="text-[10px] text-slate-400">IVA discrim. s/Factura A</p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Add */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-xl bg-white border border-slate-300 p-1">
                      <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="w-12 text-center text-sm font-mono font-bold text-slate-800">
                        {quantity}
                      </span>

                      <button
                        onClick={handleIncrement}
                        className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={handleAdd}
                      disabled={!product.inStock}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Agregar al Pedido ({quantity} un.)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Precios y Stock Mayoristas Privados</h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                      Iniciá sesión o registrate con tus datos comerciales para visualizar la lista de precios y armar pedidos directos por WhatsApp.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      onClick={() => {
                        closeProductDetail();
                        openAuthModal('login');
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      onClick={() => {
                        closeProductDetail();
                        openAuthModal('register');
                      }}
                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold text-xs border border-blue-300 transition-colors cursor-pointer"
                    >
                      Registrarse como Mayorista
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
