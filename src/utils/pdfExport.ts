import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MonthlyInvoice } from '../types';

export function exportMonthlyBillingPdf(
  invoices: MonthlyInvoice[],
  filterMonth?: string,
  filterHouse?: string
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const title = 'SRKP PROPERTY MANAGEMENT';
  const subtitle = 'Monthly Billing & Rent Summary Statement';

  // Primary Header Brand Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 60, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 40, 36);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(subtitle, 40, 50);

  // Right-aligned report meta
  const now = new Date();
  const generatedText = `Generated: ${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  doc.text(generatedText, pageWidth - 40, 36, { align: 'right' });
  doc.text(`Scope: ${filterHouse || 'All Properties'} | Month: ${filterMonth || 'All Months'}`, pageWidth - 40, 50, { align: 'right' });

  // Summary Metrics Banner
  let totalBilled = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let paidCount = 0;
  let pendingCount = 0;

  invoices.forEach((inv) => {
    totalBilled += inv.Total_Amount;
    if (inv.Payment_Status === 'Paid' || inv.Payment_Status === 'Paid and Closed') {
      totalPaid += inv.Total_Amount;
      paidCount++;
    } else {
      totalPending += (inv.Total_Due !== undefined ? inv.Total_Due : inv.Total_Amount);
      pendingCount++;
    }
  });

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(40, 75, pageWidth - 80, 50, 4, 4, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105); // slate-600

  const colWidth = (pageWidth - 80) / 4;

  // Box 1: Total Invoices
  doc.text('TOTAL INVOICES', 55, 93);
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${invoices.length} (${paidCount} Paid)`, 55, 112);

  // Box 2: Total Billed
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL BILLED', 55 + colWidth, 93);
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.text(`INR ${totalBilled.toLocaleString('en-IN')}`, 55 + colWidth, 112);

  // Box 3: Total Collected
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('TOTAL COLLECTED', 55 + colWidth * 2, 93);
  doc.setFontSize(14);
  doc.setTextColor(22, 101, 52); // green-700
  doc.text(`INR ${totalPaid.toLocaleString('en-IN')}`, 55 + colWidth * 2, 112);

  // Box 4: Pending Balance
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('PENDING RECOVERY', 55 + colWidth * 3, 93);
  doc.setFontSize(14);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(`INR ${totalPending.toLocaleString('en-IN')}`, 55 + colWidth * 3, 112);

  // Table Body Rows - separating Water, Motor, Maintenance, Other charges, and Payable to Owner (Req 3 & 4)
  const tableData = invoices.map((inv) => {
    const rent = inv.Rent_Amount || 0;
    const eb = inv.EB_Bill_Amount ?? inv.EB_Charges ?? 0;
    const water = inv.Water_Bill_Amount ?? inv.Water_Charges ?? 0;
    const motor = inv.Motor_Bill_Amount ?? 0;
    const maint = inv.Maintenance_Charges ?? 0;
    const other = (inv.Other_Charges ?? 0) + (inv.previous_balance_carried_forward ?? 0);
    const payableToOwner = rent + water + motor + maint + other;

    return [
      inv.Invoice_ID,
      inv.Invoice_Month,
      inv.Tenant_Name,
      `${inv.House_name} (${inv.floor}-${inv.house_type})`,
      rent.toLocaleString('en-IN'),
      eb.toLocaleString('en-IN'),
      water.toLocaleString('en-IN'),
      motor.toLocaleString('en-IN'),
      maint.toLocaleString('en-IN'),
      other.toLocaleString('en-IN'),
      payableToOwner.toLocaleString('en-IN'),
      inv.Total_Amount.toLocaleString('en-IN'),
      inv.Payment_Status.toUpperCase(),
    ];
  });

  const totalRentSum = invoices.reduce((acc, c) => acc + (c.Rent_Amount || 0), 0);
  const totalEbSum = invoices.reduce((acc, c) => acc + (c.EB_Bill_Amount ?? c.EB_Charges ?? 0), 0);
  const totalWaterSum = invoices.reduce((acc, c) => acc + (c.Water_Bill_Amount ?? c.Water_Charges ?? 0), 0);
  const totalMotorSum = invoices.reduce((acc, c) => acc + (c.Motor_Bill_Amount ?? 0), 0);
  const totalMaintSum = invoices.reduce((acc, c) => acc + (c.Maintenance_Charges ?? 0), 0);
  const totalOtherSum = invoices.reduce(
    (acc, c) => acc + (c.Other_Charges ?? 0) + (c.previous_balance_carried_forward ?? 0),
    0
  );
  const totalPayableToOwnerSum = totalRentSum + totalWaterSum + totalMotorSum + totalMaintSum + totalOtherSum;

  autoTable(doc, {
    startY: 140,
    margin: { left: 24, right: 24 },
    head: [[
      'Invoice #',
      'Month',
      'Tenant Name',
      'Unit Details',
      'Rent (INR)',
      'EB (INR)',
      'Water (INR)',
      'Motor (INR)',
      'Maint (INR)',
      'Other (INR)',
      'Owner (INR)',
      'Total (INR)',
      'Status',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 62, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 78, fontStyle: 'bold' },
      3: { cellWidth: 88 },
      4: { halign: 'right', cellWidth: 48 },
      5: { halign: 'right', cellWidth: 44 },
      6: { halign: 'right', cellWidth: 46 },
      7: { halign: 'right', cellWidth: 44 },
      8: { halign: 'right', cellWidth: 44 },
      9: { halign: 'right', cellWidth: 42 },
      10: { halign: 'right', cellWidth: 56, fontStyle: 'bold', textColor: [22, 101, 52] },
      11: { halign: 'right', cellWidth: 56, fontStyle: 'bold' },
      12: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 12) {
        const status = data.cell.raw;
        if (status === 'PAID' || status === 'PAID AND CLOSED') {
          data.cell.styles.textColor = [22, 101, 52]; // green-700
          data.cell.styles.fillColor = [240, 253, 244]; // green-50
        } else if (status === 'PENDING') {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
          data.cell.styles.fillColor = [254, 242, 242]; // red-50
        }
      }
    },
    foot: [[
      'Totals',
      '',
      '',
      '',
      totalRentSum.toLocaleString('en-IN'),
      totalEbSum.toLocaleString('en-IN'),
      totalWaterSum.toLocaleString('en-IN'),
      totalMotorSum.toLocaleString('en-IN'),
      totalMaintSum.toLocaleString('en-IN'),
      totalOtherSum.toLocaleString('en-IN'),
      totalPayableToOwnerSum.toLocaleString('en-IN'),
      totalBilled.toLocaleString('en-IN'),
      `${paidCount} Paid / ${pendingCount} Due`,
    ]],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
  });

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `SRKP Property Management - Confidential Financial Summary - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  // File name
  const safeMonth = (filterMonth || 'all-months').toLowerCase().replace(/\s+/g, '-');
  const safeHouse = (filterHouse || 'all-properties').toLowerCase().replace(/\s+/g, '-');
  const fileName = `SRKP-Billing-Summary_${safeHouse}_${safeMonth}.pdf`;
  doc.save(fileName);
}
