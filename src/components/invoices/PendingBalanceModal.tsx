import React, { useState, useMemo } from 'react';
import {
  X,
  AlertCircle,
  Search,
  Building,
  Phone,
  Receipt,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Droplets,
  Wrench,
  Clock,
  IndianRupee,
} from 'lucide-react';
import { MonthlyInvoice } from '../../types';
import { formatCurrency, calculatePayableToOwner, calculatePayableToOwnerDue } from '../../utils/formatters';

interface PendingBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: MonthlyInvoice[];
  selectedMonth: string;
  onSelectInvoice: (invoice: MonthlyInvoice) => void;
}

export const PendingBalanceModal: React.FC<PendingBalanceModalProps> = ({
  isOpen,
  onClose,
  invoices,
  selectedMonth,
  onSelectInvoice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter invoices with pending balances
  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isSettled =
        inv.Payment_Status === 'Paid' ||
        inv.Payment_Status === 'Paid and Closed' ||
        (inv.Total_Due !== undefined && inv.Total_Due <= 0);
      if (isSettled) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = inv.Tenant_Name.toLowerCase().includes(q);
        const matchesHouse = inv.House_name.toLowerCase().includes(q);
        const matchesUnit = `${inv.floor} ${inv.house_type}`.toLowerCase().includes(q);
        const matchesMobile = inv.Tenant_Mobile.includes(q);
        const matchesId = inv.Invoice_ID.toLowerCase().includes(q);
        return matchesName || matchesHouse || matchesUnit || matchesMobile || matchesId;
      }
      return true;
    });
  }, [invoices, searchQuery]);

  // Aggregate totals
  const totalGrossPending = pendingInvoices.reduce(
    (acc, inv) => acc + (inv.Total_Due !== undefined ? inv.Total_Due : inv.Total_Amount),
    0
  );

  const totalOwnerPending = pendingInvoices.reduce(
    (acc, inv) => acc + calculatePayableToOwnerDue(inv),
    0
  );

  const totalEbPending = pendingInvoices.reduce((acc, inv) => {
    if (inv.EB_Paid_Status === 'Paid') return acc;
    return acc + (inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0);
  }, 0);

  const handleCopyReminder = (inv: MonthlyInvoice) => {
    const rentDue = inv.Rent_Paid_Status === 'Paid' ? 0 : inv.Rent_Amount;
    const waterDue = inv.Water_Paid_Status === 'Paid' ? 0 : (inv.Water_Bill_Amount ?? inv.Water_Charges ?? 0);
    const maintDue = inv.Rent_Paid_Status === 'Paid' ? 0 : (inv.Maintenance_Charges ?? 0);
    const ebDue = inv.EB_Paid_Status === 'Paid' ? 0 : (inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0);
    const prevDue = inv.previous_balance_carried_forward || 0;
    const ownerDue = calculatePayableToOwnerDue(inv);
    const totalDue = inv.Total_Due !== undefined ? inv.Total_Due : inv.Total_Amount;

    const text = `Dear ${inv.Tenant_Name},\nThis is a friendly reminder for your ${inv.Invoice_Month} rent bill for ${inv.House_name} (${inv.floor} - ${inv.house_type}).\n\nBreakdown:\n- Rent: ₹${rentDue}\n- Water: ₹${waterDue}\n- Maintenance: ₹${maintDue}${prevDue > 0 ? `\n- Previous Dues: ₹${prevDue}` : ''}\nTotal Payable to Owner: ₹${ownerDue}${ebDue > 0 ? `\n- EB Bill (BESCOM): ₹${ebDue}` : ''}\n\nTotal Due: ₹${totalDue}.\nPlease arrange for payment. Thank you!`;

    navigator.clipboard.writeText(text);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90dvh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">Pending Balances &amp; Unsettled Dues</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/30 text-amber-200">
                  {selectedMonth}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Detailed tenant breakdown of pending rent, water, maintenance and utility balances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Financial KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                Pending to Owner
              </span>
              <strong className="text-lg font-black font-mono text-emerald-950 block">
                {formatCurrency(totalOwnerPending)}
              </strong>
              <span className="text-[10px] text-emerald-700">Rent + Water + Maint</span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">
                Pending EB Utility
              </span>
              <strong className="text-lg font-black font-mono text-amber-950 block">
                {formatCurrency(totalEbPending)}
              </strong>
              <span className="text-[10px] text-amber-700">BESCOM / EB Pass-through</span>
            </div>

            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
              <span className="text-[10px] font-bold uppercase text-indigo-800 block">
                Gross Outstanding
              </span>
              <strong className="text-lg font-black font-mono text-indigo-950 block">
                {formatCurrency(totalGrossPending)}
              </strong>
              <span className="text-[10px] text-indigo-700">Owner Dues + EB</span>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">
                Tenants with Dues
              </span>
              <strong className="text-lg font-black font-mono text-slate-900 block">
                {pendingInvoices.length}
              </strong>
              <span className="text-[10px] text-slate-500">Unsettled Invoices</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tenant name, house, unit (e.g. Ramesh, Ground, 1BHK)..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tenants Pending List */}
          {pendingInvoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <strong className="text-sm font-bold text-slate-800 block">
                All Settled Up!
              </strong>
              <p className="text-xs text-slate-500">
                No tenants have pending balances for the selected scope.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvoices.map((inv) => {
                const rentDue = inv.Rent_Paid_Status === 'Paid' ? 0 : inv.Rent_Amount;
                const waterDue = inv.Water_Paid_Status === 'Paid' ? 0 : (inv.Water_Bill_Amount ?? inv.Water_Charges ?? 0);
                const maintDue = inv.Rent_Paid_Status === 'Paid' ? 0 : (inv.Maintenance_Charges ?? 0);
                const otherDue = inv.Rent_Paid_Status === 'Paid' ? 0 : (inv.Other_Charges ?? 0);
                const ebDue = inv.EB_Paid_Status === 'Paid' ? 0 : (inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0);
                const prevDues = inv.previous_balance_carried_forward || 0;
                const ownerDue = calculatePayableToOwnerDue(inv);
                const totalDue = inv.Total_Due !== undefined ? inv.Total_Due : inv.Total_Amount;

                return (
                  <div
                    key={inv.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all space-y-3"
                  >
                    {/* Top Row: Tenant & House Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <strong className="text-sm font-black text-slate-900">
                            {inv.Tenant_Name}
                          </strong>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              inv.rental_type === 'Lease'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}
                          >
                            {inv.rental_type || 'Rent'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {inv.Invoice_ID}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-600">
                          <span className="font-semibold text-slate-800">{inv.House_name}</span>
                          <span>•</span>
                          <span>{inv.floor} ({inv.house_type})</span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">{inv.Tenant_Mobile}</span>
                        </div>
                      </div>

                      {/* Totals Pill */}
                      <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200 self-start sm:self-auto">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                            Pending to Owner
                          </span>
                          <span className="font-mono font-black text-sm text-emerald-700">
                            ₹{ownerDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <span className="text-slate-300">|</span>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-amber-700 block">
                            Net Total Due
                          </span>
                          <span className="font-mono font-black text-sm text-amber-700">
                            ₹{totalDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Itemized Pending Charges Breakdown (Req 5) */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-2 border-t border-slate-100">
                      {/* Rent */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          Pending Rent
                        </span>
                        <strong className={`font-mono text-xs ${rentDue > 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                          {rentDue > 0 ? `₹${rentDue.toLocaleString('en-IN')}` : 'Paid ✓'}
                        </strong>
                      </div>

                      {/* Water */}
                      <div className="p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                        <span className="text-[10px] text-blue-700 font-bold uppercase block flex items-center space-x-1">
                          <Droplets className="w-3 h-3 text-blue-500" />
                          <span>Pending Water</span>
                        </span>
                        <strong className={`font-mono text-xs ${waterDue > 0 ? 'text-blue-900' : 'text-emerald-700'}`}>
                          {waterDue > 0 ? `₹${waterDue.toLocaleString('en-IN')}` : 'Paid ✓'}
                        </strong>
                      </div>

                      {/* Maintenance & Other */}
                      <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase block flex items-center space-x-1">
                          <Wrench className="w-3 h-3 text-emerald-500" />
                          <span>Pending Maint</span>
                        </span>
                        <strong className={`font-mono text-xs ${(maintDue + otherDue) > 0 ? 'text-emerald-950' : 'text-emerald-700'}`}>
                          {(maintDue + otherDue) > 0 ? `₹${(maintDue + otherDue).toLocaleString('en-IN')}` : 'Paid ✓'}
                        </strong>
                      </div>

                      {/* EB Bill (BESCOM) */}
                      <div className="p-2 rounded-lg bg-amber-50/60 border border-amber-100">
                        <span className="text-[10px] text-amber-800 font-bold uppercase block flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span>Pending EB</span>
                        </span>
                        <strong className={`font-mono text-xs ${ebDue > 0 ? 'text-amber-950' : 'text-emerald-700'}`}>
                          {ebDue > 0 ? `₹${ebDue.toLocaleString('en-IN')}` : 'Paid ✓'}
                        </strong>
                      </div>

                      {/* Previous Arrears */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Prev Arrears</span>
                        </span>
                        <strong className="font-mono text-xs text-slate-800">
                          {prevDues > 0 ? `+ ₹${prevDues.toLocaleString('en-IN')}` : '₹0'}
                        </strong>
                      </div>
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleCopyReminder(inv)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                        title="Copy payment reminder message to send via WhatsApp or SMS"
                      >
                        {copiedId === inv.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied Reminder!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Reminder</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectInvoice(inv);
                        }}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Bill ({inv.Invoice_ID})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-600">
            Showing {pendingInvoices.length} unpaid bill{pendingInvoices.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
