import React, { useState } from 'react';
import { Sparkles, X, Wrench, FileText, Send, Check, Copy, ArrowRight, Loader2, Bot, AlertCircle } from 'lucide-react';
import { StockItem, CalloutJob, BusinessSettings, Client } from '../../types';
import { fetchAIDiagnosis, parseFieldNotesWithAI, generateAICustomerMessage, AIDiagnosisResult, AIParsedNoteResult } from '../../lib/ai';

interface AICopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockItem[];
  jobs: CalloutJob[];
  clients: Client[];
  settings: BusinessSettings;
  onApplyParsedJob?: (parsed: AIParsedNoteResult) => void;
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  stock,
  jobs,
  clients,
  settings,
  onApplyParsedJob,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'parser' | 'diagnose' | 'message'>('parser');

  // Parser State
  const [rawNoteInput, setRawNoteInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<AIParsedNoteResult | null>(null);
  const [parserError, setParserError] = useState<string | null>(null);

  // Diagnose State
  const [category, setCategory] = useState('Aircon & Cooling');
  const [equipment, setEquipment] = useState('Inverter Split System 12000 BTU');
  const [symptomInput, setSymptomInput] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<AIDiagnosisResult | null>(null);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);

  // Message Generator State
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs.length > 0 ? jobs[0].id : '');
  const [messageType, setMessageType] = useState<'quote_send' | 'invoice_ready' | 'payment_reminder' | 'service_completion' | 'seasonal_maintenance'>('invoice_ready');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Handler: Run Field Note Parser
  const handleRunParser = async () => {
    if (!rawNoteInput.trim()) return;
    setIsParsing(true);
    setParserError(null);
    try {
      const res = await parseFieldNotesWithAI(rawNoteInput, stock);
      setParsedResult(res);
    } catch (err: any) {
      setParserError(err.message || 'Failed to process notes with Gemini AI');
    } finally {
      setIsParsing(false);
    }
  };

  // Handler: Run AI Diagnosis
  const handleRunDiagnosis = async () => {
    if (!symptomInput.trim()) return;
    setIsDiagnosing(true);
    setDiagnoseError(null);
    try {
      const res = await fetchAIDiagnosis(symptomInput, category, equipment);
      setDiagnosisResult(res);
    } catch (err: any) {
      setDiagnoseError(err.message || 'Failed to generate diagnosis');
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Handler: Run AI Customer Message
  const handleGenerateMessage = async () => {
    setIsGeneratingMessage(true);
    setMessageError(null);
    setCopiedMessage(false);
    try {
      const selectedJob = jobs.find((j) => j.id === selectedJobId) || null;
      const selectedClient = clients.find((c) => c.id === selectedJob?.clientId) || null;
      const msg = await generateAICustomerMessage(messageType, selectedJob, selectedClient, settings.businessName);
      setGeneratedMessage(msg);
    } catch (err: any) {
      setMessageError(err.message || 'Failed to generate message');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Harry's Gemini AI Assistant</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Gemini 3.6
                </span>
              </h2>
              <p className="text-xs text-slate-400">Smart HVAC, Electrical & Solar field copilot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 bg-slate-950/80 p-1.5 border-b border-slate-800 text-xs font-bold text-slate-400">
          <button
            onClick={() => setActiveTab('parser')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'parser'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Note Auto-Logger</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnose')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'diagnose'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Smart Diagnostic</span>
          </button>

          <button
            onClick={() => setActiveTab('message')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'message'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Client Messaging</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: FIELD NOTE PARSER */}
          {activeTab === 'parser' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-indigo-300">
                  Paste Raw Technician Notes or Voice Transcript:
                </label>
                <textarea
                  value={rawNoteInput}
                  onChange={(e) => setRawNoteInput(e.target.value)}
                  placeholder="e.g., Fixed aircon for John Smith at 42 Protea Road. Replaced 1x 12000 BTU Capacitor, 2kg R410a Gas, and 15m Copper Pipe. Spent 2.5 hours on site."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">
                    Matches parts against your inventory catalog automatically
                  </span>
                  <button
                    onClick={handleRunParser}
                    disabled={isParsing || !rawNoteInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/30"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Parsing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract Job Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {parserError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{parserError}</span>
                </div>
              )}

              {parsedResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Structured Job Extracted!
                    </span>
                    {onApplyParsedJob && (
                      <button
                        onClick={() => {
                          onApplyParsedJob(parsedResult);
                          onClose();
                        }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <span>Apply to New Job</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Client Name</span>
                      <span className="text-white font-semibold">{parsedResult.clientName || 'Not specified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Phone / Address</span>
                      <span className="text-white font-semibold">
                        {parsedResult.clientPhone || parsedResult.clientAddress || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Job Title</span>
                      <span className="text-indigo-300 font-bold">{parsedResult.jobTitle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Labor Estimate</span>
                      <span className="text-white font-semibold">{parsedResult.laborHours} Hours</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase mb-1">
                      Matched Inventory Parts ({parsedResult.items?.length || 0})
                    </span>
                    <div className="space-y-1">
                      {parsedResult.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex justify-between text-xs"
                        >
                          <span className="text-slate-200 font-medium">
                            {it.quantity}x {it.name}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">
                            R{(it.quantity * it.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SMART DIAGNOSTIC */}
          {activeTab === 'diagnose' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl"
                    >
                      <option value="Aircon & Cooling">Aircon & Cooling</option>
                      <option value="Solar & Inverters">Solar & Inverters</option>
                      <option value="Electrical & DB Board">Electrical & DB Board</option>
                      <option value="Refrigeration">Refrigeration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Equipment Model / Brand</label>
                    <input
                      type="text"
                      value={equipment}
                      onChange={(e) => setEquipment(e.target.value)}
                      placeholder="e.g., 5kW Sunsynk Hybrid Inverter / Samsung Aircon"
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Describe Fault / Symptoms / Error Codes
                  </label>
                  <textarea
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    placeholder="e.g. Aircon blows lukewarm air, outdoor compressor clicking repeatedly every 30 seconds, error E4 on display."
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleRunDiagnosis}
                    disabled={isDiagnosing || !symptomInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/30"
                  >
                    {isDiagnosing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4" />
                        <span>Diagnose Fault</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {diagnoseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{diagnoseError}</span>
                </div>
              )}

              {diagnosisResult && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/40 space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider block">
                      Likely Root Cause
                    </span>
                    <p className="text-white font-semibold mt-0.5">{diagnosisResult.diagnosis}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider block">
                      Troubleshooting Checklist
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-1 mt-1">
                      {diagnosisResult.troubleshooting.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Recommended Parts</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {diagnosisResult.recommendedParts.map((p, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-900 text-indigo-300 border border-slate-800 px-2 py-0.5 rounded-md text-[11px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Est. Labor</span>
                      <span className="text-emerald-400 font-bold">{diagnosisResult.estimatedLaborHours} Hours</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice Notes Summary</span>
                    <p className="text-slate-200 italic mt-0.5">{diagnosisResult.invoiceSummary}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLIENT MESSAGING */}
          {activeTab === 'message' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Callout Job</label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.invoiceNumber} - {j.clientName} (R{j.totalAmount.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Message Purpose</label>
                    <select
                      value={messageType}
                      onChange={(e) => setMessageType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-white p-2.5 rounded-xl"
                    >
                      <option value="invoice_ready">Invoice Ready for Payment</option>
                      <option value="payment_reminder">Friendly Payment Reminder</option>
                      <option value="quote_send">Quote / Estimate Notice</option>
                      <option value="service_completion">Service Completed Note</option>
                      <option value="seasonal_maintenance">Seasonal Aircon/Solar Maintenance Reminder</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateMessage}
                    disabled={isGeneratingMessage || jobs.length === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/30"
                  >
                    {isGeneratingMessage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Writing Message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Generate WhatsApp / Email Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {messageError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{messageError}</span>
                </div>
              )}

              {generatedMessage && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">Generated Message Draft:</span>
                    <button
                      onClick={handleCopyMessage}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMessage ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
