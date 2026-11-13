import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Wrench,
  Plus,
  Building,
  Gauge,
  Trash2,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Lock,
  Unlock,
  ExternalLink,
  Users,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { HouseMaintenanceBill, MaintenanceChargeItem, AttachedDocument } from '../../types';
import { generateNextMaintenanceBillId } from '../../utils/formatters';
import { AttachmentField } from '../common/AttachmentField';

interface AddMaintenanceBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
  defaultHouseName?: string;
  onSelectExistingBill?: (bill: HouseMaintenanceBill) => void;
}

export const AddMaintenanceBillModal: React.FC<AddMaintenanceBillModalProps> = ({
  isOpen,
  onClose,
  defaultMonth = 'November 2026',
  defaultHouseName,
  onSelectExistingBill,
}) => {
  const { houses, tenants, maintenanceBills, addMaintenanceBill, uniqueHouseNames } = useProperty();

  const nextBillId = generateNextMaintenanceBillId(maintenanceBills.map((b) => b.Bill_ID));

  // 1. House selection dropdown
  const [selectedHouseName, setSelectedHouseName] = useState<string>(
    defaultHouseName || uniqueHouseNames[0] || 'Bglr Old SR'
  );

  const [billingMonth, setBillingMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    if (isOpen && defaultHouseName) {
      setSelectedHouseName(defaultHouseName);
    }
  }, [isOpen, defaultHouseName]);

  useEffect(() => {
    if (isOpen && defaultMonth) {
      setBillingMonth(defaultMonth);
    }
  }, [isOpen, defaultMonth]);
  const [billDate, setBillDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(10);
    return d.toISOString().split('T')[0];
  });

  // Calculate total units in the selected house
  const totalUnitsInHouse = useMemo(() => {
    const matched = houses.filter(
      (h) => h.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase()
    );
    return Math.max(1, matched.length);
  }, [houses, selectedHouseName]);

  // Active tenants in this house
  const activeTenantsInHouse = useMemo(() => {
    return tenants.filter(
      (t) => t.is_active_tenant && t.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase()
    );
  }, [tenants, selectedHouseName]);

  // Duplicate check: no duplicate bills allowed for selected_house on any given month
  const existingDuplicateBill = useMemo(() => {
    if (!selectedHouseName || !billingMonth) return null;
    return (
      maintenanceBills.find(
        (b) =>
          b.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase() &&
          b.Billing_Month.trim().toLowerCase() === billingMonth.trim().toLowerCase()
      ) || null
    );
  }, [maintenanceBills, selectedHouseName, billingMonth]);

  // Look up previous month's maintenance bill for this house to chain motor readings (4.2.1)
  const previousHouseBill = useMemo(() => {
    if (!selectedHouseName) return null;
    const houseBills = maintenanceBills.filter(
      (b) => b.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase()
    );
    if (houseBills.length === 0) return null;
    return [...houseBills].sort((a, b) =>
      (b.Bill_Date || '').localeCompare(a.Bill_Date || '')
    )[0];
  }, [maintenanceBills, selectedHouseName]);

  // Motor Reading states
  const [motorStartUnlocked, setMotorStartUnlocked] = useState(false);
  const [motorReadingStart, setMotorReadingStart] = useState<string>('0');
  const [motorReadingEnd, setMotorReadingEnd] = useState<string>('0');
  const [totalMotorBillAmount, setTotalMotorBillAmount] = useState<string>('0');

  // Dynamic 0 to n Maintenance Charges - default to 0 items per requirement
  const [charges, setCharges] = useState<MaintenanceChargeItem[]>([]);

  const [paymentStatus, setPaymentStatus] = useState<'Pending' | 'Paid'>('Pending');
  const [notes, setNotes] = useState<string>('');
  const [motorEbBillDocument, setMotorEbBillDocument] = useState<AttachedDocument | null>(null);
  const [paidReceiptDocument, setPaidReceiptDocument] = useState<AttachedDocument | null>(null);
  const [error, setError] = useState<string>('');

  // Auto-populate motor readings when house or previous bill changes (4.2.1)
  useEffect(() => {
    const prevMotorEnd = previousHouseBill?.Motor_Reading_End;
    if (prevMotorEnd !== undefined && prevMotorEnd !== null && prevMotorEnd > 0) {
      setMotorReadingStart(String(prevMotorEnd));
      setMotorReadingEnd(String(prevMotorEnd + 4));
    } else {
      setMotorReadingStart('0');
      setMotorReadingEnd('5');
    }
  }, [previousHouseBill, selectedHouseName]);

  const isMotorStartFromPrev = Boolean(
    previousHouseBill?.Motor_Reading_End && previousHouseBill.Motor_Reading_End > 0
  );

  // Motor calculations
  const mStartVal = parseFloat(motorReadingStart) || 0;
  const mEndVal = parseFloat(motorReadingEnd) || 0;
  const motorUnitsConsumed = Math.max(0, mEndVal - mStartVal);
  const motorBillAmtVal = parseFloat(totalMotorBillAmount) || 0;

  // Validation: Motor_Reading_End must be >= Motor_Reading_Start (4.2.2)
  const motorValidationError = mEndVal < mStartVal ? 'Motor Reading End must be ≥ Motor Reading Start' : '';

  // Dynamic charges calculations (4.2.4)
  const totalOtherCharges = useMemo(() => {
    return charges.reduce((acc, c) => acc + (parseFloat(String(c.amount)) || 0), 0);
  }, [charges]);

  // Grand Total & Per Unit Share (4.2.5)
  // Autopopulate (4.2.3 + 4.2.4) / total_no_units_in_selected_house
  const totalMaintenanceAmount = Number((motorBillAmtVal + totalOtherCharges).toFixed(2));
  const perUnitShare = Number((totalMaintenanceAmount / totalUnitsInHouse).toFixed(2));

  // Charge manipulation handlers
  const handleAddCharge = () => {
    setCharges((prev) => [
      ...prev,
      {
        id: `ch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: '',
        amount: 0,
      },
    ]);
  };

  const handleUpdateCharge = (id: string, field: 'name' | 'amount', value: any) => {
    setCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCharge = (id: string) => {
    setCharges((prev) => prev.filter((c) => c.id !== id));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHouseName) {
      setError('Please select a house.');
      return;
    }

    if (existingDuplicateBill) {
      setError(
        `Duplicate prevented: A maintenance bill already exists for ${selectedHouseName} for ${billingMonth}.`
      );
      return;
    }

    if (motorValidationError) {
      setError(motorValidationError);
      return;
    }

    // Filter out completely blank charge rows
    const cleanedCharges = charges
      .filter((c) => c.name.trim().length > 0 || (c.amount && c.amount > 0))
      .map((c) => ({
        ...c,
        name: c.name.trim() || 'General Maintenance',
        amount: parseFloat(String(c.amount)) || 0,
      }));

    addMaintenanceBill({
      Bill_ID: nextBillId,
      House_name: selectedHouseName,
      Billing_Month: billingMonth.trim(),
      Bill_Date: billDate,
      Due_Date: dueDate,
      Motor_Reading_Start: mStartVal,
      Motor_Reading_End: mEndVal,
      Motor_Units_Consumed: motorUnitsConsumed,
      Total_Motor_Bill_Amount: motorBillAmtVal,
      charges: cleanedCharges,
      Total_Other_Charges: totalOtherCharges,
      Total_Units_Count: totalUnitsInHouse,
      Total_Maintenance_Amount: totalMaintenanceAmount,
      Per_Unit_Share: perUnitShare,
      Payment_Status: paymentStatus,
      Notes: notes.trim() || `Maintenance for ${billingMonth} split across ${totalUnitsInHouse} units (₹${perUnitShare.toLocaleString('en-IN')}/unit)`,
      motor_eb_bill_document: motorEbBillDocument,
      paid_receipt_document: paidReceiptDocument,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">Create House Maintenance Bill</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/30 text-emerald-200">
                  Common Bill
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Shared motor electricity &amp; common expenses split equally across house units
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Property & Month */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center space-x-1.5">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>1. House &amp; Billing Cycle</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Property / House Name *
                </label>
                <select
                  value={selectedHouseName}
                  onChange={(e) => setSelectedHouseName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {uniqueHouseNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Billing Month *
                </label>
                <input
                  type="text"
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  placeholder="e.g., November 2026"
                  className="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-bold rounded-xl focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* House Units Info */}
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-600">
                  Total Units in <strong>{selectedHouseName}</strong>:{' '}
                  <strong className="text-emerald-700 font-mono text-sm">{totalUnitsInHouse} units</strong>
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                ({activeTenantsInHouse.length} active tenants currently occupying)
              </span>
            </div>
          </div>

          {/* Duplicate Bill Warning (4.2: No duplicate bills allowed for selected_house on any month) */}
          {existingDuplicateBill && (
            <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-900 shadow-sm animate-in fade-in space-y-2.5">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center space-x-1.5">
                    <span>Maintenance Bill Already Exists for {billingMonth}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900">
                      {existingDuplicateBill.Bill_ID}
                    </span>
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    A maintenance bill for <strong>{selectedHouseName}</strong> ({billingMonth}) has already been generated with a per-unit share of <strong>₹{existingDuplicateBill.Per_Unit_Share.toLocaleString('en-IN')}</strong>.
                    To prevent duplicate billing, only one common bill is allowed per house per month.
                  </p>
                </div>
              </div>
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectExistingBill?.(existingDuplicateBill);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Pull Up Existing Bill ({existingDuplicateBill.Bill_ID})</span>
                </button>
              </div>
            </div>
          )}

          {/* Bill ID & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Bill ID (Auto)
              </label>
              <input
                type="text"
                readOnly
                value={nextBillId}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-300 font-mono text-xs font-bold text-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Bill Date
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Section 2: Motor Readings (4.2.1, 4.2.2, 4.2.3) */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-emerald-600" />
              <span>2. Common Motor Electricity Readings &amp; Bill</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 4.2.1: Motor_Reading_Start */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Motor Reading Start *
                  </label>
                  {isMotorStartFromPrev && (
                    <button
                      type="button"
                      onClick={() => setMotorStartUnlocked(!motorStartUnlocked)}
                      title="Toggle manual override"
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 flex items-center space-x-0.5 cursor-pointer"
                    >
                      {motorStartUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>{motorStartUnlocked ? 'Unlocked' : 'Prev Month'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={motorReadingStart}
                  readOnly={isMotorStartFromPrev && !motorStartUnlocked}
                  onChange={(e) => setMotorReadingStart(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold ${
                    isMotorStartFromPrev && !motorStartUnlocked
                      ? 'bg-slate-100 border-slate-300 text-slate-700'
                      : 'bg-white border-emerald-300 text-slate-900'
                  }`}
                  placeholder="0"
                  required
                />
              </div>

              {/* 4.2.2: Motor_Reading_End (Must be >= Motor_Reading_Start) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Motor Reading End * (≥ Start)
                </label>
                <input
                  type="number"
                  step="any"
                  value={motorReadingEnd}
                  onChange={(e) => setMotorReadingEnd(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold ${
                    motorValidationError
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-slate-300 bg-white'
                  }`}
                  placeholder="0"
                  required
                />
                {motorValidationError && (
                  <p className="text-[10px] text-red-600 mt-1">{motorValidationError}</p>
                )}
              </div>

              {/* 4.2.3: Total_Motor_Bill_Amount (Decimal) */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Total Motor Bill Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalMotorBillAmount}
                  onChange={(e) => setTotalMotorBillAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-800 bg-white/80 p-2 rounded-lg border border-emerald-100">
              <span>Units Consumed: <strong>{motorUnitsConsumed} units</strong></span>
              <span>Motor Bill: <strong>₹{motorBillAmtVal.toFixed(2)}</strong></span>
            </div>

            {/* Motor EB Bill Attachment (Req 3) */}
            <div className="pt-2 border-t border-emerald-200">
              <AttachmentField
                label="Attach Motor EB Bill / Submeter Photo"
                subLabel="Upload common motor electricity bill or submeter photo (PDF, JPG, PNG). Replaceable until bill is marked paid & closed."
                document={motorEbBillDocument}
                onDocumentChange={setMotorEbBillDocument}
                storageKeyPrefix={`maint-motor-${nextBillId}`}
                badgeText="Motor EB Bill"
              />
            </div>
          </div>

          {/* Section 3: Dynamic Maintenance Charges (4.2.4: 0 to n charges, user provides name & price) */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>3. Dynamic Maintenance Charges (0 to n items)</span>
              </span>
              <button
                type="button"
                onClick={handleAddCharge}
                className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Charge</span>
              </button>
            </div>

            {charges.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-dashed border-blue-200 text-center text-xs text-slate-500">
                No additional maintenance charges added yet. Click &quot;Add Charge&quot; to append custom charges.
              </div>
            ) : (
              <div className="space-y-2">
                {charges.map((charge, idx) => (
                  <div
                    key={charge.id}
                    className="flex items-center space-x-2 p-2 bg-white rounded-xl border border-blue-100 shadow-2xs"
                  >
                    <span className="text-[11px] font-mono text-slate-400 w-5 text-center">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={charge.name}
                      onChange={(e) => handleUpdateCharge(charge.id, 'name', e.target.value)}
                      placeholder="Charge Name (e.g., Security, Cleaning, Tank Wash)"
                      className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={charge.amount || ''}
                        onChange={(e) =>
                          handleUpdateCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCharge(charge.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Remove charge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-blue-900 bg-white p-2.5 rounded-lg border border-blue-200">
              <span className="font-semibold">Subtotal Other Charges ({charges.length} items):</span>
              <span className="font-mono font-bold text-sm text-blue-800">
                ₹{totalOtherCharges.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Section 4: Autopopulated Split & Per-Unit Share (4.2.5) */}
          <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-2.5">
            <div className="text-xs text-emerald-200 font-bold uppercase tracking-wider flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>4. Autopopulated Common Share Formula</span>
            </div>

            <div className="p-3 bg-emerald-900/60 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-emerald-200">
                <span>Total Motor Bill (4.2.3):</span>
                <span className="font-mono font-bold text-white">₹{motorBillAmtVal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-200">
                <span>Total Other Charges (4.2.4):</span>
                <span className="font-mono font-bold text-white">₹{totalOtherCharges.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-200 border-t border-emerald-800/80 pt-1.5">
                <span>Total Common Maintenance Expense:</span>
                <span className="font-mono font-bold text-amber-300">
                  ₹{totalMaintenanceAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-emerald-200">
                <span>Divided by Total Units in {selectedHouseName}:</span>
                <span className="font-mono font-bold text-white">{totalUnitsInHouse} units</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-emerald-800 pt-2 text-white">
              <div>
                <span className="text-xs uppercase tracking-wider block text-emerald-300">
                  Per-Unit Share Autopopulated:
                </span>
                <span className="text-[11px] text-emerald-300 font-mono">
                  (₹{totalMaintenanceAmount} ÷ {totalUnitsInHouse})
                </span>
              </div>
              <span className="font-mono text-2xl font-black text-amber-300">
                ₹{perUnitShare.toLocaleString('en-IN')}
                <span className="text-xs text-emerald-300 font-normal ml-1">/ unit</span>
              </span>
            </div>
          </div>

          {/* Status & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Common Maintenance Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Pending">Pending Collection</option>
                <option value="Paid">Collected / Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes / Audit Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Lift servicing bill included..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Maintenance Paid Receipt Attachment (Req 3) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <AttachmentField
              label="Attach Maintenance Paid Receipt / Bank Receipt"
              subLabel="Upload vendor paid voucher, society maintenance receipt, or bank transaction slip (PDF, JPG, PNG). Replaceable until bill is marked paid & closed."
              document={paidReceiptDocument}
              onDocumentChange={setPaidReceiptDocument}
              storageKeyPrefix={`maint-receipt-${nextBillId}`}
              badgeText="Maintenance Paid Receipt"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            {existingDuplicateBill ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSelectExistingBill?.(existingDuplicateBill);
                }}
                className="flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/25 transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Pull Up Existing Bill ({existingDuplicateBill.Bill_ID})</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={Boolean(motorValidationError)}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/25 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Maintenance Bill</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
