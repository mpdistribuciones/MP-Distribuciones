import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MessageCircle,
  Phone,
  AlertTriangle,
  RotateCw,
  User as UserIcon,
  MapPin,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  PackageX,
  CreditCard,
  Building,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, CartItem, OrderStatus } from '../types';
import { StockShortageModal } from './StockShortageModal';

interface ShortageItem {
  item: CartItem;
  available: number;
  requested: number;
}

export const AdminOrdersView: React.FC = () => {
  const {
    orders,
    products,
    confirmOrder,
    cancelOrder,
    formatPrice,
    exchangeRate,
    syncWithSupabase,
    isSyncingSupabase,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Shortage modal state
  const [shortageModalState, setShortageModalState] = useState<{
    isOpen: boolean;
    order: Order | null;
    shortages: ShortageItem[];
  }>({
    isOpen: false,
    order: null,
    shortages: [],
  });

  // Toggle order items expansion
  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  // Helper to sanitize phone for WhatsApp wa.me link
  const getWhatsAppLink = (order: Order) => {
    let rawPhone = order.phone || '';
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('549') && !cleaned.startsWith('54')) {
      cleaned = `549${cleaned}`;
    } else if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
      cleaned = `549${cleaned.substring(2)}`;
    }

    const customerName = order.buyerName || order.userBusinessName || 'Cliente';
    const totalFormatted =
      order.totalARS > 0
        ? `$ ${Math.round(order.totalARS).toLocaleString('es-AR')} ARS (u$s ${order.totalUSD.toFixed(2)})`
        : `u$s ${order.totalUSD.toFixed(2)}`;

    const message =
      `Hola *${customerName}*! 👋 Te escribimos de *MP Distribuciones* respecto a tu pedido *#${order.orderNumber}*.\n\n` +
      `✅ Tu pedido ha sido confirmado por un total de *${totalFormatted}*.\n\n` +
      `💳 *Datos para realizar la transferencia bancaria:*\n` +
      `• Titular: MP Distribuciones\n` +
      `• Por favor indicanos tu comprobante por este medio para coordinar la entrega o retiro.\n\n` +
      `¡Muchas gracias por elegirnos!`;

    const encoded = encodeURIComponent(message);
    return cleaned ? `https://wa.me/${cleaned}?text=${encoded}` : `https://wa.me/5493413422310?text=${encoded}`;
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pendiente' && o.status !== 'pendiente' && o.status !== 'enviado') {
          return false;
        }
        if (statusFilter !== 'pendiente' && o.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesNumber = o.orderNumber.toLowerCase().includes(q);
        const matchesName = (o.buyerName || o.userBusinessName || '').toLowerCase().includes(q);
        const matchesCuit = (o.cuit || '').toLowerCase().includes(q);
        const matchesPhone = (o.phone || '').toLowerCase().includes(q);
        const matchesItems = o.items.some(
          (it) =>
            it.product.name.toLowerCase().includes(q) ||
            it.product.sku.toLowerCase().includes(q)
        );

        return matchesNumber || matchesName || matchesCuit || matchesPhone || matchesItems;
      }

      return true;
    });
  }, [orders, statusFilter, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pendiente' || o.status === 'enviado').length;
    const confirmed = orders.filter((o) => o.status === 'confirmado' || o.status === 'completado').length;
    const cancelled = orders.filter((o) => o.status === 'cancelado').length;
    return { total, pending, confirmed, cancelled };
  }, [orders]);

  // Actions
  const handleConfirmClick = async (order: Order) => {
    setProcessingOrderId(order.id);
    try {
      const result = await confirmOrder(order.id);
      if (!result.success && result.error === 'stock_shortage' && result.shortages) {
        setShortageModalState({
          isOpen: true,
          order,
          shortages: result.shortages,
        });
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmAdjusted = async (adjustedItems: { productId: string; quantity: number }[]) => {
    if (!shortageModalState.order) return;
    setProcessingOrderId(shortageModalState.order.id);
    try {
      await confirmOrder(shortageModalState.order.id, { adjustedItems });
      setShortageModalState({ isOpen: false, order: null, shortages: [] });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmNegative = async () => {
    if (!shortageModalState.order) return;
    setProcessingOrderId(shortageModalState.order.id);
    try {
      await confirmOrder(shortageModalState.order.id, { allowNegativeStock: true });
      setShortageModalState({ isOpen: false, order: null, shortages: [] });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCancelClick = async (order: Order) => {
    if (
      window.confirm(
        `¿Desea cancelar el pedido #${order.orderNumber} de ${order.buyerName || order.userBusinessName}?`
      )
    ) {
      setProcessingOrderId(order.id);
      try {
        await cancelOrder(order.id);
      } finally {
        setProcessingOrderId(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">Total Pedidos</p>
          <h4 className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</h4>
          <p className="text-[11px] text-slate-500 font-medium">Registrados en el sistema</p>
        </div>

        {/* Pendientes */}
        <div
          onClick={() => setStatusFilter('pendiente')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'pendiente'
              ? 'border-amber-500 shadow-md ring-2 ring-amber-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700">Pendientes</p>
            {counts.pending > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <h4 className="text-2xl font-black text-amber-600 mt-0.5">{counts.pending}</h4>
          <p className="text-[11px] text-amber-700 font-medium">Requieren confirmación</p>
        </div>

        {/* Confirmados */}
        <div
          onClick={() => setStatusFilter('confirmado')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'confirmado'
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-emerald-700">Confirmados</p>
          <h4 className="text-2xl font-black text-emerald-700 mt-0.5">{counts.confirmed}</h4>
          <p className="text-[11px] text-emerald-600 font-medium">Stock descontado</p>
        </div>

        {/* Cancelados */}
        <div
          onClick={() => setStatusFilter('cancelado')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'cancelado'
              ? 'border-slate-500 shadow-md ring-2 ring-slate-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">Cancelados</p>
          <h4 className="text-2xl font-black text-slate-500 mt-0.5">{counts.cancelled}</h4>
          <p className="text-[11px] text-slate-400 font-medium">Sin impacto en stock</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('pendiente')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pendiente'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-100/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendientes ({counts.pending})</span>
          </button>
          <button
            onClick={() => setStatusFilter('confirmado')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'confirmado'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmados ({counts.confirmed})</span>
          </button>
          <button
            onClick={() => setStatusFilter('cancelado')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'cancelado'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelados ({counts.cancelled})</span>
          </button>
        </div>

        {/* Search & Sync */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº, cliente, CUIT, teléfono..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={syncWithSupabase}
            disabled={isSyncingSupabase}
            title="Sincronizar pedidos con Supabase Cloud"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <PackageX className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No se encontraron pedidos</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay pedidos que coincidan con la búsqueda ingresada.'
              : statusFilter === 'pendiente'
              ? '¡Excelente! No hay pedidos pendientes de confirmación en este momento.'
              : 'Aún no se han registrado pedidos en esta sección.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            const isPending = order.status === 'pendiente' || order.status === 'enviado';
            const isConfirmed = order.status === 'confirmado' || order.status === 'completado';
            const isCancelled = order.status === 'cancelado';
            const isProcessing = processingOrderId === order.id;

            // Date format
            const orderDate = new Date(order.date);
            const dateStr = orderDate.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const timeStr = orderDate.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            // Calculate stock status for each item in this order
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

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-400/20'
                    : isConfirmed
                    ? 'border-emerald-200'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Order Top Card Header */}
                <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      #{order.orderNumber}
                    </span>

                    <span className="text-xs text-slate-500 font-medium">
                      {dateStr} • {timeStr} hs
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Pendiente de Confirmación
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Confirmado
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        Cancelado
                      </span>
                    )}
                  </div>

                  {/* Order Total */}
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-slate-900">
                      $ {Math.round(order.totalARS || order.totalUSD * exchangeRate).toLocaleString('es-AR')} ARS
                    </div>
                    <div className="text-xs font-bold text-blue-600">
                      u$s {order.totalUSD.toFixed(2).replace('.', ',')} USD
                    </div>
                  </div>
                </div>

                {/* Customer Details & Metadata */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-b border-slate-100">
                  {/* Buyer Data */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Datos del Cliente
                    </div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{order.buyerName || order.userBusinessName || 'Sin nombre'}</span>
                    </div>
                    {order.cuit && (
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>CUIT / DNI: <strong className="text-slate-800">{order.cuit}</strong></span>
                      </div>
                    )}
                    {order.phone && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <a
                          href={`tel:${order.phone}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                        >
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{order.phone}</span>
                        </a>

                        <a
                          href={getWhatsAppLink(order)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold transition-colors"
                          title="Contactar al cliente por WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Delivery & Invoice */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Entrega y Facturación
                    </div>
                    <div className="text-slate-700 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        Entrega: <strong className="text-slate-900">{order.shippingAddress || (order.deliveryMethod === 'pickup' ? 'Retiro en Local (San Nicolás 2277, Rosario)' : 'Envío')}</strong>
                      </span>
                    </div>
                    <div className="text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Factura: <strong className="text-slate-900 font-bold">{order.invoiceType || 'B'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Notes / Observaciones */}
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                      Observaciones
                    </div>
                    {order.notes ? (
                      <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200 italic leading-snug">
                        "{order.notes}"
                      </p>
                    ) : (
                      <span className="text-slate-400 italic">Sin observaciones adicionales</span>
                    )}
                  </div>
                </div>

                {/* Items preview and list */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">
                        Artículos del Pedido ({order.items.reduce((s, it) => s + it.quantity, 0)} unidades en {order.items.length} productos)
                      </span>
                      {isPending && hasAnyShortage && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Stock faltante detectado
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle Completo'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Items List (Collapsible / Preview) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {(isExpanded ? itemStockAnalysis : itemStockAnalysis.slice(0, 2)).map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                      >
                        <div className="flex items-center gap-3">
                          {it.product.imageUrl ? (
                            <img
                              src={it.product.imageUrl}
                              alt={it.product.name}
                              className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-white"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                              {it.product.sku.substring(0, 4)}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-slate-900">{it.product.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">SKU: {it.product.sku}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          {/* Live Stock Comparison Pill */}
                          {isPending && (
                            <div>
                              {it.hasEnough ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                                  ✓ Stock: {it.available} un.
                                </span>
                              ) : it.isPartial ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-300">
                                  ⚠️ Solo {it.available} un. disp.
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                  ❌ Sin stock (0 un.)
                                </span>
                              )}
                            </div>
                          )}

                          <div>
                            <div className="font-bold text-slate-900">
                              {it.quantity} un. × {formatPrice(it.product.priceUSD)}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Subtotal: {formatPrice(it.product.priceUSD * it.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!isExpanded && itemStockAnalysis.length > 2 && (
                      <div
                        onClick={() => toggleExpand(order.id)}
                        className="p-2 text-center text-xs font-semibold text-slate-500 hover:text-blue-600 bg-slate-50 cursor-pointer"
                      >
                        + Ver {itemStockAnalysis.length - 2} productos más...
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="p-4 sm:p-5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
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

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* WhatsApp Quick Reply */}
                    <a
                      href={getWhatsAppLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Responder por WhatsApp</span>
                    </a>

                    {/* Pending Actions */}
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleCancelClick(order)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Cancelar Pedido</span>
                        </button>

                        <button
                          onClick={() => handleConfirmClick(order)}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>{isProcessing ? 'Verificando...' : 'Confirmar Pedido y Descontar Stock'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stock Shortage Warning Modal */}
      <StockShortageModal
        isOpen={shortageModalState.isOpen}
        onClose={() => setShortageModalState({ isOpen: false, order: null, shortages: [] })}
        order={shortageModalState.order}
        shortages={shortageModalState.shortages}
        onConfirmAdjusted={handleConfirmAdjusted}
        onConfirmNegative={handleConfirmNegative}
        isProcessing={processingOrderId !== null}
      />
    </div>
  );
};
