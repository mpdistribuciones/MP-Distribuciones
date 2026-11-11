import React from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  History,
  RotateCcw,
  Package,
  Calendar,
  Truck,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const OrderHistoryModal: React.FC = () => {
  const {
    isOrderHistoryModalOpen,
    closeOrderHistoryModal,
    orders,
    repeatOrder,
    user,
    openAuthModal,
    exchangeRate,
  } = useApp();

  if (!isOrderHistoryModalOpen) return null;

  // Filter orders for current logged in user
  const userOrders = user
    ? orders.filter(
        (o) => o.userId === user.id || o.userBusinessName.toLowerCase() === user.businessName.toLowerCase()
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Historial de Compras B2B
              </h2>
              <p className="text-xs text-slate-500">
                {user ? `Pedidos registrados para ${user.businessName}` : 'Iniciá sesión para ver tu historial'}
              </p>
            </div>
          </div>

          <button
            onClick={closeOrderHistoryModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {!user ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Iniciá sesión para ver tus pedidos anteriores
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Los pedidos quedan asociados a tu comercio registrado para que puedas consultar facturas y repetir pedidos con un solo clic.
              </p>
              <button
                onClick={() => {
                  closeOrderHistoryModal();
                  openAuthModal('login');
                }}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Ingresar a mi Cuenta
              </button>
            </div>
          ) : userOrders.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Aún no tenés pedidos registrados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cuando confirmes un pedido por WhatsApp desde el carrito, quedará guardado aquí para que puedas repetirlo cuando quieras.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => {
                const totalUnits = order.items.reduce((acc, item) => acc + item.quantity, 0);
                const formattedDate = new Date(order.date).toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-blue-300 transition-colors space-y-3"
                  >
                    {/* Top Row: Order ID, Date & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          #{order.orderNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {order.status === 'enviado' ? '✓ Enviado a WhatsApp' : order.status}
                        </span>
                      </div>
                    </div>

                    {/* Items List Preview */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Artículos del pedido ({totalUnits} unidades):
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-slate-900 font-mono text-[11px] shrink-0">
                                {item.quantity}x
                              </span>
                              <span className="truncate text-slate-700 font-medium">
                                {item.product.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0 ml-2">
                              {item.product.priceCurrency === 'USD'
                                ? `u$s ${(item.product.priceUSD * item.quantity).toFixed(2)}`
                                : `$ ${((item.product.priceARS || Math.round(item.product.priceUSD * exchangeRate)) * item.quantity).toLocaleString('es-AR')}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Details & Summary Footer */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {order.deliveryMethod === 'pickup'
                              ? 'Retiro en Rosario'
                              : order.deliveryMethod === 'rosario_delivery'
                              ? 'Cadetería Rosario'
                              : 'Envíos a Todo el País'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.invoiceType}</span>
                        </div>
                        <div className="text-sm font-black text-slate-900">
                          Total: $ {Math.round(order.totalARS).toLocaleString('es-AR')} ARS{' '}
                          <span className="text-xs font-normal text-slate-500 font-mono">
                            (u$s {order.totalUSD.toFixed(2)})
                          </span>
                        </div>
                      </div>

                      {/* Repetir Pedido Button */}
                      <button
                        onClick={() => repeatOrder(order)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all cursor-pointer"
                        title="Cargar estos artículos nuevamente en tu carrito"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Repetir Pedido</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={closeOrderHistoryModal}
            className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
