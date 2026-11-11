import React, { useState, useEffect, useRef } from 'react';
import { Product, Category } from '../types';
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
  Barcode,
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
  const { addProduct, updateProduct, exchangeRate, categories, addCategory } = useApp();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<Category>('NOTEBOOKS');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [specsText, setSpecsText] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'ARS'>('ARS');
  const [priceInput, setPriceInput] = useState<number>(0);
  const [costInput, setCostInput] = useState<number>(0);
  const [profitMarginInput, setProfitMarginInput] = useState<number>(15);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [minWholesaleQty, setMinWholesaleQty] = useState<number>(1);
  const [badge, setBadge] = useState<'NUEVO' | 'DESTACADO' | 'OFERTA' | 'MÁS VENDIDO' | ''>('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productToEdit) {
      setSku(productToEdit.sku);
      setName(productToEdit.name);
      setBrand(productToEdit.brand);
      setCategory(productToEdit.category);
      setSubcategory(productToEdit.subcategory || '');
      setDescription(productToEdit.description);
      setSpecsText(productToEdit.specs ? productToEdit.specs.join('\n') : '');
      setStockQuantity(productToEdit.stockQuantity);
      setMinWholesaleQty(productToEdit.minWholesaleQty || 1);
      setBadge(productToEdit.badge || '');
      setImageUrl(productToEdit.imageUrl);

      const margin = productToEdit.profitMargin != null ? productToEdit.profitMargin : 15;
      setProfitMarginInput(margin);

      if (productToEdit.priceCurrency === 'ARS') {
        setPriceCurrency('ARS');
        const priceARS = productToEdit.priceARS || Math.round(productToEdit.priceUSD * exchangeRate);
        const costARS = productToEdit.costARS != null
          ? productToEdit.costARS
          : (productToEdit.costUSD != null
              ? Math.round(productToEdit.costUSD * exchangeRate)
              : Math.round(priceARS / (1 + margin / 100)));
        setPriceInput(priceARS);
        setCostInput(costARS);
      } else {
        setPriceCurrency('USD');
        const priceUSD = productToEdit.priceUSD;
        const costUSD = productToEdit.costUSD != null
          ? productToEdit.costUSD
          : (priceUSD > 0 ? Number((priceUSD / (1 + margin / 100)).toFixed(2)) : 0);
        setPriceInput(priceUSD);
        setCostInput(costUSD);
      }
    } else {
      // Defaults for new product (support prefilled values from quick stock entry search)
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const prefillQuery = (initialValues?.name || initialValues?.sku || '').trim();
      const isSkuPattern = prefillQuery && /^[A-Z0-9\-_]{3,15}$/i.test(prefillQuery);

      setSku(initialValues?.sku || (isSkuPattern ? prefillQuery.toUpperCase() : `MP-${randomCode}`));
      setName(initialValues?.name && !isSkuPattern ? prefillQuery : (initialValues?.name || ''));
      setBrand(initialValues?.brand || '');
      setCategory((initialValues?.category as Category) || 'ACCESORIOS, ADAPTADORES Y CABLES');
      setSubcategory(initialValues?.subcategory || '');
      setDescription(initialValues?.description || '');
      setSpecsText('');
      setPriceCurrency(initialValues?.priceCurrency || 'ARS');
      setProfitMarginInput(initialValues?.profitMargin ?? 15);
      const defaultCost = initialValues?.costARS != null
        ? initialValues.costARS
        : (initialValues?.costUSD != null ? Math.round(initialValues.costUSD * exchangeRate) : 0);
      setCostInput(defaultCost);
      const defaultPrice = initialValues?.priceARS != null
        ? initialValues.priceARS
        : (initialValues?.priceUSD != null
            ? Math.round(initialValues.priceUSD * exchangeRate)
            : (defaultCost > 0 ? Math.round(defaultCost * 1.15) : 0));
      setPriceInput(defaultPrice);
      setStockQuantity(initialValues?.stockQuantity ?? 0);
      setMinWholesaleQty(initialValues?.minWholesaleQty || 1);
      setBadge(initialValues?.badge || '');
      setImageUrl(initialValues?.imageUrl || '');
    }
  }, [productToEdit, initialValues, isOpen, exchangeRate]);

  // Manejo de Costo, Margen y Precio sin bucles de estado
  const handleCostChange = (newCost: number) => {
    const safeCost = Math.max(0, newCost);
    setCostInput(safeCost);
    const factor = 1 + profitMarginInput / 100;
    const calculatedPrice = priceCurrency === 'USD'
      ? Number((safeCost * factor).toFixed(2))
      : Math.round(safeCost * factor);
    setPriceInput(calculatedPrice);
  };

  const handleProfitMarginChange = (newMargin: number) => {
    setProfitMarginInput(newMargin);
    const factor = 1 + newMargin / 100;
    const calculatedPrice = priceCurrency === 'USD'
      ? Number((costInput * factor).toFixed(2))
      : Math.round(costInput * factor);
    setPriceInput(calculatedPrice);
  };

  const handlePriceChange = (newPrice: number) => {
    const safePrice = Math.max(0, newPrice);
    setPriceInput(safePrice);
    if (costInput > 0) {
      const calculatedMargin = Number((((safePrice - costInput) / costInput) * 100).toFixed(2));
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
      const newPriceUSD = Number((priceInput / exchangeRate).toFixed(2));
      const newCostUSD = Number((costInput / exchangeRate).toFixed(2));
      setPriceInput(newPriceUSD);
      setCostInput(newCostUSD);
    } else {
      const newPriceARS = Math.round(priceInput * exchangeRate);
      const newCostARS = Math.round(costInput * exchangeRate);
      setPriceInput(newPriceARS);
      setCostInput(newCostARS);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const img = new Image();
      img.onload = () => {
        // Resize and optimize image to max 800px width/height to save quota
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

        // Si Supabase Storage está configurado, subir en segundo plano para URL pública
        if (isSupabaseConfigured()) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              setIsUploadingImage(true);
              const fileNamePrefix = sku.trim() || name.trim() || 'foto_producto';
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
    const numericPrice = Number(priceInput) || 0;
    if (!name.trim() || !sku.trim() || numericPrice <= 0) {
      alert('Por favor complete el nombre, SKU y un precio válido.');
      return;
    }

    const specsArray = specsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const numericCost = Number(costInput) || 0;

    let finalPriceUSD = 0;
    let finalPriceARS: number | undefined = undefined;
    let finalCostUSD = 0;
    let finalCostARS: number | undefined = undefined;

    if (priceCurrency === 'USD') {
      finalPriceUSD = Math.max(0.01, Number(numericPrice.toFixed(2)));
      finalPriceARS = Math.round(finalPriceUSD * exchangeRate);
      finalCostUSD = Math.max(0, Number(numericCost.toFixed(2)));
      finalCostARS = Math.round(finalCostUSD * exchangeRate);
    } else {
      finalPriceARS = Math.max(1, Math.round(numericPrice));
      finalPriceUSD = Number((finalPriceARS / exchangeRate).toFixed(2));
      finalCostARS = Math.max(0, Math.round(numericCost));
      finalCostUSD = Number((finalCostARS / exchangeRate).toFixed(2));
    }

    const productPayload = {
      sku: sku.trim(),
      name: name.trim(),
      brand: brand.trim() || 'Genérico',
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
      inStock: stockQuantity > 0,
      stockQuantity: Number(stockQuantity),
      minWholesaleQty: Number(minWholesaleQty) || 1,
      badge: badge ? (badge as any) : undefined,
      imageUrl: imageUrl.trim() || DEFAULT_PRODUCT_IMAGE,
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-5 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
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

          {/* Row 2: SKU, Brand, Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-blue-600" />
                <span>Código SKU *</span>
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="CON-REP-JG0548"
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs font-mono font-bold text-slate-800 outline-none uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Sony, Lenovo, XAEA, Genérico..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Etiqueta Especial</label>
              <select
                value={badge}
                onChange={(e) => setBadge(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none font-semibold"
              >
                <option value="">Ninguna</option>
                <option value="OFERTA">🔥 OFERTA (Sección Outlet)</option>
                <option value="MÁS VENDIDO">⭐ MÁS VENDIDO</option>
                <option value="DESTACADO">💎 DESTACADO</option>
                <option value="NUEVO">✨ NUEVO INGRESO</option>
              </select>
            </div>
          </div>

          {/* Row 3: Category and Subcategory */}
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
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2 animate-fadeIn shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-950">
                    <span>Escribí el nombre del nuevo rubro:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setNewCategoryName('');
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategory();
                        } else if (e.key === 'Escape') {
                          setIsCreatingCategory(false);
                        }
                      }}
                      placeholder="Ej: HERRAMIENTAS, ILUMINACIÓN, IMPRESIÓN 3D..."
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-white border border-blue-300 text-xs font-bold text-slate-800 outline-none uppercase placeholder:normal-case focus:border-blue-600"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateCategory()}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingCategory(true);
                    } else {
                      setCategory(e.target.value as Category);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none font-medium cursor-pointer"
                >
                  <option value="__NEW__" className="font-bold text-blue-600 bg-blue-50">
                    ➕ + Crear Nuevo Rubro...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.shortName} ({c.name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Subcategoría / Tipo</label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Ej: Repetidores, Auriculares In Ear, Cables..."
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-xs text-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Row 4: Pricing, Cost & Profit Margin Structure */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
              <div className="flex items-center gap-1.5 text-blue-950 font-bold text-xs">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Estructura de Rentabilidad (Costos y Márgenes)</span>
              </div>

              {/* Selector de moneda USD / ARS */}
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
                  USD (u$s)
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyToggle('ARS')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    priceCurrency === 'ARS'
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  ARS ($)
                </button>
              </div>
            </div>

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
                    ? `≈ $ ${Math.round(costInput * exchangeRate).toLocaleString('es-AR')} ARS`
                    : `≈ u$s ${(costInput / exchangeRate).toFixed(2)} USD`}
                </p>
              </div>

              {/* 2. Margen de Ganancia % */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                  <span>Margen Ganancia %</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Rentabilidad</span>
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
                  Ganancia: {priceCurrency === 'USD' ? `u$s ${(priceInput - costInput).toFixed(2)}` : `$ ${Math.round(priceInput - costInput).toLocaleString('es-AR')}`} /un.
                </p>
              </div>

              {/* 3. Precio de Venta Mayorista */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                  <span>Precio de Venta ({priceCurrency}) *</span>
                  <span className="text-[10px] text-blue-600 font-bold">Público B2B</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-blue-600">
                    {priceCurrency === 'USD' ? 'u$s' : '$'}
                  </span>
                  <input
                    type="number"
                    step={priceCurrency === 'USD' ? '0.01' : '1'}
                    min="0"
                    required
                    value={priceInput}
                    onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border-2 border-blue-400 focus:border-blue-600 text-sm font-mono font-black text-blue-950 outline-none shadow-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  {priceCurrency === 'USD'
                    ? `≈ $ ${Math.round(priceInput * exchangeRate).toLocaleString('es-AR')} ARS`
                    : `≈ u$s ${(priceInput / exchangeRate).toFixed(2)} USD`}
                  <span className="text-slate-400"> (T.C. ${exchangeRate})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Row 5: Stock & Mínimo */}
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

              {/* Upload or Camera Button */}
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

            {/* Live Preview */}
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
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
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
