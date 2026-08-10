import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { JobList } from './components/jobs/JobList';
import { JobFormModal } from './components/jobs/JobFormModal';
import { InvoiceViewModal } from './components/jobs/InvoiceViewModal';
import { InventoryList } from './components/inventory/InventoryList';
import { StockFormModal } from './components/inventory/StockFormModal';
import { StockLogModal } from './components/inventory/StockLogModal';
import { ClientList } from './components/clients/ClientList';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { AppUpdateModal } from './components/settings/AppUpdateModal';
import { AICopilotModal } from './components/ai/AICopilotModal';
import { AIParsedNoteResult } from './lib/ai';

import {
  getStoredStock,
  saveStoredStock,
  getStoredClients,
  saveStoredClients,
  getStoredCallouts,
  saveStoredCallouts,
  getStoredSettings,
  saveStoredSettings,
  getStoredLogs,
  saveStoredLogs,
  clearAllDemoData,
  resetAllData,
  handleStockForJobStatusChange,
} from './lib/storage';

import { StockItem, Client, CalloutJob, BusinessSettings, StockLog, JobStatus } from './types';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('jobs');
  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState<boolean>(true);

  // Core domain states
  const [stock, setStock] = useState<StockItem[]>(() => getStoredStock());
  const [clients, setClients] = useState<Client[]>(() => getStoredClients());
  const [callouts, setCallouts] = useState<CalloutJob[]>(() => getStoredCallouts());
  const [settings, setSettings] = useState<BusinessSettings>(() => getStoredSettings());
  const [logs, setLogs] = useState<StockLog[]>(() => getStoredLogs());

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<CalloutJob | null>(null);

  const [viewingInvoiceJob, setViewingInvoiceJob] = useState<CalloutJob | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null);

  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState(false);
  const [isAppUpdateOpen, setIsAppUpdateOpen] = useState(false);

  // Apply parsed AI note directly to New Callout Job
  const handleApplyParsedAIJob = (parsed: AIParsedNoteResult) => {
    // Map parsed stock items to UsedStockItem
    const matchedStockItems = (parsed.items || []).map((it) => {
      const foundInCatalog = stock.find((s) => s.id === it.stockItemId || s.name.toLowerCase().includes(it.name.toLowerCase()));
      return {
        stockItemId: foundInCatalog?.id || `stk-ai-${Date.now()}-${Math.random()}`,
        sku: foundInCatalog?.sku || `SKU-AI`,
        name: it.name,
        unit: foundInCatalog?.unit || 'pcs',
        quantity: it.quantity,
        unitCost: foundInCatalog?.costPrice || Math.round(it.unitPrice * 0.6),
        unitSellPrice: it.unitPrice,
      };
    });

    const aiJobDraft: CalloutJob = {
      id: `job-${Date.now()}`,
      invoiceNumber: `INV-2026-${settings.nextInvoiceNumber}`,
      clientId: `cli-ai-${Date.now()}`,
      clientName: parsed.clientName || 'New Client',
      clientAddress: parsed.clientAddress || '',
      clientPhone: parsed.clientPhone || '',
      date: new Date().toISOString().split('T')[0],
      status: 'Invoiced',
      jobTitle: parsed.jobTitle || 'AI Auto-Filled Callout',
      workDone: parsed.description || '',
      kmTravelled: 15,
      fuelCostPerKm: settings.defaultFuelCostPerKm,
      clientFuelRatePerKm: settings.defaultClientFuelRatePerKm,
      hoursOnSite: parsed.laborHours || 1.5,
      hourlyRateClient: settings.defaultHourlyRateClient,
      hourlyCostInternal: settings.defaultHourlyCostInternal,
      stockItems: matchedStockItems,
      miscExpenses: [],
      taxRate: settings.defaultTaxRate,
      discountAmount: 0,
      stockDeducted: false,
      createdAt: new Date().toISOString(),
      subtotal: 0,
      totalInvoicePrice: 0,
      totalCalloutCost: 0,
      netProfit: 0,
      profitMarginPercent: 0,
      travelCharge: 0,
      travelCost: 0,
      laborCharge: 0,
      laborCost: 0,
      stockCharge: 0,
      stockCost: 0,
      miscCharge: 0,
      miscCost: 0,
      taxTotal: 0,
    };

    setEditingJob(aiJobDraft);
    setIsJobModalOpen(true);
    showToast('✨ AI field notes applied to Callout Job form!');
  };

  // Sync state changes to localStorage
  useEffect(() => {
    saveStoredStock(stock);
  }, [stock]);

  useEffect(() => {
    saveStoredClients(clients);
  }, [clients]);

  useEffect(() => {
    saveStoredCallouts(callouts);
  }, [callouts]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredLogs(logs);
  }, [logs]);

  // Helper function to trigger toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Low stock & unpaid count
  const lowStockCount = stock.filter((s) => s.quantity <= s.minQuantity).length;
  const unpaidCount = callouts.filter((j) => j.status === 'Invoiced').length;

  // Handler: Save or Update Job
  const handleSaveJob = (jobToSave: CalloutJob, newClient?: Client) => {
    // If a new client was created inline
    if (newClient) {
      setClients((prev) => [newClient, ...prev]);
    }

    // Determine stock deduction logic
    const { updatedJob, updatedStock, updatedLogs, message } =
      handleStockForJobStatusChange(jobToSave, jobToSave.status, stock, logs);

    setStock(updatedStock);
    setLogs(updatedLogs);

    // Save job into array
    setCallouts((prev) => {
      const exists = prev.some((j) => j.id === updatedJob.id);
      if (exists) {
        return prev.map((j) => (j.id === updatedJob.id ? updatedJob : j));
      } else {
        return [updatedJob, ...prev];
      }
    });

    setIsJobModalOpen(false);
    setEditingJob(null);

    if (message) {
      showToast(message);
    } else {
      showToast(`Callout ${updatedJob.invoiceNumber} saved!`);
    }

    // Auto open invoice preview
    setViewingInvoiceJob(updatedJob);
  };

  // Handler: Delete Job
  const handleDeleteJob = (jobId: string) => {
    const job = callouts.find((j) => j.id === jobId);
    if (!job) return;

    if (job.stockDeducted) {
      const { updatedStock, updatedLogs } = handleStockForJobStatusChange(job, 'Cancelled', stock, logs);
      setStock(updatedStock);
      setLogs(updatedLogs);
    }

    setCallouts((prev) => prev.filter((j) => j.id !== jobId));
    if (viewingInvoiceJob?.id === jobId) {
      setViewingInvoiceJob(null);
    }
    showToast(`Deleted callout ${job.invoiceNumber}.`);
  };

  // Handler: Change job status from list or invoice view (e.g. Mark Paid)
  const handleJobStatusChange = (job: CalloutJob, newStatus: JobStatus) => {
    const { updatedJob, updatedStock, updatedLogs, message } =
      handleStockForJobStatusChange(job, newStatus, stock, logs);

    setStock(updatedStock);
    setLogs(updatedLogs);

    setCallouts((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j)));

    if (viewingInvoiceJob && viewingInvoiceJob.id === updatedJob.id) {
      setViewingInvoiceJob(updatedJob);
    }

    if (message) {
      showToast(message);
    } else {
      showToast(`Status for ${job.invoiceNumber} updated to ${newStatus}`);
    }
  };

  // Handler: Adjust stock quantity manually (+/- buttons)
  const handleAdjustStockQty = (itemId: string, changeQty: number, reason: string) => {
    const item = stock.find((s) => s.id === itemId);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + changeQty);
    const updatedStock = stock.map((s) =>
      s.id === itemId ? { ...s, quantity: newQty, updatedAt: new Date().toISOString() } : s
    );

    const newLog: StockLog = {
      id: `log-${Date.now()}`,
      stockItemId: item.id,
      stockItemName: item.name,
      changeQuantity: changeQty,
      newQuantity: newQty,
      reason: reason as any,
      timestamp: new Date().toISOString(),
    };

    setStock(updatedStock);
    setLogs((prev) => [newLog, ...prev]);

    showToast(`Stock updated for ${item.name}: ${newQty} ${item.unit} available.`);
  };

  // Handler: Save stock item
  const handleSaveStock = (savedItem: StockItem) => {
    setStock((prev) => {
      const exists = prev.some((s) => s.id === savedItem.id);
      if (exists) {
        return prev.map((s) => (s.id === savedItem.id ? savedItem : s));
      } else {
        return [savedItem, ...prev];
      }
    });

    setIsStockModalOpen(false);
    setEditingStockItem(null);
    showToast(`Saved stock item: ${savedItem.name}`);
  };

  // Handler: Delete stock item
  const handleDeleteStockItem = (stockItemId: string) => {
    const item = stock.find((s) => s.id === stockItemId);
    setStock((prev) => prev.filter((s) => s.id !== stockItemId));
    showToast(`Deleted "${item?.name || 'stock item'}" from inventory.`);
  };

  // Handler: Delete Client
  const handleDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    showToast(`Deleted client "${client?.name || 'record'}".`);
  };

  // Handler: Clear Demo Data
  const handleClearDemoData = () => {
    clearAllDemoData();
    setStock([]);
    setClients([]);
    setCallouts([]);
    setLogs([]);
    showToast('All demo and sample records cleared.');
  };

  // Handler: Reset All Data
  const handleResetData = () => {
    resetAllData();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Smartphone frame container when mobile view enabled */}
      <div
        className={
          isMobileDeviceFrame
            ? 'py-4 sm:py-8 px-2 flex justify-center items-center min-h-screen bg-slate-950/90'
            : 'min-h-screen flex flex-col'
        }
      >
        <div
          className={
            isMobileDeviceFrame
              ? 'w-full max-w-md bg-slate-900 border-4 border-slate-800 rounded-[38px] shadow-2xl overflow-hidden relative flex flex-col min-h-[840px] max-h-[92vh]'
              : 'w-full max-w-6xl mx-auto flex-1 flex flex-col'
          }
        >
          {/* Simulated Mobile Status Bar if device frame mode */}
          {isMobileDeviceFrame && (
            <div className="bg-slate-950 px-6 py-1.5 flex justify-between items-center text-[11px] font-mono text-slate-400 select-none border-b border-slate-800/50">
              <span className="font-bold text-slate-200">09:41</span>
              <div className="w-16 h-3.5 bg-slate-900 border border-slate-800 rounded-full mx-auto" />
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Header */}
          <Header
            settings={settings}
            activeTab={activeTab}
            isMobileDeviceFrame={isMobileDeviceFrame}
            setIsMobileDeviceFrame={setIsMobileDeviceFrame}
            lowStockCount={lowStockCount}
            onOpenLowStock={() => {
              setActiveTab('inventory');
            }}
            onOpenAICopilot={() => setIsAICopilotOpen(true)}
            onOpenAppUpdates={() => setIsAppUpdateOpen(true)}
          />

          {/* Floating Toast Alert Banner */}
          {toastMessage && (
            <div className="mx-4 mt-3 bg-emerald-500 text-slate-950 px-3.5 py-2.5 rounded-xl shadow-xl font-semibold text-xs flex items-center justify-between gap-2 border border-emerald-400 animate-bounce z-40">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                <span>{toastMessage}</span>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-slate-950 font-extrabold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
            {activeTab === 'jobs' && (
              <JobList
                jobs={callouts}
                settings={settings}
                onNewJob={() => {
                  setEditingJob(null);
                  setIsJobModalOpen(true);
                }}
                onViewInvoice={(job) => setViewingInvoiceJob(job)}
                onEditJob={(job) => {
                  setEditingJob(job);
                  setIsJobModalOpen(true);
                }}
                onDeleteJob={handleDeleteJob}
                onStatusChange={handleJobStatusChange}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryList
                stock={stock}
                settings={settings}
                onAddStock={() => {
                  setEditingStockItem(null);
                  setIsStockModalOpen(true);
                }}
                onEditStock={(item) => {
                  setEditingStockItem(item);
                  setIsStockModalOpen(true);
                }}
                onDeleteStock={handleDeleteStockItem}
                onAdjustStockQty={handleAdjustStockQty}
                onOpenLogs={() => setIsLogsModalOpen(true)}
              />
            )}

            {activeTab === 'clients' && (
              <ClientList
                clients={clients}
                jobs={callouts}
                settings={settings}
                onAddClient={(c) => {
                  setClients((prev) => [c, ...prev]);
                  showToast(`Added client: ${c.name}`);
                }}
                onEditClient={(c) => {
                  setClients((prev) => prev.map((item) => (item.id === c.id ? c : item)));
                  showToast(`Updated client: ${c.name}`);
                }}
                onDeleteClient={handleDeleteClient}
                onViewInvoice={(job) => setViewingInvoiceJob(job)}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsDashboard
                jobs={callouts}
                stock={stock}
                settings={settings}
                onNavigateToStock={() => setActiveTab('inventory')}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsModal
                settings={settings}
                onSaveSettings={(s) => {
                  setSettings(s);
                  showToast('Updated business preferences!');
                }}
                onClearDemoData={handleClearDemoData}
                onResetData={handleResetData}
                onOpenAppUpdates={() => setIsAppUpdateOpen(true)}
              />
            )}
          </main>

          {/* Bottom Tab Bar */}
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            lowStockCount={lowStockCount}
            unpaidCount={unpaidCount}
          />
        </div>
      </div>

      {/* MODALS */}
      <JobFormModal
        initialJob={editingJob}
        clients={clients}
        stockItems={stock}
        settings={settings}
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSaveJob}
        onAddNewStockItem={handleSaveStock}
      />

      <InvoiceViewModal
        job={viewingInvoiceJob}
        settings={settings}
        isOpen={!!viewingInvoiceJob}
        onClose={() => setViewingInvoiceJob(null)}
        onStatusChange={handleJobStatusChange}
        onEditJob={(job) => {
          setViewingInvoiceJob(null);
          setEditingJob(job);
          setIsJobModalOpen(true);
        }}
        onOpenAICopilot={() => setIsAICopilotOpen(true)}
      />

      <StockFormModal
        initialItem={editingStockItem}
        settings={settings}
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setEditingStockItem(null);
        }}
        onSave={handleSaveStock}
      />

      <StockLogModal
        logs={logs}
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />

      <AICopilotModal
        isOpen={isAICopilotOpen}
        onClose={() => setIsAICopilotOpen(false)}
        stock={stock}
        jobs={callouts}
        clients={clients}
        settings={settings}
        onApplyParsedJob={handleApplyParsedAIJob}
      />

      <AppUpdateModal
        isOpen={isAppUpdateOpen}
        onClose={() => setIsAppUpdateOpen(false)}
        settings={settings}
        onUpdateSettings={(s) => setSettings(s)}
      />
    </div>
  );
}
