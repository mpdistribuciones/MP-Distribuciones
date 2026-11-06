import React from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/categories';
import {
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setSelectedCategory, user, openAuthModal } = useApp();

  return (
    <footer className="w-full bg-[#07245b] border-t border-blue-900 pt-10 pb-8 px-4 text-blue-100 text-xs">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="MP Distribuciones Logo"
                className="w-11 h-11 object-contain shrink-0 drop-shadow-md"
              />
              <div>
                <span className="text-base font-extrabold text-white tracking-tight">
                  MP DISTRIBUCIONES
                </span>
                <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">
                  Mayorista de Informática B2B
                </p>
              </div>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Distribuidor mayorista de hardware, conectividad, periféricos, seguridad y telefonía en Rosario y toda Argentina. Venta exclusiva a gremio y comercios del rubro.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Garantía oficial y servicio posventa directo</span>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Casa Central Rosario
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-mp-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">San Nicolás 2277</p>
                  <p className="text-slate-400">S2000 Rosario, Santa Fe, Argentina</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Teléfono / WhatsApp:</p>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://wa.me/5493413422310"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      341 342-2310
                    </a>
                    <span className="text-slate-500">•</span>
                    <a
                      href="tel:+543413422310"
                      className="text-slate-300 hover:text-white transition-colors"
                      title="Llamar"
                    >
                      Llamar
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-200">Horarios de Atención:</p>
                  <p className="text-slate-400">Lunes a Viernes: 9:00 a 16:00 hs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Categories Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Rubros Destacados
            </h4>
            <ul className="grid grid-cols-2 gap-1.5 text-[11px]">
              {CATEGORIES.slice(0, 10).map((cat) => (
                <li key={cat.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="hover:text-blue-400 transition-colors text-left"
                  >
                    • {cat.shortName}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Wholesale B2B Policy */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Políticas Mayoristas
            </h4>
            <div className="space-y-2 text-[11px] text-slate-400">
              <p>
                • Facturación: Emitimos <strong>Factura A</strong> y <strong>Factura B</strong> electrónica.
              </p>
              <p>
                • Formas de Pago: Transferencia bancaria inmediata, e-cheqs y efectivo en local.
              </p>
              <p>
                • Despacho Express: Retiro en local o envío por expresos (Cruz del Sur, Vía Cargo, OCA, Andreani, etc.).
              </p>
              {!user && (
                <button
                  onClick={() => openAuthModal('register')}
                  className="mt-2 w-full py-2 px-3 rounded-xl bg-mp-card border border-mp-cardBorder hover:border-mp-primary text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Registrar mi Comercio Ahora</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom copyright & disclaimer */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} MP Distribuciones. Todos los derechos reservados. Rosario, Santa Fe.</p>
          <div className="flex items-center gap-3">
            <span className="text-blue-300">
              Plataforma B2B para Distribuidores y Locales.
            </span>
            <span>•</span>
            <span className="text-slate-300 flex items-center gap-1.5">
              Desarrollado por{' '}
              <a
                href="https://www.shurianlabs.com.ar/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-blue-300 font-bold tracking-wide transition-colors underline underline-offset-4"
              >
                Shurian Labs
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
