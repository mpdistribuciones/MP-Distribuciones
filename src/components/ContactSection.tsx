import React from 'react';
import {
  MapPin,
  Clock,
  Phone,
  MessageCircle,
  Navigation,
  ExternalLink,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export const ContactSection: React.FC = () => {
  const address = 'San Nicolás 2277, Rosario, Santa Fe, Argentina';
  const hours = 'Lunes a Viernes de 9:00 a 16:00 hs';
  const phoneDisplay = '341 342-2310';
  const phoneTel = '+543413422310';
  const whatsappUrl =
    'https://wa.me/5493413422310?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta%20mayorista.';
  const mapsDirectionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe';
  const mapsEmbedUrl =
    'https://maps.google.com/maps?q=San+Nicol%C3%A1s+2277,+Rosario,+Santa+Fe&t=&z=16&ie=UTF8&iwloc=&output=embed';

  return (
    <section
      id="contacto"
      className="w-full bg-gradient-to-b from-[#f4f6fa] via-slate-50 to-white border-t border-slate-200/80 py-12 sm:py-16 px-4 sm:px-6 lg:px-8"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-[1550px] mx-auto space-y-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Casa Central & Atención Comercial</span>
          </div>
          <h2
            id="contact-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight"
          >
            Venta Mayorista y Retiro en Rosario
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Visitanos en nuestro local para retirar tus pedidos o comunicate directamente con nuestro equipo de ventas para asesoramiento y cotizaciones inmediatas.
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Abierto de Lun a Vie</span>
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
                    <p className="text-[11px] text-slate-400 pt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>Estacionamiento para carga de pedidos</span>
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

                {/* Phone & WhatsApp */}
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-xs">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Teléfono y WhatsApp
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`tel:${phoneTel}`}
                        className="text-base font-black text-slate-900 hover:text-blue-600 transition-colors"
                        title="Llamar por teléfono"
                      >
                        {phoneDisplay}
                      </a>
                    </div>
                    <p className="text-xs text-slate-500">
                      Línea directa para consultas, cotizaciones y altas comerciales
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm shadow-sm hover:shadow transition-all group cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white group-hover:scale-110 transition-transform" />
                <span>Chatear por WhatsApp ({phoneDisplay})</span>
              </a>

              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href={`tel:${phoneTel}`}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-600" />
                  <span>Llamar Ahora</span>
                </a>

                <a
                  href={mapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/60 transition-colors cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cómo llegar</span>
                </a>
              </div>
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
