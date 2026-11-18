import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, DollarRateKey } from '../types';
import { useApp } from '../context/AppContext';
import { isSupabaseConfigured, uploadProductImage } from '../lib/supabase';
import { DEFAULT_PRODUCT_IMAGE } from '../lib/constants';
import {
  X,
  Plus,
  Save,
  Image as ImageIcon,
  Layers,
  Tag,
  DollarSign,
  Boxes,
  Camera,
  Trash2,
  Loader2,
} from 'lucide-react';

interface AdminProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  initialValues?: Partial<Product> | null;
}

export const AdminProductModal: React.FC<AdminProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  initialValues,
}) => {
  const { addProduct, updateProduct, dollarRates, categories, addCategory } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('NOTEBOOKS');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'ARS'>('USD');
  const [dollarRateKey, setDollarRateKey] = useState<DollarRateKey>('dolar1');
  const [costInput, setCostInput] = useState<number>(0);
  const [profitMarginInput, setProfitMarginInput] = useState<number>(15);
  const [priceArsInput, setPriceArsInput] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minWholesaleQty, setMinWholesaleQty] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const getRateByKey = (key: DollarRateKey) =>
    dollarRates[key]?.rate || dollarRates.dolar1.rate || 1350;

  const activeRate = getRateByKey(dollarRateKey);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setCategory(productToEdit.category);
      setSubcategory(productToEdit.subcategory || '');
      setDescription(productToEdit.description);
      setSpecsText(productToEdit.specs ? productToEdit.specs.join('\n') : '');
      setStockQuantity(productToEdit.stockQuantity);
      setMinWholesaleQty(productToEdit.minWholesaleQty || 1);
      setImageUrl(productToEdit.imageUrl);

      const margin = productToEdit.profitMargin != null ? productToEdit.profitMargin : 15;
      setProfitMarginInput(margin);

      const dKey: DollarRateKey =
        productToEdit.dollarRateKey === 'dolar2' || productToEdit.dollarRateKey === 'dolar3'
          ? productToEdit.dollarRateKey
          : 'dolar1';
      setDollarRateKey(dKey);
      const rate = getRateByKey(dKey);

      if (productToEdit.priceCurrency === 'ARS') {
        setPriceCurrency('ARS');
        const priceARS =
          productToEdit.priceARS || Math.round(productToEdit.priceUSD * rate);
        const costARS =
          productToEdit.costARS != null && productToEdit.costARS > 0
            ? productToEdit.costARS
            : productToEdit.costUSD != null && productToEdit.costUSD > 0
            ? Math.round(productToEdit.costUSD * rate)
            : Math.round(priceARS / (1 + margin / 100));
        setCostInput(costARS);
        setPriceArsInput(priceARS);
      } else {
        setPriceCurrency('USD');
        const priceUSD = productToEdit.priceUSD;
        const costUSD =
          productToEdit.costUSD != null && productToEdit.costUSD > 0
            ? productToEdit.costUSD
            : priceUSD > 0
            ? Number((priceUSD / (1 + margin / 100)).toFixed(2))
            : 0;
        const priceARS =
          productToEdit.priceARS || Math.round(costUSD * rate * (1 + margin / 100));
        setCostInput(costUSD);
        setPriceArsInput(priceARS);
      }
    } else {
      const prefillName = (initialValues?.name || '').trim();
      setName(prefillName);
      setCategory((initialValues?.category as Category) || 'ACCESORIOS, ADAPTADORES Y CABLES');
      setSubcategory(initialValues?.subcategory || '');
      setDescription(initialValues?.description || '');
      setSpecsText('');

      const defaultCurrency = initialValues?.priceCurrency || 'USD';
      setPriceCurrency(defaultCurrency);
      const defaultKey: DollarRateKey = initialValues?.dollarRateKey || 'dolar1';
      setDollarRateKey(defaultKey);
      const rate = getRateByKey(defaultKey);
      const defaultMargin = initialValues?.profitMargin ?? 15;
      setProfitMarginInput(defaultMargin);

      if (defaultCurrency === 'USD') {
        const defaultCostUSD =
          initialValues?.costUSD != null
            ? initialValues.costUSD
            : initialValues?.costARS != null
            ? Number((initialValues.costARS / rate).toFixed(2))
            : 0;
        setCostInput(defaultCostUSD);
        const defaultPriceARS =
          initialValues?.priceARS != null
            ? initialValues.priceARS
            : defaultCostUSD > 0
            ? Math.round(defaultCostUSD * rate * (1 + defaultMargin / 100))
            : 0;
        setPriceArsInput(defaultPriceARS);
      } else {
        const defaultCostARS =
          initialValues?.costARS != null
            ? initialValues.costARS
            : initialValues?.costUSD != null
            ? Math.round(initialValues.costUSD * rate)
            : 0;
        setCostInput(defaultCostARS);
        const defaultPriceARS =
          initialValues?.priceARS != null
            ? initialValues.priceARS
            : defaultCostARS > 0
            ? Math.round(defaultCostARS * (1 + defaultMargin / 100))
            : 0;
        setPriceArsInput(defaultPriceARS);
      }
      setStockQuantity(initialValues?.stockQuantity ?? 0);
      setMinWholesaleQty(initialValues?.minWholesaleQty || 1);
      setImageUrl(initialValues?.imageUrl || '');
    }
  }, [productToEdit, initialValues, isOpen, dollarRates]);

  // Manejo de Costo, Dólar Asignado, Porcentaje Puntual y Precio Final en Pesos
  const handleCostChange = (newCost: number) => {
    const safeCost = Math.max(0, newCost);
    setCostInput(safeCost);
    const factor = 1 + profitMarginInput / 100;
    const calculatedArs =
      priceCurrency === 'USD'
        ? Math.round(safeCost * activeRate * factor)
        : Math.round(safeCost * factor);
    setPriceArsInput(calculatedArs);
  };

  const handleProfitMarginChange = (newMargin: number) => {
    setProfitMarginInput(newMargin);
    const factor = 1 + newMargin / 100;
    const calculatedArs =
      priceCurrency === 'USD'
        ? Math.round(costInput * activeRate * factor)
        : Math.round(costInput * factor);
    setPriceArsInput(calculatedArs);
  };

  const handleDollarRateSelect = (newKey: DollarRateKey) => {
    setDollarRateKey(newKey);
    const rate = getRateByKey(newKey);
    if (priceCurrency === 'USD') {
      const factor = 1 + profitMarginInput / 100;
      setPriceArsInput(Math.round(costInput * rate * factor));
    }
  };

  const handlePriceArsChange = (newPriceArs: number) => {
    const safePriceArs = Math.max(0, Math.round(newPriceArs));
    setPriceArsInput(safePriceArs);
    const baseCostArs =
      priceCurrency === 'USD' ? costInput * activeRate : costInput;
    if (baseCostArs > 0) {
      const calculatedMargin = Number(
        (((safePriceArs - baseCostArs) / baseCostArs) * 100).toFixed(2)
      );
      setProfitMarginInput(calculatedMargin);
    } else {
      setProfitMarginInput(0);
    }
  };

  const handleCreateCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    const created = addCategory(trimmed);
    setCategory(created.id as Category);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleCurrencyToggle = (newCurrency: 'USD' | 'ARS') => {
    if (newCurrency === priceCurrency) return;
    setPriceCurrency(newCurrency);
    if (newCurrency === 'USD') {
      const newCostUSD = Number((costInput / activeRate).toFixed(4));
      setCostInput(newCostUSD);
      const factor = 1 + profitMarginInput / 100;
      setPriceArsInput(Math.round(newCostUSD * activeRate * factor));
    } else {
      const newCostARS = Math.round(costInput * activeRate);
      setCostInput(newCostARS);
      const factor = 1 + profitMarginInput / 100;
      setPriceArsInput(Math.round(newCostARS * factor));
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setImageUrl(dataUrl);

        if (isSupabaseConfigured()) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              setIsUploadingImage(true);
              const fileNamePrefix = name.trim() || 'foto_producto';
              const publicUrl = await uploadProductImage(blob, fileNamePrefix);
              setIsUploadingImage(false);
              if (publicUrl) {
                setImageUrl(publicUrl);
              }
            }
          }, 'image/jpeg', 0.85);
        }
      };
      img.src = uploadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericPriceArs = Math.round(Number(priceArsInput) || 0);
    if (!name.trim() || numericPriceArs <= 0) {
      alert('Por favor complete el nombre del producto y un precio válido en pesos.');
      return;
    }

    const specsArray = specsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const numericCost = Number(costInput) || 0;
    const factor = 1 + (Number(profitMarginInput) || 0) / 100;

    let finalPriceUSD = 0;
    let finalPriceARS = numericPriceArs;
    let finalCostUSD = 0;
    let finalCostARS = 0;

    if (priceCurrency === 'USD') {
      finalCostUSD = Math.max(0, Number(numericCost.toFixed(2)));
      finalCostARS = Math.round(finalCostUSD * activeRate);
      finalPriceUSD = Math.max(
        0.01,
        Number((finalCostUSD > 0 ? finalCostUSD * factor : finalPriceARS / activeRate).toFixed(2))
      );
      finalPriceARS = Math.max(1, numericPriceArs);
    } else {
      finalCostARS = Math.max(0, Math.round(numericCost));
      finalCostUSD = Number((finalCostARS / activeRate).toFixed(2));
      finalPriceARS = Math.max(1, numericPriceArs);
      finalPriceUSD = Number((finalPriceARS / activeRate).toFixed(2));
    }

    const productPayload: Omit<Product, 'id'> = {
      name: name.trim(),
      category,
      subcategory: subcategory.trim() || undefined,
      description: description.trim() || name.trim(),
      specs: specsArray.length > 0 ? specsArray : ['Garantía oficial MP Distribuciones'],
      priceUSD: finalPriceUSD,
      costUSD: finalCostUSD,
      priceARS: finalPriceARS,
      costARS: finalCostARS,
      profitMargin: Number(profitMarginInput),
      priceCurrency,
      dollarRateKey,
      inStock: stockQuantity > 0,
      stockQuantity: Number(stockQuantity),
      minWholesaleQty: Number(minWholesaleQty) || 1,
      imageUrl: imageUrl.trim() || DEFAULT_PRODUCT_IMAGE,
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    onClose();
  };

  const costArsEquivalent =
    priceCurrency === 'USD' ? Math.round(costInput * activeRate) : Math.round(costInput);
  const profitArs = Math.round(priceArsInput - costArsEquivalent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            {productToEdit ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {productToEdit ? 'Editar Artículo en Catálogo' : 'Crear Nuevo Artículo Mayorista'}
            </h3>
            <p className="text-xs text-slate-500">
              {productToEdit
                ? `Modificando: ${productToEdit.name.slice(0, 45)}...`
                : 'Completá los datos para agregarlo a la lista de precios mayorista'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Row 1: Name */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
              <span>Nombre Completo del Producto (Título Mayorista) *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: REPETIDOR DE WIFI 300 MBPS EN CAJA JG-0548"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm text-slate-900 outline-none font-semibold"
            />
          </div>

          {/* Row 2: Category and Subcategory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rubro Oficial ({categories.length} rubros) *</span>
                </label>
                {!isCreatingCategory && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingCategory(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Crear Nuevo Rubro</span>
                  </button>
                )}
              </div>

              {isCreatingCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nombre del nuevo rubro..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateCategory();
                      } else if (e.key === 'Escape') {
                        setIsCreatingCategory(false);
                        setNewCategoryName('');
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-blue-500 text-xs text-slate-900 font-bold outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCategory()}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    Crear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setNewCategoryName('');
                    }}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer shrink-0"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__CREATE_NEW__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCategory(e.target.value as Category);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none font-semibold"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="__CREATE_NEW__" className="font-bold text-blue-600 bg-blue-50">
                    ➕ + Crear Nuevo Rubro...
                  </option>
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Subcategoría / Familia (Opcional)</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Ej: Repetidores, Auriculares In Ear, Cables..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Row 3: Pricing, Cost Currency (USD/ARS), 3-Dollar Selector & Punctual Percentage */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-blue-200/60">
              <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Estructura de Costo, Dólar Asignado y Porcentaje Puntual</span>
              </div>

              {/* Selector de moneda en que se carga el costo */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-600">Cargar costo en:</span>
                <div className="flex items-center rounded-lg bg-blue-100 p-0.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleCurrencyToggle('USD')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      priceCurrency === 'USD'
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : 'text-blue-700 hover:text-blue-900'
                    }`}
                  >
                    Dólares (u$s)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyToggle('ARS')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      priceCurrency === 'ARS'
                        ? 'bg-emerald-600 text-white shadow-xs font-black'
                        : 'text-blue-700 hover:text-blue-900'
                    }`}
                  >
                    Pesos ($ ARS)
                  </button>
                </div>
              </div>
            </div>

            {/* Selector de cuál de los 3 Dólares aplicar (cuando el costo se carga en USD) */}
            {priceCurrency === 'USD' ? (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Cotización de Dólar Asignada a este Artículo (Privado Admin):</span>
                  <span className="text-[10px] text-blue-700 font-semibold">
                    El cliente solo verá el precio final en Pesos ($ ARS)
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['dolar1', 'dolar2', 'dolar3'] as DollarRateKey[]).map((key) => {
                    const cfg = dollarRates[key];
                    const isSelected = dollarRateKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDollarRateSelect(key)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-400/30'
                            : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase opacity-90 truncate">
                          {cfg.label}
                        </div>
                        <div className="text-sm font-mono font-black">
                          $ {cfg.rate.toLocaleString('es-AR')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-semibold">
                ✓ Costo cargado directamente en Pesos Argentinos ($ ARS). No varía cuando cambian las cotizaciones de dólar.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Costo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Costo Unitario ({priceCurrency}) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Base compra</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                    {priceCurrency === 'USD' ? 'u$s' : '$'}
                  </span>
                  <input
                    type="number"
                    step={priceCurrency === 'USD' ? '0.01' : '1'}
                    min="0"
                    required
                    value={costInput}
                    onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-sm font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {priceCurrency === 'USD'
                    ? `Costo en pesos: $ ${costArsEquivalent.toLocaleString('es-AR')} ARS`
                    : `Costo directo en pesos ($ ARS)`}
                </p>
              </div>

              {/* 2. Porcentaje Puntual % */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                  <span>Porcentaje Puntual % *</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Margen</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={profitMarginInput}
                    onChange={(e) => handleProfitMarginChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-3 pr-8 py-2 rounded-lg bg-emerald-50/70 border border-emerald-300 focus:border-emerald-600 text-sm font-mono font-black text-emerald-900 outline-none text-right"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-700">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">
                  Ganancia: $ {profitArs.toLocaleString('es-AR')} ARS /un.
                </p>
              </div>

              {/* 3. Precio de Venta Final en Pesos ($ ARS) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                  <span>Precio Cliente ($ ARS) *</span>
                  <span className="text-[10px] text-blue-600 font-bold">Visible en Web</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-blue-600">
                    $
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={priceArsInput}
                    onChange={(e) => handlePriceArsChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border-2 border-blue-400 focus:border-blue-600 text-sm font-mono font-black text-blue-950 outline-none shadow-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {priceCurrency === 'USD'
                    ? `Ref. Admin: u$s ${(priceArsInput / activeRate).toFixed(2)} (${dollarRates[dollarRateKey].label}: $${activeRate})`
                    : 'Precio final fijo en Pesos ($ ARS)'}
                </p>
              </div>
            </div>
          </div>

          {/* Row 4: Stock & Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700 flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>Stock Disponible (Unidades) *</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-sm font-mono font-black text-slate-900 outline-none"
              />
              <p className={`text-[10px] font-bold ${stockQuantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {stockQuantity > 0 ? '● En Stock para venta' : '○ Sin Stock (Pausado)'}
              </p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-xs text-slate-700">Mínimo Mayorista por Pedido</label>
              <input
                type="number"
                min="1"
                value={minWholesaleQty}
                onChange={(e) => setMinWholesaleQty(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-sm font-mono font-bold text-slate-800 outline-none"
              />
              <p className="text-[10px] text-slate-500">Mínimo de compra x bulto</p>
            </div>
          </div>

          {/* Row 5: Image (URL, File Upload, or Mobile Camera) */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Foto del Producto (URL, Archivo o Cámara)</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder={imageUrl.startsWith('data:') ? 'Foto cargada desde archivo/cámara' : 'Pegar enlace URL de la imagen...'}
                className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 focus:border-blue-600 text-xs text-slate-800 outline-none font-mono"
              />

              <button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Subir / Sacar Foto</span>
              </button>

              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {imageUrl && (
              <div className="flex items-center gap-3 pt-1">
                <div className="w-16 h-16 rounded-xl border border-slate-300 bg-white p-1.5 shrink-0 flex items-center justify-center overflow-hidden shadow-xs relative">
                  <img
                    src={imageUrl || DEFAULT_PRODUCT_IMAGE}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_PRODUCT_IMAGE;
                    }}
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  <p className="font-bold text-slate-700">Previsualización de la foto</p>
                  {isUploadingImage ? (
                    <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Subiendo a Supabase Storage...
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 font-semibold">
                      {imageUrl.includes('supabase.co')
                        ? '✓ Alojada en Supabase Storage (Nube)'
                        : imageUrl.startsWith('data:')
                        ? '✓ Foto optimizada localmente'
                        : '✓ Imagen vinculada por URL'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 6: Specs */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">
              Especificaciones Técnicas (una por línea):
            </label>
            <textarea
              rows={3}
              value={specsText}
              onChange={(e) => setSpecsText(e.target.value)}
              placeholder="Ej:&#10;Velocidad 300 Mbps 2.4GHz&#10;Puerto RJ45 10/100&#10;Enchufe directo 220V"
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Row 7: Description */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Descripción / Detalles para el Gremio:</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del artículo..."
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{productToEdit ? 'Guardar Cambios' : 'Publicar Producto en Catálogo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
