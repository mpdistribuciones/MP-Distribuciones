import React, { useMemo } from 'react';
import {
  X,
  MapPin,
  Clock,
  MessageCircle,
  Navigation,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContactModal: React.FC = () => {
  const { isContactModalOpen, closeContactModal } = useApp();

  const address = 'San Nicolás 2277, Rosario, Santa Fe, Argentina';
  const hours = 'Lunes a Viernes de 9:00 a 16:00 hs';
  const phoneDisplay = '+54 9 341 340-8439';
  const whatsappUrl =
    'https://wa.me/5493413408439?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta%20sobre%20retiro%20en%20local.';
  const mapsDirectionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe';
  const mapsEmbedUrl =
    'https://maps.google.com/maps?q=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe&t=&z=16&ie=UTF8&iwloc=&output=embed';

  // Calculate live business status in Argentina timezone
  const statusInfo = useMemo(() => {
    try {
      const now = new Date();
      // Format to Argentina time
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
      });
      const parts = formatter.formatToParts(now);
      const weekday = parts.find((p) => p.type === 'weekday')?.value || '';
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const isWeekday = !['Sat', 'Sun'].includes(weekday);
      const isOpen = isWeekday && hour >= 9 && hour < 16;

      return {
        isOpen,
        badgeText: isOpen ? 'Abierto Ahora (cierra 16:00 hs)' : 'Cerrado Ahora (abre Lun a Vie 9:00 hs)',
        badgeColor: isOpen
          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
          : 'bg-amber-50 text-amber-800 border-amber-300',
        dotColor: isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500',
      };
    } catch {
      return {
        isOpen: true,
        badgeText: 'Horario: Lun a Vie 9:00 a 16:00 hs',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        dotColor: 'bg-blue-500',
      };
    }
  }, [isContactModalOpen]);

  if (!isContactModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={closeContactModal}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-7 space-y-5 sm:space-y-6 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeContactModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-10"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 pr-10">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="MP Distribuciones"
              className="w-11 h-11 object-contain rounded-full bg-[#0052cc] p-1 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  MP DISTRIBUCIONES
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[10px] uppercase tracking-wider border border-blue-200">
                  Rosario
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Punto de Retiro Mayorista y Envíos a Todo el País
              </p>
            </div>
          </div>

          {/* Live Status Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusInfo.badgeColor}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
            <span>{statusInfo.badgeText}</span>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Left Column: Location, Shipping, Hours & Action Buttons */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
            <div className="space-y-3">
              {/* Address card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-500 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dirección y Retiro</span>
                </div>
                <div className="font-black text-slate-900 text-sm sm:text-base">
                  San Nicolás 2277
                </div>
                <p className="text-xs text-slate-600">
                  {address}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Retiro inmediato de pedidos confirmados</span>
                </div>
              </div>

              {/* Shipping card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-600 uppercase tracking-wider">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Envíos a Todo el País</span>
                </div>
                <div className="font-black text-slate-900 text-sm sm:text-base">
                  Por el transporte que prefiera el cliente
                </div>
                <p className="text-xs text-slate-600">
                  Despachamos por el expreso, encomienda o comisionista de tu elección a cualquier punto de Argentina.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Embalaje seguro y despacho ágil</span>
                </div>
              </div>

              {/* Hours card */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-500 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Horarios de Atención</span>
                </div>
                <div className="font-black text-slate-900 text-xs sm:text-sm">
                  {hours}
                </div>
                <p className="text-[11px] text-slate-500">
                  Sábados, Domingos y Feriados cerrado
                </p>
              </div>

              {/* Action Buttons in place of Contact Directo Card */}
              <div className="space-y-2 pt-0.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all group cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white shrink-0 group-hover:scale-105 transition-transform" />
                  <span>Consultar por WhatsApp ({phoneDisplay})</span>
                </a>

                <a
                  href={mapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs sm:text-sm border border-sky-200 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Cómo Llegar (Google Maps)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Google Maps Interactive Embed */}
          <div className="lg:col-span-7 flex flex-col min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group bg-slate-100">
            <iframe
              title="Ubicación MP Distribuciones"
              src={mapsEmbedUrl}
              className="w-full h-full min-h-[300px] lg:min-h-[420px] border-0"
              loading="lazy"
              allowFullScreen
            />

            {/* Floating button on top of map */}
            <a
              href={mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md hover:shadow-lg transition-all border border-slate-200/80 cursor-pointer backdrop-blur-xs"
            >
              <span>Abrir en Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            </a>
          </div>
        </div>

        {/* Footer note */}
        <div className="pt-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Venta exclusiva a comercios, empresas y revendedores de informática.</span>
        </div>
      </div>
    </div>
  );
};
