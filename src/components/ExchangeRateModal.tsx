import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DollarRateKey } from '../types';
import {
  X,
  DollarSign,
  Info,
  RefreshCw,
  Landmark,
  Lock,
} from 'lucide-react';

export const ExchangeRateModal: React.FC = () => {
  const {
    isExchangeRateModalOpen,
    closeExchangeRateModal,
    dollarRates,
    updateDollarRates,
    products,
    showToast,
    fetchBnaRate,
    isFetchingBnaRate,
    lastBnaSyncDate,
  } = useApp();

  const [label1, setLabel1] = useState(dollarRates.dolar1.label);
  const [rate1, setRate1] = useState(dollarRates.dolar1.rate.toString());
  const [label2, setLabel2] = useState(dollarRates.dolar2.label);
  const [rate2, setRate2] = useState(dollarRates.dolar2.rate.toString());
  const [label3, setLabel3] = useState(dollarRates.dolar3.label);
  const [rate3, setRate3] = useState(dollarRates.dolar3.rate.toString());
  const [bnaRateValue, setBnaRateValue] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isExchangeRateModalOpen) {
      setLabel1(dollarRates.dolar1.label);
      setRate1(dollarRates.dolar1.rate.toString());
      setLabel2(dollarRates.dolar2.label);
      setRate2(dollarRates.dolar2.rate.toString());
      setLabel3(dollarRates.dolar3.label);
      setRate3(dollarRates.dolar3.rate.toString());
    }
  }, [isExchangeRateModalOpen, dollarRates]);

  if (!isExchangeRateModalOpen) return null;

  const countByDollar = (key: DollarRateKey) =>
    products.filter(
      (p) => p.priceCurrency !== 'ARS' && (p.dollarRateKey || 'dolar1') === key
    ).length;

  const handleSyncBna = async () => {
    const rate = await fetchBnaRate();
    if (rate) {
      setBnaRateValue(rate);
      showToast(
        `Cotización BNA Oficial consultada: $${rate.toLocaleString('es-AR')} ARS. Podés aplicarla a cualquiera de los 3 dólares.`,
        'info'
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val1 = parseFloat(rate1);
    const val2 = parseFloat(rate2);
    const val3 = parseFloat(rate3);

    if (isNaN(val1) || val1 <= 0 || isNaN(val2) || val2 <= 0 || isNaN(val3) || val3 <= 0) {
      alert('Por favor ingrese valores válidos mayores a 0 para los 3 dólares.');
      return;
    }

    setIsSaving(true);
    try {
      await updateDollarRates({
        dolar1: { key: 'dolar1', label: label1.trim() || 'Dólar 1', rate: val1 },
        dolar2: { key: 'dolar2', label: label2.trim() || 'Dólar 2', rate: val2 },
        dolar3: { key: 'dolar3', label: label3.trim() || 'Dólar 3', rate: val3 },
      });
      showToast(
        'Las 3 cotizaciones de dólar fueron actualizadas y los precios en pesos se recalcularon.',
        'success'
      );
      closeExchangeRateModal();
    } finally {
      setIsSaving(false);
    }
  };

  const rows: {
    key: DollarRateKey;
    title: string;
    badgeColor: string;
    label: string;
    setLabel: (v: string) => void;
    rate: string;
    setRate: (v: string) => void;
    count: number;
  }[] = [
    {
      key: 'dolar1',
      title: 'Cotización #1',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      label: label1,
      setLabel: setLabel1,
      rate: rate1,
      setRate: setRate1,
      count: countByDollar('dolar1'),
    },
    {
      key: 'dolar2',
      title: 'Cotización #2',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      label: label2,
      setLabel: setLabel2,
      rate: rate2,
      setRate: setRate2,
      count: countByDollar('dolar2'),
    },
    {
      key: 'dolar3',
      title: 'Cotización #3',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: label3,
      setLabel: setLabel3,
      rate: rate3,
      setRate: setRate3,
      count: countByDollar('dolar3'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeExchangeRateModal}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">
                Configuración de 3 Dólares (Solo Admin)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                <Lock className="w-2.5 h-2.5" /> Privado
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Asigná cualquiera de estos 3 dólares a cada artículo. El cliente solo verá el precio final en Pesos ($ ARS).
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            {rows.map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${item.badgeColor}`}
                  >
                    {item.title}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {item.count} {item.count === 1 ? 'artículo asignado' : 'artículos asignados'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Nombre / Etiqueta
                    </label>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => item.setLabel(e.target.value)}
                      placeholder="Ej: Dólar 1"
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Valor en Pesos ($ ARS)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">
                        $
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        required
                        value={item.rate}
                        onChange={(e) => item.setRate(e.target.value)}
                        placeholder="1350"
                        className="w-full pl-7 pr-12 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-sm font-mono font-black text-slate-900 outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">
                        ARS
                      </span>
                    </div>
                  </div>
                </div>

                {bnaRateValue && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => item.setRate(bnaRateValue.toString())}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      Usar valor BNA (${bnaRateValue.toLocaleString('es-AR')}) en {item.label || item.title}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Banco Nación Official Reference */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Consultar Dólar Banco Nación Oficial
                  {bnaRateValue ? ` ($${bnaRateValue.toLocaleString('es-AR')})` : ''}
                </p>
                <p className="text-[10px] text-slate-500">
                  {lastBnaSyncDate ? `Sincronizado: ${lastBnaSyncDate}` : 'Consultar valor oficial de referencia'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isFetchingBnaRate}
              onClick={handleSyncBna}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingBnaRate ? 'animate-spin' : ''}`} />
              <span>{isFetchingBnaRate ? 'Consultando...' : 'Consultar BNA'}</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Al guardar, todos los artículos con costo en USD recalcularán automáticamente su precio final en Pesos ($ ARS) según el dólar (1, 2 o 3) y el porcentaje puntual que tengan asignado.
            </span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={closeExchangeRateModal}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
            >
              {isSaving ? 'Guardando...' : 'Guardar 3 Dólares'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
