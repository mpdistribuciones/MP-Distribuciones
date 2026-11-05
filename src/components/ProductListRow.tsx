import React from 'react';
import { Product } from '../types';
import { useApp } from '../context/AppContext';
import { Plus, Minus, Eye, Lock } from 'lucide-react';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';

interface ProductListRowProps {
  product: Product;
}

export const ProductListRow: React.FC<ProductListRowProps> = ({ product }) => {
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
    ? `u$s ${product.priceUSD.toFixed(2)}`
    : `$ ${unitPriceARS.toLocaleString('es-AR')}`;

  const rawUnitPrice = isUSD ? product.priceUSD : unitPriceARS;

  const subtotalPrice = isUSD
    ? `u$s ${(rawUnitPrice * cartQuantity).toFixed(2)}`
    : `$ ${(rawUnitPrice * cartQuantity).toLocaleString('es-AR')}`;

  const isSelected = cartQuantity > 0;

  return (
    <tr
      className={`border-b border-slate-200 transition-colors ${
        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
      }`}
    >
      {/* Thumbnail */}
      <td className="p-2 sm:p-3 text-center w-14 sm:w-16">
        <div
          onClick={() => openProductDetail(product)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center cursor-pointer hover:border-blue-400"
        >
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

      {/* SKU & Category */}
      <td className="p-2 sm:p-3 text-xs">
        <span className="font-mono text-slate-500 font-semibold">{product.sku}</span>
        <div className="text-[11px] text-slate-400">{product.brand}</div>
      </td>

      {/* Product Name */}
      <td className="p-2 sm:p-3">
        <div
          onClick={() => openProductDetail(product)}
          className="text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 cursor-pointer line-clamp-2"
        >
          {product.name.toUpperCase()}
        </div>
        {product.badge && (
          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
            {product.badge}
          </span>
        )}
      </td>

      {/* Stock */}
      <td className="p-2 sm:p-3 text-xs text-center whitespace-nowrap">
        {user ? (
          product.inStock && product.stockQuantity > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Disponible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              Agotado
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            <Lock className="w-3 h-3 text-slate-400" /> Privado
          </span>
        )}
      </td>

      {/* Unit Price */}
      <td className="p-2 sm:p-3 text-xs sm:text-sm font-black text-slate-900 whitespace-nowrap text-right">
        {user ? (
          formattedPrice
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAuthModal('login');
            }}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
            title="Iniciar sesión para ver precios mayoristas"
          >
            <Lock className="w-3 h-3" /> Ver precio
          </button>
        )}
      </td>

      {/* Inline Stepper */}
      <td className="p-2 sm:p-3 text-center whitespace-nowrap">
        {user ? (
          <div className="inline-flex items-center rounded-lg border border-emerald-400 bg-white p-0.5">
            <button
              onClick={handleDecrement}
              disabled={cartQuantity === 0}
              className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 transition-colors font-bold cursor-pointer"
              title="Disminuir cantidad"
            >
              <Minus className="w-3.5 h-3.5" />
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
              className="w-10 text-center text-xs font-black text-slate-800 font-mono bg-transparent outline-none focus:bg-emerald-50 rounded"
              title="Cantidad a pedir"
            />
            <button
              onClick={handleIncrement}
              disabled={!product.inStock || cartQuantity >= product.stockQuantity}
              className="w-6 h-6 flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 transition-colors font-bold cursor-pointer"
              title={cartQuantity >= product.stockQuantity ? 'Stock máximo alcanzado' : 'Aumentar cantidad'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAuthModal('login');
            }}
            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            Ingresar
          </button>
        )}
      </td>

      {/* Subtotal */}
      <td className="p-2 sm:p-3 text-xs font-bold text-slate-700 whitespace-nowrap text-right hidden sm:table-cell">
        {user && cartQuantity > 0 ? (
          <span className="text-emerald-700 font-black">{subtotalPrice}</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </td>

      {/* Action / Detail */}
      <td className="p-2 sm:p-3 text-center w-10">
        <button
          onClick={() => openProductDetail(product)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
          title="Ver detalle del producto"
        >
          <Eye className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};
