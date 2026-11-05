import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { Plus, Minus, Eye, CheckCircle2, Lock } from 'lucide-react';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const {
    exchangeRate,
    openProductDetail,
    getItemQuantity,
    setItemQuantity,
    user,
    openAuthModal,
  } = useApp();

  const cartQuantity = getItemQuantity(product.id);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock || cartQuantity >= product.stockQuantity) return;
    setItemQuantity(product, cartQuantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cartQuantity > 0) {
      setItemQuantity(product, cartQuantity - 1);
    }
  };

  // Price formatting strictly based on owner's chosen product currency
  const isUSD = product.priceCurrency === 'USD';
  const unitPriceARS =
    product.priceCurrency === 'ARS' && product.priceARS
      ? product.priceARS
      : Math.round(product.priceUSD * exchangeRate);

  const formattedPrice = isUSD
    ? `u$s ${product.priceUSD.toFixed(2)} USD`
    : `$ ${unitPriceARS.toLocaleString('es-AR')}`;

  const isSelectedInCart = cartQuantity > 0;

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl bg-white border transition-all duration-200 p-3 shadow-xs hover:shadow-md w-full max-w-[260px] mx-auto ${
        isSelectedInCart
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Product Image Area */}
      <div
        onClick={() => openProductDetail(product)}
        className="relative w-full h-44 flex items-center justify-center p-2 bg-white rounded-lg cursor-pointer overflow-hidden"
      >
        <img
          src={product.imageUrl || DEFAULT_PRODUCT_IMAGE}
          alt={product.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
          }}
        />

        {/* Quick View Button on Hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openProductDetail(product);
          }}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
          title="Ver ficha técnica"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Promotional / Special Badges */}
        {product.badge && (
          <span
            className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
              product.badge === 'OFERTA'
                ? 'bg-red-500 text-white'
                : product.badge === 'MÁS VENDIDO'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-blue-600 text-white'
            }`}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Product Details */}
      <div className="pt-2 flex-1 flex flex-col justify-between space-y-2">
        {/* Title (Clean bold uppercase like screenshot) */}
        <div>
          <h3
            onClick={() => openProductDetail(product)}
            className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer line-clamp-2 leading-snug tracking-tight"
            title={product.name}
          >
            {product.name.toUpperCase()}
          </h3>
        </div>

        {/* Stock & Price info */}
        {user ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              {product.inStock && product.stockQuantity > 0 ? (
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Disponible
                </span>
              ) : (
                <span className="font-bold text-red-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Agotado
                </span>
              )}
              <span className="text-[10px] text-slate-400 font-mono">
                SKU: {product.sku}
              </span>
            </div>

            {/* Large Bold Price */}
            <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {formattedPrice}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Stock: 🔒 Solo clientes</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                SKU: {product.sku}
              </span>
            </div>
            <div className="text-xs font-bold text-blue-700 bg-blue-50/80 px-2 py-1 rounded-md border border-blue-200/60 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Precios para comercios</span>
            </div>
          </div>
        )}

        {/* Stepper or Login prompt */}
        <div className="pt-1">
          {user ? (
            <>
              <div
                className={`flex items-center justify-between rounded-lg border px-2 py-1 transition-colors ${
                  isSelectedInCart
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-emerald-400/80 bg-white hover:border-emerald-500'
                }`}
              >
                <button
                  onClick={handleDecrement}
                  disabled={cartQuantity === 0}
                  className="w-7 h-7 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold cursor-pointer"
                  title="Disminuir cantidad"
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                </button>

                <input
                  type="number"
                  min="0"
                  max={product.stockQuantity}
                  value={cartQuantity === 0 ? '0' : cartQuantity}
                  disabled={!product.inStock}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setItemQuantity(product, isNaN(val) ? 0 : val);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm font-black text-slate-800 font-mono w-12 text-center bg-transparent outline-none focus:bg-emerald-50 rounded"
                  title="Cantidad a pedir"
                />

                <button
                  onClick={handleIncrement}
                  disabled={!product.inStock || cartQuantity >= product.stockQuantity}
                  className="w-7 h-7 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-bold cursor-pointer"
                  title={cartQuantity >= product.stockQuantity ? 'Stock máximo alcanzado' : 'Aumentar cantidad al pedido'}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {isSelectedInCart && (
                <p className="text-[10px] text-emerald-600 font-semibold text-center mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> En tu pedido ({cartQuantity} un.)
                </p>
              )}
            </>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ingresar para comprar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
