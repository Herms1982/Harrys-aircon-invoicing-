import React, { useState } from 'react';
import { Plus, Users, Search, Phone, Mail, MapPin, Briefcase, FileText, X, Edit, Trash2, UserPlus } from 'lucide-react';
import { Client, CalloutJob, BusinessSettings } from '../../types';
import { formatCurrency } from '../../lib/calculations';

interface ClientListProps {
  clients: Client[];
  jobs: CalloutJob[];
  settings: BusinessSettings;
  onAddClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient?: (id: string) => void;
  onViewInvoice: (job: CalloutJob) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  jobs,
  settings,
  onAddClient,
  onEditClient,
  onDeleteClient,
  onViewInvoice,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => {
    setEditingClient(null);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompany(client.company || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const clientObj: Client = {
      id: editingClient?.id || `cli-${Date.now()}`,
      name: name.trim(),
      company: company.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      notes: notes.trim() || undefined,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
    };

    if (editingClient) {
      onEditClient(clientObj);
    } else {
      onAddClient(clientObj);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (client: Client) => {
    if (confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      if (onDeleteClient) {
        onDeleteClient(client.id);
      }
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-slate-900/50 rounded-3xl border border-slate-800 p-5 shadow-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1 block">
            Client Directory
          </label>
          <h2 className="text-xl font-bold text-white">
            Client Callout History & Contact Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage site addresses, phone numbers, gate codes, and total invoiced jobs per client.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-2xl text-xs shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-indigo-400/30"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by client name, company, phone or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">No Clients Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Your client list is currently empty. Click below to add your first client contact and site details.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-2xl text-xs shadow-lg inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Client</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => {
            const clientJobs = jobs.filter((j) => j.clientId === client.id);
            const totalRevenue = clientJobs.reduce((sum, j) => sum + j.totalInvoicePrice, 0);

            return (
              <div
                key={client.id}
                className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-slate-700 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white">{client.name}</h3>
                    {client.company && (
                      <span className="text-xs text-indigo-400 font-semibold block mt-0.5">
                        {client.company}
                      </span>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.phone}</span>
                        </span>
                      )}
                      {client.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.email}</span>
                        </span>
                      )}
                    </div>
                    {client.address && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{client.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block">Total Billed</span>
                    <span className="text-lg font-black text-white block font-mono mt-0.5">
                      {formatCurrency(totalRevenue, settings.currencySymbol)}
                    </span>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button
                        onClick={() => openEditModal(client)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-0.5"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {onDeleteClient && (
                        <button
                          onClick={() => handleDelete(client)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {client.notes && (
                  <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 italic">
                    "{client.notes}"
                  </p>
                )}

                {/* Callout History Pills */}
                {clientJobs.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1.5">
                      Recent Callout Invoices ({clientJobs.length})
                    </label>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {clientJobs.map((j) => (
                        <button
                          key={j.id}
                          onClick={() => onViewInvoice(j)}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs px-3 py-1.5 rounded-xl flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
                        >
                          <span className="font-mono text-indigo-400 font-bold">
                            {j.invoiceNumber}
                          </span>
                          <span className="text-slate-300">
                            {formatCurrency(j.totalInvoicePrice, settings.currencySymbol)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>{editingClient ? 'Edit Client Details' : 'Add New Client'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Full Name / Contact Person *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl font-semibold focus:border-indigo-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Company / Building Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Horizon Apartments / Private"
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 82 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@email.co.za"
                    className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Site / Service Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address or site location"
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1">Site Notes / Gate Pins</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate pin codes, parking instructions, payment terms..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-2xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/40"
                >
                  Save Client Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
