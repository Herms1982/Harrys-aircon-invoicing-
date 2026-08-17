import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Check,
  AlertCircle,
  Package,
  Boxes,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
  HelpCircle,
  FileText,
  Building2,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  CheckCircle2,
  Trash2,
  Eye,
  Sliders,
  DollarSign,
} from 'lucide-react';
import { StockItem, BusinessSettings, STOCK_CATEGORIES } from '../../types';
import { ScannedInvoiceItem, ScannedInvoiceResult, scanPurchaseInvoiceWithAI } from '../../lib/ai';
import { findBestCatalogMatch, saveSupplierAliasMapping } from '../../lib/stockMatching';
import { formatCurrency } from '../../lib/calculations';
import confetti from 'canvas-confetti';

interface StockPurchaseScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: StockItem[];
  settings: BusinessSettings;
  onApplyStockPurchase: (
    results: {
      supplierName: string;
      invoiceNumber: string;
      invoiceDate: string;
      itemsToUpdate: Array<{
        stockItemId: string;
        addQty: number;
        newCostPrice?: number;
        newSellPrice?: number;
      }>;
      itemsToCreate: Array<Omit<StockItem, 'id' | 'updatedAt'>>;
    }
  ) => void;
}

// Preset samples for quick testing
const SAMPLE_PRESETS = [
  {
    id: 'voltex',
    title: 'Voltex Electrical Wholesaler',
    subtitle: 'MCBs, Earth Leakage, Cables, Flush DB',
    supplier: 'Voltex Electrical',
    invNum: 'VTX-2026-8891',
    date: new Date().toISOString().split('T')[0],
    data: [
      {
        rawDescription: '16A 1P MCB 3KA CURVE C',
        supplierSku: 'CB1-16',
        quantity: 10,
        unitCost: 55.0,
        totalCost: 550.0,
        suggestedName: '16A Single Pole Circuit Breaker (C-Curve 3kA)',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 75.0,
      },
      {
        rawDescription: '20A 1P MCB 3KA CURVE C',
        supplierSku: 'CB1-20',
        quantity: 10,
        unitCost: 55.0,
        totalCost: 550.0,
        suggestedName: '20A Single Pole Circuit Breaker (C-Curve 3kA)',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 75.0,
      },
      {
        rawDescription: '63A 2P 30MA EARTH LEAKAGE RCCB',
        supplierSku: 'EL63-2P',
        quantity: 3,
        unitCost: 380.0,
        totalCost: 1140.0,
        suggestedName: '63A Double Pole Earth Leakage (30mA)',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 520.0,
      },
      {
        rawDescription: '2.5MM TW+E CAB 100M BLK',
        supplierSku: 'CAB-2.5-100',
        quantity: 2,
        unitCost: 950.0,
        totalCost: 1900.0,
        suggestedName: '2.5mm² Flat Twin & Earth Cable (100m Roll)',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'roll',
        suggestedSellPrice: 1350.0,
      },
      {
        rawDescription: '12WAY FLUSH DB WHITE METAL DOOR',
        supplierSku: 'DB12F-W',
        quantity: 2,
        unitCost: 290.0,
        totalCost: 580.0,
        suggestedName: '12-Way Flush Mount Distribution Board',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 420.0,
      },
    ],
  },
  {
    id: 'acdc',
    title: 'ACDC Dynamics HVAC & Aircon',
    subtitle: 'Dual Capacitors, Contactors, R410A, Isolators',
    supplier: 'ACDC Dynamics',
    invNum: 'ACDC-44091',
    date: new Date().toISOString().split('T')[0],
    data: [
      {
        rawDescription: 'CAP DUAL RUN 45/5UF 440V ROUND',
        supplierSku: 'CAP-45-5',
        quantity: 6,
        unitCost: 95.0,
        totalCost: 570.0,
        suggestedName: 'Dual Run Capacitor 45/5 uF 440V',
        suggestedCategory: 'Air Conditioning',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 145.0,
      },
      {
        rawDescription: 'CONTACTOR 25A 230V 1P+N AC',
        supplierSku: 'CONT-25-1P',
        quantity: 4,
        unitCost: 140.0,
        totalCost: 560.0,
        suggestedName: 'AC Contactor 25A 2-Pole 230V',
        suggestedCategory: 'Air Conditioning',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 210.0,
      },
      {
        rawDescription: 'R410A REFRIGERANT 11.3KG CYL',
        supplierSku: 'GAS-R410A-11',
        quantity: 1,
        unitCost: 1650.0,
        totalCost: 1650.0,
        suggestedName: 'Refrigerant R410A 11.3kg Cylinder',
        suggestedCategory: 'Air Conditioning',
        suggestedUnit: 'cylinder',
        suggestedSellPrice: 2450.0,
      },
      {
        rawDescription: 'ISOLATOR 32A 3P IP65 ROTARY WP',
        supplierSku: 'ISO-32-3P',
        quantity: 5,
        unitCost: 120.0,
        totalCost: 600.0,
        suggestedName: '32A Triple Pole Weatherproof Isolator IP65',
        suggestedCategory: 'Electrical',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 180.0,
      },
    ],
  },
  {
    id: 'solar',
    title: 'Solar & Renewable Wholesaler',
    subtitle: 'MC4 Connectors, 6mm Solar Cable, DC Isolators',
    supplier: 'SunPower Wholesale SA',
    invNum: 'SP-99201',
    date: new Date().toISOString().split('T')[0],
    data: [
      {
        rawDescription: 'SOLAR MC4 CONN M/F PAIR 1000V',
        supplierSku: 'MC4-PAIR',
        quantity: 20,
        unitCost: 18.0,
        totalCost: 360.0,
        suggestedName: 'MC4 Solar Connectors Male/Female Set',
        suggestedCategory: 'Solar',
        suggestedUnit: 'set',
        suggestedSellPrice: 32.0,
      },
      {
        rawDescription: '6MM2 SOLAR DC CABLE RED 100M',
        supplierSku: 'SOL-CAB-6R',
        quantity: 1,
        unitCost: 1450.0,
        totalCost: 1450.0,
        suggestedName: '6mm² Solar DC PV Cable (Red 100m Roll)',
        suggestedCategory: 'Solar',
        suggestedUnit: 'roll',
        suggestedSellPrice: 1980.0,
      },
      {
        rawDescription: '32A 2P 1000V DC MINI BREAKER',
        supplierSku: 'DC-MCB-32',
        quantity: 4,
        unitCost: 165.0,
        totalCost: 660.0,
        suggestedName: '32A 2-Pole 1000V DC Photovoltaic Circuit Breaker',
        suggestedCategory: 'Solar',
        suggestedUnit: 'pcs',
        suggestedSellPrice: 245.0,
      },
    ],
  },
];

export const StockPurchaseScannerModal: React.FC<StockPurchaseScannerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  settings,
  onApplyStockPurchase,
}) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scanned invoice structured data
  const [supplierName, setSupplierName] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>('');
  const [items, setItems] = useState<ScannedInvoiceItem[]>([]);

  // Batch markup override
  const [globalMarkupPercent, setGlobalMarkupPercent] = useState<number>(35);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle file select (from drag & drop, file picker, or camera)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
  };

  const processFile = (file: File) => {
    setErrorMessage(null);
    setMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Perform AI Scan
  const handleStartScan = async () => {
    if (!selectedImage) {
      setErrorMessage('Please select or capture a supplier invoice image first.');
      return;
    }

    setIsProcessing(true);
    setStep('scanning');
    setErrorMessage(null);

    try {
      const result = await scanPurchaseInvoiceWithAI(selectedImage, mimeType, catalog);

      // Enhance with client-side fallback/alias matching if needed
      const enhancedItems: ScannedInvoiceItem[] = result.items.map((item) => {
        // If AI didn't find a match or had low confidence, test our localized fuzzy matcher
        if (!item.matchedStockId || item.matchConfidence === 'NONE' || item.matchConfidence === 'LOW') {
          const localMatch = findBestCatalogMatch(
            result.supplierName,
            item.rawDescription,
            item.supplierSku,
            catalog
          );

          if (localMatch.item && (localMatch.confidence === 'EXACT' || localMatch.confidence === 'HIGH')) {
            return {
              ...item,
              matchedStockId: localMatch.item.id,
              matchConfidence: localMatch.confidence,
              matchReason: localMatch.reason,
              selectedAction: 'RESTOCK_EXISTING',
              chosenStockId: localMatch.item.id,
              customName: localMatch.item.name,
              customCategory: localMatch.item.category,
              customUnit: localMatch.item.unit,
              customSellPrice: localMatch.item.sellPrice,
            };
          }
        }
        return item;
      });

      setSupplierName(result.supplierName || 'Wholesale Supplier');
      setInvoiceNumber(result.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`);
      setInvoiceDate(result.invoiceDate || new Date().toISOString().split('T')[0]);
      setItems(enhancedItems);
      setStep('review');
    } catch (err: any) {
      console.error('Invoice scan failed:', err);
      setErrorMessage(err.message || 'Failed to scan invoice. Please verify your connection or try again.');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load a preset sample directly
  const handleLoadPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setSupplierName(preset.supplier);
    setInvoiceNumber(preset.invNum);
    setInvoiceDate(preset.date);

    // Map preset items against current catalog
    const mappedItems: ScannedInvoiceItem[] = preset.data.map((p) => {
      const match = findBestCatalogMatch(preset.supplier, p.rawDescription, p.supplierSku, catalog);
      const matched = match.item;

      return {
        rawDescription: p.rawDescription,
        supplierSku: p.supplierSku,
        quantity: p.quantity,
        unitCost: p.unitCost,
        totalCost: p.totalCost,
        suggestedName: p.suggestedName,
        suggestedCategory: p.suggestedCategory,
        suggestedUnit: p.suggestedUnit,
        suggestedSellPrice: p.suggestedSellPrice,
        matchedStockId: matched ? matched.id : null,
        matchConfidence: match.confidence,
        matchReason: match.reason,
        selectedAction: matched ? 'RESTOCK_EXISTING' : 'CREATE_NEW',
        chosenStockId: matched ? matched.id : '',
        customName: matched ? matched.name : p.suggestedName,
        customQty: p.quantity,
        customCostPrice: p.unitCost,
        customSellPrice: matched ? matched.sellPrice : p.suggestedSellPrice,
        customCategory: matched ? matched.category : p.suggestedCategory,
        customUnit: matched ? matched.unit : p.suggestedUnit,
        updateCatalogCostPrice: true,
        rememberMapping: true,
      };
    });

    setItems(mappedItems);
    setStep('review');
  };

  // Item action change
  const handleActionChange = (index: number, action: 'RESTOCK_EXISTING' | 'CREATE_NEW' | 'IGNORE') => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        let chosenId = item.chosenStockId;
        let cName = item.customName;
        let cCategory = item.customCategory;
        let cUnit = item.customUnit;
        let cSell = item.customSellPrice;

        if (action === 'RESTOCK_EXISTING') {
          // If no item currently picked, pick best or first
          if (!chosenId) {
            const first = catalog[0];
            if (first) {
              chosenId = first.id;
              cName = first.name;
              cCategory = first.category;
              cUnit = first.unit;
              cSell = first.sellPrice;
            }
          } else {
            const current = catalog.find((c) => c.id === chosenId);
            if (current) {
              cName = current.name;
              cCategory = current.category;
              cUnit = current.unit;
              cSell = current.sellPrice;
            }
          }
        } else if (action === 'CREATE_NEW') {
          cName = item.suggestedName || item.rawDescription;
          cCategory = item.suggestedCategory || 'Electrical';
          cUnit = item.suggestedUnit || 'pcs';
          cSell = Math.round(item.customCostPrice * (1 + globalMarkupPercent / 100));
        }

        return {
          ...item,
          selectedAction: action,
          chosenStockId: chosenId,
          customName: cName,
          customCategory: cCategory,
          customUnit: cUnit,
          customSellPrice: cSell,
        };
      })
    );
  };

  // Chosen stock item change
  const handleSelectCatalogItem = (index: number, stockId: string) => {
    const selectedCatalogItem = catalog.find((c) => c.id === stockId);
    if (!selectedCatalogItem) return;

    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return {
          ...item,
          chosenStockId: stockId,
          customName: selectedCatalogItem.name,
          customCategory: selectedCatalogItem.category,
          customUnit: selectedCatalogItem.unit,
          customSellPrice: selectedCatalogItem.sellPrice,
          matchConfidence: 'HIGH',
          matchReason: `Manually mapped to ${selectedCatalogItem.name}`,
        };
      })
    );
  };

  // Update item field
  const handleUpdateItemField = (index: number, field: keyof ScannedInvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        const updated = { ...item, [field]: value };

        // Recalculate sell price if cost changed and creating new
        if (field === 'customCostPrice' && item.selectedAction === 'CREATE_NEW') {
          updated.customSellPrice = Math.round(Number(value) * (1 + globalMarkupPercent / 100));
        }

        return updated;
      })
    );
  };

  // Apply markup globally to new items
  const handleApplyGlobalMarkup = (newMarkup: number) => {
    setGlobalMarkupPercent(newMarkup);
    setItems((prev) =>
      prev.map((item) => {
        if (item.selectedAction === 'CREATE_NEW') {
          return {
            ...item,
            customSellPrice: Math.round(item.customCostPrice * (1 + newMarkup / 100)),
          };
        }
        return item;
      })
    );
  };

  // Confirm and Apply Stock Purchases
  const handleConfirmAndApply = () => {
    const itemsToUpdate: Array<{
      stockItemId: string;
      addQty: number;
      newCostPrice?: number;
      newSellPrice?: number;
    }> = [];

    const itemsToCreate: Array<Omit<StockItem, 'id' | 'updatedAt'>> = [];

    items.forEach((item) => {
      if (item.selectedAction === 'IGNORE') return;

      if (item.selectedAction === 'RESTOCK_EXISTING' && item.chosenStockId) {
        itemsToUpdate.push({
          stockItemId: item.chosenStockId,
          addQty: item.customQty,
          newCostPrice: item.updateCatalogCostPrice ? item.customCostPrice : undefined,
          newSellPrice: item.customSellPrice,
        });

        // Save alias mapping memory if requested
        if (item.rememberMapping && supplierName) {
          saveSupplierAliasMapping(
            supplierName,
            item.rawDescription,
            item.supplierSku,
            item.chosenStockId
          );
        }
      } else if (item.selectedAction === 'CREATE_NEW') {
        const newSku =
          item.supplierSku ||
          `SKU-${item.customCategory.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        itemsToCreate.push({
          sku: newSku,
          name: item.customName,
          category: item.customCategory || 'Electrical',
          costPrice: item.customCostPrice,
          sellPrice: item.customSellPrice || Math.round(item.customCostPrice * 1.35),
          quantity: item.customQty,
          minQuantity: 2,
          unit: item.customUnit || 'pcs',
          notes: `Auto-imported from supplier ${supplierName} (Inv #${invoiceNumber}) on ${invoiceDate}`,
        });
      }
    });

    if (itemsToUpdate.length === 0 && itemsToCreate.length === 0) {
      alert('No items selected for stock ingestion. Please select at least one item to restock or create.');
      return;
    }

    // Call parent handler
    onApplyStockPurchase({
      supplierName: supplierName || 'Supplier',
      invoiceNumber: invoiceNumber || 'INV-001',
      invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
      itemsToUpdate,
      itemsToCreate,
    });

    // Trigger confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    onClose();
  };

  // Summaries
  const restockCount = items.filter((i) => i.selectedAction === 'RESTOCK_EXISTING').length;
  const createCount = items.filter((i) => i.selectedAction === 'CREATE_NEW').length;
  const ignoreCount = items.filter((i) => i.selectedAction === 'IGNORE').length;
  const totalCostValue = items
    .filter((i) => i.selectedAction !== 'IGNORE')
    .reduce((sum, i) => sum + i.customQty * i.customCostPrice, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Scan Supplier Purchase Invoice
                </h2>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                  AI Auto-Restock
                </span>
              </div>
              <p className="text-xs text-slate-400">
                OCR & intelligent name normalization for Voltex, ACDC, Plumblink, Builders, etc.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: Upload or Capture Invoice */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop / Capture Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  selectedImage
                    ? 'border-amber-500/60 bg-amber-500/5'
                    : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/40 hover:bg-slate-900/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedImage ? (
                  <div className="space-y-3 w-full max-w-sm">
                    <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 max-h-56 bg-slate-950 flex items-center justify-center">
                      <img
                        src={selectedImage}
                        alt="Invoice Preview"
                        className="w-full h-auto object-contain max-h-56"
                      />
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-amber-400 text-[10px] font-bold px-2 py-1 rounded-md border border-amber-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Image Loaded
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Click or tap to choose a different photo</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Upload className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        Upload or Capture Supplier Tax Invoice / Cash Slip
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        Drag & drop your slip here, browse your photos, or use your phone camera to scan physical paper.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/20"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer border border-slate-700"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Browse Files</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Action button if image is selected */}
              {selectedImage && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Clear Image
                  </button>
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Process Invoice with AI</span>
                  </button>
                </div>
              )}

              {/* Quick Preset Demonstrations */}
              <div className="border-t border-slate-800/80 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Quick Test with Real Wholesaler Slips</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Click any preset to test instantly</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SAMPLE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset)}
                      className="p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 hover:border-amber-500/40 text-left transition-all group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                            {preset.title}
                          </span>
                          <Building2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{preset.subtitle}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>{preset.data.length} items</span>
                        <span className="text-amber-400/90 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          Load Slip <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Scanning & Normalizing in Progress */}
          {step === 'scanning' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                  <Sparkles className="w-10 h-10 animate-spin text-amber-400" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-white">
                  Reading Invoice & Normalizing Names...
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extracting line items, reconciling supplier abbreviations (e.g. 1P MCB, CAP 45/5), and cross-referencing against your {catalog.length} stock catalog items.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Extracting with Gemini AI Vision...</span>
              </div>
            </div>
          )}

          {/* STEP 3: Review, Reconcile, and Ingest Stock */}
          {step === 'review' && (
            <div className="space-y-5">
              {/* Supplier Metadata Banner */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Supplier / Wholesaler
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. Voltex, ACDC Dynamics"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-semibold focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Invoice / Slip Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-88910"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Default New Item Markup
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={globalMarkupPercent}
                      onChange={(e) => handleApplyGlobalMarkup(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:border-amber-400 outline-none"
                    />
                    <span className="text-slate-400 text-xs font-bold">% markup</span>
                  </div>
                </div>
              </div>

              {/* Stats & Mapping Overview */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold">
                    🔄 Restock: {restockCount}
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
                    ✨ Add New: {createCount}
                  </span>
                  {ignoreCount > 0 && (
                    <span className="bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full">
                      🚫 Ignored: {ignoreCount}
                    </span>
                  )}
                </div>

                <div className="text-right font-mono">
                  <span className="text-slate-400 text-[11px]">Total Stock Ingestion Value: </span>
                  <strong className="text-amber-400 text-sm font-bold">
                    {formatCurrency(totalCostValue, settings.currencySymbol)}
                  </strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const matchedCatalogItem = catalog.find((c) => c.id === item.chosenStockId);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.selectedAction === 'IGNORE'
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                          : item.selectedAction === 'RESTOCK_EXISTING'
                          ? 'bg-slate-900 border-emerald-500/30 shadow-xs'
                          : 'bg-slate-900 border-blue-500/30 shadow-xs'
                      }`}
                    >
                      {/* Top Bar: Raw Description + Confidence Badge + Action Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white">
                              {item.rawDescription}
                            </span>
                            {item.supplierSku && (
                              <span className="bg-slate-800 text-slate-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-700">
                                Code: {item.supplierSku}
                              </span>
                            )}

                            {/* Confidence Tag */}
                            {item.matchConfidence === 'EXACT' && (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Exact Match
                              </span>
                            )}
                            {item.matchConfidence === 'HIGH' && (
                              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                🟢 High Match
                              </span>
                            )}
                            {item.matchConfidence === 'MEDIUM' && (
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                🟡 Similarity Match
                              </span>
                            )}
                            {item.matchConfidence === 'NONE' && (
                              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
                                🔵 New Item
                              </span>
                            )}
                          </div>

                          {item.matchReason && (
                            <p className="text-[10px] text-slate-400 mt-0.5 italic">
                              {item.matchReason}
                            </p>
                          )}
                        </div>

                        {/* Action Pill Selector */}
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleActionChange(idx, 'RESTOCK_EXISTING')}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              item.selectedAction === 'RESTOCK_EXISTING'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Restock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionChange(idx, 'CREATE_NEW')}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              item.selectedAction === 'CREATE_NEW'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            New Item
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActionChange(idx, 'IGNORE')}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              item.selectedAction === 'IGNORE'
                                ? 'bg-slate-700 text-slate-300'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            Ignore
                          </button>
                        </div>
                      </div>

                      {/* Middle: Mapping Details & Form Inputs */}
                      {item.selectedAction !== 'IGNORE' && (
                        <div className="pt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs items-center">
                          {/* Stock Catalog Selection / Name */}
                          <div className="sm:col-span-5">
                            {item.selectedAction === 'RESTOCK_EXISTING' ? (
                              <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                  Matches Inventory Item:
                                </label>
                                <select
                                  value={item.chosenStockId}
                                  onChange={(e) => handleSelectCatalogItem(idx, e.target.value)}
                                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:border-emerald-400 outline-none"
                                >
                                  {catalog.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name} ({c.quantity} {c.unit} in stock - {formatCurrency(c.costPrice, settings.currencySymbol)})
                                    </option>
                                  ))}
                                </select>
                                {matchedCatalogItem && (
                                  <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                                    Current Stock: {matchedCatalogItem.quantity} {matchedCatalogItem.unit} → Will become{' '}
                                    <strong className="text-white">
                                      {matchedCatalogItem.quantity + item.customQty} {matchedCatalogItem.unit}
                                    </strong>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">
                                  Standardized Item Name (for Clients):
                                </label>
                                <input
                                  type="text"
                                  value={item.customName}
                                  onChange={(e) => handleUpdateItemField(idx, 'customName', e.target.value)}
                                  className="w-full bg-slate-950 border border-blue-500/40 rounded-xl px-2.5 py-1.5 text-xs text-white font-medium focus:border-blue-400 outline-none"
                                />
                                <div className="flex items-center gap-2 mt-1">
                                  <select
                                    value={item.customCategory}
                                    onChange={(e) => handleUpdateItemField(idx, 'customCategory', e.target.value)}
                                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-200 focus:border-blue-400 outline-none"
                                  >
                                    {STOCK_CATEGORIES.map((cat, catIdx) => (
                                      <option key={cat} value={cat}>
                                        {catIdx + 1}. {cat}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    value={item.customUnit}
                                    onChange={(e) => handleUpdateItemField(idx, 'customUnit', e.target.value)}
                                    placeholder="Unit (pcs)"
                                    className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-[11px] text-slate-300"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Qty Purchased
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={item.customQty}
                              onChange={(e) => handleUpdateItemField(idx, 'customQty', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono font-bold focus:border-amber-400 outline-none text-center"
                            />
                          </div>

                          {/* Unit Cost Price */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Unit Cost Price ({settings.currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.customCostPrice}
                              onChange={(e) => handleUpdateItemField(idx, 'customCostPrice', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:border-amber-400 outline-none text-right"
                            />
                          </div>

                          {/* Selling Price */}
                          <div className="sm:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                              Client Sell Price ({settings.currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.customSellPrice}
                              onChange={(e) => handleUpdateItemField(idx, 'customSellPrice', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-400 outline-none text-right"
                            />
                          </div>

                          {/* Options Checkboxes */}
                          <div className="sm:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                            {item.selectedAction === 'RESTOCK_EXISTING' && (
                              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={item.updateCatalogCostPrice}
                                  onChange={(e) =>
                                    handleUpdateItemField(idx, 'updateCatalogCostPrice', e.target.checked)
                                  }
                                  className="rounded accent-amber-500"
                                />
                                <span>Update catalog unit cost price to new invoice price ({formatCurrency(item.customCostPrice, settings.currencySymbol)})</span>
                              </label>
                            )}

                            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 ml-auto">
                              <input
                                type="checkbox"
                                checked={item.rememberMapping}
                                onChange={(e) =>
                                  handleUpdateItemField(idx, 'rememberMapping', e.target.checked)
                                }
                                className="rounded accent-emerald-500"
                              />
                              <span>Remember this name alias for {supplierName || 'this supplier'}</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          {step === 'review' && (
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="text-xs text-slate-400 hover:text-white font-bold transition-colors cursor-pointer w-full sm:w-auto"
            >
              ← Rescan or Choose Another Slip
            </button>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step === 'review' && (
              <button
                type="button"
                onClick={handleConfirmAndApply}
                className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black px-6 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  Apply Purchases ({restockCount + createCount} items)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
