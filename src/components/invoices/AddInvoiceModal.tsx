import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Receipt,
  Plus,
  Building,
  Zap,
  Droplets,
  AlertCircle,
  AlertTriangle,
  Lock,
  ExternalLink,
  Wrench,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';
import { MonthlyInvoice, AttachedDocument } from '../../types';
import { generateNextInvoiceId } from '../../utils/formatters';
import { AttachmentField } from '../common/AttachmentField';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
  defaultHouseName?: string;
  onSelectExistingInvoice?: (invoice: MonthlyInvoice) => void;
  onOpenWaterModal?: (houseName?: string, month?: string) => void;
  onOpenEbModal?: (houseName?: string, month?: string) => void;
  onOpenMaintenanceModal?: (houseName?: string, month?: string) => void;
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  isOpen,
  onClose,
  defaultMonth = 'November 2026',
  defaultHouseName,
  onSelectExistingInvoice,
  onOpenWaterModal,
  onOpenEbModal,
  onOpenMaintenanceModal,
}) => {
  const {
    tenants,
    houses,
    invoices,
    maintenanceBills,
    recordedWaterReadings,
    recordedEbReadings,
    addInvoice,
    uniqueHouseNames,
    getMaintenanceBillForHouse,
    getWaterReading,
    getEbReading,
  } = useProperty();

  const { isAuthenticated, connectedSheet, syncToGoogleSheet } = useGoogleSheets();

  const nextInvoiceId = generateNextInvoiceId(invoices.map((i) => i.Invoice_ID));

  // 1. House selection dropdown
  const [selectedHouseName, setSelectedHouseName] = useState<string>(
    defaultHouseName || uniqueHouseNames[0] || 'Bglr Old SR'
  );
  const [invoiceMonth, setInvoiceMonth] = useState(defaultMonth);

  // Sync props when modal opens or defaults change
  useEffect(() => {
    if (isOpen && defaultHouseName) {
      setSelectedHouseName(defaultHouseName);
    }
  }, [isOpen, defaultHouseName]);

  useEffect(() => {
    if (isOpen && defaultMonth) {
      setInvoiceMonth(defaultMonth);
    }
  }, [isOpen, defaultMonth]);

  // Active tenants occupying the selected house
  const activeTenantsInHouse = useMemo(() => {
    return tenants.filter(
      (t) => t.is_active_tenant && t.House_name.toLowerCase() === selectedHouseName.toLowerCase()
    );
  }, [tenants, selectedHouseName]);

  // Selected tenant in house
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // Auto-select first tenant when house changes
  useEffect(() => {
    if (activeTenantsInHouse.length > 0) {
      if (!activeTenantsInHouse.some((t) => t.Tenant_ID === selectedTenantId)) {
        setSelectedTenantId(activeTenantsInHouse[0].Tenant_ID);
      }
    } else {
      setSelectedTenantId('');
    }
  }, [selectedHouseName, activeTenantsInHouse, selectedTenantId]);

  const selectedTenant = activeTenantsInHouse.find((t) => t.Tenant_ID === selectedTenantId);

  // Matched House record
  const matchedHouse = useMemo(() => {
    if (!selectedTenant) return null;
    return (
      houses.find(
        (h) =>
          h.House_ID === selectedTenant.house_id ||
          (h.House_name.toLowerCase() === selectedTenant.House_name.toLowerCase() &&
            h.floor.toLowerCase() === selectedTenant.floor.toLowerCase() &&
            h.house_type.toLowerCase() === selectedTenant.house_type.toLowerCase())
      ) || null
    );
  }, [houses, selectedTenant]);

  // Form states
  const [invoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(10);
    return d.toISOString().split('T')[0];
  });

  // PREREQUISITE CHECK:
  // Rent Bill should not open and throw warning if ((water_recording, EB_recording, maintenance) bills are not present for current_month for the selected_house)
  const isWaterRecordedForHouse = useMemo(() => {
    if (!selectedHouseName || !invoiceMonth) return false;
    return recordedWaterReadings.some(
      (r) =>
        r.houseName.trim().toLowerCase() === selectedHouseName.trim().toLowerCase() &&
        r.month.trim().toLowerCase() === invoiceMonth.trim().toLowerCase()
    );
  }, [recordedWaterReadings, selectedHouseName, invoiceMonth]);

  const isEbRecordedForHouse = useMemo(() => {
    if (!selectedHouseName || !invoiceMonth) return false;
    return recordedEbReadings.some(
      (r) =>
        r.houseName.trim().toLowerCase() === selectedHouseName.trim().toLowerCase() &&
        r.month.trim().toLowerCase() === invoiceMonth.trim().toLowerCase()
    );
  }, [recordedEbReadings, selectedHouseName, invoiceMonth]);

  const isMaintenanceRecordedForHouse = useMemo(() => {
    if (!selectedHouseName || !invoiceMonth) return false;
    return maintenanceBills.some(
      (b) =>
        b.House_name.trim().toLowerCase() === selectedHouseName.trim().toLowerCase() &&
        b.Billing_Month.trim().toLowerCase() === invoiceMonth.trim().toLowerCase()
    );
  }, [maintenanceBills, selectedHouseName, invoiceMonth]);

  const areAllPrerequisitesMet = isWaterRecordedForHouse && isEbRecordedForHouse && isMaintenanceRecordedForHouse;

  // Duplicate invoice check for this tenant & month
  const existingDuplicateInvoice = useMemo(() => {
    if (!selectedTenant || !invoiceMonth) return null;
    return (
      invoices.find(
        (inv) =>
          inv.Tenant_ID === selectedTenant.Tenant_ID &&
          inv.Invoice_Month.trim().toLowerCase() === invoiceMonth.trim().toLowerCase()
      ) || null
    );
  }, [invoices, selectedTenant, invoiceMonth]);

  // EB Readings (Autopopulated and non-editable)
  const [ebReadingStart, setEbReadingStart] = useState<string>('0');
  const [ebReadingEnd, setEbReadingEnd] = useState<string>('0');
  const [ebBillAmount, setEbBillAmount] = useState<string>('0');
  const [isEbPaid, setIsEbPaid] = useState<boolean>(false);
  const [ebPaidAt, setEbPaidAt] = useState<string>('Google Pay');
  const [ebPaidDate, setEbPaidDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [ebBillDocument, setEbBillDocument] = useState<AttachedDocument | null>(null);

  // Water Readings (Autopopulated and non-editable)
  const [waterReadingStart, setWaterReadingStart] = useState<string>('0');
  const [waterReadingEnd, setWaterReadingEnd] = useState<string>('0');
  const [water1ReadingStart, setWater1ReadingStart] = useState<string>('0');
  const [water1ReadingEnd, setWater1ReadingEnd] = useState<string>('0');
  const [isWaterPaid, setIsWaterPaid] = useState<boolean>(false);
  const [waterPaidAt, setWaterPaidAt] = useState<string>('Google Pay');
  const [waterPaidDate, setWaterPaidDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Rent & Maintenance Charges (Autopopulated from Tenant setup and House Maintenance Bill)
  const [rentAmount, setRentAmount] = useState<string>('0');
  const [maintenanceCharges, setMaintenanceCharges] = useState<string>('0');
  const [otherCharges, setOtherCharges] = useState<string>('0');
  const [isRentPaid, setIsRentPaid] = useState<boolean>(false);
  const [rentPaidDate, setRentPaidDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paidReceiptDocument, setPaidReceiptDocument] = useState<AttachedDocument | null>(null);

  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Lookup House Maintenance Bill for selected house & month
  const matchedHouseMaintenanceBill = useMemo(() => {
    if (!selectedHouseName || !invoiceMonth) return null;
    return getMaintenanceBillForHouse(selectedHouseName, invoiceMonth) || null;
  }, [selectedHouseName, invoiceMonth, getMaintenanceBillForHouse]);

  // Autopopulate Maintenance Share from matchedHouseMaintenanceBill
  useEffect(() => {
    if (matchedHouseMaintenanceBill) {
      setMaintenanceCharges(String(matchedHouseMaintenanceBill.Per_Unit_Share));
    } else {
      setMaintenanceCharges('0');
    }
  }, [matchedHouseMaintenanceBill]);

  // When tenant or readings change, autopopulate EB and Water
  useEffect(() => {
    if (!selectedTenant) {
      setRentAmount('0');
      return;
    }

    // Rent
    if (selectedTenant.rental_type === 'Lease') {
      setRentAmount('0');
    } else {
      setRentAmount(String(selectedTenant.rent_amount ?? selectedTenant.monthly_rent ?? 0));
    }

    // Autopopulate EB from recorded EB reading for this unit
    const recEb = getEbReading(
      selectedTenant.House_name,
      selectedTenant.floor,
      selectedTenant.house_type,
      invoiceMonth
    );
    if (recEb) {
      setEbReadingStart(String(recEb.ebReadingStart));
      setEbReadingEnd(String(recEb.ebReadingEnd));
      setEbBillAmount(String(recEb.ebBillAmount));
    } else {
      setEbReadingStart('0');
      setEbReadingEnd('0');
      setEbBillAmount('0');
    }

    // Autopopulate Water from recorded Water reading for this unit
    const recWater = getWaterReading(
      selectedTenant.House_name,
      selectedTenant.floor,
      selectedTenant.house_type,
      invoiceMonth
    );
    if (recWater) {
      setWaterReadingStart(String(recWater.waterReadingStart));
      setWaterReadingEnd(String(recWater.waterReadingEnd));
      setWater1ReadingStart(String(recWater.water1ReadingStart || 0));
      setWater1ReadingEnd(String(recWater.water1ReadingEnd || 0));
    } else {
      setWaterReadingStart('0');
      setWaterReadingEnd('0');
      setWater1ReadingStart('0');
      setWater1ReadingEnd('0');
    }
  }, [selectedTenant, invoiceMonth, getEbReading, getWaterReading]);

  // Water meters presence
  const hasWaterMeter = Boolean(matchedHouse?.Water_RR_Number);
  const secondaryWaterRR = matchedHouse?.Water_RR_Number2 || (matchedHouse as any)?.Water_RR_Number1;
  const hasWaterMeter1 = Boolean(secondaryWaterRR && secondaryWaterRR.trim().length > 0);
  const waterRR1 = matchedHouse?.Water_RR_Number || 'N/A';
  const waterRR2 = secondaryWaterRR || '';

  // Water_Base_Price is price/litre (defaults to 0 if unset or 1899)
  const rawWbp = selectedTenant?.water_base_price;
  const waterBasePrice =
    (rawWbp === undefined || rawWbp === null || rawWbp === 1899 || String(rawWbp).includes('1899')) ? 0 : rawWbp;

  const wStartNum = parseFloat(waterReadingStart) || 0;
  const wEndNum = parseFloat(waterReadingEnd) || 0;
  const deltaWater = Math.max(0, wEndNum - wStartNum);

  const w1StartNum = parseFloat(water1ReadingStart) || 0;
  const w1EndNum = parseFloat(water1ReadingEnd) || 0;
  const deltaWater1 = hasWaterMeter1 ? Math.max(0, w1EndNum - w1StartNum) : 0;

  const totalWaterUnits = hasWaterMeter1 ? deltaWater + deltaWater1 : deltaWater;
  const calculatedWaterBillAmount = Number((totalWaterUnits * waterBasePrice).toFixed(2));

  // Numeric totals for current month
  const numRent = parseFloat(rentAmount) || 0;
  const numEb = parseFloat(ebBillAmount) || 0;
  const numMaint = parseFloat(maintenanceCharges) || 0;
  const numOther = parseFloat(otherCharges) || 0;

  // Req 6: Find previous unsettled balance to carry forward (e.g. Oct2026 balance added to Nov2026)
  const previousUnsettledInvoices = useMemo(() => {
    if (!selectedTenant || !invoiceMonth) return [];
    return invoices
      .filter((inv) => {
        if (inv.Tenant_ID !== selectedTenant.Tenant_ID) return false;
        if (inv.Invoice_Month.trim().toLowerCase() === invoiceMonth.trim().toLowerCase()) return false;
        const isSettled = inv.Payment_Status === 'Paid' || inv.Payment_Status === 'Paid and Closed' || (inv.Total_Due || 0) <= 0;
        return !isSettled;
      })
      .sort((a, b) => (b.Invoice_Date || '').localeCompare(a.Invoice_Date || ''));
  }, [invoices, selectedTenant, invoiceMonth]);

  const carriedForwardBalance = useMemo(() => {
    if (previousUnsettledInvoices.length === 0) return 0;
    return previousUnsettledInvoices[0].Total_Due ?? previousUnsettledInvoices[0].Total_Amount ?? 0;
  }, [previousUnsettledInvoices]);

  const carriedForwardMonth = previousUnsettledInvoices.length > 0 ? previousUnsettledInvoices[0].Invoice_Month : '';

  // Gross total billed for this month
  const currentMonthCharges = Number(
    (numRent + numEb + calculatedWaterBillAmount + numMaint + numOther).toFixed(2)
  );

  const totalInvoiceAmount = Number(
    (currentMonthCharges + carriedForwardBalance).toFixed(2)
  );

  // Req 4: Total Payable to Owner = Rent + Water + Maintenance + Other + Arrears (Excludes EB)
  const currentMonthOwnerCharges = Number(
    (numRent + calculatedWaterBillAmount + numMaint + numOther).toFixed(2)
  );
  const payableToOwner = Number(
    (currentMonthOwnerCharges + carriedForwardBalance).toFixed(2)
  );

  // Deduct paid components from Total Due
  const isRentType = selectedTenant?.rental_type !== 'Lease';
  const rentAndOtherAmount = numRent + numMaint + numOther;
  const isRentDeducted = isRentType && isRentPaid;

  const totalDeductions =
    (isEbPaid ? numEb : 0) +
    (isWaterPaid ? calculatedWaterBillAmount : 0) +
    (isRentDeducted ? rentAndOtherAmount : 0);

  const calculatedTotalDue = Math.max(0, Number((totalInvoiceAmount - totalDeductions).toFixed(2)));

  // Remaining owner portion due
  const payableToOwnerDue = isEbPaid
    ? calculatedTotalDue
    : Math.max(0, Number((calculatedTotalDue - numEb).toFixed(2)));

  const ebStartVal = parseFloat(ebReadingStart) || 0;
  const ebEndVal = parseFloat(ebReadingEnd) || 0;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areAllPrerequisitesMet) {
      setError('Cannot create rent bill: Water, EB, and Maintenance bills must all be recorded first.');
      return;
    }

    if (!selectedTenant) {
      setError('Please select a tenant.');
      return;
    }

    if (existingDuplicateInvoice) {
      setError(
        `Duplicate prevented: An invoice already exists for ${selectedTenant.Tenant_Name} for ${invoiceMonth}.`
      );
      return;
    }

    const isLease = selectedTenant.rental_type === 'Lease';

    let paymentStatus: 'Pending' | 'Partially Paid' | 'Paid' = 'Pending';
    if (calculatedTotalDue === 0) {
      paymentStatus = 'Paid';
    } else if (totalDeductions > 0) {
      paymentStatus = 'Partially Paid';
    }

    const createdInvoice = addInvoice({
      Invoice_ID: nextInvoiceId,
      Invoice_Month: invoiceMonth.trim(),
      Invoice_Date: invoiceDate,
      Due_Date: dueDate,
      Tenant_ID: selectedTenant.Tenant_ID,
      Tenant_Name: selectedTenant.Tenant_Name,
      Tenant_Mobile: selectedTenant.Tenant_Mobile,
      House_name: selectedTenant.House_name,
      floor: selectedTenant.floor,
      house_type: selectedTenant.house_type,
      house_id: selectedTenant.house_id || '',
      rental_type: selectedTenant.rental_type || 'Rent',
      Rent_Amount: isLease ? 0 : numRent,
      Rent_Paid_Status: isRentDeducted ? 'Paid' : 'Due',
      Rent_Paid_Date: isRentDeducted ? rentPaidDate : null,
      lease_amount: isLease ? selectedTenant.lease_amount : 0,

      // EB (Autopopulated from recorded readings)
      EB_RR_Number: matchedHouse?.EB_RR_Number || 'N/A',
      EB_Reading_Start: ebStartVal,
      EB_Reading_End: ebEndVal,
      EB_Units_Consumed: Math.max(0, ebEndVal - ebStartVal),
      EB_Bill_Amount: numEb,
      EB_Paid_Status: isEbPaid ? 'Paid' : 'Due',
      EB_Paid_At: isEbPaid ? ebPaidAt : null,
      EB_Paid_Date: isEbPaid ? ebPaidDate : null,
      EB_Charges: numEb,

      // Water (Autopopulated from recorded readings)
      Water_RR_Number: matchedHouse?.Water_RR_Number || null,
      Water_Reading_Start: hasWaterMeter ? wStartNum : null,
      Water_Reading_End: hasWaterMeter ? wEndNum : null,
      Water_RR_Number1: waterRR2 || null,
      Water1_Reading_Start: hasWaterMeter1 ? w1StartNum : null,
      Water1_Reading_End: hasWaterMeter1 ? w1EndNum : null,
      Water_Base_Price: waterBasePrice,
      Water_Bill_Amount: calculatedWaterBillAmount,
      Water_Paid_Status: isWaterPaid ? 'Paid' : 'Due',
      Water_Paid_At: isWaterPaid ? waterPaidAt : null,
      Water_Paid_Date: isWaterPaid ? waterPaidDate : null,
      Water_Charges: calculatedWaterBillAmount,

      // Common motor bill handled via House Maintenance Bill
      Motor_Reading_Start: null,
      Motor_Reading_End: null,
      Motor_Bill_Amount: 0,
      Maintenance_Bill_ID: matchedHouseMaintenanceBill?.Bill_ID,

      // Maintenance & Other
      Maintenance_Charges: numMaint,
      Other_Charges: numOther,

      // Carried Forward Unsettled Balance (Req 6)
      previous_balance_carried_forward: carriedForwardBalance,
      previous_balance_month: carriedForwardMonth || undefined,

      // Totals
      Total_Amount: totalInvoiceAmount,
      Total_Due: calculatedTotalDue,
      payable_to_owner: payableToOwner,
      payable_to_owner_due: payableToOwnerDue,
      Payment_Status: paymentStatus,
      is_closed: false,
      Payment_Date: paymentStatus === 'Paid' ? invoiceDate : null,
      Payment_Mode: paymentStatus === 'Paid' ? 'UPI' : null,
      Notes: notes.trim() || (isLease ? 'Lease Tenant — Utilities & Maintenance' : ''),
      eb_bill_document: ebBillDocument,
      paid_receipt_document: paidReceiptDocument,
    });

    // Immediate auto-save to Google Sheet if connected
    if (isAuthenticated && connectedSheet) {
      syncToGoogleSheet(
        houses,
        tenants,
        [createdInvoice, ...invoices],
        maintenanceBills,
        recordedWaterReadings,
        recordedEbReadings
      ).catch((err) => {
        console.warn('Auto-save to Google Sheet on rent bill create:', err);
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">Create Tenant Rent Bill</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/30 text-indigo-200">
                  Rent Bill
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Autopopulated EB, Water &amp; House Maintenance Share
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

        {/* PREREQUISITE CHECK VIEW: Render warning if Water, EB, or Maintenance bill is not present */}
        {!areAllPrerequisitesMet ? (
          <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {/* Property and Month Selectors so user can inspect any house or month */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Selected Property &amp; Billing Month</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property / House Name
                  </label>
                  <select
                    value={selectedHouseName}
                    onChange={(e) => setSelectedHouseName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
                    Billing Month
                  </label>
                  <input
                    type="text"
                    value={invoiceMonth}
                    onChange={(e) => setInvoiceMonth(e.target.value)}
                    placeholder="e.g., November 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-300 text-xs font-bold rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                    Rent Bill Generation Blocked — Missing Prerequisites
                  </h3>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Rent bills cannot be generated for <strong>{selectedHouseName}</strong> for <strong>{invoiceMonth}</strong> because the preparatory preliminary bills are incomplete.
                  </p>
                  <p className="text-xs text-amber-800">
                    All three preliminary bills below (Water Recording, EB Recording, and House Maintenance Bill) must be recorded for <strong>{selectedHouseName}</strong> for <strong>{invoiceMonth}</strong> before generating individual tenant rent bills.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Prerequisite Cards with 1-Click Action Buttons */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Required Preliminary Bills ({selectedHouseName} • {invoiceMonth})
              </span>

              {/* 1. Water Recording */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isWaterRecordedForHouse
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-red-50/70 border-red-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isWaterRecordedForHouse
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-xs font-bold text-slate-900">
                        1. Water Reading Recording
                      </strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isWaterRecordedForHouse
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {isWaterRecordedForHouse ? 'Recorded ✓' : 'Missing ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Water meter readings and price/litre calculation for all units in {selectedHouseName}.
                    </p>
                  </div>
                </div>
                {!isWaterRecordedForHouse && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenWaterModal?.(selectedHouseName, invoiceMonth);
                    }}
                    className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Record Water Reading</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. EB Recording */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isEbRecordedForHouse
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-red-50/70 border-red-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isEbRecordedForHouse
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-xs font-bold text-slate-900">
                        2. EB Reading Recording
                      </strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isEbRecordedForHouse
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {isEbRecordedForHouse ? 'Recorded ✓' : 'Missing ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Electricity board meter readings and bill amounts for all units in {selectedHouseName}.
                    </p>
                  </div>
                </div>
                {!isEbRecordedForHouse && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEbModal?.(selectedHouseName, invoiceMonth);
                    }}
                    className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Record EB Reading</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3. House Maintenance Bill */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isMaintenanceRecordedForHouse
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-red-50/70 border-red-200'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isMaintenanceRecordedForHouse
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <strong className="text-xs font-bold text-slate-900">
                        3. House Maintenance Bill
                      </strong>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isMaintenanceRecordedForHouse
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {isMaintenanceRecordedForHouse ? 'Created ✓' : 'Missing ✗'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Common motor bill and dynamic maintenance charges shared across units in {selectedHouseName}.
                    </p>
                  </div>
                </div>
                {!isMaintenanceRecordedForHouse && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMaintenanceModal?.(selectedHouseName, invoiceMonth);
                    }}
                    className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Create Maintenance Bill</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ALL 3 BILLS ARE PRESENT: RENT BILL FORM WITH AUTOPOPULATED NON-EDITABLE FIELDS */
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Prerequisites Verified Badge */}
            <div className="p-2.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">
                  Prerequisites Met for {selectedHouseName} ({invoiceMonth}):
                </span>
                <span className="text-[11px] text-emerald-700">
                  Water ✓ • EB ✓ • Maintenance ✓
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-200/80 px-2 py-0.5 rounded-full font-bold">
                Autopopulated &amp; Locked
              </span>
            </div>

            {/* Section 1: Property & Tenant Selection */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>1. House &amp; Tenant Selection</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dropdown 1: House_name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Property / House Name *
                  </label>
                  <select
                    value={selectedHouseName}
                    onChange={(e) => setSelectedHouseName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    {uniqueHouseNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown 2: Tenant */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tenant Details * ({activeTenantsInHouse.length} in this House)
                  </label>
                  {activeTenantsInHouse.length === 0 ? (
                    <div className="p-2 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                      No active tenants in {selectedHouseName}.
                    </div>
                  ) : (
                    <select
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {activeTenantsInHouse.map((t) => (
                        <option key={t.id} value={t.Tenant_ID}>
                          {t.Tenant_Name} — {t.floor} ({t.house_type}) [{t.rental_type}]
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Selected Tenant Quick Card */}
              {selectedTenant && (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Rental Type</span>
                    <span
                      className={`inline-block font-bold text-[10px] px-1.5 py-0.5 rounded uppercase ${
                        selectedTenant.rental_type === 'Lease'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {selectedTenant.rental_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Base Rent</span>
                    <strong className="text-slate-800 font-mono">
                      {selectedTenant.rental_type === 'Lease' ? '₹0 (Lease)' : `₹${selectedTenant.rent_amount}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Water Base Price</span>
                    <strong className="text-blue-700 font-mono">
                      ₹{selectedTenant.water_base_price !== undefined ? selectedTenant.water_base_price : 0.05} / litre
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">EB RR No.</span>
                    <strong className="text-slate-700 font-mono truncate block">
                      {matchedHouse?.EB_RR_Number || 'N/A'}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate Invoice Warning & Quick Pull Up Action */}
            {existingDuplicateInvoice && (
              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-300 text-amber-900 shadow-sm animate-in fade-in space-y-2.5">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center space-x-1.5">
                      <span>Rent Bill Already Exists for {invoiceMonth}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200 text-amber-900">
                        {existingDuplicateInvoice.Invoice_ID}
                      </span>
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      An invoice has already been generated for <strong>{selectedTenant?.Tenant_Name}</strong> for <strong>{invoiceMonth}</strong> with status <strong>{existingDuplicateInvoice.Payment_Status}</strong>.
                      Creating duplicate rent bills for the same tenant and billing month is disabled.
                    </p>
                  </div>
                </div>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectExistingInvoice?.(existingDuplicateInvoice);
                    }}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pull Up Existing Bill ({existingDuplicateInvoice.Invoice_ID})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Invoice ID, Month, Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Bill ID (Auto)
                </label>
                <input
                  type="text"
                  readOnly
                  value={nextInvoiceId}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 font-mono text-xs font-bold text-slate-700 rounded-xl cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Billing Month
                </label>
                <input
                  type="text"
                  readOnly
                  value={invoiceMonth}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 rounded-xl cursor-not-allowed select-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>
            </div>

            {/* Section 2: Electricity Board (EB) Readings & Bill — Autopopulated & Non-Editable */}
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>2. Electricity Board (EB) Meter &amp; Bill</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-amber-800">
                    RR: {matchedHouse?.EB_RR_Number || 'N/A'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Non-Editable</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* EB_Reading_Start */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    EB Reading Start (Autopopulated)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={ebReadingStart}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                  />
                </div>

                {/* EB_Reading_End */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    EB Reading End (Autopopulated)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={ebReadingEnd}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                  />
                </div>

                {/* EB_Bill_Amount */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    EB Bill Amount (₹) (Autopopulated)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ebBillAmount}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Checkbox EB_Bill (Due/Paid) */}
              <div className="pt-2 border-t border-amber-200/70 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEbPaid}
                    onChange={(e) => setIsEbPaid(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>EB Bill is Paid (Deduct ₹{numEb.toLocaleString('en-IN')} from Total Due)</span>
                </label>

                {isEbPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-white rounded-lg border border-amber-200 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Paid At (Text) *
                      </label>
                      <input
                        type="text"
                        value={ebPaidAt}
                        onChange={(e) => setEbPaidAt(e.target.value)}
                        placeholder="e.g., BESCOM App / Google Pay / Axis Bank"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        required={isEbPaid}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Paid Date *
                      </label>
                      <input
                        type="date"
                        value={ebPaidDate}
                        onChange={(e) => setEbPaidDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        required={isEbPaid}
                      />
                    </div>
                  </div>
                )}

                {/* EB Bill Attachment */}
                <div className="pt-2">
                  <AttachmentField
                    label="Attach EB Bill / Meter Photo"
                    subLabel="Attach the electricity board statement or meter snapshot (PDF, JPG, PNG). Replaceable until invoice is marked paid & closed."
                    document={ebBillDocument}
                    onDocumentChange={setEbBillDocument}
                    storageKeyPrefix={`invoice-eb-${nextInvoiceId}`}
                    badgeText="EB Bill Document"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Water Readings & Bill — Autopopulated & Non-Editable */}
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>3. Water Consumption &amp; Autocalculated Bill</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-blue-800">
                    Rate: ₹{waterBasePrice}/litre
                  </span>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-200/60 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-blue-700" />
                    <span>Non-Editable</span>
                  </span>
                </div>
              </div>

              {/* Meter 1: Water_Reading_Start & End */}
              {hasWaterMeter ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-white rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Water Reading Start (RR: {waterRR1}) (Autopopulated)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={waterReadingStart}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Water Reading End (Autopopulated)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={waterReadingEnd}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No primary water RR Number on this house.</p>
              )}

              {/* Meter 2 if present */}
              {hasWaterMeter1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-white rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Water1 Reading Start (RR: {waterRR2}) (Autopopulated)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={water1ReadingStart}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Water1 Reading End (Autopopulated)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={water1ReadingEnd}
                      readOnly
                      className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              )}

              {/* Non-editable Autocalculated Water Bill Amount */}
              <div className="p-3 bg-white rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">
                    Water Bill Amount (Non-Editable Autocalculated)
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {!hasWaterMeter1
                      ? `Formula: ((${wEndNum} - ${wStartNum}) × ₹${waterBasePrice}/L) = (${deltaWater} L × ₹${waterBasePrice}/L)`
                      : `Formula: (((${wEndNum} - ${wStartNum}) + (${w1EndNum} - ${w1StartNum})) × ₹${waterBasePrice}/L) = (${deltaWater + deltaWater1} L × ₹${waterBasePrice}/L)`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-blue-700 font-mono">
                    ₹{calculatedWaterBillAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkbox Water_Bill (Due/Paid) */}
              <div className="pt-2 border-t border-blue-200/70 space-y-2">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWaterPaid}
                    onChange={(e) => setIsWaterPaid(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Water Bill is Paid (Deduct ₹{calculatedWaterBillAmount.toFixed(2)} from Total Due)</span>
                </label>

                {isWaterPaid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-white rounded-lg border border-blue-200 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Paid At (Text) *
                      </label>
                      <input
                        type="text"
                        value={waterPaidAt}
                        onChange={(e) => setWaterPaidAt(e.target.value)}
                        placeholder="e.g., BWSSB / UPI / Direct Cash"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        required={isWaterPaid}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Paid Date *
                      </label>
                      <input
                        type="date"
                        value={waterPaidDate}
                        onChange={(e) => setWaterPaidDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                        required={isWaterPaid}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Rent & Maintenance Charges — Autopopulated & Non-Editable */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  4. Rent &amp; Maintenance Charges
                </span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-slate-600" />
                  <span>Autopopulated &amp; Non-Editable</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* House Rent */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    House Rent (₹) {selectedTenant?.rental_type === 'Lease' && '(Lease: ₹0)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={rentAmount}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                  />
                </div>

                {/* Maintenance Charges (Autopopulated from House Maintenance Bill) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Maintenance Share (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={maintenanceCharges}
                    readOnly
                    className="w-full px-3 py-2 border border-slate-300 bg-slate-100 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-not-allowed select-none"
                    required
                  />
                </div>

                {/* Other Charges */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Other Charges (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Maintenance Bill Breakdown Card */}
              {matchedHouseMaintenanceBill && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <Wrench className="w-4 h-4 text-emerald-600" />
                      <span>Autopopulated from House Maintenance Bill: {matchedHouseMaintenanceBill.Bill_ID}</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                      {matchedHouseMaintenanceBill.Total_Units_Count} Units
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
                    <div>
                      <span className="text-emerald-800">Motor EB Bill Share:</span>{' '}
                      <strong className="font-mono">
                        ₹{(matchedHouseMaintenanceBill.Total_Motor_Bill_Amount / (matchedHouseMaintenanceBill.Total_Units_Count || 1)).toFixed(2)}
                      </strong>{' '}
                      <span className="text-emerald-700 text-[10px]">(Total: ₹{matchedHouseMaintenanceBill.Total_Motor_Bill_Amount})</span>
                    </div>
                    <div>
                      <span className="text-emerald-800">Other Maintenance Share:</span>{' '}
                      <strong className="font-mono">
                        ₹{((matchedHouseMaintenanceBill.Total_Maintenance_Amount - matchedHouseMaintenanceBill.Total_Motor_Bill_Amount) / (matchedHouseMaintenanceBill.Total_Units_Count || 1)).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                  {matchedHouseMaintenanceBill.charges && matchedHouseMaintenanceBill.charges.length > 0 && (
                    <div className="pt-1.5 border-t border-emerald-200/60">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                        Included Common Charges:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {matchedHouseMaintenanceBill.charges.map((c, idx) => (
                          <span
                            key={c.id || idx}
                            className="px-2 py-0.5 bg-white border border-emerald-200 rounded-lg text-[10px] font-medium text-emerald-900"
                          >
                            {c.name}: ₹{c.amount}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-1 text-[11px] text-emerald-800 font-semibold pt-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Equal Unit Share: ₹{matchedHouseMaintenanceBill.Per_Unit_Share.toLocaleString('en-IN')} (Non-editable)</span>
                  </div>
                </div>
              )}

              {/* Checkbox Rent & Other Charges (Due/Paid) */}
              {isRentType && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRentPaid}
                      onChange={(e) => setIsRentPaid(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      Rent &amp; Other Charges is Paid (Deduct ₹{rentAndOtherAmount.toLocaleString('en-IN')} from Total Due)
                    </span>
                  </label>

                  {isRentPaid && (
                    <div className="p-2.5 bg-white rounded-lg border border-indigo-200 animate-in fade-in max-w-xs">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">
                        Rent Paid Date *
                      </label>
                      <input
                        type="date"
                        value={rentPaidDate}
                        onChange={(e) => setRentPaidDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                        required={isRentPaid}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional billing note..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Paid Receipt Attachment */}
              <div className="pt-2 border-t border-slate-200">
                <AttachmentField
                  label="Attach Paid Receipt / Payment Proof"
                  subLabel="Attach tenant payment screenshot, bank receipt or acknowledgement (PDF, JPG, PNG). Replaceable until invoice is marked paid & closed."
                  document={paidReceiptDocument}
                  onDocumentChange={setPaidReceiptDocument}
                  storageKeyPrefix={`invoice-receipt-${nextInvoiceId}`}
                  badgeText="Payment Receipt"
                />
              </div>
            </div>

            {/* Financial Totals Card (Req 4: Payable to Owner & Req 6: Carried Forward Arrears) */}
            <div className="p-4 bg-indigo-950 text-white rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs text-indigo-200">
                <span>Current Month Charges (Rent + EB + Water + Maint):</span>
                <span className="font-mono font-bold text-sm text-white">
                  ₹{currentMonthCharges.toLocaleString('en-IN')}
                </span>
              </div>

              {carriedForwardBalance > 0 && (
                <div className="flex items-center justify-between text-xs text-amber-300 bg-amber-500/15 p-2 rounded-xl border border-amber-500/30">
                  <span className="font-bold">
                    + Previous Unsettled Dues Carried Forward ({carriedForwardMonth}):
                  </span>
                  <span className="font-mono font-bold text-sm text-amber-300">
                    + ₹{carriedForwardBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-indigo-300 border-t border-indigo-900 pt-1.5">
                <span>Gross Total Bill (includes EB ₹{numEb.toLocaleString('en-IN')}):</span>
                <span className="font-mono font-bold text-sm text-white">
                  ₹{totalInvoiceAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Total Payable to Owner (Req 4) */}
              <div className="flex items-center justify-between text-xs text-emerald-300 bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30">
                <div>
                  <strong className="block text-emerald-200 text-xs">Total Payable to Owner (Excludes EB):</strong>
                  <span className="text-[10px] text-emerald-300/80">Rent + Water + Maint + Other + Previous Dues</span>
                </div>
                <span className="font-mono text-base font-black text-emerald-300">
                  ₹{payableToOwner.toLocaleString('en-IN')}
                </span>
              </div>

              {(isEbPaid || isWaterPaid || isRentDeducted) && (
                <div className="flex items-center justify-between text-xs text-amber-300 border-t border-indigo-900 pt-1.5">
                  <span>
                    Deductions (Paid: {[isEbPaid && 'EB', isWaterPaid && 'Water', isRentDeducted && 'Rent & Charges'].filter(Boolean).join(', ')}):
                  </span>
                  <span className="font-mono font-bold">
                    - ₹{totalDeductions.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-bold border-t border-indigo-800 pt-2 text-white">
                <div>
                  <span className="uppercase tracking-wider block">Net Total Due:</span>
                  <span className="text-[11px] text-indigo-300 font-normal">
                    Owner Portion Due: <strong className="text-emerald-300 font-mono">₹{payableToOwnerDue.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <span className="font-mono text-xl font-black text-amber-400">
                  ₹{calculatedTotalDue.toLocaleString('en-IN')}
                </span>
              </div>
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
              {existingDuplicateInvoice ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectExistingInvoice?.(existingDuplicateInvoice);
                  }}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/25 transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Pull Up Existing Bill ({existingDuplicateInvoice.Invoice_ID})</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!selectedTenant}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Rent Bill</span>
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
