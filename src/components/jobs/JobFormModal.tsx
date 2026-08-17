import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Fuel, Clock, Package, DollarSign, Calculator, UserPlus, AlertTriangle, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { CalloutJob, Client, StockItem, UsedStockItem, MiscExpense, BusinessSettings, JobStatus, STOCK_CATEGORIES } from '../../types';
import { calculateJobTotals, formatCurrency } from '../../lib/calculations';
import { parseFieldNotesWithAI } from '../../lib/ai';

interface JobFormModalProps {
  initialJob?: CalloutJob | null;
  clients: Client[];
  stockItems: StockItem[];
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: CalloutJob, addNewClient?: Client) => void;
  onAddNewStockItem?: (item: StockItem) => void;
}

export const JobFormModal: React.FC<JobFormModalProps> = ({
  initialJob,
  clients,
  stockItems,
  settings,
  isOpen,
  onClose,
  onSave,
  onAddNewStockItem,
}) => {
  if (!isOpen) return null;

  // Selected client or quick client creation state
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialJob?.clientId || (clients.length > 0 ? clients[0].id : 'new')
  );
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(clients.length === 0);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  // Inline new stock item state
  const [isAddingNewStock, setIsAddingNewStock] = useState<boolean>(false);
  const [newStockName, setNewStockName] = useState('');
  const [newStockSku, setNewStockSku] = useState('');
  const [newStockCategory, setNewStockCategory] = useState<string>(STOCK_CATEGORIES[0]);
  const [newStockCost, setNewStockCost] = useState<number>(100);
  const [newStockSell, setNewStockSell] = useState<number>(200);
  const [newStockQty, setNewStockQty] = useState<number>(5);
  const [newStockUnit, setNewStockUnit] = useState('pcs');

  // Job details
  const [invoiceNumber, setInvoiceNumber] = useState(
    initialJob?.invoiceNumber || `INV-2026-${settings.nextInvoiceNumber}`
  );
  const [date, setDate] = useState(
    initialJob?.date || new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<JobStatus>(initialJob?.status || 'Invoiced');
  const [jobTitle, setJobTitle] = useState(
    initialJob?.jobTitle || 'General Site Callout & Repairs'
  );
  const [workDone, setWorkDone] = useState(initialJob?.workDone || '');

  // Travel & Time
  const [kmTravelled, setKmTravelled] = useState<number>(initialJob?.kmTravelled ?? 20);
  const [fuelCostPerKm, setFuelCostPerKm] = useState<number>(
    initialJob?.fuelCostPerKm ?? settings.defaultFuelCostPerKm
  );
  const [clientFuelRatePerKm, setClientFuelRatePerKm] = useState<number>(
    initialJob?.clientFuelRatePerKm ?? settings.defaultClientFuelRatePerKm
  );

  const [hoursOnSite, setHoursOnSite] = useState<number>(initialJob?.hoursOnSite ?? 1.5);
  const [hourlyRateClient, setHourlyRateClient] = useState<number>(
    initialJob?.hourlyRateClient ?? settings.defaultHourlyRateClient
  );
  const [hourlyCostInternal, setHourlyCostInternal] = useState<number>(
    initialJob?.hourlyCostInternal ?? settings.defaultHourlyCostInternal
  );

  // Stock Used
  const [usedStockItems, setUsedStockItems] = useState<UsedStockItem[]>(
    initialJob?.stockItems || []
  );

  // Misc expenses
  const [miscExpenses, setMiscExpenses] = useState<MiscExpense[]>(
    initialJob?.miscExpenses || []
  );

  // Discount & Tax
  const [taxRate, setTaxRate] = useState<number>(
    initialJob?.taxRate ?? settings.defaultTaxRate
  );
  const [discountAmount, setDiscountAmount] = useState<number>(
    initialJob?.discountAmount ?? 0
  );

  // Inline AI parsing state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiRawInput, setAiRawInput] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);

  const handleInlineAIParse = async () => {
    if (!aiRawInput.trim()) return;
    setIsAiParsing(true);
    try {
      const res = await parseFieldNotesWithAI(aiRawInput, stockItems);
      if (res.jobTitle) setJobTitle(res.jobTitle);
      if (res.description) setWorkDone(res.description);
      if (res.laborHours) setHoursOnSite(res.laborHours);
      if (res.clientName) {
        setIsCreatingClient(true);
        setNewClientName(res.clientName);
        if (res.clientPhone) setNewClientPhone(res.clientPhone);
        if (res.clientAddress) setNewClientAddress(res.clientAddress);
      }

      if (res.items && res.items.length > 0) {
        const newUsedItems: UsedStockItem[] = res.items.map((it) => {
          const found = stockItems.find((s) => s.id === it.stockItemId || s.name.toLowerCase().includes(it.name.toLowerCase()));
          return {
            stockItemId: found?.id || `stk-ai-${Date.now()}-${Math.random()}`,
            sku: found?.sku || 'SKU-AI',
            name: it.name,
            unit: found?.unit || 'pcs',
            quantity: it.quantity,
            unitCost: found?.costPrice || Math.round(it.unitPrice * 0.6),
            unitSellPrice: it.unitPrice,
          };
        });
        setUsedStockItems((prev) => [...prev, ...newUsedItems]);
      }

      setShowAIPrompt(false);
      setAiRawInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to parse notes with AI');
    } finally {
      setIsAiParsing(false);
    }
  };

  // When client changes from dropdown
  const currentClient = clients.find((c) => c.id === selectedClientId);

  // Live total calculations
  const totals = calculateJobTotals({
    kmTravelled,
    fuelCostPerKm,
    clientFuelRatePerKm,
    hoursOnSite,
    hourlyRateClient,
    hourlyCostInternal,
    stockItems: usedStockItems,
    miscExpenses,
    taxRate,
    discountAmount,
  });

  // Handlers for stock items
  const handleAddStockItem = (stockItemId: string) => {
    const item = stockItems.find((s) => s.id === stockItemId);
    if (!item) return;

    // Check if already added
    const existingIndex = usedStockItems.findIndex((u) => u.stockItemId === stockItemId);
    if (existingIndex >= 0) {
      const updated = [...usedStockItems];
      updated[existingIndex].quantity += 1;
      setUsedStockItems(updated);
    } else {
      setUsedStockItems([
        ...usedStockItems,
        {
          stockItemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          quantity: 1,
          unitCost: item.costPrice,
          unitSellPrice: item.sellPrice,
        },
      ]);
    }
  };

  const handleUpdateStockQty = (index: number, qty: number) => {
    const updated = [...usedStockItems];
    updated[index].quantity = Math.max(1, qty);
    setUsedStockItems(updated);
  };

  const handleRemoveStockItem = (index: number) => {
    setUsedStockItems(usedStockItems.filter((_, i) => i !== index));
  };

  // Handler: Create brand new stock item on the fly and attach to invoice
  const handleCreateAndAttachNewStock = () => {
    if (!newStockName.trim()) {
      alert('Please enter a name for the new stock item.');
      return;
    }

    const generatedSku = newStockSku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const newItem: StockItem = {
      id: `stk-${Date.now()}`,
      sku: generatedSku,
      name: newStockName.trim(),
      category: newStockCategory,
      costPrice: Math.max(0, newStockCost || 0),
      sellPrice: Math.max(0, newStockSell || 0),
      quantity: Math.max(1, newStockQty || 1),
      minQuantity: 2,
      unit: newStockUnit.trim() || 'pcs',
      location: 'Van / Main Stock',
      notes: `Added during invoice #${invoiceNumber}`,
      updatedAt: new Date().toISOString(),
    };

    if (onAddNewStockItem) {
      onAddNewStockItem(newItem);
    }

    // Automatically append into used stock for this job
    setUsedStockItems((prev) => [
      ...prev,
      {
        stockItemId: newItem.id,
        sku: newItem.sku,
        name: newItem.name,
        unit: newItem.unit,
        quantity: 1,
        unitCost: newItem.costPrice,
        unitSellPrice: newItem.sellPrice,
      },
    ]);

    // Reset inline form
    setNewStockName('');
    setNewStockSku('');
    setIsAddingNewStock(false);
  };

  // Handlers for Misc expenses
  const handleAddMisc = () => {
    setMiscExpenses([
      ...miscExpenses,
      {
        id: `misc-${Date.now()}`,
        description: 'Tolls / Municipal Fee',
        costAmount: 10,
        chargeAmount: 15,
      },
    ]);
  };

  const handleUpdateMisc = (index: number, field: keyof MiscExpense, val: any) => {
    const updated = [...miscExpenses];
    updated[index] = { ...updated[index], [field]: val };
    setMiscExpenses(updated);
  };

  const handleRemoveMisc = (index: number) => {
    setMiscExpenses(miscExpenses.filter((_, i) => i !== index));
  };

  // Submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let clientName = currentClient ? currentClient.name : newClientName;
    let clientPhone = currentClient ? currentClient.phone : newClientPhone;
    let clientAddress = currentClient ? currentClient.address : newClientAddress;
    let clientId = selectedClientId;

    let newClientObj: Client | undefined;

    if (isCreatingClient || !currentClient) {
      if (!newClientName.trim()) {
        alert('Please enter a client name.');
        return;
      }
      clientId = `cli-${Date.now()}`;
      newClientObj = {
        id: clientId,
        name: newClientName,
        phone: newClientPhone,
        address: newClientAddress,
        email: '',
        createdAt: new Date().toISOString(),
      };
      clientName = newClientName;
      clientPhone = newClientPhone;
      clientAddress = newClientAddress;
    }

    const jobData: CalloutJob = {
      id: initialJob?.id || `job-${Date.now()}`,
      invoiceNumber,
      clientId,
      clientName,
      clientAddress,
      clientPhone,
      date,
      status,
      jobTitle,
      workDone,
      kmTravelled,
      fuelCostPerKm,
      clientFuelRatePerKm,
      hoursOnSite,
      hourlyRateClient,
      hourlyCostInternal,
      stockItems: usedStockItems,
      miscExpenses,
      taxRate,
      discountAmount,
      stockDeducted: initialJob?.stockDeducted || false,
      createdAt: initialJob?.createdAt || new Date().toISOString(),
      ...totals,
    };

    onSave(jobData, newClientObj);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-indigo-400" />
              <span>{initialJob ? 'Edit Callout Job' : 'Log New Callout & Invoice'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculate travel, time, stock used, invoice total, and callout profit margin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Basic Info & Client */}
          <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>1. Client & Invoice Info</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAIPrompt(!showAIPrompt)}
                className="text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold px-3 py-1 rounded-xl border border-indigo-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{showAIPrompt ? 'Close AI Auto-Fill' : '✨ AI Auto-Fill Form'}</span>
              </button>
            </div>

            {/* Inline AI Field Note Auto-Filler Panel */}
            {showAIPrompt && (
              <div className="bg-slate-900 border border-indigo-500/40 p-4 rounded-2xl space-y-2 shadow-xl">
                <label className="block text-xs font-bold text-indigo-300">
                  Paste Technician Field Notes or Voice Transcript:
                </label>
                <textarea
                  value={aiRawInput}
                  onChange={(e) => setAiRawInput(e.target.value)}
                  placeholder="e.g. Serviced aircon for Sarah Jenkins at 12 Ocean View. Replaced 2x 25A Circuit Breakers and 1L R410a Gas. Worked 2 hours on site."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAIPrompt(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInlineAIParse}
                    disabled={isAiParsing || !aiRawInput.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow border border-indigo-400/30 disabled:opacity-50"
                  >
                    {isAiParsing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Auto-Fill Form Fields</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-indigo-400 font-mono font-bold text-xs rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Job Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                  className="w-full bg-slate-900 border border-slate-800 text-indigo-400 font-semibold text-xs rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Invoiced">Invoiced (Subtracts Stock)</option>
                  <option value="Paid">Paid (Subtracts Stock)</option>
                  <option value="Draft">Draft (Quote / Working)</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Client selector or add client */}
            <div className="pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-300 font-bold">Select Client</label>
                <button
                  type="button"
                  onClick={() => setIsCreatingClient(!isCreatingClient)}
                  className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isCreatingClient ? 'Choose Existing' : '+ New Client'}</span>
                </button>
              </div>

              {!isCreatingClient ? (
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} - {c.address}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <input
                    type="text"
                    placeholder="Client Name *"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Site / Business Address"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Job title & description */}
            <div className="grid grid-cols-1 gap-2 pt-2">
              <input
                type="text"
                placeholder="Job Title (e.g., Emergency Gate Motor & Cable Repair)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs font-semibold text-white rounded-2xl p-3 focus:border-indigo-500 focus:outline-none"
                required
              />
              <textarea
                placeholder="Work done description / site notes..."
                value={workDone}
                onChange={(e) => setWorkDone(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-2xl p-3 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Travelling (Fuel Cost & Charge) & Time on Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Travel metrics */}
            <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-indigo-400" />
                <span>2. Travel & Fuel Cost</span>
              </h3>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Kilometers Travelled (round trip)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={kmTravelled}
                    onChange={(e) => setKmTravelled(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs rounded-2xl p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Billed Rate / km
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={clientFuelRatePerKm}
                      onChange={(e) => setClientFuelRatePerKm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs rounded-2xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Internal Cost / km
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={fuelCostPerKm}
                      onChange={(e) => setFuelCostPerKm(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-rose-400 font-mono text-xs rounded-2xl p-2.5"
                    />
                  </div>
                </div>

                <div className="text-xs bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Travel Charge:</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(kmTravelled * clientFuelRatePerKm, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            {/* Time on site */}
            <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>3. Time on Site (Labor)</span>
              </h3>

              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                    Hours on Site
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={hoursOnSite}
                    onChange={(e) => setHoursOnSite(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs rounded-2xl p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Client Hourly Rate
                    </label>
                    <input
                      type="number"
                      value={hourlyRateClient}
                      onChange={(e) => setHourlyRateClient(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs rounded-2xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-1">
                      Tech Wage / Cost / hr
                    </label>
                    <input
                      type="number"
                      value={hourlyCostInternal}
                      onChange={(e) => setHourlyCostInternal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 text-rose-400 font-mono text-xs rounded-2xl p-2.5"
                    />
                  </div>
                </div>

                <div className="text-xs bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Labor Charge:</span>
                  <span className="font-bold text-white font-mono">
                    {formatCurrency(hoursOnSite * hourlyRateClient, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Stock Used (Auto subtracted when invoiced) */}
          <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                <span>4. Business Stock Used</span>
              </h3>
              <span className="text-[10px] text-slate-400 italic font-medium">
                Will auto-subtract upon invoicing
              </span>
            </div>

            {/* Quick stock selector dropdown & Create stock item button */}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddStockItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-2xl p-3 focus:outline-none focus:border-indigo-500"
              >
                <option value="">+ Select existing stock item from catalog...</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - {item.quantity} in stock -{' '}
                    {formatCurrency(item.sellPrice, settings.currencySymbol)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsAddingNewStock(!isAddingNewStock)}
                className="px-3.5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs rounded-2xl border border-indigo-500/30 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>{isAddingNewStock ? 'Cancel New Stock' : '+ Create New Stock Item'}</span>
              </button>
            </div>

            {/* Inline New Stock Item Creation Card */}
            {isAddingNewStock && (
              <div className="bg-slate-900 border border-indigo-500/40 p-4 rounded-2xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-400" />
                    <span>Quick Add New Part to Inventory & Invoice</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewStock(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Item / Part Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Copper Pipe 1/2 inch 5m"
                      value={newStockName}
                      onChange={(e) => setNewStockName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-bold p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                        Part SKU / Code
                      </label>
                      <input
                        type="text"
                        placeholder="Auto SKU"
                        value={newStockSku}
                        onChange={(e) => setNewStockSku(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-indigo-400 font-mono font-bold p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                        Category
                      </label>
                      <select
                        value={newStockCategory}
                        onChange={(e) => setNewStockCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 text-white p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                      >
                        {STOCK_CATEGORIES.map((cat, idx) => (
                          <option key={cat} value={cat}>
                            {idx + 1}. {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Cost Price ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newStockCost}
                      onChange={(e) => setNewStockCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-mono font-bold p-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Client Sell ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newStockSell}
                      onChange={(e) => setNewStockSell(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono font-bold p-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Qty Stocked
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newStockQty}
                      onChange={(e) => setNewStockQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 text-white font-mono p-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">
                      Unit
                    </label>
                    <input
                      type="text"
                      placeholder="pcs, m, set"
                      value={newStockUnit}
                      onChange={(e) => setNewStockUnit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white p-2 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewStock(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAndAttachNewStock}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow border border-indigo-400/30 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Stock & Attach to Invoice</span>
                  </button>
                </div>
              </div>
            )}

            {/* Used stock table */}
            {usedStockItems.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center border border-dashed border-slate-800 rounded-2xl">
                No stock items added yet. Select items above.
              </p>
            ) : (
              <div className="space-y-2">
                {usedStockItems.map((item, idx) => {
                  const availableStock = stockItems.find((s) => s.id === item.stockItemId)?.quantity ?? 0;
                  const isInsufficient = item.quantity > availableStock;

                  return (
                    <div
                      key={item.stockItemId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-white">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.sku} | In Stock: {availableStock} {item.unit}
                        </div>
                        {isInsufficient && (
                          <span className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold mt-0.5">
                            <AlertTriangle className="w-3 h-3" /> Exceeds current stock!
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[10px] font-bold uppercase">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateStockQty(idx, parseInt(e.target.value) || 1)
                            }
                            className="w-14 bg-slate-950 border border-slate-800 text-indigo-400 font-bold p-1 rounded-xl text-center"
                          />
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-emerald-400 font-bold">
                            {formatCurrency(
                              item.quantity * item.unitSellPrice,
                              settings.currencySymbol
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Cost: {formatCurrency(item.quantity * item.unitCost, settings.currencySymbol)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStockItem(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
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

          {/* Section 4: Miscellaneous Expenses */}
          <div className="bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                <span>5. Misc Expenses & Permits</span>
              </h3>
              <button
                type="button"
                onClick={handleAddMisc}
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Expense
              </button>
            </div>

            {miscExpenses.map((m, idx) => (
              <div
                key={m.id}
                className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 items-center text-xs"
              >
                <input
                  type="text"
                  value={m.description}
                  onChange={(e) => handleUpdateMisc(idx, 'description', e.target.value)}
                  placeholder="Expense description"
                  className="sm:col-span-2 bg-slate-950 border border-slate-800 text-white p-2 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
                <div>
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Cost to Us</span>
                  <input
                    type="number"
                    value={m.costAmount}
                    onChange={(e) =>
                      handleUpdateMisc(idx, 'costAmount', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-950 border border-slate-800 text-rose-400 font-mono p-1.5 rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Billed to Client</span>
                    <input
                      type="number"
                      value={m.chargeAmount}
                      onChange={(e) =>
                        handleUpdateMisc(idx, 'chargeAmount', parseFloat(e.target.value) || 0)
                      }
                      className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-mono p-1.5 rounded-xl"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMisc(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1 mt-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Section 5: Tax & Discount */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-5 rounded-3xl border border-slate-800/80">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Tax / VAT Rate (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 text-white font-mono text-xs rounded-2xl p-2.5"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                Discount Amount ({settings.currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-xs rounded-2xl p-2.5"
              />
            </div>
          </div>

          {/* LIVE SUMMARY CARDS: Invoice Price & Net Profit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-5 rounded-3xl border border-indigo-500/30 shadow-xl">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Subtotal</span>
              <span className="text-sm font-bold text-slate-200 block mt-1 font-mono">
                {formatCurrency(totals.subtotal, settings.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Client Total</span>
              <span className="text-base font-black text-white block mt-1 font-mono">
                {formatCurrency(totals.totalInvoicePrice, settings.currencySymbol)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-400/90 block font-bold uppercase tracking-wider">Job Cost</span>
              <span className="text-sm font-bold text-rose-400 block mt-1 font-mono">
                {formatCurrency(totals.totalCalloutCost, settings.currencySymbol)}
              </span>
            </div>
            <div className="bg-indigo-600 p-3 rounded-2xl text-right text-white shadow-lg shadow-indigo-900/30">
              <span className="text-[10px] text-indigo-200 block font-bold tracking-widest uppercase">NET PROFIT</span>
              <span className="text-lg font-black text-white block mt-0.5 font-mono">
                {formatCurrency(totals.netProfit, settings.currencySymbol)}
              </span>
              <span className="text-[10px] text-indigo-100 block font-semibold">
                {totals.profitMarginPercent.toFixed(1)}% margin
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-900/40 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
            >
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              <span>Save Callout & Calculate Invoice</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
