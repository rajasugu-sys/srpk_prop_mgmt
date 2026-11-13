import React from 'react';
import { X, Printer, CheckCircle2, Building, Receipt, Calendar, User, Zap, Droplets } from 'lucide-react';
import { MonthlyInvoice } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface InvoiceReceiptModalProps {
  invoice: MonthlyInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (invoice: MonthlyInvoice) => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onToggleStatus,
}) => {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Printable Card Area */}
        <div id="printable-receipt" className="p-6 space-y-5 bg-white text-slate-800">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black text-slate-900 tracking-tight">
                  SRKP PROPERTY MANAGEMENT
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Official Monthly Rent &amp; Utility Receipt
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg print:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Invoice Meta */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block font-mono">Invoice Number</span>
              <strong className="text-slate-900 font-bold text-sm font-mono">{invoice.Invoice_ID}</strong>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block font-mono">Billing Month</span>
              <strong className="text-indigo-700 font-bold text-sm">{invoice.Invoice_Month}</strong>
            </div>
          </div>

          {/* Tenant & House Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Tenant Details</span>
              <strong className="text-slate-900 font-bold block">{invoice.Tenant_Name}</strong>
              <span className="text-slate-600 font-mono text-[11px]">{invoice.Tenant_Mobile}</span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Property &amp; Unit</span>
              <strong className="text-slate-900 font-bold block">{invoice.House_name}</strong>
              <span className="text-slate-600 text-[11px]">{invoice.floor} • {invoice.house_type}</span>
            </div>
          </div>

          {/* Line items table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="py-2 px-3 text-left">Description</th>
                  <th className="py-2 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    House Rent ({invoice.floor} - {invoice.house_type})
                    {invoice.rental_type === 'Lease' && (
                      <span className="block text-[10px] text-amber-700 font-bold">
                        [Lease Agreement — ₹0 Monthly Rent]
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {formatCurrency(invoice.Rent_Amount)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    Electricity Board Charges (RR: {invoice.EB_RR_Number || 'N/A'})
                    {invoice.EB_Units_Consumed ? ` — ${invoice.EB_Units_Consumed} Units` : ''}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {formatCurrency(invoice.EB_Charges)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-800">Water Consumption Charges</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {formatCurrency(invoice.Water_Charges)}
                  </td>
                </tr>

                <tr>
                  <td className="py-2.5 px-3 font-medium text-slate-800">Building Maintenance</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold">
                    {formatCurrency(invoice.Maintenance_Charges)}
                  </td>
                </tr>

                {invoice.Other_Charges > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 font-medium text-slate-800">Other Miscellaneous Charges</td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold">
                      {formatCurrency(invoice.Other_Charges)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                <tr>
                  <td className="py-3 px-3 text-sm">TOTAL AMOUNT DUE</td>
                  <td className="py-3 px-3 text-right font-mono text-base text-indigo-700">
                    {formatCurrency(invoice.Total_Amount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Status Stamp */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-50 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500">Payment Status:</span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold ${
                  invoice.Payment_Status === 'Paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {invoice.Payment_Status === 'Paid' ? 'PAID' : 'PENDING'}
              </span>
            </div>

            {invoice.Payment_Status === 'Paid' && (
              <span className="text-emerald-700 font-medium">
                Paid on {invoice.Payment_Date || 'Recorded'} via {invoice.Payment_Mode || 'UPI'}
              </span>
            )}
          </div>
        </div>

        {/* Modal Action Buttons (hidden in print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between print:hidden">
          <button
            onClick={() => onToggleStatus(invoice)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              invoice.Payment_Status === 'Paid'
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            {invoice.Payment_Status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
