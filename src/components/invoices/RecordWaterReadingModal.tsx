import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Droplets,
  Building,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Unlock,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { RecordedWaterReading, House, Tenant } from '../../types';

interface RecordWaterReadingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
  defaultHouseName?: string;
}

interface UnitWaterEntry {
  houseId: string;
  houseName: string;
  floor: string;
  houseType: string;
  tenantName: string;
  waterBasePrice: number; // in INR per litre
  // Primary Meter
  waterRrNumber: string;
  waterReadingStart: number;
  waterReadingStartLocked: boolean;
  waterReadingEnd: number;
  // Secondary Meter (if available)
  waterRrNumber1: string | null;
  water1ReadingStart: number;
  water1ReadingStartLocked: boolean;
  water1ReadingEnd: number;
  // Computed
  computedTotalLitres: number;
  computedBillAmount: number;
}

export const RecordWaterReadingModal: React.FC<RecordWaterReadingModalProps> = ({
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
    recordedWaterReadings,
    saveBatchWaterReadings,
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
  const [entries, setEntries] = useState<UnitWaterEntry[]>([]);
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

    const initialEntries: UnitWaterEntry[] = houseUnits.map((unit) => {
      // Find active tenant in this unit if any
      const tenant = tenants.find(
        (t) =>
          t.is_active_tenant &&
          t.House_name.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
          t.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
          t.house_type.trim().toLowerCase() === unit.house_type.trim().toLowerCase()
      );

      const waterBasePrice = tenant?.water_base_price !== undefined ? tenant.water_base_price : 0.05;

      // Check if there is already a recorded reading for this unit & month
      const existingReading = recordedWaterReadings.find(
        (r) =>
          r.houseName.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
          r.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
          r.houseType.trim().toLowerCase() === unit.house_type.trim().toLowerCase() &&
          r.month.trim().toLowerCase() === selectedMonth.trim().toLowerCase()
      );

      // Check previous month reading from invoices or recorded readings
      const prevReading = [...invoices]
        .filter(
          (inv) =>
            inv.House_name.trim().toLowerCase() === unit.House_name.trim().toLowerCase() &&
            inv.floor.trim().toLowerCase() === unit.floor.trim().toLowerCase() &&
            inv.house_type.trim().toLowerCase() === unit.house_type.trim().toLowerCase() &&
            inv.Invoice_Month.trim().toLowerCase() !== selectedMonth.trim().toLowerCase() &&
            (inv.Water_Reading_End !== undefined && inv.Water_Reading_End !== null && inv.Water_Reading_End > 0)
        )
        .sort((a, b) => (b.Invoice_Date || '').localeCompare(a.Invoice_Date || ''))[0];

      let startVal = 0;
      let startLocked = false;
      let endVal = 0;

      let start1Val = 0;
      let start1Locked = false;
      let end1Val = 0;

      if (existingReading) {
        startVal = existingReading.waterReadingStart ?? existingReading.water_reading_start ?? 0;
        startLocked = startVal > 0;
        endVal = existingReading.waterReadingEnd ?? existingReading.water_reading_end ?? 0;
        start1Val = existingReading.water1ReadingStart ?? existingReading.water1_reading_start ?? 0;
        start1Locked = start1Val > 0;
        end1Val = existingReading.water1ReadingEnd ?? existingReading.water1_reading_end ?? 0;
      } else if (prevReading) {
        if (prevReading.Water_Reading_End && prevReading.Water_Reading_End > 0) {
          startVal = prevReading.Water_Reading_End;
          startLocked = true;
          endVal = prevReading.Water_Reading_End;
        }
        if (prevReading.Water1_Reading_End && prevReading.Water1_Reading_End > 0) {
          start1Val = prevReading.Water1_Reading_End;
          start1Locked = true;
          end1Val = prevReading.Water1_Reading_End;
        }
      }

      const totalLitres = Math.max(0, endVal - startVal) + (unit.Water_RR_Number2 ? Math.max(0, end1Val - start1Val) : 0);
      const computedBill = Math.round(totalLitres * waterBasePrice * 100) / 100;

      return {
        houseId: unit.House_ID,
        houseName: unit.House_name,
        floor: unit.floor,
        houseType: unit.house_type,
        tenantName: tenant ? tenant.Tenant_Name : 'Vacant',
        waterBasePrice,
        waterRrNumber: unit.Water_RR_Number || 'N/A',
        waterReadingStart: startVal,
        waterReadingStartLocked: startLocked,
        waterReadingEnd: endVal,
        waterRrNumber1: unit.Water_RR_Number2 || null,
        water1ReadingStart: start1Val,
        water1ReadingStartLocked: start1Locked,
        water1ReadingEnd: end1Val,
        computedTotalLitres: totalLitres,
        computedBillAmount: computedBill,
      };
    });

    setEntries(initialEntries);
    setSavedSuccess(false);
    setError('');
  }, [selectedHouseName, selectedMonth, houseUnits, tenants, invoices, recordedWaterReadings]);

  if (!isOpen) return null;

  const handleUpdateEntry = (index: number, field: keyof UnitWaterEntry, value: any) => {
    setEntries((prev) => {
      const next = [...prev];
      const entry = { ...next[index], [field]: value };

      // Recalculate
      const start0 = entry.waterReadingStart || 0;
      const end0 = entry.waterReadingEnd || 0;
      const start1 = entry.water1ReadingStart || 0;
      const end1 = entry.water1ReadingEnd || 0;

      const litresPrimary = Math.max(0, end0 - start0);
      const litresSecondary = entry.waterRrNumber1 ? Math.max(0, end1 - start1) : 0;
      const totalLitres = litresPrimary + litresSecondary;

      entry.computedTotalLitres = totalLitres;
      entry.computedBillAmount = Math.round(totalLitres * entry.waterBasePrice * 100) / 100;
      next[index] = entry;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: Water_Reading_End must be >= Water_Reading_Start
    for (const entry of entries) {
      if (entry.waterReadingEnd < entry.waterReadingStart) {
        setError(
          `Primary Water Reading End (${entry.waterReadingEnd}) cannot be less than Start (${entry.waterReadingStart}) for Unit ${entry.floor} - ${entry.houseType}.`
        );
        return;
      }
      if (entry.waterRrNumber1 && entry.water1ReadingEnd < entry.water1ReadingStart) {
        setError(
          `Secondary Water Reading End (${entry.water1ReadingEnd}) cannot be less than Start (${entry.water1ReadingStart}) for Unit ${entry.floor} - ${entry.houseType}.`
        );
        return;
      }
    }

    // Prepare batch readings
    const readingsToSave: RecordedWaterReading[] = entries.map((entry) => ({
      houseName: entry.houseName,
      floor: entry.floor,
      houseType: entry.houseType,
      month: selectedMonth,
      water_RR_number: entry.waterRrNumber,
      water_reading_start: entry.waterReadingStart,
      water_reading_end: entry.waterReadingEnd,
      water_RR_number1: entry.waterRrNumber1 || null,
      water1_reading_start: entry.waterRrNumber1 ? entry.water1ReadingStart : null,
      water1_reading_end: entry.waterRrNumber1 ? entry.water1ReadingEnd : null,
      water_base_price: entry.waterBasePrice,
      water_bill_amount: entry.computedBillAmount,
      waterRrNumber: entry.waterRrNumber,
      waterReadingStart: entry.waterReadingStart,
      waterReadingEnd: entry.waterReadingEnd,
      waterRrNumber1: entry.waterRrNumber1 || undefined,
      water1ReadingStart: entry.waterRrNumber1 ? entry.water1ReadingStart : undefined,
      water1ReadingEnd: entry.waterRrNumber1 ? entry.water1ReadingEnd : undefined,
      waterBasePrice: entry.waterBasePrice,
      waterBillAmount: entry.computedBillAmount,
      totalLitresConsumed: entry.computedTotalLitres,
      calculatedAmount: entry.computedBillAmount,
      recorded_at: new Date().toISOString(),
      recordedAt: new Date().toISOString(),
    }));

    saveBatchWaterReadings(readingsToSave);

    // Also auto-update any existing open invoice for these units for this month
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
        const newWaterBill = entry.computedBillAmount;
        const totalAmount =
          (existingInv.Rent_Amount || 0) +
          (existingInv.EB_Bill_Amount || 0) +
          newWaterBill +
          (existingInv.Maintenance_Charges || 0) +
          (existingInv.Other_Charges || 0);

        let totalDue = totalAmount;
        if (existingInv.Rent_Paid_Status === 'Paid') totalDue -= existingInv.Rent_Amount || 0;
        if (existingInv.EB_Paid_Status === 'Paid') totalDue -= existingInv.EB_Bill_Amount || 0;
        if (existingInv.Water_Paid_Status === 'Paid') totalDue -= newWaterBill;

        updateInvoice(existingInv.id, {
          Water_Reading_Start: entry.waterReadingStart,
          Water_Reading_End: entry.waterReadingEnd,
          Water_RR_Number1: entry.waterRrNumber1 || undefined,
          Water1_Reading_Start: entry.water1ReadingStart,
          Water1_Reading_End: entry.water1ReadingEnd,
          Water_Base_Price: entry.waterBasePrice,
          Water_Bill_Amount: newWaterBill,
          Water_Charges: newWaterBill,
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

  const totalLitresAllUnits = entries.reduce((acc, curr) => acc + curr.computedTotalLitres, 0);
  const totalWaterBillAllUnits = entries.reduce((acc, curr) => acc + curr.computedBillAmount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-800 to-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/30 text-white rounded-xl shadow-inner border border-sky-400/30">
              <Droplets className="w-6 h-6 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold">Record Water Readings</h2>
                <span className="text-[10px] bg-sky-400/30 text-sky-100 font-semibold px-2 py-0.5 rounded-full border border-sky-300/30">
                  Batch Entry
                </span>
              </div>
              <p className="text-xs text-sky-200">
                Autopopulate start readings and record meter end readings for all units in selected house
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-sky-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
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
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-slate-800 shadow-xs"
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
                className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden text-slate-800 shadow-xs w-36"
                placeholder="November 2026"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-medium text-slate-500">
              Total Units: <strong className="text-slate-800">{entries.length}</strong> | Total Litres:{' '}
              <strong className="text-sky-700">{totalLitresAllUnits.toLocaleString()} L</strong> | Water Charges:{' '}
              <strong className="text-emerald-700">₹{totalWaterBillAllUnits.toFixed(2)}</strong>
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
            <span className="font-semibold">Water readings saved successfully! Updating records...</span>
          </div>
        )}

        {/* Unit-wise Table / Cards */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 text-xs text-sky-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong>Formula applied:</strong> <code className="bg-white/80 px-1.5 py-0.5 rounded text-sky-900 font-mono text-[11px]">(((Water_Reading_End - Water_Reading_Start) + (Water1_Reading_End - Water1_Reading_Start)) * Water_Base_Price)</code>.
              Base price is configured per tenant in tenant details (₹/litre). Start readings are locked if chained from previous month.
            </div>
          </div>

          <div className="space-y-3">
            {entries.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                No units found for {selectedHouseName}. Please add units to this house in House Dashboard.
              </div>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={`${entry.houseId}-${idx}`}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-sky-300 transition-all shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center space-x-3">
                      <span className="px-2.5 py-1 bg-sky-100 text-sky-800 font-bold rounded-lg text-xs">
                        {entry.floor} - {entry.houseType}
                      </span>
                      <span className="text-xs text-slate-600">
                        Tenant: <strong className="text-slate-800">{entry.tenantName}</strong>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        (RR: {entry.waterRrNumber})
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-500">
                        Rate: <strong className="text-slate-700">₹{entry.waterBasePrice}/L</strong>
                      </span>
                      <span className="text-slate-500">
                        Litres: <strong className="text-sky-700">{entry.computedTotalLitres.toLocaleString()} L</strong>
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-xs">
                        ₹{entry.computedBillAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Meter Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    {/* Primary Meter */}
                    <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                          <span>Primary Meter (RR: {entry.waterRrNumber})</span>
                        </span>
                        {entry.waterReadingStartLocked && (
                          <button
                            type="button"
                            onClick={() => handleUpdateEntry(idx, 'waterReadingStartLocked', false)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                            title="Click to manually unlock start reading"
                          >
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Locked (Prev Month)</span>
                          </button>
                        )}
                        {!entry.waterReadingStartLocked && entry.waterReadingStart > 0 && (
                          <span className="text-[10px] text-emerald-600 flex items-center space-x-1">
                            <Unlock className="w-3 h-3" />
                            <span>Unlocked</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Start Reading
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={entry.waterReadingStartLocked}
                            value={entry.waterReadingStart}
                            onChange={(e) =>
                              handleUpdateEntry(idx, 'waterReadingStart', parseFloat(e.target.value) || 0)
                            }
                            className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-hidden ${
                              entry.waterReadingStartLocked
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-500'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-700 block mb-1">
                            End Reading <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={entry.waterReadingStart}
                            step="any"
                            value={entry.waterReadingEnd}
                            onChange={(e) =>
                              handleUpdateEntry(idx, 'waterReadingEnd', parseFloat(e.target.value) || 0)
                            }
                            className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 ${
                              entry.waterReadingEnd < entry.waterReadingStart
                                ? 'border-rose-400 text-rose-700'
                                : 'border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Secondary Meter (if available) */}
                    {entry.waterRrNumber1 ? (
                      <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">
                            Secondary Meter (RR: {entry.waterRrNumber1})
                          </span>
                          {entry.water1ReadingStartLocked && (
                            <button
                              type="button"
                              onClick={() => handleUpdateEntry(idx, 'water1ReadingStartLocked', false)}
                              className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer"
                              title="Click to unlock start reading"
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Locked</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                              Start Reading
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              disabled={entry.water1ReadingStartLocked}
                              value={entry.water1ReadingStart}
                              onChange={(e) =>
                                handleUpdateEntry(idx, 'water1ReadingStart', parseFloat(e.target.value) || 0)
                              }
                              className={`w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-hidden ${
                                entry.water1ReadingStartLocked
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                  : 'bg-white text-slate-800 border-slate-300 focus:ring-2 focus:ring-sky-500'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-slate-700 block mb-1">
                              End Reading <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="number"
                              min={entry.water1ReadingStart}
                              step="any"
                              value={entry.water1ReadingEnd}
                              onChange={(e) =>
                                handleUpdateEntry(idx, 'water1ReadingEnd', parseFloat(e.target.value) || 0)
                              }
                              className={`w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 ${
                                entry.water1ReadingEnd < entry.water1ReadingStart
                                  ? 'border-rose-400 text-rose-700'
                                  : 'border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50/40 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-center">
                        <span className="text-xs text-slate-400">
                          Single water meter unit (No Water RR 2)
                        </span>
                      </div>
                    )}
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
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center space-x-2 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save & Calculate Water Readings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
