import React from 'react';
import { AlertTriangle, X, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import { Order, CartItem } from '../types';

interface ShortageItem {
  item: CartItem;
  available: number;
  requested: number;
}

interface StockShortageModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  shortages: ShortageItem[];
  onConfirmAdjusted: (adjustedItems: { productId: string; quantity: number }[]) => void;
  onConfirmNegative: () => void;
  isProcessing?: boolean;
}

export const StockShortageModal: React.FC<StockShortageModalProps> = ({
  isOpen,
  onClose,
  order,
  shortages,
  onConfirmAdjusted,
  onConfirmNegative,
  isProcessing = false,
}) => {
  if (!isOpen || !order) return null;

  const handleAdjustAndConfirm = () => {
    // Generate adjusted quantities: limit requested to available (minimum 0)
    const adjusted = shortages.map((s) => ({
      productId: s.item.product.id,
      quantity: Math.max(0, s.available),
    }));
    onConfirmAdjusted(adjusted);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-amber-200 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Stock Insuficiente</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-xs">
                #{order.orderNumber}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliente: <span className="font-bold text-slate-700">{order.buyerName || order.userBusinessName}</span>
            </p>
          </div>
        </div>

        {/* Notice alert */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            Atención: algunos artículos no cuentan con stock suficiente en catálogo.
          </p>
          <p className="text-amber-800/90 pl-5">
            Revisá el listado antes de confirmar. Podés ajustar las cantidades a lo disponible, confirmar de todos modos dejando stock en negativo, o volver atrás para consultar al cliente.
          </p>
        </div>

        {/* Shortages table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Producto / SKU</th>
                <th className="py-2.5 px-3 text-center">Solicitado</th>
                <th className="py-2.5 px-3 text-center">En Stock</th>
                <th className="py-2.5 px-3 text-right text-rose-600">Faltante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shortages.map((s, idx) => {
                const missing = s.requested - s.available;
                return (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{s.item.product.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">SKU: {s.item.product.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                      {s.requested} un.
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          s.available > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {s.available} un.
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-rose-600">
                      -{missing} un.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions / Decision paths */}
        <div className="space-y-3 pt-2">
          {/* Option 1: Adjust and confirm */}
          <button
            onClick={handleAdjustAndConfirm}
            disabled={isProcessing}
            className="w-full p-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-between shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center gap-2.5 text-left">
              <Check className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-black text-sm">Ajustar cantidades al stock disponible y confirmar</p>
                <p className="text-[11px] text-emerald-100 font-normal">
                  Se asignará únicamente el stock existente y se recalculará el total del pedido.
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          {/* Option 2: Confirm anyway (allow negative stock) */}
          <button
            onClick={onConfirmNegative}
            disabled={isProcessing}
            className="w-full p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-between transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-extrabold">Confirmar de todos modos (permitir stock negativo)</p>
              <p className="text-[11px] text-amber-700 font-normal">
                Descuenta el total pedido. El inventario quedará en negativo para futura reposición.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 text-amber-700" />
          </button>

          {/* Option 3: Cancel / Back */}
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Volver sin confirmar (revisar con el cliente por WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
};
