import React, { useMemo } from 'react';
import {
  MapPin,
  Clock,
  MessageCircle,
  Navigation,
  ExternalLink,
  CheckCircle2,
  Truck,
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const address = 'San Nicolás 2277, Rosario, Santa Fe, Argentina';
  const hours = 'Lunes a Viernes de 9:00 a 16:00 hs';
  const phoneDisplay = '+54 9 341 340-8439';
  const whatsappUrl =
    'https://wa.me/5493413408439?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta%20mayorista.';
  const mapsDirectionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe';
  const mapsEmbedUrl =
    'https://maps.google.com/maps?q=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe&t=&z=16&ie=UTF8&iwloc=&output=embed';

  const statusInfo = useMemo(() => {
    try {
      const now = new Date();
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
  }, []);

  return (
    <section
      id="contacto"
      className="w-full bg-gradient-to-b from-[#f4f6fa] via-slate-50 to-white border-t border-slate-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-[1550px] mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <h2
            id="contact-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight"
          >
            Venta Mayorista, Retiro en Rosario y Envíos a Todo el País
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Visitanos en nuestro local para retirar tus compras o coordiná envíos a cualquier punto del país por el expreso o transporte que prefieras.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Column: Info Card & Quick Actions */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              {/* Card Title & Live Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-black text-slate-900">MP Distribuciones</h3>
                  <p className="text-xs text-slate-500">Distribuidor Mayorista de Tecnología</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${statusInfo.badgeColor}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
                  <span>{statusInfo.badgeText}</span>
                </span>
              </div>

              {/* Contact Data Items */}
              <div className="space-y-5">
                {/* Address */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Dirección y Retiro
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      San Nicolás 2277
                    </p>
                    <p className="text-xs text-slate-600">
                      {address}
                    </p>
                    <p className="text-[11px] text-slate-500 pt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Retiro inmediato de pedidos confirmados</span>
                    </p>
                  </div>
                </div>

                {/* Shipping Nationwide */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 shadow-xs">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Envíos a Todo el País
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      Por el transporte que prefiera el cliente
                    </p>
                    <p className="text-xs text-slate-600">
                      Despachamos por el expreso, encomienda o comisionista de tu elección a cualquier punto de Argentina.
                    </p>
                    <p className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Embalaje seguro y despacho ágil</span>
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-xs">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Horarios de Atención
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {hours}
                    </p>
                    <p className="text-xs text-slate-500">
                      Sábados, Domingos y Feriados cerrado
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:w-[60%] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm hover:shadow transition-all group cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white group-hover:scale-110 transition-transform shrink-0" />
                <span>Consultar por WhatsApp ({phoneDisplay})</span>
              </a>

              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sm:w-[40%] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs sm:text-sm border border-sky-200/80 transition-colors cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Cómo Llegar (Google Maps)</span>
              </a>
            </div>
          </div>

          {/* Right Column: Google Maps Interactive Embed */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
            <div className="relative w-full h-[320px] sm:h-[380px] lg:h-full min-h-[320px] lg:min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              <iframe
                title="Ubicación de MP Distribuciones en San Nicolás 2277, Rosario, Santa Fe"
                src={mapsEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full absolute inset-0"
              />
            </div>

            {/* Map footer subtext */}
            <div className="pt-3 px-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>San Nicolás 2277, Rosario, Santa Fe</span>
              </div>
              <a
                href={mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                <span>Ver en Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
