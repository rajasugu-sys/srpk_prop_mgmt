import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Zap,
  Building,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Unlock,
  IndianRupee,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { RecordedEbReading, House, Tenant } from '../../types';

interface RecordEbReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
  defaultHouseName?: string;
}

interface UnitEbEntry {
  houseId: string;
  houseName: string;
  floor: string;
  houseType: string;
  tenantName: string;
  ebRrNumber: string;
  ebReadingStart: number;
  ebReadingStartLocked: boolean;
  ebReadingEnd: number;
  ebBillAmount: number;
  unitsConsumed: number;
}

export const RecordEbReadingModal: React.FC<RecordEbReadingModalProps> = ({
  isOpen,
  onClose,
  defaultMonth = 'November 2026',
  defaultHouseName,
}) => {
  const {
    houses,
    tenants,
    invoices,
    uniqueHouseNames,
    recordedEbReadings,
    saveBatchEbReadings,
    updateInvoice,
  } = useProperty();

  const [selectedHouseName, setSelectedHouseName] = useState<string>(
    defaultHouseName || uniqueHouseNames[0] || 'Bglr Old SR'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    if (isOpen && defaultHouseName) {
      setSelectedHouseName(defaultHouseName);
    }
  }, [isOpen, defaultHouseName]);

  useEffect(() => {
    if (isOpen && defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [isOpen, defaultMonth]);
  const [entries, setEntries] = useState<UnitEbEntry[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string>('');

  // Units belonging to the selected house
  const houseUnits = useMemo(() => {
    return houses.filter(
      (h) => h.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase()
    );
  }, [houses, selectedHouseName]);

  // Build entry list whenever house or month changes
  useEffect(() => {
    if (!selectedHouseName) return;

    const initialEntries: UnitEbEntry[] = houseUnits.map((unit) => {
      // Active tenant in unit
      const tenant = tenants.find(
        (t) =>
          t.is_active_tenant &&
          t.House_name.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
          t.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
          t.house_type.trim().toLowerCase() === unit.house_type.trim().toLowerCase()
      );

      // Check existing recorded reading for this unit & month
      const existingReading = recordedEbReadings.find(
        (r) =>
          r.houseName.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
          r.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
          r.houseType.trim().toLowerCase() === unit.house_type.trim().toLowerCase() &&
          r.month.trim().toLowerCase() === selectedMonth.trim().toLowerCase()
      );

      // Look up previous month reading from invoices
      const prevInvoice = [...invoices]
        .filter(
          (inv) =>
            inv.House_name.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
            inv.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
            inv.house_type.trim().toLowerCase() === unit.house_type.trim().toLowerCase() &&
            inv.Invoice_Month.trim().toLowerCase() !== selectedMonth.trim().toLowerCase() &&
            (inv.EB_Reading_End !== undefined && inv.EB_Reading_End !== null && inv.EB_Reading_End > 0)
        )
        .sort((a, b) => (b.Invoice_Date || '').localeCompare(a.Invoice_Date || ''))[0];

      let startVal = 0;
      let startLocked = false;
      let endVal = 0;
      let billVal = 0;

      if (existingReading) {
        startVal = existingReading.ebReadingStart ?? existingReading.EB_reading_start ?? 0;
        startLocked = startVal > 0;
        endVal = existingReading.ebReadingEnd ?? existingReading.EB_reading_end ?? 0;
        billVal = existingReading.ebBillAmount ?? existingReading.EB_bill_amount ?? 0;
      } else if (prevInvoice) {
        if (prevInvoice.EB_Reading_End && prevInvoice.EB_Reading_End > 0) {
          startVal = prevInvoice.EB_Reading_End;
          startLocked = true;
          endVal = prevInvoice.EB_Reading_End;
        }
      }

      return {
        houseId: unit.House_ID,
        houseName: unit.House_name,
        floor: unit.floor,
        houseType: unit.house_type,
        tenantName: tenant ? tenant.Tenant_Name : 'Vacant',
        ebRrNumber: unit.EB_RR_Number || 'N/A',
        ebReadingStart: startVal,
        ebReadingStartLocked: startLocked,
        ebReadingEnd: endVal,
        ebBillAmount: billVal,
        unitsConsumed: Math.max(0, endVal - startVal),
      };
    });

    setEntries(initialEntries);
    setSavedSuccess(false);
    setError('');
  }, [selectedHouseName, selectedMonth, houseUnits, tenants, invoices, recordedEbReadings]);

  if (!isOpen) return null;

  const handleUpdateEntry = (index: number, field: keyof UnitEbEntry, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const entry = { ...next[index], [field]: value };

      const start = entry.ebReadingStart || 0;
      const end = entry.ebReadingEnd || 0;
      entry.unitsConsumed = Math.max(0, end - start);

      next[index] = entry;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: EB_Reading_End must be >= EB_Reading_Start
    for (const entry of entries) {
      if (entry.ebReadingEnd < entry.ebReadingStart) {
        setError(
          `EB Reading End (${entry.ebReadingEnd}) cannot be less than Start (${entry.ebReadingStart}) for Unit ${entry.floor} - ${entry.houseType}.`
        );
        return;
      }
    }

    const readingsToSave: RecordedEbReading[] = entries.map((entry) => ({
      houseName: entry.houseName,
      floor: entry.floor,
      houseType: entry.houseType,
      month: selectedMonth,
      EB_RR_number: entry.ebRrNumber,
      EB_reading_start: entry.ebReadingStart,
      EB_reading_end: entry.ebReadingEnd,
      EB_units_consumed: entry.unitsConsumed,
      EB_bill_amount: entry.ebBillAmount,
      ebRrNumber: entry.ebRrNumber,
      ebReadingStart: entry.ebReadingStart,
      ebReadingEnd: entry.ebReadingEnd,
      ebBillAmount: entry.ebBillAmount,
      unitsConsumed: entry.unitsConsumed,
      recorded_at: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    }));

    saveBatchEbReadings(readingsToSave);

    // Update any existing open invoice for this unit & month
    entries.forEach((entry) => {
      const existingInv = invoices.find(
        (inv) =>
          inv.House_name.trim().toLowerCase() === entry.houseName.trim().toLowerCase() &&
          inv.floor.trim().toLowerCase() === entry.floor.trim().toLowerCase() &&
          inv.house_type.trim().toLowerCase() === entry.houseType.trim().toLowerCase() &&
          inv.Invoice_Month.trim().toLowerCase() === selectedMonth.trim().toLowerCase() &&
          !inv.is_closed
      );

      if (existingInv) {
        const newEbBill = entry.ebBillAmount;
        const totalAmount =
          (existingInv.Rent_Amount || 0) +
          newEbBill +
          (existingInv.Water_Bill_Amount || existingInv.Water_Charges || 0) +
          (existingInv.Maintenance_Charges || 0) +
          (existingInv.Other_Charges || 0);

        let totalDue = totalAmount;
        if (existingInv.Rent_Paid_Status === 'Paid') totalDue -= existingInv.Rent_Amount || 0;
        if (existingInv.EB_Paid_Status === 'Paid') totalDue -= newEbBill;
        if (existingInv.Water_Paid_Status === 'Paid') {
          totalDue -= existingInv.Water_Bill_Amount || existingInv.Water_Charges || 0;
        }

        updateInvoice(existingInv.id, {
          EB_Reading_Start: entry.ebReadingStart,
          EB_Reading_End: entry.ebReadingEnd,
          EB_Bill_Amount: newEbBill,
          EB_Charges: newEbBill,
          Total_Amount: totalAmount,
          Total_Due: Math.max(0, totalDue),
        });
      }
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const totalEbAmountAllUnits = entries.reduce((acc, curr) => acc + (curr.ebBillAmount || 0), 0);
  const totalEbUnitsConsumed = entries.reduce((acc, curr) => acc + (curr.unitsConsumed || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-yellow-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/30 text-white rounded-xl shadow-inner border border-amber-400/30">
              <Zap className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Record EB Readings</h2>
                <span className="text-[10px] bg-amber-400/30 text-amber-100 font-semibold px-2 py-0.5 rounded-full border border-amber-300/30">
                  Batch Entry
                </span>
              </div>
              <p className="text-xs text-amber-200">
                Autopopulate previous month end readings and record electricity bill amounts for all units
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls: House Dropdown & Month */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* House Dropdown */}
            <div className="flex items-center space-x-2">
              <Building className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-bold text-slate-700">Choose House:</label>
              <select
                value={selectedHouseName}
                onChange={(e) => setSelectedHouseName(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-slate-800 shadow-xs"
              >
                {uniqueHouseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Billing Month */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-bold text-slate-700">Month:</label>
              <input
                type="text"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-hidden text-slate-800 shadow-xs w-36"
                placeholder="November 2026"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-500">
              Total Units: <strong className="text-slate-800">{entries.length}</strong> | Total Units Consumed:{' '}
              <strong className="text-amber-700">{totalEbUnitsConsumed.toLocaleString()} kWh</strong> | Total EB Bill:{' '}
              <strong className="text-emerald-700">₹{totalEbAmountAllUnits.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {savedSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span className="font-semibold">EB readings and bill amounts saved successfully!</span>
          </div>
        )}

        {/* Unit-wise Table */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>EB Reading guidelines:</strong> Start reading is automatically populated from previous month's end reading and locked. End reading must be greater than or equal to start reading. Enter the official EB Bill Amount (decimal) from the Bescom / electricity bill.
            </div>
          </div>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No units found for {selectedHouseName}.
              </div>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={`${entry.houseId}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 transition-all shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-xs">
                        {entry.floor} - {entry.houseType}
                      </span>
                      <span className="text-xs text-slate-600">
                        Tenant: <strong className="text-slate-800">{entry.tenantName}</strong>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (EB RR: {entry.ebRrNumber})
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-500">
                        Units: <strong className="text-amber-700">{entry.unitsConsumed.toLocaleString()} kWh</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-xs">
                        ₹{(entry.ebBillAmount || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Meter Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    {/* Start reading */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-semibold text-slate-500">
                          Start Reading
                        </label>
                        {entry.ebReadingStartLocked && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEntry(idx, 'ebReadingStartLocked', false)}
                            className="text-[9px] text-slate-500 hover:text-slate-800 flex items-center space-x-0.5 cursor-pointer"
                            title="Click to unlock start reading"
                          >
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            <span>Locked</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={entry.ebReadingStartLocked}
                        value={entry.ebReadingStart}
                        onChange={(e) =>
                          handleUpdateEntry(idx, 'ebReadingStart', parseFloat(e.target.value) || 0)
                        }
                        className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-hidden ${
                          entry.ebReadingStartLocked
                            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-amber-500'
                        }`}
                      />
                    </div>

                    {/* End reading */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-700 block mb-1">
                        End Reading <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={entry.ebReadingStart}
                        step="any"
                        value={entry.ebReadingEnd}
                        onChange={(e) =>
                          handleUpdateEntry(idx, 'ebReadingEnd', parseFloat(e.target.value) || 0)
                        }
                        className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 ${
                          entry.ebReadingEnd < entry.ebReadingStart
                            ? 'border-rose-400 text-rose-700'
                            : 'border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* EB Bill Amount */}
                    <div>
                      <label className="text-[10px] font-semibold text-slate-700 block mb-1">
                        EB Bill Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.ebBillAmount || ''}
                          onChange={(e) =>
                            handleUpdateEntry(idx, 'ebBillAmount', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full text-xs font-bold pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={entries.length === 0 || savedSuccess}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 flex items-center space-x-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save EB Readings & Bill Amounts</span>
          </button>
        </div>
      </div>
    </div>
  );
};
