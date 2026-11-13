import React, { useState } from 'react';
import {
  X,
  Printer,
  Building,
  Gauge,
  Wrench,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Save,
  Users,
} from 'lucide-react';
import { HouseMaintenanceBill, AttachedDocument } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AttachmentField } from '../common/AttachmentField';

interface MaintenanceBillViewModalProps {
  bill: HouseMaintenanceBill | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBill?: (id: string, updates: Partial<HouseMaintenanceBill>) => void;
}

interface MaintenanceBillViewModalContentProps {
  bill: HouseMaintenanceBill;
  onClose: () => void;
  onUpdateBill?: (id: string, updates: Partial<HouseMaintenanceBill>) => void;
}

const MaintenanceBillViewModalContent: React.FC<MaintenanceBillViewModalContentProps> = ({
  bill,
  onClose,
  onUpdateBill,
}) => {
  const isClosed = bill.Payment_Status === 'Paid';

  const [isEditing, setIsEditing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(bill.Payment_Status);
  const [notes, setNotes] = useState(bill.Notes || '');

  // Attachments: Motor EB Bill & Paid Receipt (Req 3)
  const [motorEbBillDocument, setMotorEbBillDocument] = useState<AttachedDocument | null>(
    bill.motor_eb_bill_document || null
  );
  const [paidReceiptDocument, setPaidReceiptDocument] = useState<AttachedDocument | null>(
    bill.paid_receipt_document || null
  );

  const handleMotorDocChange = (doc: AttachedDocument | null) => {
    setMotorEbBillDocument(doc);
    onUpdateBill?.(bill.id, { motor_eb_bill_document: doc });
  };

  const handleReceiptDocChange = (doc: AttachedDocument | null) => {
    setPaidReceiptDocument(doc);
    onUpdateBill?.(bill.id, { paid_receipt_document: doc });
  };

  const handleSave = () => {
    onUpdateBill?.(bill.id, {
      Payment_Status: paymentStatus,
      Notes: notes.trim(),
      motor_eb_bill_document: motorEbBillDocument,
      paid_receipt_document: paidReceiptDocument,
    });
    setIsEditing(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">House Maintenance Bill</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300">
                  {bill.Bill_ID}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {bill.House_name} • {bill.Billing_Month}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrint}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              title="Print Bill Summary"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick House Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-slate-900">{bill.House_name}</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-600">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Split across <strong>{bill.Total_Units_Count} units</strong></span>
            </div>
          </div>

          {/* Motor Section */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
            <span className="text-xs font-bold text-emerald-950 uppercase flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>Common Motor Electricity</span>
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-400 block">Start Reading</span>
                <strong className="font-mono text-slate-800">{bill.Motor_Reading_Start}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-400 block">End Reading</span>
                <strong className="font-mono text-slate-800">{bill.Motor_Reading_End}</strong>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="text-[10px] text-slate-400 block">Motor Bill</span>
                <strong className="font-mono text-emerald-800">
                  {formatCurrency(bill.Total_Motor_Bill_Amount)}
                </strong>
              </div>
            </div>

            {/* Motor EB Bill Attachment (Req 3) */}
            <div className="pt-2 border-t border-emerald-200">
              <AttachmentField
                label="Motor EB Bill / Submeter Photo"
                subLabel="Common motor electricity bill or meter photo. Replaceable until bill is marked paid & closed."
                document={motorEbBillDocument}
                onDocumentChange={handleMotorDocChange}
                storageKeyPrefix={`maint-motor-${bill.Bill_ID}`}
                badgeText="Motor EB Bill"
                isLocked={isClosed}
                lockedReason="Maintenance Bill is marked Paid & Closed. Attachments cannot be replaced."
              />
            </div>
          </div>

          {/* Dynamic Charges List */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2">
            <span className="text-xs font-bold text-blue-950 uppercase flex items-center space-x-1.5">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>Dynamic Maintenance Charges ({bill.charges.length} items)</span>
            </span>

            {bill.charges.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No additional charges recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {bill.charges.map((charge, idx) => (
                  <div
                    key={charge.id || idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-blue-100 text-xs"
                  >
                    <span className="text-slate-700 font-medium">{charge.name}</span>
                    <strong className="font-mono text-slate-900">{formatCurrency(charge.amount)}</strong>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-blue-900 pt-1 font-semibold">
              <span>Subtotal Maintenance Charges:</span>
              <span className="font-mono font-bold">{formatCurrency(bill.Total_Other_Charges)}</span>
            </div>
          </div>

          {/* Grand Total & Per Unit Share */}
          <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-emerald-200">
              <span>Total Common Maintenance (Motor + Charges):</span>
              <span className="font-mono font-bold text-sm text-white">
                {formatCurrency(bill.Total_Maintenance_Amount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-emerald-200">
              <span>Equal Division:</span>
              <span className="font-mono">{formatCurrency(bill.Total_Maintenance_Amount)} ÷ {bill.Total_Units_Count} units</span>
            </div>
            <div className="flex items-center justify-between border-t border-emerald-800 pt-2">
              <span className="uppercase text-xs font-bold tracking-wider text-emerald-300">
                Autopopulated Share / Unit:
              </span>
              <span className="font-mono text-2xl font-black text-amber-300">
                {formatCurrency(bill.Per_Unit_Share)}
                <span className="text-xs font-normal text-emerald-300 ml-1">/ unit</span>
              </span>
            </div>
          </div>

          {/* Status & Notes */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 uppercase">Collection Status:</span>
              {isEditing ? (
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-xs"
                >
                  <option value="Pending">Pending Collection</option>
                  <option value="Paid">Collected / Paid</option>
                </select>
              ) : (
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                    bill.Payment_Status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {bill.Payment_Status}
                </span>
              )}
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Notes:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
              ) : (
                <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                  {bill.Notes || 'No notes provided.'}
                </p>
              )}
            </div>
          </div>

          {/* Maintenance Paid Receipt Attachment (Req 3) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <AttachmentField
              label="Common Maintenance Paid Receipt / Bank Receipt"
              subLabel="Vendor paid voucher, maintenance receipt, or bank transaction slip. Replaceable until bill is marked paid & closed."
              document={paidReceiptDocument}
              onDocumentChange={handleReceiptDocChange}
              storageKeyPrefix={`maint-receipt-${bill.Bill_ID}`}
              badgeText="Maintenance Paid Receipt"
              isLocked={isClosed}
              lockedReason="Maintenance Bill is marked Paid & Closed. Attachments cannot be replaced."
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Status / Notes</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MaintenanceBillViewModal: React.FC<MaintenanceBillViewModalProps> = ({
  bill,
  isOpen,
  onClose,
  onUpdateBill,
}) => {
  if (!isOpen || !bill) return null;

  return (
    <MaintenanceBillViewModalContent
      key={bill.id}
      bill={bill}
      onClose={onClose}
      onUpdateBill={onUpdateBill}
    />
  );
};
