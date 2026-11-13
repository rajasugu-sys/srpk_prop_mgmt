/**
 * Date formatter for occupancy end date requirement: mmmm/yyyy (e.g., "October 2026")
 */
export function formatMonthYear(dateString?: string | null): string {
  if (!dateString) return 'Not Specified';
  try {
    // If it's already in YYYY-MM or YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parts[2] ? parseInt(parts[2], 10) : 1;
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return dateString;
  } catch {
    return dateString || 'N/A';
  }
}

/**
 * Currency formatter (INR format by default for Indian property management terms like EB RR Number)
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Generate next sequential House ID like 1..12 -> 13, or HSE-101 -> HSE-102
 */
export function generateNextHouseId(existingIds: string[]): string {
  let highestNum = 0;
  let isNumericFormat = true;

  for (const id of existingIds) {
    const trimmed = id.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num > highestNum) highestNum = num;
    } else {
      isNumericFormat = false;
      const match = trimmed.match(/(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) highestNum = num;
      }
    }
  }

  if (isNumericFormat && highestNum > 0) {
    return String(highestNum + 1);
  }
  return highestNum > 0 ? `HSE-${highestNum + 1}` : '1';
}

/**
 * Generate next sequential Tenant ID like TNT-101, TNT-102
 */
export function generateNextTenantId(existingIds: string[]): string {
  let highestNum = 100;
  for (const id of existingIds) {
    const match = id.match(/TNT-(\d+)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  }
  return `TNT-${highestNum + 1}`;
}

/**
 * Generate next sequential Invoice ID like INV-2026-10-001
 */
export function generateNextInvoiceId(existingIds: string[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}-${month}-`;
  
  let highestSeq = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const seqStr = id.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > highestSeq) highestSeq = seq;
    }
  }
  return `${prefix}${String(highestSeq + 1).padStart(3, '0')}`;
}

/**
 * Generate next sequential Maintenance Bill ID like MB-2026-10-001
 */
export function generateNextMaintenanceBillId(existingIds: string[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `MB-${year}-${month}-`;
  
  let highestSeq = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const seqStr = id.slice(prefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > highestSeq) highestSeq = seq;
    }
  }
  return `${prefix}${String(highestSeq + 1).padStart(3, '0')}`;
}

/**
 * Auto-calculate Occupancy End Date:
 * - If Rental_Type = 'Rent': End of the 11th month from Occupancy_start_date.
 *   (e.g., Nov 2026 start -> ends 2027-09-30; Jan 2026 start -> ends 2026-11-30).
 * - If Rental_Type = 'Lease': 2year (24 months) or 3year (36 months) term from start date.
 *   (e.g., 2025-06-01 with 2yr term -> ends 2027-05-31).
 */
export function calculateOccupancyEndDate(
  startDateStr: string,
  rentalType: 'Rent' | 'Lease',
  leaseTermYears: 2 | 3 = 2
): string {
  if (!startDateStr) return '';
  const parts = startDateStr.split('-');
  if (parts.length < 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed: 0 = Jan, 1 = Feb, etc.
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

  if (rentalType === 'Rent') {
    // 11th month from start date:
    // month is 1st month. Month (month + 10) is the 11th month.
    // The last day of month (month + 10) is given by day 0 of month (month + 11).
    const endOfMonth = new Date(year, month + 11, 0);
    const y = endOfMonth.getFullYear();
    const m = String(endOfMonth.getMonth() + 1).padStart(2, '0');
    const d = String(endOfMonth.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } else {
    // For Lease: 2 years (24 months) or 3 years (36 months)
    const targetYear = year + leaseTermYears;
    const targetMonth = month;
    const targetDay = day - 1;

    if (targetDay === 0) {
      // End of previous month
      const prevMonthEnd = new Date(targetYear, targetMonth, 0);
      const y = prevMonthEnd.getFullYear();
      const m = String(prevMonthEnd.getMonth() + 1).padStart(2, '0');
      const d = String(prevMonthEnd.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } else {
      // Normal day minus 1
      const exactDate = new Date(targetYear, targetMonth, targetDay);
      const y = exactDate.getFullYear();
      const m = String(exactDate.getMonth() + 1).padStart(2, '0');
      const d = String(exactDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
}

/**
 * Req 4: Calculate Total Payable to Owner
 * (Total Payable to Owner = Rent + Water + Maintenance + Motor & Other + Previous Balance Carried Forward)
 * EB_Bill is part of the Gross Total Bill, but NOT part of payable to owner.
 */
export function calculatePayableToOwner(inv: {
  Rent_Amount?: number;
  Water_Bill_Amount?: number;
  Water_Charges?: number;
  Maintenance_Charges?: number;
  Motor_Bill_Amount?: number;
  Other_Charges?: number;
  previous_balance_carried_forward?: number;
}): number {
  const rent = inv.Rent_Amount || 0;
  const water = inv.Water_Bill_Amount ?? inv.Water_Charges ?? 0;
  const maint = inv.Maintenance_Charges || 0;
  const motor = inv.Motor_Bill_Amount || 0;
  const other = inv.Other_Charges || 0;
  const prevArrears = inv.previous_balance_carried_forward || 0;
  return Number((rent + water + maint + motor + other + prevArrears).toFixed(2));
}

/**
 * Calculate Remaining Pending Balance Payable to Owner
 */
export function calculatePayableToOwnerDue(inv: {
  Total_Due?: number;
  Total_Amount?: number;
  Payment_Status?: string;
  EB_Paid_Status?: string;
  EB_Bill_Amount?: number;
  EB_Charges?: number;
  Rent_Amount?: number;
  Water_Bill_Amount?: number;
  Water_Charges?: number;
  Maintenance_Charges?: number;
  Motor_Bill_Amount?: number;
  Other_Charges?: number;
  previous_balance_carried_forward?: number;
}): number {
  if (inv.Payment_Status === 'Paid' || inv.Payment_Status === 'Paid and Closed') {
    return 0;
  }
  const totalDue = inv.Total_Due !== undefined ? inv.Total_Due : (inv.Total_Amount || 0);
  const ebAmount = inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0;
  const isEbPaid = inv.EB_Paid_Status === 'Paid';
  
  // If EB is unpaid, totalDue includes unpaid EB; so owner portion is totalDue - ebAmount
  const ownerDue = isEbPaid ? totalDue : Math.max(0, totalDue - ebAmount);
  return Number(ownerDue.toFixed(2));
}

