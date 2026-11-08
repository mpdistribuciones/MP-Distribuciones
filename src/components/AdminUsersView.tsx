import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  Building,
  MapPin,
  MessageCircle,
  RotateCw,
  Trash2,
  PauseCircle,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserStatus } from '../types';

export const AdminUsersView: React.FC = () => {
  const {
    b2bUsers,
    approveUser,
    rejectUser,
    suspendUser,
    deleteB2bUser,
    syncWithSupabase,
    isSyncingSupabase,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Helper to sanitize phone for WhatsApp wa.me link
  const getWhatsAppLink = (u: User, isApprovalMessage = false) => {
    let rawPhone = u.phone || '';
    let cleaned = rawPhone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('549') && !cleaned.startsWith('54')) {
      cleaned = `549${cleaned}`;
    } else if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
      cleaned = `549${cleaned.substring(2)}`;
    }

    const message = isApprovalMessage
      ? `Hola *${u.businessName}*! 👋 Te informamos desde *MP Distribuciones* que tu cuenta mayorista ha sido aprobada con éxito.\n\n` +
        `Ya podés ingresar a nuestra plataforma con tu email (*${u.email}*) o CUIT (*${u.cuit}*) para acceder al catálogo completo con precios de lista y armar tus pedidos.\n\n` +
        `🌐 https://mpdistribuciones.vercel.app\n\n` +
        `¡Muchas gracias por elegirnos!`
      : `Hola *${u.businessName}*! 👋 Te escribimos desde *MP Distribuciones* respecto a tu cuenta mayorista.`;

    const encoded = encodeURIComponent(message);
    return cleaned ? `https://wa.me/${cleaned}?text=${encoded}` : `https://wa.me/5493413408439?text=${encoded}`;
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return b2bUsers.filter((u) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'rechazado' && (u.status === 'rechazado' || u.status === 'suspendido')) {
          // match both negative states under rejected filter
        } else if (u.status !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = u.businessName.toLowerCase().includes(q);
        const matchesCuit = u.cuit.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesPhone = u.phone.toLowerCase().includes(q);
        const matchesCity = (u.city || '').toLowerCase().includes(q);

        return matchesName || matchesCuit || matchesEmail || matchesPhone || matchesCity;
      }

      return true;
    });
  }, [b2bUsers, statusFilter, searchTerm]);

  // Counts
  const counts = useMemo(() => {
    const total = b2bUsers.length;
    const pending = b2bUsers.filter((u) => u.status === 'pendiente').length;
    const approved = b2bUsers.filter((u) => u.status === 'aprobado').length;
    const rejected = b2bUsers.filter((u) => u.status === 'rechazado' || u.status === 'suspendido').length;
    return { total, pending, approved, rejected };
  }, [b2bUsers]);

  const handleApprove = async (u: User) => {
    setActionProcessingId(u.id);
    try {
      await approveUser(u.id);
      // Auto offer WhatsApp notification
      if (window.confirm(`¿Desea abrir WhatsApp para avisar a "${u.businessName}" que su cuenta fue habilitada?`)) {
        window.open(getWhatsAppLink(u, true), '_blank');
      }
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleReject = async (u: User) => {
    if (window.confirm(`¿Está seguro de rechazar la solicitud de "${u.businessName}"?`)) {
      setActionProcessingId(u.id);
      try {
        await rejectUser(u.id);
      } finally {
        setActionProcessingId(null);
      }
    }
  };

  const handleSuspend = async (u: User) => {
    if (window.confirm(`¿Desea pausar o suspender temporalmente el acceso a "${u.businessName}"?`)) {
      setActionProcessingId(u.id);
      try {
        await suspendUser(u.id);
      } finally {
        setActionProcessingId(null);
      }
    }
  };

  const handleDelete = async (u: User) => {
    if (window.confirm(`¿Está seguro de eliminar definitivamente a "${u.businessName}" de la base de datos?`)) {
      setActionProcessingId(u.id);
      try {
        await deleteB2bUser(u.id);
      } finally {
        setActionProcessingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">Total Solicitudes</p>
          <h4 className="text-2xl font-black text-slate-900 mt-0.5">{counts.total}</h4>
          <p className="text-[11px] text-slate-500 font-medium">Comercios registrados</p>
        </div>

        {/* Pendientes */}
        <div
          onClick={() => setStatusFilter('pendiente')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'pendiente'
              ? 'border-amber-500 shadow-md ring-2 ring-amber-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-amber-700">Por Validar</p>
            {counts.pending > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <h4 className="text-2xl font-black text-amber-600 mt-0.5">{counts.pending}</h4>
          <p className="text-[11px] text-amber-700 font-medium">Pendientes de aprobación</p>
        </div>

        {/* Aprobados */}
        <div
          onClick={() => setStatusFilter('aprobado')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'aprobado'
              ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-emerald-700">Aprobados / Activos</p>
          <h4 className="text-2xl font-black text-emerald-700 mt-0.5">{counts.approved}</h4>
          <p className="text-[11px] text-emerald-600 font-medium">Con acceso mayorista</p>
        </div>

        {/* Rechazados / Suspendidos */}
        <div
          onClick={() => setStatusFilter('rechazado')}
          className={`p-4 rounded-2xl bg-white border cursor-pointer transition-all ${
            statusFilter === 'rechazado'
              ? 'border-rose-500 shadow-md ring-2 ring-rose-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <p className="text-xs font-semibold text-slate-500">Rechazados / Pausa</p>
          <h4 className="text-2xl font-black text-slate-500 mt-0.5">{counts.rejected}</h4>
          <p className="text-[11px] text-slate-400 font-medium">Sin acceso a precios</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Status Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('pendiente')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'pendiente'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 hover:bg-amber-100/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pendientes ({counts.pending})</span>
          </button>
          <button
            onClick={() => setStatusFilter('aprobado')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'aprobado'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 hover:bg-emerald-100/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprobados ({counts.approved})</span>
          </button>
          <button
            onClick={() => setStatusFilter('rechazado')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'rechazado'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rechazados ({counts.rejected})</span>
          </button>
        </div>

        {/* Search & Sync */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por razón social, CUIT, email, ciudad..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={syncWithSupabase}
            disabled={isSyncingSupabase}
            title="Sincronizar clientes con Supabase Cloud"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">No se encontraron clientes</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay solicitudes que coincidan con la búsqueda.'
              : statusFilter === 'pendiente'
              ? '¡Excelente! No hay nuevas cuentas pendientes de validación.'
              : 'Aún no hay clientes registrados en esta sección.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const isPending = u.status === 'pendiente';
            const isApproved = u.status === 'aprobado';
            const isRejected = u.status === 'rechazado';
            const isSuspended = u.status === 'suspendido';
            const isBusy = actionProcessingId === u.id;

            const regDate = u.registeredAt ? new Date(u.registeredAt) : null;
            const regDateStr = regDate
              ? regDate.toLocaleDateString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Reciente';

            return (
              <div
                key={u.id}
                className={`bg-white rounded-2xl border shadow-sm transition-all overflow-hidden p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-400/20'
                    : isApproved
                    ? 'border-emerald-200'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                {/* Left: User Identity Info */}
                <div className="space-y-1.5 flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm sm:text-base">
                      {u.businessName}
                    </span>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Por Validar
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Mayorista Activo
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Rechazado
                      </span>
                    )}
                    {isSuspended && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        <PauseCircle className="w-3.5 h-3.5 text-slate-500" />
                        Suspendido
                      </span>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-mono text-slate-700 font-semibold">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      CUIT: {u.cuit}
                    </span>

                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <a href={`mailto:${u.email}`} className="text-blue-600 hover:underline">
                        {u.email}
                      </a>
                    </span>

                    {u.city && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {u.city}
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400">
                      Registro: {regDateStr}
                    </span>
                  </div>
                </div>

                {/* Right: Phone & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                  {/* WhatsApp Quick Contact */}
                  <a
                    href={getWhatsAppLink(u)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer"
                    title={`Contactar a ${u.phone} por WhatsApp`}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Call Direct */}
                  <a
                    href={`tel:${u.phone}`}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title={`Llamar al ${u.phone}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>

                  {/* State Actions */}
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleReject(u)}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-600 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Rechazar
                      </button>

                      <button
                        onClick={() => handleApprove(u)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Aprobar Cuenta</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => handleSuspend(u)}
                      disabled={isBusy}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      title="Suspender temporalmente"
                    >
                      Pausar
                    </button>
                  )}

                  {(isRejected || isSuspended) && (
                    <button
                      onClick={() => handleApprove(u)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reactivar</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(u)}
                    disabled={isBusy}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
