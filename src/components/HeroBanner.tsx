import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Zap,
  Truck,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';

export const HeroBanner: React.FC = () => {
  const { user, openAuthModal, currency } = useApp();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-mp-dark via-mp-card to-mp-bg border-b border-mp-cardBorder/60 py-8 md:py-12 px-4">
      {/* Background Tech Mesh & Glow Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-mp-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mp-primary/10 border border-mp-primary/30 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>LISTA DE PRECIOS MAYORISTA OFICIAL 2026</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-emerald-400 font-mono">STOCK EN TIEMPO REAL</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Distribuidor Mayorista de Informática y Tecnología en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-mp-accent to-blue-500">
                Rosario, Santa Fe
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Abastecemos a locales de computación, servicios técnicos, integradores y revendedores en toda la región.
              Precios directos de importador, garantía oficial y despacho ágil.
            </p>

            {/* Feature Bullets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-mp-card/70 border border-white/5">
                <Building2 className="w-4 h-4 text-mp-accent shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">San Nicolás 2277</p>
                  <p className="text-slate-400 text-[11px]">Retiro en Rosario</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-mp-card/70 border border-white/5">
                <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">Envíos a Todo el País</p>
                  <p className="text-slate-400 text-[11px]">Expresos y cadetería</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-mp-card/70 border border-white/5">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">19 Rubros Activos</p>
                  <p className="text-slate-400 text-[11px]">Hardware & Accesorios</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-mp-card/70 border border-white/5">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-white">Garantía Escrita</p>
                  <p className="text-slate-400 text-[11px]">RMA directo</p>
                </div>
              </div>
            </div>

            {/* Call to Actions */}
            {!user && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => openAuthModal('register')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mp-primary hover:bg-blue-600 text-white font-bold text-sm shadow-glow-md hover:shadow-glow-lg transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>Crear Cuenta Mayorista Gratis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-mp-card hover:bg-mp-cardHover border border-mp-cardBorder text-slate-200 text-sm font-semibold transition-all"
                >
                  <span>Ya tengo cuenta / Ingresar</span>
                </button>

                <div className="text-xs text-amber-300/90 flex items-center gap-1.5 pl-1">
                  <span>🔒 Precios visibles únicamente para comercios registrados</span>
                </div>
              </div>
            )}
          </div>

          {/* Right Status Card */}
          <div className="lg:col-span-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-mp-card via-mp-card to-[#0d1629] border border-mp-cardBorder shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-white tracking-wide uppercase">
                    Mesa de Entrada Mayorista
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
                  Atención Inmediata
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Canal exclusivo:</span>
                  <span className="font-bold text-blue-400">Gremio y Comercios B2B</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Moneda en pantalla:</span>
                  <span className="font-bold text-white">{currency === 'ARS' ? 'Pesos ($ ARS)' : 'Dólares (u$s USD)'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Dirección de retiro:</span>
                  <span className="text-slate-200 font-medium">San Nicolás 2277, Rosario</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Horario de retiro:</span>
                  <span className="text-slate-200 font-medium">Lun a Vie 9:00 a 16:00 hs</span>
                </div>
              </div>

              <a
                href="https://wa.me/5493413422310?text=Hola%20MP%20Distribuciones,%20quisiera%20hacer%20una%20consulta%20mayorista"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Consultar por WhatsApp Directo</span>
              </a>

              {user ? (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Logueado como <strong>{user.businessName}</strong>. Precios desbloqueados.</span>
                </div>
              ) : (
                <p className="text-[11px] text-center text-slate-400">
                  El registro es inmediato y sin demoras.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
