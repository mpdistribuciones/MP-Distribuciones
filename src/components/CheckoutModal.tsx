import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceType, DeliveryMethod } from '../types';
import confetti from 'canvas-confetti';
import {
  X,
  Phone,
  Building2,
  FileText,
  MapPin,
  Send,
  Receipt,
  Truck,
  MessageCircle,
} from 'lucide-react';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutModalOpen,
    closeCheckoutModal,
    user,
    cart,
    cartTotalUSD,
    cartTotalARS,
    currency,
    exchangeRate,
    clearCart,
    showToast,
    createOrder,
  } = useApp();

  const [buyerName, setBuyerName] = useState(user?.businessName || '');
  const [cuit, setCuit] = useState(user?.cuit || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [shippingAddress, setShippingAddress] = useState(
    deliveryMethod === 'pickup' ? 'Retiro en local: San Nicolás 2277, Rosario' : (user?.city || '')
  );
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Factura A');
  const [notes, setNotes] = useState('');

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setBuyerName(user.businessName);
      setCuit(user.cuit);
      setPhone(user.phone);
      if (deliveryMethod === 'pickup') {
        setShippingAddress('Retiro en local: San Nicolás 2277, Rosario');
      }
    }
  }, [user, deliveryMethod]);

  if (!isCheckoutModalOpen) return null;

  const currentTotal =
    currency === 'USD'
      ? `u$s ${cartTotalUSD.toFixed(2).replace('.', ',')}`
      : `$ ${Math.round(cartTotalARS).toLocaleString('es-AR')}`;

  const handleDeliveryChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === 'pickup') {
      setShippingAddress('Retiro en local: San Nicolás 2277, Rosario');
    } else if (shippingAddress === 'Retiro en local: San Nicolás 2277, Rosario') {
      setShippingAddress(user?.city || '');
    }
  };

  const handleSendWhatsApp = () => {
    if (!buyerName || !cuit || !phone) {
      showToast('Por favor verifique que Nombre, CUIT y Teléfono estén completos.', 'warning');
      return;
    }

    if (cart.length === 0) {
      showToast('El pedido no contiene productos.', 'warning');
      return;
    }

    // Build the items lines
    const itemsLines = cart
      .map((item) => {
        const itemSubtotal =
          currency === 'USD'
            ? `u$s ${(item.product.priceUSD * item.quantity).toFixed(2).replace('.', ',')}`
            : `$ ${Math.round(item.product.priceUSD * exchangeRate * item.quantity).toLocaleString('es-AR')}`;
        return `• ${item.quantity}x ${item.product.name} (SKU: ${item.product.sku}) - ${itemSubtotal}`;
      })
      .join('\n');

    const deliveryText =
      deliveryMethod === 'pickup'
        ? 'Retiro en local (San Nicolás 2277, Rosario)'
        : shippingAddress;

    // Strict template formatting
    const message =
      `📦 *NUEVO PEDIDO MAYORISTA - MP DISTRIBUCIONES*\n` +
      `👤 *Cliente:* ${buyerName}\n` +
      `🆔 *CUIT/DNI:* ${cuit}\n` +
      `📞 *Teléfono:* ${phone}\n` +
      `🧾 *Facturación:* ${invoiceType}\n` +
      `📍 *Localidad / Entrega:* ${deliveryText}\n` +
      (notes ? `📝 *Observaciones:* ${notes}\n` : '') +
      `------------------------------------\n` +
      `*DETALLE DEL PEDIDO:*\n` +
      `${itemsLines}\n` +
      `------------------------------------\n` +
      `💰 *TOTAL ESTIMADO:* ${currentTotal}\n` +
      `💬 *Solicito confirmación de stock y datos de cuenta para transferencia.*`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/5493413422310?text=${encodedMessage}`;

    // Confetti effect
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // Save order in history
    createOrder({
      userId: user?.id,
      userBusinessName: buyerName,
      buyerName,
      cuit,
      phone,
      items: [...cart],
      totalUSD: cartTotalUSD,
      totalARS: cartTotalARS,
      deliveryMethod,
      invoiceType,
      shippingAddress: deliveryText,
      notes,
    });

    window.open(whatsappUrl, '_blank');
    clearCart();
    showToast('Pedido preparado y enviado a WhatsApp de MP Distribuciones', 'success');
    closeCheckoutModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeCheckoutModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Finalizar Pedido Mayorista</h3>
            <p className="text-xs text-slate-500">
              Confirmá los datos de facturación y entrega para el despacho en Rosario o al interior
            </p>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4 text-xs">
          {/* Buyer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Nombre o Razón Social</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>CUIT o DNI</span>
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Teléfono / WhatsApp</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-blue-600" />
                <span>Comprobante Requerido</span>
              </label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as InvoiceType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
              >
                <option value="Factura A">Factura A (Responsable Inscripto)</option>
                <option value="Factura B">Factura B (Monotributo / Consumidor Final)</option>
                <option value="Consumidor Final">Consumidor Final</option>
              </select>
            </div>
          </div>

          {/* Delivery Method Choice */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Modalidad de Despacho / Entrega:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDeliveryChange('pickup')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  deliveryMethod === 'pickup'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="font-bold text-xs">Retiro en Local</p>
                <p className="text-[10px] text-slate-500">San Nicolás 2277, Rosario</p>
              </button>

              <button
                type="button"
                onClick={() => handleDeliveryChange('rosario_delivery')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  deliveryMethod === 'rosario_delivery'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="font-bold text-xs">Cadetería Rosario</p>
                <p className="text-[10px] text-slate-500">Entrega en el día</p>
              </button>

              <button
                type="button"
                onClick={() => handleDeliveryChange('interior_shipping')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  deliveryMethod === 'interior_shipping'
                    ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <p className="font-bold text-xs">Expreso Interior</p>
                <p className="text-[10px] text-slate-500">Despacho a terminal</p>
              </button>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Dirección de Entrega / Transporte</span>
            </label>
            <input
              type="text"
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Dirección, piso, expreso o transporte de preferencia"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700">
              Aclaraciones / Observaciones adicionales (opcional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Embalaje reforzado, horario de recepción de 14 a 18 hs"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-slate-900 outline-none"
            />
          </div>
        </div>

        {/* Order Summary Box */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Ítems en el pedido:</span>
            <span className="font-bold text-slate-900">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} unidades ({cart.length} productos)
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-blue-200/60">
            <span className="text-sm font-black text-slate-900">TOTAL DEL PEDIDO:</span>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-700">
                {currentTotal}
              </span>
              {currency === 'USD' ? (
                <span className="block text-[10px] text-slate-500 font-mono">
                  ≈ $ {Math.round(cartTotalARS).toLocaleString('es-AR')} ARS
                </span>
              ) : (
                <span className="block text-[10px] text-slate-500 font-mono">
                  ≈ u$s {cartTotalUSD.toFixed(2).replace('.', ',')} USD
                </span>
              )}
            </div>
          </div>
        </div>

        {/* WhatsApp Official Submit Button */}
        <button
          onClick={handleSendWhatsApp}
          className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Send className="w-5 h-5" />
          <span>Enviar pedido por WhatsApp (+54 9 341 342-2310)</span>
        </button>

        <p className="text-[11px] text-center text-slate-500">
          Al presionar se abrirá la aplicación de WhatsApp con el mensaje pre-cargado con el detalle para que el equipo comercial confirme el stock y envíe los datos bancarios.
        </p>
      </div>
    </div>
  );
};
