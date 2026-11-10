import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Lock,
  ShieldCheck,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

export const AdminLoginModal: React.FC = () => {
  const {
    isAdminModalOpen,
    closeAdminModal,
    loginAdmin,
    isAdminLoggedIn,
    setIsAdminView,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isAdminModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const success = await loginAdmin(email, password);
    setLoading(false);
    if (!success) {
      setError(true);
    } else {
      setPassword('');
      setError(false);
    }
  };

  const handleAlreadyLogged = () => {
    closeAdminModal();
    setIsAdminView(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeAdminModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
              <span>Panel de Gestión Dueño</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </h3>
            <p className="text-xs text-slate-500">
              Control de inventario, stock, precios y carga masiva
            </p>
          </div>
        </div>

        {isAdminLoggedIn ? (
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ya contás con una sesión activa de Administrador.</span>
            </div>
            <button
              onClick={handleAlreadyLogged}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Ir al Panel de Gestión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email de Administrador</label>
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(false);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>Contraseña</span>
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-sm text-slate-900 outline-none transition-all ${
                  error
                    ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-300 focus:border-blue-600 focus:bg-white'
                }`}
              />
              {error && (
                <p className="text-xs text-red-600 font-medium">
                  Credenciales incorrectas o sin permisos de administrador.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={closeAdminModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 disabled:opacity-60 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <span>{loading ? 'Verificando...' : 'Acceder al Panel'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
