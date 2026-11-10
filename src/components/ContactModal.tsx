import React, { useMemo } from 'react';
import {
  X,
  MapPin,
  Clock,
  MessageCircle,
  Navigation,
  ShieldCheck,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ContactModal: React.FC = () => {
  const { isContactModalOpen, closeContactModal } = useApp();

  const address = 'San Nicolás 2277, Rosario, Santa Fe, Argentina';
  const hours = 'Lunes a Viernes de 9:00 a 16:00 hs';
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
        className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-4 sm:p-5 space-y-3 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeContactModal}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer z-10"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 pr-9">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="MP Distribuciones"
              className="w-9 h-9 object-contain rounded-full bg-[#0052cc] p-1 shadow-2xs"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  MP DISTRIBUCIONES
                </h3>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 font-extrabold text-[9px] uppercase tracking-wider border border-blue-200">
                  Rosario
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Punto de Retiro Mayorista y Envíos a Todo el País
              </p>
            </div>
          </div>

          {/* Live Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${statusInfo.badgeColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`} />
            <span>{statusInfo.badgeText}</span>
          </div>
        </div>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
          {/* Left Column: Location, Hours, Contact Details & Quick Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
            <div className="space-y-2">
              {/* Address card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  <span>Dirección y Retiro</span>
                </div>
                <div className="font-black text-slate-900 text-xs sm:text-sm">
                  {address}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Estacionamiento disponible para carga de pedidos</span>
                </div>
              </div>

              {/* Shipping card */}
              <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-indigo-600 uppercase tracking-wider">
                  <Truck className="w-3 h-3 text-indigo-600" />
                  <span>Envíos a Todo el País</span>
                </div>
                <div className="font-black text-slate-900 text-xs sm:text-sm">
                  Por el transporte que prefiera el cliente
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>Despachos a toda la Argentina por el expreso de tu elección</span>
                </div>
              </div>

              {/* Horarios de Atención Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>Horarios de Atención</span>
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  {hours}
                </div>
                <p className="text-[11px] text-slate-500">
                  Sábados, Domingos y Feriados cerrado
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Iniciar Consulta por WhatsApp</span>
              </a>

              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] border border-sky-200/80 transition-colors cursor-pointer"
              >
                <Navigation className="w-3 h-3 text-sky-600" />
                <span>Cómo Llegar (Google Maps)</span>
              </a>
            </div>
          </div>

          {/* Right Column: Google Maps Interactive Embed */}
          <div className="lg:col-span-7 flex flex-col min-h-[220px] lg:min-h-[260px] h-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative bg-slate-100">
            <iframe
              title="Ubicación MP Distribuciones"
              src={mapsEmbedUrl}
              className="w-full h-full min-h-[220px] lg:min-h-[260px] border-0"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>

        {/* Footer note */}
        <div className="pt-1 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Venta exclusiva a comercios, empresas y revendedores de informática.</span>
        </div>
      </div>
    </div>
  );
};
