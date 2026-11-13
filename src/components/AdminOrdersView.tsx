import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  PackageX,
  Eye,
  Edit3,
  MapPin,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Order, CartItem, OrderStatus } from '../types';
import { AdminOrderDetailModal } from './AdminOrderDetailModal';
import { AdminOrderEditModal } from './AdminOrderEditModal';
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
    updateOrder,
    deleteOrders,
    syncOrders,
    formatPrice,
    exchangeRate,
    syncWithSupabase,
    isSyncingSupabase,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);

  // Auto-sync continua en tiempo real: sincronización cada 4 segundos (solo con pestaña activa) + foco + BroadcastChannel
  useEffect(() => {
    // Sincronización inmediata al abrir la vista
    syncOrders();

    // Polling inteligente cada 4 segundos: solo se ejecuta si la pestaña está visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncOrders();
      }
    }, 4000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        syncOrders();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('mp_orders_sync');
        bc.onmessage = () => {
          syncOrders();
        };
      } catch {}
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (bc) bc.close();
    };
  }, []);

  // Modals state
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [selectedEditOrder, setSelectedEditOrder] = useState<Order | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Keep selectedDetailOrder in sync with latest orders state
  const activeDetailOrder = useMemo(() => {
    if (!selectedDetailOrder) return null;
    return orders.find((o) => o.id === selectedDetailOrder.id) || selectedDetailOrder;
  }, [orders, selectedDetailOrder]);

  // Counts
  const counts = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === 'pendiente' || o.status === 'enviado').length;
    const confirmed = orders.filter((o) => o.status === 'confirmado' || o.status === 'completado').length;
    const cancelled = orders.filter((o) => o.status === 'cancelado').length;
    return { total, pending, confirmed, cancelled };
  }, [orders]);

  // Action: Confirm Order
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
        return;
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmAdjusted = async (adjustedItems: { productId: string; quantity: number }[]) => {
    if (!shortageModalState.order) return;
    const targetOrder = shortageModalState.order;
    setProcessingOrderId(targetOrder.id);
    try {
      const result = await confirmOrder(targetOrder.id, { adjustedItems });
      if (result.success) {
        setShortageModalState({ isOpen: false, order: null, shortages: [] });
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleConfirmNegative = async () => {
    if (!shortageModalState.order) return;
    const targetOrder = shortageModalState.order;
    setProcessingOrderId(targetOrder.id);
    try {
      const result = await confirmOrder(targetOrder.id, { allowNegativeStock: true });
      if (result.success) {
        setShortageModalState({ isOpen: false, order: null, shortages: [] });
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  // Action: Cancel Order
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

  // Action: Save Edited Order
  const handleSaveEditedOrder = async (
    orderId: string,
    updatedData: { items: CartItem[]; totalUSD: number; totalARS: number; notes?: string }
  ) => {
    setIsSavingEdit(true);
    try {
      const success = await updateOrder(orderId, updatedData);
      if (success) {
        setSelectedEditOrder(null);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  useEffect(() => {
    const validIds = new Set(orders.map((order) => order.id));
    setSelectedOrderIds((prev) => {
      const next = prev.filter((id) => validIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [orders]);

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((order) => selectedOrderIds.includes(order.id));

  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredOrders.map((order) => order.id));
      setSelectedOrderIds((prev) => prev.filter((id) => !filteredSet.has(id)));
      return;
    }

    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      filteredOrders.forEach((order) => next.add(order.id));
      return Array.from(next);
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedOrderIds.length === 0 || isDeletingSelected) return;

    const count = selectedOrderIds.length;
    const confirmed = window.confirm(
      `¿Eliminar ${count} ${count === 1 ? 'pedido seleccionado' : 'pedidos seleccionados'} de forma permanente? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setIsDeletingSelected(true);
    try {
      const deletedIds = [...selectedOrderIds];
      const success = await deleteOrders(deletedIds);
      if (success) {
        const deletedSet = new Set(deletedIds);
        setSelectedOrderIds([]);
        setSelectedDetailOrder((prev) => (prev && deletedSet.has(prev.id) ? null : prev));
        setSelectedEditOrder((prev) => (prev && deletedSet.has(prev.id) ? null : prev));
      }
    } finally {
      setIsDeletingSelected(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Top Banner / Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Total Pedidos</p>
          <h4 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{counts.total}</h4>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Registrados en el sistema</p>
        </div>

        {/* Pendientes */}
        <div
          onClick={() => setStatusFilter('pendiente')}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'pendiente'
              ? 'border-amber-500 shadow-md ring-2 ring-amber-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] sm:text-xs font-semibold text-amber-700">Pendientes</p>
            {counts.pending > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">{counts.pending}</h4>
          <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium">Requieren confirmación</p>
        </div>

        {/* Confirmados */}
        <div
          onClick={() => setStatusFilter('confirmado')}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'confirmado'
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold text-emerald-700">Confirmados</p>
          <h4 className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{counts.confirmed}</h4>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium">Stock descontado</p>
        </div>

        {/* Cancelados */}
        <div
          onClick={() => setStatusFilter('cancelado')}
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'cancelado'
              ? 'border-slate-500 shadow-md ring-2 ring-slate-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold text-slate-500">Cancelados</p>
          <h4 className="text-xl sm:text-2xl font-black text-slate-500 mt-0.5">{counts.cancelled}</h4>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Sin impacto en stock</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs w-full sm:w-auto">
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
              placeholder="Buscar Nº, cliente, CUIT, SKU..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700 shadow-2xs shrink-0 select-none"
            title="Sincronización en vivo activa (actualiza automáticamente sin refrescar)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">En Vivo</span>
          </div>

          <button
            onClick={() => {
              syncOrders();
              syncWithSupabase();
            }}
            disabled={isSyncingSupabase}
            title="Sincronizar pedidos con Supabase Cloud ahora"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk selection action bar */}
      {selectedOrderIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-2xl bg-red-50 border border-red-200 shadow-2xs">
          <div className="flex items-center gap-2.5 text-sm font-bold text-red-900">
            <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-black">
              {selectedOrderIds.length}
            </span>
            <span>
              {selectedOrderIds.length === 1
                ? '1 pedido seleccionado'
                : `${selectedOrderIds.length} pedidos seleccionados`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              disabled={isDeletingSelected}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Deseleccionar
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isDeletingSelected}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white bg-red-600 hover:bg-red-700 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeletingSelected ? 'Eliminando...' : 'Eliminar seleccionados'}
            </button>
          </div>
        </div>
      )}

      {/* Orders List Area */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
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
        <>
          {/* DESKTOP TABLE VIEW: Compact, dense, high visibility */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3 pl-3.5 pr-1 w-10">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        aria-label="Seleccionar todos los pedidos visibles"
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                      />
                    </th>
                    <th className="py-3 px-3.5">Nº Pedido</th>
                    <th className="py-3 px-3">Fecha y Hora</th>
                    <th className="py-3 px-3">Cliente / Razón Social</th>
                    <th className="py-3 px-3">Entrega</th>
                    <th className="py-3 px-3 text-center">Artículos</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const isPending = order.status === 'pendiente' || order.status === 'enviado';
                    const isConfirmed = order.status === 'confirmado' || order.status === 'completado';
                    const isCancelled = order.status === 'cancelado';

                    const orderDate = new Date(order.date);
                    const dateStr = orderDate.toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                    });
                    const timeStr = orderDate.toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const totalUnits = order.items.reduce((s, it) => s + it.quantity, 0);
                    const isSelected = selectedOrderIds.includes(order.id);

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70'
                            : isPending
                            ? 'bg-amber-50/20'
                            : ''
                        }`}
                        onClick={() => setSelectedDetailOrder(order)}
                      >
                        <td
                          className="py-3 pl-3.5 pr-1 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            aria-label={`Seleccionar pedido ${order.orderNumber}`}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                        </td>
                        {/* Nº Pedido */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            #{order.orderNumber}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                          <div className="font-medium text-slate-800">{dateStr}</div>
                          <div className="text-[10px] text-slate-400">{timeStr} hs</div>
                        </td>

                        {/* Cliente */}
                        <td className="py-3 px-3 max-w-[200px]">
                          <div className="font-bold text-slate-900 truncate">
                            {order.buyerName || order.userBusinessName}
                          </div>
                          {order.cuit && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              CUIT: {order.cuit}
                            </div>
                          )}
                        </td>

                        {/* Entrega */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                              order.deliveryMethod === 'pickup'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{order.deliveryMethod === 'pickup' ? 'Retiro Local' : 'Envío Expreso'}</span>
                          </span>
                        </td>

                        {/* Artículos */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="font-semibold text-slate-700">
                            {order.items.length} prods.
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            ({totalUnits} un.)
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900">
                            $ {Math.round(order.totalARS || order.totalUSD * exchangeRate).toLocaleString('es-AR')}
                          </div>
                          <div className="text-[10px] font-bold text-blue-600">
                            u$s {order.totalUSD.toFixed(2).replace('.', ',')} USD
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pendiente
                            </span>
                          )}
                          {isConfirmed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Confirmado
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Cancelado
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => setSelectedDetailOrder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                              title="Ver detalle completo del pedido"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Pedido</span>
                            </button>

                            <button
                              onClick={() => setSelectedEditOrder(order)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Editar pedido (cantidades, eliminar o agregar productos)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARD VIEW: Clean, compact cards (< 100px) */}
          <div className="md:hidden space-y-2.5">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span>Seleccionar todos ({filteredOrders.length})</span>
              </label>
              {selectedOrderIds.length > 0 && (
                <span className="text-[11px] font-bold text-blue-700">
                  {selectedOrderIds.length} selec.
                </span>
              )}
            </div>
            {filteredOrders.map((order) => {
              const isPending = order.status === 'pendiente' || order.status === 'enviado';
              const isConfirmed = order.status === 'confirmado' || order.status === 'completado';
              const isCancelled = order.status === 'cancelado';
              const isSelected = selectedOrderIds.includes(order.id);

              const orderDate = new Date(order.date);
              const dateStr = orderDate.toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
              });

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedDetailOrder(order)}
                  className={`p-3 rounded-xl bg-white border shadow-2xs space-y-2 cursor-pointer active:scale-[0.99] transition-all ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-400/30'
                      : isPending
                      ? 'border-amber-300 ring-1 ring-amber-400/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          aria-label={`Seleccionar pedido ${order.orderNumber}`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                      </div>
                      <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        #{order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">{dateStr}</span>
                    </div>

                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pendiente
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                        Confirmado
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        Cancelado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {order.buyerName || order.userBusinessName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {order.items.length} prods. ({order.items.reduce((s, it) => s + it.quantity, 0)} un.)
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-xs text-slate-900">
                        $ {Math.round(order.totalARS || order.totalUSD * exchangeRate).toLocaleString('es-AR')}
                      </div>
                      <div className="text-[10px] font-bold text-blue-600">
                        u$s {order.totalUSD.toFixed(2)} USD
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between pt-1.5 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setSelectedDetailOrder(order)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver y Gestionar Pedido</span>
                    </button>

                    <button
                      onClick={() => setSelectedEditOrder(order)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      <AdminOrderDetailModal
        isOpen={selectedDetailOrder !== null}
        onClose={() => setSelectedDetailOrder(null)}
        order={activeDetailOrder}
        products={products}
        onConfirm={handleConfirmClick}
        onCancel={handleCancelClick}
        onEdit={(ord) => {
          setSelectedEditOrder(ord);
        }}
        isProcessing={processingOrderId !== null}
        formatPrice={formatPrice}
        exchangeRate={exchangeRate}
      />

      {/* Order Edit Modal */}
      <AdminOrderEditModal
        isOpen={selectedEditOrder !== null}
        onClose={() => setSelectedEditOrder(null)}
        order={selectedEditOrder}
        products={products}
        exchangeRate={exchangeRate}
        formatPrice={formatPrice}
        onSave={handleSaveEditedOrder}
        isSaving={isSavingEdit}
      />

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
