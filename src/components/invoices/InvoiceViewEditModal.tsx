import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Lock,
  Unlock,
  Edit3,
  Save,
  AlertCircle,
  Building,
  User,
  Zap,
  Droplets,
  Gauge,
  Calendar,
  Clock,
  IndianRupee,
  Check,
} from 'lucide-react';
import { MonthlyInvoice, InvoiceStatus, AttachedDocument } from '../../types';
import {
  formatCurrency,
  calculatePayableToOwner,
  calculatePayableToOwnerDue,
} from '../../utils/formatters';
import { AttachmentField } from '../common/AttachmentField';

interface InvoiceViewEditModalProps {
  invoice: MonthlyInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateInvoice: (id: string, updates: Partial<MonthlyInvoice>) => void;
}

interface InvoiceViewEditModalContentProps {
  invoice: MonthlyInvoice;
  onClose: () => void;
  onUpdateInvoice: (id: string, updates: Partial<MonthlyInvoice>) => void;
}

const InvoiceViewEditModalContent: React.FC<InvoiceViewEditModalContentProps> = ({
  invoice,
  onClose,
  onUpdateInvoice,
}) => {
  const isClosed = invoice.is_closed || invoice.Payment_Status === 'Paid and Closed';

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  // Editable Form State
  const [invoiceMonth, setInvoiceMonth] = useState(invoice.Invoice_Month);
  const [invoiceDate, setInvoiceDate] = useState(invoice.Invoice_Date || '');
  const [dueDate, setDueDate] = useState(invoice.Due_Date || '');

  // EB
  const [ebReadingStart, setEbReadingStart] = useState<string>(
    invoice.EB_Reading_Start !== undefined && invoice.EB_Reading_Start !== null
      ? String(invoice.EB_Reading_Start)
      : '0'
  );
  const [ebReadingEnd, setEbReadingEnd] = useState<string>(
    invoice.EB_Reading_End !== undefined && invoice.EB_Reading_End !== null
      ? String(invoice.EB_Reading_End)
      : '0'
  );
  const [ebBillAmount, setEbBillAmount] = useState<string>(
    String(invoice.EB_Bill_Amount ?? invoice.EB_Charges ?? 0)
  );
  const [isEbPaid, setIsEbPaid] = useState<boolean>(invoice.EB_Paid_Status === 'Paid');
  const [ebPaidAt, setEbPaidAt] = useState<string>(invoice.EB_Paid_At || 'Google Pay');
  const [ebPaidDate, setEbPaidDate] = useState<string>(
    invoice.EB_Paid_Date || new Date().toISOString().split('T')[0]
  );

  // Water
  const hasWaterMeter = Boolean(invoice.Water_RR_Number);
  const hasWaterMeter1 = Boolean(invoice.Water_RR_Number1);
  const waterBasePrice = invoice.Water_Base_Price !== undefined ? invoice.Water_Base_Price : 0.05;

  const [waterReadingStart, setWaterReadingStart] = useState<string>(
    invoice.Water_Reading_Start !== undefined && invoice.Water_Reading_Start !== null
      ? String(invoice.Water_Reading_Start)
      : '0'
  );
  const [waterReadingEnd, setWaterReadingEnd] = useState<string>(
    invoice.Water_Reading_End !== undefined && invoice.Water_Reading_End !== null
      ? String(invoice.Water_Reading_End)
      : '0'
  );
  const [water1ReadingStart, setWater1ReadingStart] = useState<string>(
    invoice.Water1_Reading_Start !== undefined && invoice.Water1_Reading_Start !== null
      ? String(invoice.Water1_Reading_Start)
      : '0'
  );
  const [water1ReadingEnd, setWater1ReadingEnd] = useState<string>(
    invoice.Water1_Reading_End !== undefined && invoice.Water1_Reading_End !== null
      ? String(invoice.Water1_Reading_End)
      : '0'
  );
  const [isWaterPaid, setIsWaterPaid] = useState<boolean>(invoice.Water_Paid_Status === 'Paid');
  const [waterPaidAt, setWaterPaidAt] = useState<string>(invoice.Water_Paid_At || 'Google Pay');
  const [waterPaidDate, setWaterPaidDate] = useState<string>(
    invoice.Water_Paid_Date || new Date().toISOString().split('T')[0]
  );

  // Motor
  const [motorReadingStart, setMotorReadingStart] = useState<string>(
    invoice.Motor_Reading_Start !== undefined && invoice.Motor_Reading_Start !== null
      ? String(invoice.Motor_Reading_Start)
      : '0'
  );
  const [motorReadingEnd, setMotorReadingEnd] = useState<string>(
    invoice.Motor_Reading_End !== undefined && invoice.Motor_Reading_End !== null
      ? String(invoice.Motor_Reading_End)
      : '0'
  );
  const [motorBillAmount, setMotorBillAmount] = useState<string>(
    String(invoice.Motor_Bill_Amount ?? 0)
  );

  // Rent & Other
  const [rentAmount, setRentAmount] = useState<string>(String(invoice.Rent_Amount ?? 0));
  const [maintenanceCharges, setMaintenanceCharges] = useState<string>(
    String(invoice.Maintenance_Charges ?? 0)
  );
  const [otherCharges, setOtherCharges] = useState<string>(String(invoice.Other_Charges ?? 0));

  // Requirement 3: Rent & Other Charges Due/Paid
  const [isRentPaid, setIsRentPaid] = useState<boolean>(invoice.Rent_Paid_Status === 'Paid');
  const [rentPaidDate, setRentPaidDate] = useState<string>(
    invoice.Rent_Paid_Date || new Date().toISOString().split('T')[0]
  );

  const [paymentMode, setPaymentMode] = useState<string>(invoice.Payment_Mode || 'UPI');
  const [notes, setNotes] = useState<string>(invoice.Notes || '');

  // Attachments: EB Bill & Paid Receipt (Req 2)
  const [ebBillDocument, setEbBillDocument] = useState<AttachedDocument | null>(
    invoice.eb_bill_document || null
  );
  const [paidReceiptDocument, setPaidReceiptDocument] = useState<AttachedDocument | null>(
    invoice.paid_receipt_document || null
  );

  const handleEbDocChange = (doc: AttachedDocument | null) => {
    setEbBillDocument(doc);
    onUpdateInvoice(invoice.id, { eb_bill_document: doc });
  };

  const handleReceiptDocChange = (doc: AttachedDocument | null) => {
    setPaidReceiptDocument(doc);
    onUpdateInvoice(invoice.id, { paid_receipt_document: doc });
  };

  // Reset form when invoice changes
  useEffect(() => {
    setIsEditing(false);
    setError('');
    setInvoiceMonth(invoice.Invoice_Month);
    setInvoiceDate(invoice.Invoice_Date || '');
    setDueDate(invoice.Due_Date || '');

    setEbReadingStart(
      invoice.EB_Reading_Start !== undefined && invoice.EB_Reading_Start !== null
        ? String(invoice.EB_Reading_Start)
        : '0'
    );
    setEbReadingEnd(
      invoice.EB_Reading_End !== undefined && invoice.EB_Reading_End !== null
        ? String(invoice.EB_Reading_End)
        : '0'
    );
    setEbBillAmount(String(invoice.EB_Bill_Amount ?? invoice.EB_Charges ?? 0));
    setIsEbPaid(invoice.EB_Paid_Status === 'Paid');
    setEbPaidAt(invoice.EB_Paid_At || 'Google Pay');
    setEbPaidDate(invoice.EB_Paid_Date || new Date().toISOString().split('T')[0]);

    setWaterReadingStart(
      invoice.Water_Reading_Start !== undefined && invoice.Water_Reading_Start !== null
        ? String(invoice.Water_Reading_Start)
        : '0'
    );
    setWaterReadingEnd(
      invoice.Water_Reading_End !== undefined && invoice.Water_Reading_End !== null
        ? String(invoice.Water_Reading_End)
        : '0'
    );
    setWater1ReadingStart(
      invoice.Water1_Reading_Start !== undefined && invoice.Water1_Reading_Start !== null
        ? String(invoice.Water1_Reading_Start)
        : '0'
    );
    setWater1ReadingEnd(
      invoice.Water1_Reading_End !== undefined && invoice.Water1_Reading_End !== null
        ? String(invoice.Water1_Reading_End)
        : '0'
    );
    setIsWaterPaid(invoice.Water_Paid_Status === 'Paid');
    setWaterPaidAt(invoice.Water_Paid_At || 'Google Pay');
    setWaterPaidDate(invoice.Water_Paid_Date || new Date().toISOString().split('T')[0]);

    setMotorReadingStart(
      invoice.Motor_Reading_Start !== undefined && invoice.Motor_Reading_Start !== null
        ? String(invoice.Motor_Reading_Start)
        : '0'
    );
    setMotorReadingEnd(
      invoice.Motor_Reading_End !== undefined && invoice.Motor_Reading_End !== null
        ? String(invoice.Motor_Reading_End)
        : '0'
    );
    setMotorBillAmount(String(invoice.Motor_Bill_Amount ?? 0));

    setRentAmount(String(invoice.Rent_Amount ?? 0));
    setMaintenanceCharges(String(invoice.Maintenance_Charges ?? 0));
    setOtherCharges(String(invoice.Other_Charges ?? 0));
    setIsRentPaid(invoice.Rent_Paid_Status === 'Paid');
    setRentPaidDate(invoice.Rent_Paid_Date || new Date().toISOString().split('T')[0]);
    setPaymentMode(invoice.Payment_Mode || 'UPI');
    setNotes(invoice.Notes || '');
    setEbBillDocument(invoice.eb_bill_document || null);
    setPaidReceiptDocument(invoice.paid_receipt_document || null);
  }, [invoice]);

  // Autocalculate Water Bill Amount in Edit Mode
  const wStartNum = parseFloat(waterReadingStart) || 0;
  const wEndNum = parseFloat(waterReadingEnd) || 0;
  const deltaWater = Math.max(0, wEndNum - wStartNum);

  const w1StartNum = parseFloat(water1ReadingStart) || 0;
  const w1EndNum = parseFloat(water1ReadingEnd) || 0;
  const deltaWater1 = hasWaterMeter1 ? Math.max(0, w1EndNum - w1StartNum) : 0;

  const totalWaterUnits = hasWaterMeter1 ? deltaWater + deltaWater1 : deltaWater;
  const calculatedWaterBillAmount = Number((totalWaterUnits * waterBasePrice).toFixed(2));

  // Edit Validations
  const ebStartVal = parseFloat(ebReadingStart) || 0;
  const ebEndVal = parseFloat(ebReadingEnd) || 0;
  const ebValidationError = ebEndVal < ebStartVal ? 'EB Reading End must be ≥ EB Reading Start' : '';

  const waterValidationError =
    hasWaterMeter && wEndNum < wStartNum ? 'Water Reading End must be ≥ Water Reading Start' : '';

  const water1ValidationError =
    hasWaterMeter1 && w1EndNum < w1StartNum ? 'Water1 Reading End must be ≥ Water1 Reading Start' : '';

  const motorStartVal = parseFloat(motorReadingStart) || 0;
  const motorEndVal = parseFloat(motorReadingEnd) || 0;
  const motorValidationError =
    motorEndVal < motorStartVal ? 'Motor Reading End must be ≥ Motor Reading Start' : '';

  const hasAnyValidationError = Boolean(
    ebValidationError || waterValidationError || water1ValidationError || motorValidationError
  );

  // Financial totals in edit mode
  const isRentType = invoice.rental_type !== 'Lease';
  const numRent = parseFloat(rentAmount) || 0;
  const numEb = parseFloat(ebBillAmount) || 0;
  const numMotor = parseFloat(motorBillAmount) || 0;
  const numMaint = parseFloat(maintenanceCharges) || 0;
  const numOther = parseFloat(otherCharges) || 0;
  const arrears = invoice.previous_balance_carried_forward || 0;

  const rentAndOtherAmount = numRent + numMaint + numOther + arrears;
  const isRentDeducted = isRentType && isRentPaid;

  const totalInvoiceAmount = Number(
    (numRent + numEb + calculatedWaterBillAmount + numMotor + numMaint + numOther + arrears).toFixed(2)
  );

  const payableToOwner = Number(
    (numRent + calculatedWaterBillAmount + numMotor + numMaint + numOther + arrears).toFixed(2)
  );

  const totalDeductions =
    (isEbPaid ? numEb : 0) +
    (isWaterPaid ? calculatedWaterBillAmount : 0) +
    (isRentDeducted ? rentAndOtherAmount : 0);
  const calculatedTotalDue = Math.max(0, Number((totalInvoiceAmount - totalDeductions).toFixed(2)));
  const payableToOwnerDue = isRentDeducted ? 0 : Math.max(0, calculatedTotalDue - (isEbPaid ? 0 : numEb));

  // Save changes handler
  const handleSaveChanges = () => {
    if (hasAnyValidationError) {
      setError('Please fix validation errors before saving.');
      return;
    }

    let nextStatus: InvoiceStatus = invoice.Payment_Status;
    if (calculatedTotalDue === 0) {
      nextStatus = 'Paid';
    } else if (isEbPaid || isWaterPaid || isRentDeducted) {
      nextStatus = 'Partially Paid';
    } else {
      nextStatus = 'Pending';
    }

    onUpdateInvoice(invoice.id, {
      Invoice_Month: invoiceMonth,
      Invoice_Date: invoiceDate,
      Due_Date: dueDate,
      Rent_Amount: invoice.rental_type === 'Lease' ? 0 : numRent,
      Rent_Paid_Status: isRentDeducted ? 'Paid' : 'Due',
      Rent_Paid_Date: isRentDeducted ? rentPaidDate : null,

      // EB
      EB_Reading_Start: ebStartVal,
      EB_Reading_End: ebEndVal,
      EB_Units_Consumed: Math.max(0, ebEndVal - ebStartVal),
      EB_Bill_Amount: numEb,
      EB_Paid_Status: isEbPaid ? 'Paid' : 'Due',
      EB_Paid_At: isEbPaid ? ebPaidAt : null,
      EB_Paid_Date: isEbPaid ? ebPaidDate : null,
      EB_Charges: numEb,

      // Water
      Water_Reading_Start: hasWaterMeter ? wStartNum : null,
      Water_Reading_End: hasWaterMeter ? wEndNum : null,
      Water1_Reading_Start: hasWaterMeter1 ? w1StartNum : null,
      Water1_Reading_End: hasWaterMeter1 ? w1EndNum : null,
      Water_Bill_Amount: calculatedWaterBillAmount,
      Water_Paid_Status: isWaterPaid ? 'Paid' : 'Due',
      Water_Paid_At: isWaterPaid ? waterPaidAt : null,
      Water_Paid_Date: isWaterPaid ? waterPaidDate : null,
      Water_Charges: calculatedWaterBillAmount,

      // Motor
      Motor_Reading_Start: motorStartVal,
      Motor_Reading_End: motorEndVal,
      Motor_Bill_Amount: numMotor,

      // Other
      Maintenance_Charges: numMaint,
      Other_Charges: numOther,
      previous_balance_carried_forward: arrears,
      previous_balance_month: invoice.previous_balance_month,
      payable_to_owner: payableToOwner,
      payable_to_owner_due: payableToOwnerDue,
      Total_Amount: totalInvoiceAmount,
      Total_Due: calculatedTotalDue,
      Payment_Status: nextStatus,
      Payment_Mode: (paymentMode as any) || 'UPI',
      Notes: notes,
      eb_bill_document: ebBillDocument,
      paid_receipt_document: paidReceiptDocument,
    });

    setIsEditing(false);
  };

  // Requirement 3 & 4: Mark as Paid and Closed
  const handleMarkPaidAndClosed = () => {
    const today = new Date().toISOString().split('T')[0];
    onUpdateInvoice(invoice.id, {
      Payment_Status: 'Paid and Closed',
      is_closed: true,
      Total_Due: 0,
      Rent_Paid_Status: 'Paid',
      Rent_Paid_Date: invoice.Rent_Paid_Date || today,
      EB_Paid_Status: 'Paid',
      EB_Paid_Date: invoice.EB_Paid_Date || today,
      Water_Paid_Status: 'Paid',
      Water_Paid_Date: invoice.Water_Paid_Date || today,
      Payment_Date: invoice.Payment_Date || today,
      Payment_Mode: invoice.Payment_Mode || 'UPI',
    });
    setIsEditing(false);
  };

  // Unlock/Reopen for admin adjustments
  const handleReopenInvoice = () => {
    const ebDeduction = invoice.EB_Paid_Status === 'Paid' ? (invoice.EB_Bill_Amount || invoice.EB_Charges || 0) : 0;
    const waterDeduction = invoice.Water_Paid_Status === 'Paid' ? (invoice.Water_Bill_Amount || invoice.Water_Charges || 0) : 0;
    const rentDeduction = invoice.Rent_Paid_Status === 'Paid' ? (invoice.Rent_Amount + invoice.Maintenance_Charges + invoice.Other_Charges) : 0;
    const remainingDue = Math.max(0, invoice.Total_Amount - (ebDeduction + waterDeduction + rentDeduction));

    onUpdateInvoice(invoice.id, {
      Payment_Status: remainingDue === 0 ? 'Paid' : 'Pending',
      is_closed: false,
      Total_Due: remainingDue,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Printable Card Area */}
        <div id="printable-receipt" className="p-5 sm:p-6 space-y-4 bg-white text-slate-800 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  SRKP PROPERTY MANAGEMENT
                </span>
                {isClosed && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>PAID &amp; CLOSED</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Official Monthly Rent &amp; Utility Invoice Breakdown
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg print:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Closed Status Notice Banner */}
          {isClosed ? (
            <div className="p-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">
                  This invoice is marked as <strong>Paid and Closed</strong>. Meter readings and charges are locked from modifications.
                </span>
              </div>
              <button
                type="button"
                onClick={handleReopenInvoice}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline ml-2 shrink-0 cursor-pointer"
              >
                Reopen Invoice
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-indigo-50/70 text-indigo-900 rounded-xl border border-indigo-100 text-xs flex items-center justify-between print:hidden">
              <span className="font-medium">
                {isEditing ? 'Editing invoice readings & charges...' : 'Invoice is active and can be updated until marked as Paid & Closed.'}
              </span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Invoice</span>
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Meta Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Invoice #</span>
              <strong className="text-slate-900 font-bold font-mono">{invoice.Invoice_ID}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Billing Month</span>
              {isEditing ? (
                <input
                  type="text"
                  value={invoiceMonth}
                  onChange={(e) => setInvoiceMonth(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold"
                />
              ) : (
                <strong className="text-indigo-700 font-bold">{invoice.Invoice_Month}</strong>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Invoice Date</span>
              {isEditing ? (
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                />
              ) : (
                <span className="font-mono text-slate-700">{invoice.Invoice_Date}</span>
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono uppercase">Due Date</span>
              {isEditing ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                />
              ) : (
                <span className="font-mono text-slate-700">{invoice.Due_Date}</span>
              )}
            </div>
          </div>

          {/* Tenant & House Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase">Tenant Details</span>
              <div className="flex items-center space-x-2">
                <strong className="text-slate-900 font-bold text-sm">{invoice.Tenant_Name}</strong>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {invoice.rental_type || 'Rent'}
                </span>
              </div>
              <p className="text-slate-600 font-mono text-[11px]">{invoice.Tenant_Mobile}</p>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase">Property &amp; Unit</span>
              <strong className="text-slate-900 font-bold text-sm block">{invoice.House_name}</strong>
              <p className="text-slate-600 text-[11px]">
                {invoice.floor} Floor • {invoice.house_type}
              </p>
            </div>
          </div>

          {/* Section: Electricity Board (EB) */}
          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 uppercase flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>Electricity Board (EB) (RR: {invoice.EB_RR_Number || 'N/A'})</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  (isEditing ? isEbPaid : invoice.EB_Paid_Status === 'Paid')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {(isEditing ? isEbPaid : invoice.EB_Paid_Status === 'Paid') ? 'Paid' : 'Due'}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">Start Reading</label>
                    <input
                      type="number"
                      step="any"
                      value={ebReadingStart}
                      readOnly={isEbPaid}
                      disabled={isEbPaid}
                      onChange={(e) => setEbReadingStart(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        isEbPaid
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">End Reading (≥ Start)</label>
                    <input
                      type="number"
                      step="any"
                      value={ebReadingEnd}
                      readOnly={isEbPaid}
                      disabled={isEbPaid}
                      onChange={(e) => setEbReadingEnd(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        isEbPaid
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                          : ebValidationError
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-300 bg-white'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">EB Bill Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ebBillAmount}
                      readOnly={isEbPaid}
                      disabled={isEbPaid}
                      onChange={(e) => setEbBillAmount(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        isEbPaid
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
                {!isEbPaid && ebValidationError && <p className="text-[10px] text-red-600">{ebValidationError}</p>}

                {/* EB Due/Paid Checkbox */}
                <div className="pt-1.5 border-t border-amber-200">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isEbPaid}
                      onChange={(e) => setIsEbPaid(e.target.checked)}
                      className="rounded text-amber-600 cursor-pointer"
                    />
                    <span>EB Bill is Paid (Deduct from Total Due)</span>
                  </label>
                  {isEbPaid && (
                    <div className="grid grid-cols-2 gap-2 mt-1.5 p-2 bg-amber-50/60 rounded-lg border border-amber-200">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Paid At</label>
                        <input
                          type="text"
                          placeholder="Paid At (e.g. BESCOM / Google Pay)"
                          value={ebPaidAt}
                          onChange={(e) => setEbPaidAt(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Paid Date</label>
                        <input
                          type="date"
                          value={ebPaidDate}
                          onChange={(e) => setEbPaidDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Start Reading</span>
                  <strong className="font-mono">{invoice.EB_Reading_Start ?? 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">End Reading</span>
                  <strong className="font-mono">{invoice.EB_Reading_End ?? 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Units</span>
                  <strong className="font-mono">
                    {invoice.EB_Units_Consumed ??
                      (invoice.EB_Reading_End && invoice.EB_Reading_Start
                        ? invoice.EB_Reading_End - invoice.EB_Reading_Start
                        : 'N/A')}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Bill Amount</span>
                  <strong className="font-mono text-slate-900">
                    {formatCurrency(invoice.EB_Bill_Amount ?? invoice.EB_Charges)}
                  </strong>
                  {invoice.EB_Paid_Status === 'Paid' && invoice.EB_Paid_Date && (
                    <span className="block text-[9px] text-emerald-700">
                      Paid: {invoice.EB_Paid_Date} ({invoice.EB_Paid_At || 'Recorded'})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* EB Bill Attachment (Req 2) */}
            <div className="pt-2 border-t border-amber-200">
              <AttachmentField
                label="EB Bill / Meter Photo"
                subLabel="Electricity bill statement or meter snapshot. Replaceable until invoice is marked paid & closed."
                document={ebBillDocument}
                onDocumentChange={handleEbDocChange}
                storageKeyPrefix={`invoice-eb-${invoice.Invoice_ID}`}
                badgeText="EB Bill Document"
                isLocked={isClosed}
                lockedReason="Invoice is marked Paid and Closed. Attachments cannot be replaced."
              />
            </div>
          </div>

          {/* Section: Water Consumption */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 uppercase flex items-center space-x-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                <span>Water Consumption &amp; Base Price (₹{waterBasePrice}/litre)</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  (isEditing ? isWaterPaid : invoice.Water_Paid_Status === 'Paid')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {(isEditing ? isWaterPaid : invoice.Water_Paid_Status === 'Paid') ? 'Paid' : 'Due'}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-2 pt-1">
                {hasWaterMeter && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-blue-100">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block">
                        Water Reading Start (RR: {invoice.Water_RR_Number})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={waterReadingStart}
                        readOnly={isWaterPaid}
                        disabled={isWaterPaid}
                        onChange={(e) => setWaterReadingStart(e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                          isWaterPaid
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block">
                        Water Reading End (≥ Start)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={waterReadingEnd}
                        readOnly={isWaterPaid}
                        disabled={isWaterPaid}
                        onChange={(e) => setWaterReadingEnd(e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                          isWaterPaid
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                            : waterValidationError
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                  </div>
                )}
                {!isWaterPaid && waterValidationError && <p className="text-[10px] text-red-600">{waterValidationError}</p>}

                {hasWaterMeter1 && (
                  <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded border border-blue-100">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block">
                        Water1 Reading Start (RR: {invoice.Water_RR_Number1})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={water1ReadingStart}
                        readOnly={isWaterPaid}
                        disabled={isWaterPaid}
                        onChange={(e) => setWater1ReadingStart(e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                          isWaterPaid
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-600 block">
                        Water1 Reading End (≥ Start)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={water1ReadingEnd}
                        readOnly={isWaterPaid}
                        disabled={isWaterPaid}
                        onChange={(e) => setWater1ReadingEnd(e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                          isWaterPaid
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed select-none'
                            : water1ValidationError
                            ? 'border-red-500 bg-red-50'
                            : 'border-slate-300 bg-white'
                        }`}
                      />
                    </div>
                  </div>
                )}
                {!isWaterPaid && water1ValidationError && <p className="text-[10px] text-red-600">{water1ValidationError}</p>}

                {/* Non-editable autocalculated water bill */}
                <div className="p-2 bg-white rounded border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-700 block">
                      Autocalculated Water Bill Amount (Non-Editable):
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {!hasWaterMeter1
                        ? `Formula: ((${wEndNum} - ${wStartNum}) × ₹${waterBasePrice}/L) = (${deltaWater} L × ₹${waterBasePrice}/L)`
                        : `Formula: (((${wEndNum} - ${wStartNum}) + (${w1EndNum} - ${w1StartNum})) × ₹${waterBasePrice}/L) = (${deltaWater + deltaWater1} L × ₹${waterBasePrice}/L)`}
                    </span>
                  </div>
                  <strong className="text-sm font-black text-blue-700 font-mono">
                    ₹{calculatedWaterBillAmount.toFixed(2)}
                  </strong>
                </div>

                {/* Water Due/Paid Checkbox */}
                <div className="pt-1.5 border-t border-blue-200">
                  <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isWaterPaid}
                      onChange={(e) => setIsWaterPaid(e.target.checked)}
                      className="rounded text-blue-600 cursor-pointer"
                    />
                    <span>Water Bill is Paid (Deduct from Total Due)</span>
                  </label>
                  {isWaterPaid && (
                    <div className="grid grid-cols-2 gap-2 mt-1.5 p-2 bg-blue-50/60 rounded-lg border border-blue-200">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Paid At</label>
                        <input
                          type="text"
                          placeholder="Paid At (e.g. BWSSB / UPI)"
                          value={waterPaidAt}
                          onChange={(e) => setWaterPaidAt(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Paid Date</label>
                        <input
                          type="date"
                          value={waterPaidDate}
                          onChange={(e) => setWaterPaidDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Meter 1 Readings</span>
                  <strong className="font-mono">
                    {invoice.Water_Reading_Start ?? 0} &rarr; {invoice.Water_Reading_End ?? 0}
                  </strong>
                </div>
                {hasWaterMeter1 && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Meter 2 Readings</span>
                    <strong className="font-mono">
                      {invoice.Water1_Reading_Start ?? 0} &rarr; {invoice.Water1_Reading_End ?? 0}
                    </strong>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 block">Base Price</span>
                  <strong className="font-mono">₹{waterBasePrice}/litre</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Water Bill Amount</span>
                  <strong className="font-mono text-blue-800">
                    {formatCurrency(invoice.Water_Bill_Amount ?? invoice.Water_Charges)}
                  </strong>
                  {invoice.Water_Paid_Status === 'Paid' && invoice.Water_Paid_Date && (
                    <span className="block text-[9px] text-emerald-700">
                      Paid: {invoice.Water_Paid_Date} ({invoice.Water_Paid_At || 'Recorded'})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Motor Readings */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
            <span className="font-bold text-emerald-950 uppercase flex items-center space-x-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-600" />
              <span>Motor Readings &amp; Charges</span>
            </span>

            {isEditing ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block">Motor Start</label>
                  <input
                    type="number"
                    step="any"
                    value={motorReadingStart}
                    onChange={(e) => setMotorReadingStart(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block">Motor End (≥ Start)</label>
                  <input
                    type="number"
                    step="any"
                    value={motorReadingEnd}
                    onChange={(e) => setMotorReadingEnd(e.target.value)}
                    className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                      motorValidationError ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600 block">Motor Bill (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={motorBillAmount}
                    onChange={(e) => setMotorBillAmount(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Motor Start</span>
                  <strong className="font-mono">{invoice.Motor_Reading_Start ?? 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Motor End</span>
                  <strong className="font-mono">{invoice.Motor_Reading_End ?? 0}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Motor Bill Amount</span>
                  <strong className="font-mono text-slate-900">
                    {formatCurrency(invoice.Motor_Bill_Amount ?? 0)}
                  </strong>
                </div>
              </div>
            )}
            {motorValidationError && <p className="text-[10px] text-red-600">{motorValidationError}</p>}
          </div>

          {/* Section: Rent, Maintenance, Other */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase block">Rent &amp; Other Charges</span>
              {isRentType && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    (isEditing ? isRentPaid : invoice.Rent_Paid_Status === 'Paid')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {(isEditing ? isRentPaid : invoice.Rent_Paid_Status === 'Paid')
                    ? `Paid${invoice.Rent_Paid_Date ? ` (${invoice.Rent_Paid_Date})` : ''}`
                    : 'Due'}
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">
                      Rent (₹) {invoice.rental_type === 'Lease' && '(Lease: 0)'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={rentAmount}
                      readOnly={invoice.rental_type === 'Lease' || isRentPaid}
                      disabled={invoice.rental_type === 'Lease' || isRentPaid}
                      onChange={(e) => setRentAmount(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        invoice.rental_type === 'Lease' || isRentPaid
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">Maintenance (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={maintenanceCharges}
                      readOnly={isRentPaid}
                      disabled={isRentPaid}
                      onChange={(e) => setMaintenanceCharges(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        isRentPaid
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block">Other (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={otherCharges}
                      readOnly={isRentPaid}
                      disabled={isRentPaid}
                      onChange={(e) => setOtherCharges(e.target.value)}
                      className={`w-full px-2 py-1 border rounded text-xs font-mono font-bold ${
                        isRentPaid
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Requirement 3: Rent & Other Charges Checkbox (Due/Paid) */}
                {isRentType && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isRentPaid}
                        onChange={(e) => setIsRentPaid(e.target.checked)}
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>Rent &amp; Other Charges is Paid (Deduct ₹{rentAndOtherAmount.toLocaleString('en-IN')} from Total Due)</span>
                    </label>

                    {isRentPaid && (
                      <div className="mt-1.5 p-2 bg-indigo-50/60 rounded-lg border border-indigo-200 max-w-xs">
                        <label className="block text-[9px] font-bold text-slate-600 uppercase mb-0.5">Rent Paid Date</label>
                        <input
                          type="date"
                          value={rentPaidDate}
                          onChange={(e) => setRentPaidDate(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">House Rent</span>
                  <strong className="font-mono">
                    {invoice.rental_type === 'Lease' ? '₹0 (Lease)' : formatCurrency(invoice.Rent_Amount)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Maintenance</span>
                  <strong className="font-mono">{formatCurrency(invoice.Maintenance_Charges ?? 0)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Other Charges</span>
                  <strong className="font-mono">{formatCurrency(invoice.Other_Charges ?? 0)}</strong>
                </div>
                {invoice.previous_balance_carried_forward ? (
                  <div className="col-span-3 pt-1 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-semibold">
                      Carried Forward Arrears ({invoice.previous_balance_month || 'Prior Month'}):
                    </span>
                    <strong className="font-mono text-amber-900 font-bold">
                      +{formatCurrency(invoice.previous_balance_carried_forward)}
                    </strong>
                  </div>
                ) : null}
              </div>
            )}

            {/* Paid Receipt Attachment (Req 2) */}
            <div className="pt-2 border-t border-slate-200">
              <AttachmentField
                label="Paid Receipt / Payment Proof"
                subLabel="Tenant payment receipt or UPI transaction proof. Replaceable until invoice is marked paid & closed."
                document={paidReceiptDocument}
                onDocumentChange={handleReceiptDocChange}
                storageKeyPrefix={`invoice-receipt-${invoice.Invoice_ID}`}
                badgeText="Payment Receipt"
                isLocked={isClosed}
                lockedReason="Invoice is marked Paid and Closed. Attachments cannot be replaced."
              />
            </div>
          </div>

          {/* Totals Summary Banner (Req 4: Total Payable to Owner vs Gross) */}
          <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span className="font-bold flex items-center space-x-1">
                <span>Total Payable to Owner (excl. EB):</span>
              </span>
              <strong className="font-mono text-sm text-emerald-400">
                {formatCurrency(isEditing ? payableToOwner : (invoice.payable_to_owner ?? (invoice.Total_Amount - (invoice.EB_Bill_Amount ?? invoice.EB_Charges ?? 0))))}
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 border-t border-slate-800 pt-1.5">
              <span>Gross Bill Amount (incl. EB):</span>
              <strong className="font-mono text-sm text-white">
                {formatCurrency(isEditing ? totalInvoiceAmount : invoice.Total_Amount)}
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs text-amber-300 border-t border-slate-800 pt-1.5">
              <span>
                Paid Deductions ({[
                  (isEditing ? isEbPaid : invoice.EB_Paid_Status === 'Paid') && 'EB',
                  (isEditing ? isWaterPaid : invoice.Water_Paid_Status === 'Paid') && 'Water',
                  (isEditing ? isRentDeducted : invoice.Rent_Paid_Status === 'Paid') && 'Rent & Charges',
                ].filter(Boolean).join(', ') || 'None'}):
              </span>
              <strong className="font-mono">
                - {formatCurrency(isEditing ? totalDeductions : (invoice.Total_Amount - (invoice.Total_Due ?? invoice.Total_Amount)))}
              </strong>
            </div>

            <div className="flex items-center justify-between text-sm font-bold border-t border-slate-700 pt-2">
              <div className="flex flex-col">
                <span className="uppercase tracking-wider">Total Due Remaining:</span>
                <span className="text-[10px] text-emerald-300/80 font-normal">
                  (Owner Due: {formatCurrency(isEditing ? payableToOwnerDue : calculatePayableToOwnerDue(invoice))})
                </span>
              </div>
              <strong className="font-mono text-lg text-amber-400">
                {formatCurrency(isEditing ? calculatedTotalDue : (invoice.Total_Due ?? invoice.Total_Amount))}
              </strong>
            </div>
          </div>

          {/* Notes */}
          {invoice.Notes && !isEditing && (
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 italic">
              <strong>Notes:</strong> {invoice.Notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center space-x-2">
            {/* Requirement 3: Option to update invoice until marked as Paid and Closed */}
            {!isClosed && (
              <button
                type="button"
                onClick={handleMarkPaidAndClosed}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark as Paid &amp; Closed</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={hasAnyValidationError}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
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

export const InvoiceViewEditModal: React.FC<InvoiceViewEditModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onUpdateInvoice,
}) => {
  if (!isOpen || !invoice) return null;

  return (
    <InvoiceViewEditModalContent
      key={invoice.id}
      invoice={invoice}
      onClose={onClose}
      onUpdateInvoice={onUpdateInvoice}
    />
  );
};
