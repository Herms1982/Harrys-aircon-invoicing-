import React, { useState } from 'react';
import { Settings, Save, RefreshCw, Check, Building, Fuel, Clock, DollarSign, Trash2, ShieldCheck, Github, Sparkles, Download } from 'lucide-react';
import { BusinessSettings } from '../../types';
import { DEFAULT_GITHUB_REPO, CURRENT_APP_VERSION } from '../../lib/updater';

interface SettingsModalProps {
  settings: BusinessSettings;
  onSaveSettings: (settings: BusinessSettings) => void;
  onClearDemoData?: () => void;
  onResetData: () => void;
  onOpenAppUpdates?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClearDemoData,
  onResetData,
  onOpenAppUpdates,
}) => {
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [siteName, setSiteName] = useState(settings.siteName || "Harry's Aircon invoice app");
  const [website, setWebsite] = useState(settings.website || "https://harrysaircon.co.za");
  const [githubRepo, setGithubRepo] = useState(settings.githubRepo || DEFAULT_GITHUB_REPO);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [taxNumber, setTaxNumber] = useState(settings.taxNumber || '');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);

  const [defaultFuelCostPerKm, setDefaultFuelCostPerKm] = useState(settings.defaultFuelCostPerKm);
  const [defaultClientFuelRatePerKm, setDefaultClientFuelRatePerKm] = useState(settings.defaultClientFuelRatePerKm);
  const [defaultHourlyRateClient, setDefaultHourlyRateClient] = useState(settings.defaultHourlyRateClient);
  const [defaultHourlyCostInternal, setDefaultHourlyCostInternal] = useState(settings.defaultHourlyCostInternal);
  const [defaultTaxRate, setDefaultTaxRate] = useState(settings.defaultTaxRate);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: BusinessSettings = {
      ...settings,
      businessName,
      siteName,
      website,
      githubRepo,
      ownerName,
      phone,
      email,
      address,
      taxNumber,
      currencySymbol,
      defaultFuelCostPerKm,
      defaultClientFuelRatePerKm,
      defaultHourlyRateClient,
      defaultHourlyCostInternal,
      defaultTaxRate,
    };

    onSaveSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-20 max-w-3xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg text-slate-100">
        <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
          System Preferences
        </span>
        <h2 className="text-lg font-bold text-white mt-0.5">
          Business Details & Default Rates
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Set your business invoice header, fuel cost per km defaults, technician hourly costs, and currency symbol.
        </p>
      </div>

      {/* Storage Indicator */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span><strong>Auto-Save Active:</strong> All changes, clients, stock, and callouts save automatically to phone local storage.</span>
        </div>
      </div>

      {/* GitHub App Updates Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-white">GitHub In-App Updates (v{CURRENT_APP_VERSION})</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-indigo-400/30 font-bold">
              APK Auto-Sync
            </span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Check for new APK releases or software updates directly from repository <code className="text-indigo-300 font-mono">{githubRepo}</code>.
          </p>
        </div>

        {onOpenAppUpdates && (
          <button
            type="button"
            onClick={onOpenAppUpdates}
            className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/30 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Check For Updates</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Business Info */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-indigo-400" />
            <span>Company Details (Printed on Invoices)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Business / Trade Name</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white font-semibold rounded-lg p-2.5"
                required
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Site / App Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Harry's Aircon invoice app"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Owner / Manager Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Website URL</label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. https://harrysaircon.co.za"
                className="w-full bg-slate-950 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">Tax / VAT Number</label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1">Physical / Postal Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg p-2.5"
            />
          </div>
        </div>

        {/* Currency & Rates */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            <span>Currency & Preset Callout Rates</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Currency Symbol</label>
              <select
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-indigo-400 font-bold rounded-lg p-2.5"
              >
                <option value="R">R (ZAR - South Africa)</option>
                <option value="$">$ (USD / CAD / AUD)</option>
                <option value="£">£ (GBP - United Kingdom)</option>
                <option value="€">€ (EUR - Eurozone)</option>
                <option value="A$">A$ (Australian Dollar)</option>
                <option value="KSh">KSh (Kenyan Shilling)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Default Tax / VAT %</label>
              <input
                type="number"
                step="0.5"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono rounded-lg p-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5 text-indigo-400" /> Travel Rates per km
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Billed to Client / km</label>
                  <input
                    type="number"
                    step="0.05"
                    value={defaultClientFuelRatePerKm}
                    onChange={(e) =>
                      setDefaultClientFuelRatePerKm(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Internal Fuel Cost / km</label>
                  <input
                    type="number"
                    step="0.05"
                    value={defaultFuelCostPerKm}
                    onChange={(e) => setDefaultFuelCostPerKm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 text-rose-400 font-mono font-bold p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Labor Rates per hour
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Billed Rate / hour</label>
                  <input
                    type="number"
                    value={defaultHourlyRateClient}
                    onChange={(e) =>
                      setDefaultHourlyRateClient(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold p-2 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tech Wage Cost / hour</label>
                  <input
                    type="number"
                    value={defaultHourlyCostInternal}
                    onChange={(e) =>
                      setDefaultHourlyCostInternal(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 text-rose-400 font-mono font-bold p-2 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit & Reset Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <div className="flex items-center gap-2">
            {onClearDemoData && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all stock, client, and callout data?')) {
                    onClearDemoData();
                  }
                }}
                className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Demo Data</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (confirm('Are you sure you want to reset all data and preferences back to default?')) {
                  onResetData();
                }
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset All Data</span>
            </button>
          </div>

          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-900/40 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/30"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Settings Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
