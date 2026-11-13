import React, { useState, useMemo } from 'react';
import {
  ReceiptText,
  FileDown,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Building,
  Sparkles,
  ChevronDown,
  Trash2,
  Edit3,
  Eye,
  Lock,
  Wrench,
  Gauge,
  Users,
  Check,
  Paperclip,
  Droplets,
  Zap,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { MonthlyInvoice, InvoiceStatus, HouseMaintenanceBill } from '../../types';
import {
  formatCurrency,
  calculatePayableToOwner,
  calculatePayableToOwnerDue,
} from '../../utils/formatters';
import { exportMonthlyBillingPdf } from '../../utils/pdfExport';
import { AddInvoiceModal } from './AddInvoiceModal';
import { AddMaintenanceBillModal } from './AddMaintenanceBillModal';
import { RecordWaterReadingModal } from './RecordWaterReadingModal';
import { RecordEbReadingModal } from './RecordEbReadingModal';
import { InvoiceViewEditModal } from './InvoiceViewEditModal';
import { MaintenanceBillViewModal } from './MaintenanceBillViewModal';
import { PendingBalanceModal } from './PendingBalanceModal';

export const MonthlyInvoiceDashboard: React.FC = () => {
  const {
    invoices,
    maintenanceBills,
    houses,
    tenants,
    uniqueHouseNames,
    updateInvoice,
    deleteInvoice,
    updateMaintenanceBill,
    deleteMaintenanceBill,
    generateBulkInvoicesForMonth,
  } = useProperty();

  // Tab: Rent Bills vs Maintenance Bills (Req 4)
  const [activeTab, setActiveTab] = useState<'rent_bills' | 'maintenance_bills'>('rent_bills');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>('October 2026');
  const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Partially Paid' | 'Paid and Closed'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewBillChoiceOpen, setIsNewBillChoiceOpen] = useState(false);
  const [isRecordWaterReadingOpen, setIsRecordWaterReadingOpen] = useState(false);
  const [isRecordEbReadingOpen, setIsRecordEbReadingOpen] = useState(false);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState(false);
  const [isAddMaintenanceBillOpen, setIsAddMaintenanceBillOpen] = useState(false);
  const [targetHouseForModal, setTargetHouseForModal] = useState<string | undefined>(undefined);
  const [targetMonthForModal, setTargetMonthForModal] = useState<string | undefined>(undefined);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<MonthlyInvoice | null>(null);
  const [selectedMaintenanceBillForModal, setSelectedMaintenanceBillForModal] = useState<HouseMaintenanceBill | null>(null);
  const [isPendingBalanceModalOpen, setIsPendingBalanceModalOpen] = useState(false);
  const [bulkGenNotification, setBulkGenNotification] = useState<string | null>(null);

  // Available unique months from invoices and maintenance bills
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add('November 2026');
    set.add('October 2026');
    invoices.forEach((i) => {
      if (i.Invoice_Month) set.add(i.Invoice_Month);
    });
    maintenanceBills.forEach((b) => {
      if (b.Billing_Month) set.add(b.Billing_Month);
    });
    return Array.from(set);
  }, [invoices, maintenanceBills]);

  // Filtered invoices (Tenant Rent Bills)
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Month filter
      if (selectedMonth !== 'All' && inv.Invoice_Month.toLowerCase() !== selectedMonth.toLowerCase()) {
        return false;
      }
      // House filter
      if (selectedHouseFilter !== 'All' && inv.House_name.toLowerCase() !== selectedHouseFilter.toLowerCase()) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Paid' && inv.Payment_Status !== 'Paid' && inv.Payment_Status !== 'Paid and Closed') {
          return false;
        } else if (statusFilter !== 'Paid' && inv.Payment_Status !== statusFilter) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = inv.Tenant_Name.toLowerCase().includes(q);
        const matchesMobile = inv.Tenant_Mobile.includes(q);
        const matchesId = inv.Invoice_ID.toLowerCase().includes(q);
        const matchesUnit = `${inv.floor} ${inv.house_type}`.toLowerCase().includes(q);
        if (!matchesName && !matchesMobile && !matchesId && !matchesUnit) return false;
      }
      return true;
    });
  }, [invoices, selectedMonth, selectedHouseFilter, statusFilter, searchQuery]);

  // Filtered Maintenance Bills (House Common Bills)
  const filteredMaintenanceBills = useMemo(() => {
    return maintenanceBills.filter((bill) => {
      if (selectedMonth !== 'All' && bill.Billing_Month.toLowerCase() !== selectedMonth.toLowerCase()) {
        return false;
      }
      if (selectedHouseFilter !== 'All' && bill.House_name.toLowerCase() !== selectedHouseFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'All') {
        if (statusFilter === 'Paid' && bill.Payment_Status !== 'Paid') return false;
        if (statusFilter === 'Pending' && bill.Payment_Status !== 'Pending') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesHouse = bill.House_name.toLowerCase().includes(q);
        const matchesId = bill.Bill_ID.toLowerCase().includes(q);
        const matchesMonth = bill.Billing_Month.toLowerCase().includes(q);
        if (!matchesHouse && !matchesId && !matchesMonth) return false;
      }
      return true;
    });
  }, [maintenanceBills, selectedMonth, selectedHouseFilter, statusFilter, searchQuery]);

  // Financial calculations for Rent Bills (Req 4: Payable to Owner excludes EB)
  const totalBilled = filteredInvoices.reduce((acc, i) => acc + i.Total_Amount, 0);
  const totalPayableToOwnerBilled = filteredInvoices.reduce(
    (acc, i) => acc + calculatePayableToOwner(i),
    0
  );

  const totalCollected = filteredInvoices
    .filter((i) => i.Payment_Status === 'Paid' || i.Payment_Status === 'Paid and Closed')
    .reduce((acc, i) => acc + i.Total_Amount, 0);
  const totalPayableToOwnerCollected = filteredInvoices
    .filter((i) => i.Payment_Status === 'Paid' || i.Payment_Status === 'Paid and Closed')
    .reduce((acc, i) => acc + calculatePayableToOwner(i), 0);

  const totalPending = filteredInvoices
    .filter((i) => i.Payment_Status !== 'Paid' && i.Payment_Status !== 'Paid and Closed')
    .reduce((acc, i) => acc + (i.Total_Due ?? i.Total_Amount), 0);
  const totalPendingPayableToOwner = filteredInvoices
    .filter((i) => i.Payment_Status !== 'Paid' && i.Payment_Status !== 'Paid and Closed')
    .reduce((acc, i) => acc + calculatePayableToOwnerDue(i), 0);

  const totalRentBilled = filteredInvoices.reduce((acc, i) => acc + i.Rent_Amount, 0);
  const totalEbBilled = filteredInvoices.reduce((acc, i) => acc + (i.EB_Bill_Amount ?? i.EB_Charges ?? 0), 0);
  const totalWaterBilled = filteredInvoices.reduce((acc, i) => acc + (i.Water_Bill_Amount ?? i.Water_Charges ?? 0), 0);
  const totalMaintBilled = filteredInvoices.reduce(
    (acc, i) => acc + (i.Maintenance_Charges ?? 0) + (i.Motor_Bill_Amount ?? 0),
    0
  );

  // Financial calculations for Maintenance Bills
  const totalMaintenanceBilled = filteredMaintenanceBills.reduce((acc, b) => acc + b.Total_Maintenance_Amount, 0);
  const totalMaintenanceUnits = filteredMaintenanceBills.reduce((acc, b) => acc + b.Total_Units_Count, 0);

  // Toggle invoice status
  const handleToggleStatus = (invoice: MonthlyInvoice) => {
    if (invoice.Payment_Status === 'Paid and Closed') {
      alert('This invoice is marked as Paid and Closed. Open the invoice details to reopen it.');
      return;
    }
    const newStatus = invoice.Payment_Status === 'Paid' ? 'Pending' : 'Paid';
    updateInvoice(invoice.id, {
      Payment_Status: newStatus,
      Payment_Date: newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : null,
      Payment_Mode: newStatus === 'Paid' ? 'UPI' : null,
      Total_Due: newStatus === 'Paid' ? 0 : invoice.Total_Amount,
    });
    if (selectedInvoiceForReceipt && selectedInvoiceForReceipt.id === invoice.id) {
      setSelectedInvoiceForReceipt({
        ...selectedInvoiceForReceipt,
        Payment_Status: newStatus,
        Total_Due: newStatus === 'Paid' ? 0 : invoice.Total_Amount,
      });
    }
  };

  // Toggle Maintenance Bill status
  const handleToggleMaintenanceStatus = (bill: HouseMaintenanceBill) => {
    const nextStatus = bill.Payment_Status === 'Paid' ? 'Pending' : 'Paid';
    updateMaintenanceBill(bill.id, { Payment_Status: nextStatus });
  };

  // Export to PDF functionality
  const handleExportPdf = () => {
    exportMonthlyBillingPdf(
      filteredInvoices,
      selectedMonth === 'All' ? 'All Months' : selectedMonth,
      selectedHouseFilter === 'All' ? 'All Properties' : selectedHouseFilter
    );
  };

  // Batch generate
  const handleBulkGenerate = () => {
    const month = selectedMonth === 'All' ? 'November 2026' : selectedMonth;
    const count = generateBulkInvoicesForMonth(month);
    setBulkGenNotification(`Generated ${count} new rent bill(s) for ${month}!`);
    setTimeout(() => setBulkGenNotification(null), 4000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
              <ReceiptText className="w-4 h-4" />
              <span>Property Invoicing &amp; Maintenance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Monthly Invoicing &amp; Recovery
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage tenant rent bills and common house maintenance expenses with automatic cost sharing.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportPdf}
              title="Download formatted monthly billing summary PDF"
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs shadow-md shadow-slate-900/20 cursor-pointer transition-all"
            >
              <FileDown className="w-4 h-4 text-amber-400" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleBulkGenerate}
              title="Generate rent bills for all active tenants"
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Auto-Bill Active Tenants</span>
              <span className="sm:hidden">Auto-Bill</span>
            </button>

            {/* Requirement 4: New Bill Button with 2 Options (Rent Bill vs Maintenance Bill) */}
            <div className="relative">
              <button
                onClick={() => setIsNewBillChoiceOpen(!isNewBillChoiceOpen)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Bill</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isNewBillChoiceOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-30 animate-in fade-in slide-in-from-top-2 duration-150 divide-y divide-slate-100">
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Billing Action (4 Options)
                  </div>
                  <div className="py-1 space-y-1">
                    {/* Option 1: Record Water Reading */}
                    <button
                      onClick={() => {
                        setIsNewBillChoiceOpen(false);
                        setIsRecordWaterReadingOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 transition flex items-start space-x-3 cursor-pointer group"
                    >
                      <div className="p-2 bg-sky-100 text-sky-700 rounded-lg group-hover:bg-sky-600 group-hover:text-white transition">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 group-hover:text-sky-700 block">
                          Record Water Reading
                        </strong>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Autopopulate start reading, record end readings &amp; autocalculate for all units in house
                        </p>
                      </div>
                    </button>

                    {/* Option 2: Record EB Reading */}
                    <button
                      onClick={() => {
                        setIsNewBillChoiceOpen(false);
                        setIsRecordEbReadingOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-amber-50 transition flex items-start space-x-3 cursor-pointer group"
                    >
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 group-hover:text-amber-700 block">
                          Record EB Reading
                        </strong>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Autopopulate start reading, record end reading &amp; electricity bill amounts for all units
                        </p>
                      </div>
                    </button>

                    {/* Option 3: Rent Bill */}
                    <button
                      onClick={() => {
                        setIsNewBillChoiceOpen(false);
                        setIsAddInvoiceOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-indigo-50 transition flex items-start space-x-3 cursor-pointer group"
                    >
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                        <ReceiptText className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 block">
                          Rent Bill
                        </strong>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          Individual tenant bill with autopopulated EB, water, rent &amp; maintenance share
                        </p>
                      </div>
                    </button>

                    {/* Option 4: Maintenance Bill */}
                    <button
                      onClick={() => {
                        setIsNewBillChoiceOpen(false);
                        setIsAddMaintenanceBillOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50 transition flex items-start space-x-3 cursor-pointer group"
                    >
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 block">
                          Maintenance Bill
                        </strong>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          House common motor bill &amp; dynamic charges shared equally across units
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {bulkGenNotification && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-xl border border-emerald-200 animate-in fade-in">
            {bulkGenNotification}
          </div>
        )}

        {/* Tab Switcher: Tenant Rent Bills vs House Maintenance Bills (Req 4) */}
        <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('rent_bills')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'rent_bills'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ReceiptText className="w-4 h-4" />
            <span>Tenant Rent Bills</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'rent_bills' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredInvoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance_bills')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'maintenance_bills'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>House Maintenance Bills</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'maintenance_bills' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {filteredMaintenanceBills.length}
            </span>
          </button>
        </div>

        {/* Financial KPI Summary Cards (Req 4 & 5: Payable to Owner & Interactive Pending Balance) */}
        {activeTab === 'rent_bills' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            {/* Card 1: Payable to Owner vs Gross */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block uppercase tracking-wider">
                Payable to Owner ({filteredInvoices.length})
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(totalPayableToOwnerBilled)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 rounded">
                  excl. EB
                </span>
              </div>
              <span className="text-[10px] text-slate-500 block mt-1 truncate" title={`Gross: ${formatCurrency(totalBilled)} | Rent: ${formatCurrency(totalRentBilled)} • Water: ${formatCurrency(totalWaterBilled)} • Maint: ${formatCurrency(totalMaintBilled)} • EB: ${formatCurrency(totalEbBilled)}`}>
                Gross: {formatCurrency(totalBilled)} (EB: {formatCurrency(totalEbBilled)})
              </span>
            </div>

            {/* Card 2: Collected by Owner */}
            <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 block uppercase tracking-wider">
                Collected by Owner
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-lg font-black text-emerald-950 font-mono">
                  {formatCurrency(totalPayableToOwnerCollected)}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1 rounded">
                  excl. EB
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 block mt-1 truncate">
                Gross Collected: {formatCurrency(totalCollected)} • {filteredInvoices.filter((i) => i.Payment_Status === 'Paid' || i.Payment_Status === 'Paid and Closed').length} Paid
              </span>
            </div>

            {/* Card 3: Pending Balance (Clickable for Requirement 5 Modal) */}
            <button
              type="button"
              onClick={() => setIsPendingBalanceModalOpen(true)}
              title="Click to view tenant-by-tenant pending dues breakdown"
              className="bg-amber-50/80 hover:bg-amber-100/90 active:scale-[0.99] rounded-xl p-3.5 border-2 border-amber-300 hover:border-amber-400 text-left transition-all cursor-pointer group shadow-xs hover:shadow-md relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-900 block uppercase tracking-wider">
                  Pending Balance
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 group-hover:bg-amber-300 group-hover:text-amber-950 transition uppercase tracking-wider">
                  View Dues →
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-lg font-black text-amber-950 font-mono group-hover:text-amber-900">
                  {formatCurrency(totalPendingPayableToOwner)}
                </span>
                <span className="text-[10px] font-bold text-amber-800">to Owner</span>
              </div>
              <span className="text-[10px] text-amber-800/90 block mt-1 truncate">
                Gross: {formatCurrency(totalPending)} • {filteredInvoices.filter((i) => i.Payment_Status !== 'Paid' && i.Payment_Status !== 'Paid and Closed').length} pending bills
              </span>
            </button>

            {/* Card 4: Recovery Rate */}
            <div className="bg-indigo-50/70 rounded-xl p-3.5 border border-indigo-200">
              <span className="text-[11px] font-bold text-indigo-800 block uppercase tracking-wider">
                Owner Recovery Rate
              </span>
              <div className="flex items-baseline space-x-1.5 mt-0.5">
                <span className="text-lg font-black text-indigo-950 font-mono">
                  {totalPayableToOwnerBilled > 0
                    ? Math.round((totalPayableToOwnerCollected / totalPayableToOwnerBilled) * 100)
                    : 0}%
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">collected</span>
              </div>
              <span className="text-[10px] text-indigo-600 block mt-1">
                Gross Rate: {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% • Scope: {selectedMonth}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-700 block uppercase">
                Common Maintenance Expenses
              </span>
              <span className="text-lg font-black text-emerald-900 font-mono">
                {formatCurrency(totalMaintenanceBilled)}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                Across {filteredMaintenanceBills.length} house bills ({selectedMonth})
              </span>
            </div>

            <div className="bg-blue-50/70 rounded-xl p-3.5 border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-700 block uppercase">
                Total Covered Units
              </span>
              <span className="text-lg font-black text-blue-900 font-mono">
                {totalMaintenanceUnits} units
              </span>
              <span className="text-[10px] text-blue-600 block mt-0.5">
                Equal sharing enabled
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                Average Per-Unit Share
              </span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {totalMaintenanceUnits > 0
                  ? formatCurrency(Math.round(totalMaintenanceBilled / totalMaintenanceUnits))
                  : '₹0'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Autopopulated to tenant bills
              </span>
            </div>

            <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-amber-800 block uppercase">
                  House Common Bills
                </span>
                <span className="text-lg font-black text-amber-950 font-mono">
                  {filteredMaintenanceBills.length} Bills
                </span>
              </div>
              <button
                onClick={() => setIsAddMaintenanceBillOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                + New Bill
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Month selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Billing Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="All">All Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Property Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Property / House
            </label>
            <select
              value={selectedHouseFilter}
              onChange={(e) => setSelectedHouseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="All">All Properties</option>
              {uniqueHouseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Payment Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Only</option>
              <option value="Partially Paid">Partially Paid Only</option>
              <option value="Paid">Paid / Closed</option>
              <option value="Paid and Closed">Paid &amp; Closed Only</option>
            </select>
          </div>

          {/* Search bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Search Record
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'rent_bills' ? 'Tenant, ID, Unit...' : 'House, Bill ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area based on Tab */}
      {activeTab === 'rent_bills' ? (
        /* 1. Tenant Rent Bills Table */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Tenant Rent Bills ({filteredInvoices.length} Records)
              </h2>
              <span className="text-[11px] text-slate-400">
                (Click any row to view, edit, or print receipt slip)
              </span>
            </div>
            <button
              onClick={handleExportPdf}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No rent bills match current filters</p>
              <p className="text-xs text-slate-400 mt-1">
                Try switching the billing month or click &quot;Auto-Bill Active Tenants&quot;.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Bill #</th>
                    <th className="py-3 px-3">Month</th>
                    <th className="py-3 px-3">Tenant</th>
                    <th className="py-3 px-3">House &amp; Unit</th>
                    <th className="py-3 px-3">EB RR #</th>
                    <th className="py-3 px-3 text-right">Rent (₹)</th>
                    <th className="py-3 px-3 text-right">EB (₹)</th>
                    <th className="py-3 px-3 text-right">Water (₹)</th>
                    <th className="py-3 px-3 text-right">Motor (₹)</th>
                    <th className="py-3 px-3 text-right">Maint (₹)</th>
                    <th className="py-3 px-3 text-right">Other/Arrears (₹)</th>
                    <th className="py-3 px-3 text-right font-black text-emerald-900 bg-emerald-50/80 border-x border-emerald-200/60">
                      Payable to Owner (₹)
                    </th>
                    <th className="py-3 px-3 text-right font-black">Gross Bill (₹)</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForReceipt(inv)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Invoice ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-indigo-600 group-hover:underline">{inv.Invoice_ID}</span>
                          {inv.Payment_Status === 'Paid and Closed' && (
                            <span title="Paid and Closed">
                              <Lock className="w-3 h-3 text-emerald-600" />
                            </span>
                          )}
                          {(inv.eb_bill_document || inv.paid_receipt_document) && (
                            <span
                              title={`Attachments: ${[inv.eb_bill_document && 'EB Bill', inv.paid_receipt_document && 'Paid Receipt'].filter(Boolean).join(', ')}`}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-0.5"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{[inv.eb_bill_document && 'EB', inv.paid_receipt_document && 'Rec'].filter(Boolean).length}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Month */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {inv.Invoice_Month}
                      </td>

                      {/* Tenant */}
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <strong className="text-slate-900 font-semibold">{inv.Tenant_Name}</strong>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase border ${
                              inv.rental_type === 'Lease'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {inv.rental_type || 'Rent'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{inv.Tenant_Mobile}</span>
                      </td>

                      {/* House & Unit */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block">{inv.House_name}</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] text-slate-500">
                            {inv.floor} • {inv.house_type}
                          </span>
                          {inv.Maintenance_Bill_ID && (
                            <span className="text-[9px] font-mono px-1 bg-blue-100 text-blue-700 rounded" title="Common Maintenance Bill ID">
                              {inv.Maintenance_Bill_ID}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* EB RR # */}
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {inv.EB_RR_Number || 'N/A'}
                      </td>

                      {/* Rent */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {inv.rental_type === 'Lease' ? (
                          <span className="text-amber-800 font-semibold text-[11px]">
                            ₹0 <span className="text-[10px] text-slate-400">(Lease)</span>
                          </span>
                        ) : (
                          formatCurrency(inv.Rent_Amount)
                        )}
                      </td>

                      {/* EB Charges */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0)}
                      </td>

                      {/* Water (Req 3: Separated) */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(inv.Water_Bill_Amount ?? inv.Water_Charges ?? 0)}
                      </td>

                      {/* Motor (Req 3: Separated) */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(inv.Motor_Bill_Amount ?? 0)}
                      </td>

                      {/* Maintenance (Req 3: Separated) */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(inv.Maintenance_Charges ?? 0)}
                      </td>

                      {/* Other / Carried Forward Arrears */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatCurrency((inv.Other_Charges ?? 0) + (inv.previous_balance_carried_forward ?? 0))}
                        {inv.previous_balance_carried_forward ? (
                          <span className="block text-[9px] text-amber-700 font-bold" title={`Carried from ${inv.previous_balance_month || 'prior month'}`}>
                            +{formatCurrency(inv.previous_balance_carried_forward)}
                          </span>
                        ) : null}
                      </td>

                      {/* Req 4: Total Payable to Owner (excludes EB) */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-950 bg-emerald-50/80 border-x border-emerald-200/60 text-xs">
                        {formatCurrency(calculatePayableToOwner(inv))}
                        {inv.Payment_Status !== 'Paid' && inv.Payment_Status !== 'Paid and Closed' && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            Due: {formatCurrency(calculatePayableToOwnerDue(inv))}
                          </span>
                        )}
                      </td>

                      {/* Gross Total Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(inv.Total_Amount)}
                        {inv.Total_Due !== undefined && inv.Total_Due < inv.Total_Amount && inv.Total_Due > 0 && (
                          <span className="block text-[10px] font-normal text-amber-700">
                            Due: {formatCurrency(inv.Total_Due)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {inv.Payment_Status === 'Paid and Closed' ? (
                          <span
                            title="Invoice is finalized and closed"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300"
                          >
                            <Lock className="w-3 h-3 text-emerald-600" />
                            <span>CLOSED</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            title="Click to toggle Paid/Pending"
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                              inv.Payment_Status === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : inv.Payment_Status === 'Partially Paid'
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {inv.Payment_Status === 'Paid' ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>PAID</span>
                              </>
                            ) : inv.Payment_Status === 'Partially Paid' ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-blue-600" />
                                <span>PARTIAL</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>PENDING</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setSelectedInvoiceForReceipt(inv)}
                            title={
                              inv.Payment_Status === 'Paid and Closed' || inv.is_closed
                                ? 'View Invoice (Readonly Mode — Paid & Closed)'
                                : 'View / Edit Invoice Details'
                            }
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              inv.Payment_Status === 'Paid and Closed' || inv.is_closed
                                ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                            }`}
                          >
                            {inv.Payment_Status === 'Paid and Closed' || inv.is_closed ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <Edit3 className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setSelectedInvoiceForReceipt(inv)}
                            title="Print Receipt Slip"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete bill ${inv.Invoice_ID}?`)) {
                                deleteInvoice(inv.id);
                              }
                            }}
                            title="Delete Bill"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
                  <tr>
                    <td colSpan={5} className="py-3 px-4 text-xs uppercase">
                      Summary Totals ({filteredInvoices.length} Bills)
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(totalRentBilled)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(totalEbBilled)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(
                        filteredInvoices.reduce(
                          (sum, i) => sum + (i.Water_Bill_Amount ?? i.Water_Charges ?? 0) + (i.Maintenance_Charges ?? 0) + (i.Other_Charges ?? 0),
                          0
                        )
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-base font-black text-indigo-700">
                      {formatCurrency(totalBilled)}
                    </td>
                    <td colSpan={2} className="py-3 px-4 text-center text-xs text-slate-500">
                      {filteredInvoices.filter((i) => i.Payment_Status === 'Paid' || i.Payment_Status === 'Paid and Closed').length} Paid /{' '}
                      {filteredInvoices.filter((i) => i.Payment_Status !== 'Paid' && i.Payment_Status !== 'Paid and Closed').length} Due
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* 2. House Maintenance Bills Table (Req 4.2) */
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                House Maintenance Bills ({filteredMaintenanceBills.length} Common Bills)
              </h2>
              <span className="text-[11px] text-slate-400">
                (Common motor readings &amp; dynamic maintenance charges split equally across house units)
              </span>
            </div>
            <button
              onClick={() => setIsAddMaintenanceBillOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create House Maintenance Bill</span>
            </button>
          </div>

          {filteredMaintenanceBills.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No maintenance bills found for current filters</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">
                Create a house maintenance bill to record common motor electricity and maintenance expenses.
              </p>
              <button
                onClick={() => setIsAddMaintenanceBillOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Maintenance Bill</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Bill ID</th>
                    <th className="py-3 px-4">House Name</th>
                    <th className="py-3 px-4">Month</th>
                    <th className="py-3 px-4">Motor Readings (Start &rarr; End)</th>
                    <th className="py-3 px-4 text-right">Motor Bill (₹)</th>
                    <th className="py-3 px-4 text-right">Other Charges (₹)</th>
                    <th className="py-3 px-4 text-center">Units</th>
                    <th className="py-3 px-4 text-right">Total Maintenance (₹)</th>
                    <th className="py-3 px-4 text-right font-black text-emerald-800">Per-Unit Share (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaintenanceBills.map((bill) => (
                    <tr
                      key={bill.id}
                      onClick={() => setSelectedMaintenanceBillForModal(bill)}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        <div className="flex items-center space-x-1.5">
                          <span>{bill.Bill_ID}</span>
                          {(bill.motor_eb_bill_document || bill.paid_receipt_document) && (
                            <span
                              title={`Attachments: ${[bill.motor_eb_bill_document && 'Motor EB Bill', bill.paid_receipt_document && 'Paid Receipt'].filter(Boolean).join(', ')}`}
                              className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-0.5"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{[bill.motor_eb_bill_document && 'Motor', bill.paid_receipt_document && 'Rec'].filter(Boolean).length}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {bill.House_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {bill.Billing_Month}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <span>{bill.Motor_Reading_Start} &rarr; {bill.Motor_Reading_End}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          ({bill.Motor_Units_Consumed} units)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(bill.Total_Motor_Bill_Amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        <span>{formatCurrency(bill.Total_Other_Charges)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({bill.charges.length} items)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                        {bill.Total_Units_Count}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(bill.Total_Maintenance_Amount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatCurrency(bill.Per_Unit_Share)}
                        <span className="text-[10px] text-emerald-600 font-normal ml-0.5">/unit</span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleMaintenanceStatus(bill)}
                          title="Click to toggle Paid/Pending"
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                            bill.Payment_Status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {bill.Payment_Status === 'Paid' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>COLLECTED</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>PENDING</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setSelectedMaintenanceBillForModal(bill)}
                            title="View / Edit Maintenance Bill Details"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete house maintenance bill ${bill.Bill_ID}?`)) {
                                deleteMaintenanceBill(bill.id);
                              }
                            }}
                            title="Delete Bill"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Rent Bill Modal */}
      <AddInvoiceModal
        isOpen={isAddInvoiceOpen}
        onClose={() => setIsAddInvoiceOpen(false)}
        defaultMonth={targetMonthForModal || (selectedMonth === 'All' ? 'November 2026' : selectedMonth)}
        defaultHouseName={targetHouseForModal || (selectedHouseFilter === 'All' ? undefined : selectedHouseFilter)}
        onSelectExistingInvoice={(existingInv) => {
          setIsAddInvoiceOpen(false);
          setSelectedInvoiceForReceipt(existingInv);
        }}
        onOpenWaterModal={(house, month) => {
          setTargetHouseForModal(house);
          setTargetMonthForModal(month);
          setIsAddInvoiceOpen(false);
          setIsRecordWaterReadingOpen(true);
        }}
        onOpenEbModal={(house, month) => {
          setTargetHouseForModal(house);
          setTargetMonthForModal(month);
          setIsAddInvoiceOpen(false);
          setIsRecordEbReadingOpen(true);
        }}
        onOpenMaintenanceModal={(house, month) => {
          setTargetHouseForModal(house);
          setTargetMonthForModal(month);
          setIsAddInvoiceOpen(false);
          setIsAddMaintenanceBillOpen(true);
        }}
      />

      {/* Record Water Reading Modal */}
      <RecordWaterReadingModal
        isOpen={isRecordWaterReadingOpen}
        onClose={() => setIsRecordWaterReadingOpen(false)}
        defaultMonth={targetMonthForModal || (selectedMonth === 'All' ? 'November 2026' : selectedMonth)}
        defaultHouseName={targetHouseForModal}
      />

      {/* Record EB Reading Modal */}
      <RecordEbReadingModal
        isOpen={isRecordEbReadingOpen}
        onClose={() => setIsRecordEbReadingOpen(false)}
        defaultMonth={targetMonthForModal || (selectedMonth === 'All' ? 'November 2026' : selectedMonth)}
        defaultHouseName={targetHouseForModal}
      />

      {/* Add Maintenance Bill Modal (Req 4.2) */}
      <AddMaintenanceBillModal
        isOpen={isAddMaintenanceBillOpen}
        onClose={() => setIsAddMaintenanceBillOpen(false)}
        defaultMonth={targetMonthForModal || (selectedMonth === 'All' ? 'November 2026' : selectedMonth)}
        defaultHouseName={targetHouseForModal}
        onSelectExistingBill={(existingMb) => {
          setIsAddMaintenanceBillOpen(false);
          setSelectedMaintenanceBillForModal(existingMb);
        }}
      />

      {/* Tenant Rent Bill View/Edit Modal */}
      <InvoiceViewEditModal
        invoice={selectedInvoiceForReceipt}
        isOpen={!!selectedInvoiceForReceipt}
        onClose={() => setSelectedInvoiceForReceipt(null)}
        onUpdateInvoice={(id, updates) => {
          updateInvoice(id, updates);
          if (selectedInvoiceForReceipt && selectedInvoiceForReceipt.id === id) {
            setSelectedInvoiceForReceipt({
              ...selectedInvoiceForReceipt,
              ...updates,
            });
          }
        }}
      />

      {/* House Maintenance Bill View/Edit Modal */}
      <MaintenanceBillViewModal
        bill={selectedMaintenanceBillForModal}
        isOpen={!!selectedMaintenanceBillForModal}
        onClose={() => setSelectedMaintenanceBillForModal(null)}
        onUpdateBill={(id, updates) => {
          updateMaintenanceBill(id, updates);
          if (selectedMaintenanceBillForModal && selectedMaintenanceBillForModal.id === id) {
            setSelectedMaintenanceBillForModal({
              ...selectedMaintenanceBillForModal,
              ...updates,
            });
          }
        }}
      />

      {/* Interactive Pending Balance Breakdown Modal (Req 5) */}
      <PendingBalanceModal
        isOpen={isPendingBalanceModalOpen}
        onClose={() => setIsPendingBalanceModalOpen(false)}
        invoices={filteredInvoices}
        selectedMonth={selectedMonth}
        onSelectInvoice={(inv) => {
          setSelectedInvoiceForReceipt(inv);
        }}
      />
    </div>
  );
};
