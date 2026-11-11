import React from 'react';
import {
  X,
  User as UserIcon,
  Building,
  Phone,
  MessageCircle,
  MapPin,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  PackageCheck,
  FileText,
} from 'lucide-react';
import { Order, Product } from '../types';

interface AdminOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  onConfirm: (order: Order) => void;
  onCancel: (order: Order) => void;
  onEdit: (order: Order) => void;
  isProcessing?: boolean;
  formatPrice: (priceUSD: number) => string;
  exchangeRate: number;
}

export const cleanWaPhone = (rawPhone?: string): string => {
  let cleaned = (rawPhone || '').replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (!cleaned.startsWith('549') && !cleaned.startsWith('54')) {
    cleaned = `549${cleaned}`;
  } else if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
    cleaned = `549${cleaned.substring(2)}`;
  }
  return cleaned;
};

export const getConfirmationWaLink = (order: Order, exchangeRate: number): string => {
  const phone = cleanWaPhone(order.phone);
  const customerName = order.buyerName || order.userBusinessName || 'Cliente';
  const totalArs = Math.round(order.totalARS || order.totalUSD * exchangeRate).toLocaleString('es-AR');
  const totalUsd = order.totalUSD.toFixed(2).replace('.', ',');

  const itemsSummary = order.items
    .map((it) => `• ${it.quantity}x ${it.product.name} (SKU: ${it.product.sku})`)
    .join('\n');

  const message =
    `Hola *${customerName}*! 👋 Te escribimos de *MP Distribuciones* respecto a tu pedido *#${order.orderNumber}*.\n\n` +
    `✅ ¡Tu pedido ha sido *CONFIRMADO* con éxito!\n\n` +
    `📦 *Resumen de productos:*\n${itemsSummary}\n\n` +
    `💰 *Total a abonar:* $ ${totalArs} ARS (u$s ${totalUsd} USD)\n\n` +
    `💳 *Datos para transferencia:*\n` +
    `• Titular: MP Distribuciones\n` +
    `• Por favor envianos tu comprobante por este medio para coordinar la entrega o retiro en San Nicolás 2277.\n\n` +
    `¡Muchas gracias por elegirnos!`;

  const encoded = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/5493413408439?text=${encoded}`;
};

export const AdminOrderDetailModal: React.FC<AdminOrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
  products,
  onConfirm,
  onCancel,
  onEdit,
  isProcessing = false,
  formatPrice,
  exchangeRate,
}) => {
  if (!isOpen || !order) return null;

  const isPending = order.status === 'pendiente' || order.status === 'enviado';
  const isConfirmed = order.status === 'confirmado' || order.status === 'completado';
  const isCancelled = order.status === 'cancelado';

  const orderDate = new Date(order.date);
  const dateStr = orderDate.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = orderDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate live stock status for items
  const itemStockAnalysis = order.items.map((it) => {
    const liveProd = products.find(
      (p) => p.id === it.product.id || p.sku === it.product.sku
    );
    const available = liveProd?.stockQuantity ?? 0;
    const hasEnough = available >= it.quantity;
    const isPartial = available > 0 && available < it.quantity;
    const isOut = available <= 0;
    return {
      ...it,
      available,
      hasEnough,
      isPartial,
      isOut,
    };
  });

  const hasAnyShortage = itemStockAnalysis.some((s) => !s.hasEnough);
  const totalUnits = order.items.reduce((acc, it) => acc + it.quantity, 0);

  // Clean WhatsApp link (sin plantilla)
  const phoneClean = cleanWaPhone(order.phone);
  const cleanWaUrl = phoneClean ? `https://wa.me/${phoneClean}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base sm:text-lg font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-300 shadow-2xs">
              #{order.orderNumber}
            </span>

            {/* Status Badge */}
            {isPending && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Pendiente de Confirmación
              </span>
            )}
            {isConfirmed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Pedido Confirmado
              </span>
            )}
            {isCancelled && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                <XCircle className="w-4 h-4 text-slate-500" />
                Pedido Cancelado
              </span>
            )}

            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{dateStr}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
              <span>{timeStr} hs</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Section: Customer & Delivery Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Customer Information Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Datos del Cliente</span>
              </div>
              <div className="font-extrabold text-slate-900 text-base">
                {order.buyerName || order.userBusinessName || 'Cliente Mayorista'}
              </div>
              {order.cuit && (
                <div className="text-slate-600 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>CUIT / DNI: <strong className="text-slate-900 font-bold">{order.cuit}</strong></span>
                </div>
              )}
              {order.phone && (
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <a
                    href={`tel:${order.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>{order.phone}</span>
                  </a>

                  {cleanWaUrl && (
                    <a
                      href={cleanWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors shadow-2xs"
                      title="Abrir chat de WhatsApp con el cliente"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Contactar por WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Delivery & Invoice Details */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="font-bold text-slate-500 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Entrega y Facturación</span>
              </div>
              <div className="text-slate-700">
                <span className="font-semibold text-slate-500">Modalidad: </span>
                <strong className="text-slate-900">
                  {order.shippingAddress ||
                    (order.deliveryMethod === 'pickup'
                      ? 'Retiro en Local (San Nicolás 2277, Rosario)'
                      : 'Envío por Expreso / Encomienda')}
                </strong>
              </div>
              <div className="text-slate-700 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Tipo de Comprobante: <strong className="text-slate-900 font-bold">{order.invoiceType || 'Factura B'}</strong>
                </span>
              </div>
              {order.notes && (
                <div className="pt-1">
                  <div className="font-semibold text-slate-500 flex items-center gap-1 text-[11px]">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Observaciones del cliente:</span>
                  </div>
                  <p className="mt-0.5 text-slate-700 bg-white p-2 rounded-lg border border-slate-200 italic leading-snug">
                    "{order.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900">
                  Artículos del Pedido ({totalUnits} unidades en {order.items.length} productos)
                </span>
                {isPending && hasAnyShortage && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Stock faltante detectado
                  </span>
                )}
              </div>

              {/* Edit Order Button */}
              <button
                onClick={() => onEdit(order)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
                title="Editar cantidades, eliminar o agregar productos"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Pedido</span>
              </button>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {itemStockAnalysis.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {it.product.imageUrl ? (
                      <img
                        src={it.product.imageUrl}
                        alt={it.product.name}
                        className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-[11px] shrink-0">
                        {it.product.sku.substring(0, 4)}
                      </div>
                    )}

                    <div>
                      <div className="font-bold text-slate-900 text-sm">{it.product.name}</div>
                      <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                        SKU: <strong className="text-slate-600">{it.product.sku}</strong>
                        {it.product.brand && ` • Marca: ${it.product.brand}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    {/* Real-time stock status badge */}
                    {isPending && (
                      <div>
                        {it.hasEnough ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            ✓ Stock: {it.available} un.
                          </span>
                        ) : it.isPartial ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-300">
                            ⚠️ Solo {it.available} un. disp.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                            ❌ Sin stock (0 un.)
                          </span>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {it.quantity} un. × {formatPrice(it.product.priceUSD)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Subtotal: {formatPrice(it.product.priceUSD * it.quantity)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total Summary Footer Box */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Total del Pedido
              </span>
              <p className="text-[11px] text-blue-700">
                T.C. Referencia: $ {exchangeRate.toLocaleString('es-AR')} ARS / USD
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-black text-slate-900">
                $ {Math.round(order.totalARS || order.totalUSD * exchangeRate).toLocaleString('es-AR')} ARS
              </div>
              <div className="text-xs font-extrabold text-blue-700">
                u$s {order.totalUSD.toFixed(2).replace('.', ',')} USD
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {order.confirmedAt && (
              <span className="text-xs text-emerald-700 font-medium">
                Confirmado el {new Date(order.confirmedAt).toLocaleDateString('es-AR')} a las{' '}
                {new Date(order.confirmedAt).toLocaleTimeString('es-AR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                hs
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Contactar por WhatsApp (limpio sin plantilla) */}
            {cleanWaUrl && (
              <a
                href={cleanWaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                title="Abrir WhatsApp directo sin mensaje"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Contactar por WhatsApp</span>
              </a>
            )}

            {/* Cancel Button */}
            {isPending && (
              <button
                onClick={() => onCancel(order)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-rose-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Cancelar Pedido</span>
              </button>
            )}

            {/* Confirm Button */}
            {isPending && (
              <button
                onClick={() => onConfirm(order)}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <PackageCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando...' : 'Confirmar Pedido'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
