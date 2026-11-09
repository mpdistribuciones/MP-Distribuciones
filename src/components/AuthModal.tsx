import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Lock,
  Building2,
  Mail,
  KeyRound,
  FileText,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MessageCircle,
  Phone,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    login,
    register,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalTab || 'login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<{
    status: 'pendiente' | 'rechazado' | 'suspendido' | 'not_found' | 'error';
    message: string;
    businessName?: string;
  } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register form state
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regCuit, setRegCuit] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  // Registration Submitted Success Screen State
  const [registeredSuccessData, setRegisteredSuccessData] = useState<{
    businessName: string;
    cuit: string;
    phone: string;
  } | null>(null);

  // Sync tab with context when modal opens
  React.useEffect(() => {
    setActiveTab(authModalTab);
    setLoginError(null);
    setRegError(null);
    setRegisteredSuccessData(null);
  }, [authModalTab, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const clean = loginIdentifier.trim();
    if (!clean) {
      setLoginError({
        status: 'error',
        message: 'Por favor ingrese su email o CUIT.',
      });
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError({
        status: 'error',
        message: 'Por favor ingrese su contraseña.',
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await login(clean, loginPassword);
      if (!res.success) {
        setLoginError({
          status: (res.status as any) || 'error',
          message: res.message || 'Error al iniciar sesión.',
          businessName: res.user?.businessName,
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regBusinessName.trim() || !regCuit.trim() || !regPhone.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Por favor complete todos los campos obligatorios del registro.');
      return;
    }

    if (regPassword.trim().length < 6) {
      setRegError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsRegistering(true);
    try {
      const res = await register(
        {
          businessName: regBusinessName.trim(),
          cuit: regCuit.trim(),
          city: regCity.trim() || 'Rosario, Santa Fe',
          phone: regPhone.trim(),
          email: regEmail.trim(),
        },
        regPassword
      );

      if (res.success) {
        setRegisteredSuccessData({
          businessName: regBusinessName.trim(),
          cuit: regCuit.trim(),
          phone: regPhone.trim(),
        });
        setRegPassword('');
        setRegConfirmPassword('');
      } else {
        setRegError(res.message || 'No se pudo completar el registro. Intente nuevamente.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    setLoginError(null);
    setRegError(null);
    setRegisteredSuccessData(null);
    closeAuthModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="bg-[#0052cc] text-white p-6 pb-5 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="MP Distribuciones Logo"
              className="w-11 h-11 object-contain shrink-0 drop-shadow-md rounded-full bg-black/20"
            />
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>{activeTab === 'register' ? 'Solicitar Cuenta B2B' : 'Acceso B2B Mayorista'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </h3>
              <p className="text-xs text-blue-100">
                MP Distribuciones • Rosario, Santa Fe
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
          {registeredSuccessData ? (
            /* REGISTER SUCCESS SCREEN */
            <div className="text-center py-4 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900">
                  ¡Solicitud Recibida con Éxito!
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Comercio:{' '}
                  <strong className="text-slate-800">
                    {registeredSuccessData.businessName}
                  </strong>{' '}
                  (CUIT: {registeredSuccessData.cuit})
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-left text-xs space-y-2 text-amber-950">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <p>
                    <strong>Validación de seguridad B2B:</strong> Por política de venta exclusiva al gremio y comercios, nuestro equipo de administración verificará tus datos.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p>
                    Te notificaremos vía WhatsApp al <strong>{registeredSuccessData.phone}</strong> apenas tu cuenta sea activada para que puedas realizar tus pedidos.
                  </p>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Entendido, muchas gracias
              </button>
            </div>
          ) : activeTab === 'login' ? (
            /* LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                    loginError.status === 'pendiente'
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : loginError.status === 'rechazado' || loginError.status === 'suspendido'
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2 font-bold">
                    {loginError.status === 'pendiente' ? (
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>
                      {loginError.status === 'pendiente'
                        ? 'Cuenta pendiente de validación'
                        : loginError.status === 'rechazado'
                        ? 'Solicitud no aprobada'
                        : loginError.status === 'suspendido'
                        ? 'Cuenta suspendida'
                        : 'Atención'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed pl-6">{loginError.message}</p>

                  {loginError.status === 'pendiente' && (
                    <div className="pt-1 pl-6">
                      <a
                        href="https://wa.me/5493413422310?text=Hola!%20Consulto%20por%20la%20validación%20de%20mi%20cuenta%20mayorista%20en%20MP%20Distribuciones."
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Consultar estado por WhatsApp (341 342-2310)</span>
                      </a>
                    </div>
                  )}

                  {loginError.status === 'not_found' && (
                    <div className="pt-1 pl-6">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('register');
                          setLoginError(null);
                        }}
                        className="text-blue-700 hover:underline font-bold text-xs"
                      >
                        → Hacer clic aquí para solicitar tu cuenta
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email o CUIT del Comercio</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="ej: micomercio@ejemplo.com o 30-XXXXXXXX-X"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Contraseña</span>
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isLoggingIn ? 'Verificando...' : 'Ingresar al Catálogo Mayorista'}</span>
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                ¿Aún no tenés cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setLoginError(null);
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Registrate gratis aquí
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  Registro de Clientes B2B & Comercios
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Completá tus datos comerciales y creá tu contraseña. Una vez validados por administración, se habilitará tu cuenta con precios de lista.
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nombre del Comercio / Razón Social *</span>
                </label>
                <input
                  type="text"
                  required
                  value={regBusinessName}
                  onChange={(e) => setRegBusinessName(e.target.value)}
                  placeholder="Ej: InfoStore Rosario SRL"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>CUIT o DNI *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regCuit}
                    onChange={(e) => setRegCuit(e.target.value)}
                    placeholder="30-XXXXXXXX-X"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Localidad / Provincia</span>
                  </label>
                  <input
                    type="text"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    placeholder="Rosario, Santa Fe"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>Email de Contacto *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="contacto@comercio.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp / Teléfono *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+54 9 341..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                    <span>Crear Contraseña *</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Confirmar Contraseña *</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Repetí tu contraseña"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRegistering ? 'Enviando solicitud...' : 'Enviar Solicitud de Registro B2B'}</span>
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                ¿Ya tenés una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRegError(null);
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Iniciá sesión aquí
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
