import { House, Tenant, MonthlyInvoice, HouseMaintenanceBill, RecordedWaterReading, RecordedEbReading } from '../types';

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: { sheetId: number; title: string }[];
}

/**
 * Search user's Google Drive for Google Spreadsheets
 */
export async function listDriveSpreadsheets(accessToken: string): Promise<DriveSpreadsheetItem[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=25&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to fetch spreadsheets from Google Drive (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error('Error listing Drive spreadsheets:', err);
    throw err;
  }
}

/**
 * Fetch spreadsheet metadata including sheet tabs
 */
export async function getSpreadsheetInfo(accessToken: string, spreadsheetId: string): Promise<SheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 403) {
      throw new Error(
        "Google Drive permission required: Ask the sheet owner to open this spreadsheet in Google Drive, click 'Share', and grant your email 'Editor' permissions."
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Spreadsheet not found or not accessible. Make sure the Sheet ID is correct and shared with your Google account."
      );
    }
    throw new Error(errData?.error?.message || `Failed to load spreadsheet details (HTTP ${res.status})`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title,
    })),
  };
}

/**
 * Create a new Google Sheet in the user's Drive pre-structured for SRKP Property Management
 */
export async function createPropertySpreadsheet(
  accessToken: string,
  title: string = 'SRKP Property Management - Bangalore'
): Promise<{ id: string; name: string; url: string }> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title,
    },
    sheets: [
      { properties: { title: 'house_details' } },
      { properties: { title: 'tenant_details' } },
      { properties: { title: 'monthly_invoices' } },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to create new spreadsheet in Google Drive (HTTP ${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const webViewLink = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    id: spreadsheetId,
    name: title,
    url: webViewLink,
  };
}

/**
 * Ensure required tabs exist in an existing spreadsheet
 */
export async function ensureSheetTabs(
  accessToken: string,
  spreadsheetId: string,
  requiredTabNames: string[]
): Promise<string[]> {
  const info = await getSpreadsheetInfo(accessToken, spreadsheetId);
  const existingTabNames = info.sheets.map((s) => s.title.toLowerCase());

  const missingTabs = requiredTabNames.filter(
    (name) => !existingTabNames.includes(name.toLowerCase())
  );

  if (missingTabs.length > 0) {
    const requests = missingTabs.map((name) => ({
      addSheet: {
        properties: { title: name },
      },
    }));

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!updateRes.ok) {
      console.warn('Could not auto-create missing tabs:', await updateRes.text());
    }
  }

  const updatedInfo = await getSpreadsheetInfo(accessToken, spreadsheetId);
  return updatedInfo.sheets.map((s) => s.title);
}

/**
 * Write values to a specific sheet range (overwriting content in that range)
 */
export async function writeSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to write data to Google Sheet range ${range}`);
  }
}

/**
 * Clear values in a specific sheet range
 */
export async function clearSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<void> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:clear`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (e) {
    console.warn(`Could not clear range ${range}:`, e);
  }
}

/**
 * Read values from a specific sheet range
 */
export async function readSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Failed to read range ${range} from Google Sheet`);
  }

  const data = await res.json();
  return data.values || [];
}

/**
 * Sync all local application data (houses, tenants, invoices) into the connected Google Sheet
 */
export async function syncAllDataToGoogleSheet(
  accessToken: string,
  spreadsheetId: string,
  houses: House[],
  tenants: Tenant[],
  invoices: MonthlyInvoice[],
  maintenanceBills: HouseMaintenanceBill[] = [],
  waterReadings: RecordedWaterReading[] = [],
  ebReadings: RecordedEbReading[] = []
): Promise<{
  housesCount: number;
  tenantsCount: number;
  invoicesCount: number;
  maintenanceBillsCount: number;
  waterReadingsCount: number;
  ebReadingsCount: number;
}> {
  // 1. Ensure tabs exist
  const existingTabs = await ensureSheetTabs(accessToken, spreadsheetId, [
    'house_details',
    'tenant_details',
    'monthly_invoices',
    'maintenance_bills',
    'water_readings',
    'eb_readings',
  ]);

  // Identify matching tab names (case-insensitive)
  const houseTab = existingTabs.find((t) => t.toLowerCase().includes('house')) || 'house_details';
  const tenantTab = existingTabs.find((t) => t.toLowerCase().includes('tenant')) || 'tenant_details';
  const invoiceTab = existingTabs.find((t) => t.toLowerCase().includes('invoice')) || 'monthly_invoices';
  const maintenanceTab = existingTabs.find((t) => t.toLowerCase().includes('maintenance')) || 'maintenance_bills';
  const waterTab = existingTabs.find((t) => t.toLowerCase().includes('water')) || 'water_readings';
  const ebTab = existingTabs.find((t) => t.toLowerCase().includes('eb')) || 'eb_readings';

  // 2. Clear old ranges to ensure removed/cleaned records are wiped cleanly
  await clearSheetRange(accessToken, spreadsheetId, `${houseTab}!A1:Z500`);
  await clearSheetRange(accessToken, spreadsheetId, `${tenantTab}!A1:Z500`);
  await clearSheetRange(accessToken, spreadsheetId, `${invoiceTab}!A1:AZ500`);
  await clearSheetRange(accessToken, spreadsheetId, `${maintenanceTab}!A1:Z500`);
  await clearSheetRange(accessToken, spreadsheetId, `${waterTab}!A1:Z500`);
  await clearSheetRange(accessToken, spreadsheetId, `${ebTab}!A1:Z500`);

  // 2. Prepare Houses Sheet Data
  const houseHeaders = [
    'House_ID',
    'House_name',
    'floor',
    'house_type',
    'EB_RR_Number',
    'EB_Payment_Number',
    'Water_RR_Number',
    'Water_RR_Number2',
    'House_Address',
    'rent_amount',
    'deposit_amount',
    'is_occupied',
    'notes',
    'updatedAt',
  ];

  const houseRows = houses.map((h) => [
    h.House_ID || '',
    h.House_name || '',
    h.floor || '',
    h.house_type || '',
    h.EB_RR_Number || '',
    h.EB_Payment_Number || '',
    h.Water_RR_Number || '',
    h.Water_RR_Number2 || '',
    h.House_Address || '',
    h.rent_amount ?? '',
    h.deposit_amount ?? '',
    h.is_occupied ? 'TRUE' : 'FALSE',
    h.notes || '',
    new Date().toISOString(),
  ]);

  await writeSheetRange(accessToken, spreadsheetId, `${houseTab}!A1:N${houseRows.length + 1}`, [
    houseHeaders,
    ...houseRows,
  ]);

  // 3. Prepare Tenants Sheet Data
  const tenantHeaders = [
    'Tenant_ID',
    'Tenant_Name',
    'Tenant_Mobile',
    'Tenant_Email',
    'House_name',
    'floor',
    'house_type',
    'Rental_Type',
    'Rent_Amount',
    'Advance_Amount',
    'Lease_Amount',
    'Water_Base_Price',
    'Lease_Term',
    'occupancy_start_date',
    'occupancy_end_date',
    'emergency_contact',
    'id_proof_number',
    'is_active_tenant',
    'updatedAt',
  ];

  const tenantRows = tenants.map((t) => [
    t.Tenant_ID || '',
    t.Tenant_Name || '',
    t.Tenant_Mobile || '',
    t.Tenant_Email || '',
    t.House_name || '',
    t.floor || '',
    t.house_type || '',
    t.rental_type || 'Rent',
    t.rental_type === 'Rent' ? (t.rent_amount ?? t.monthly_rent ?? 0) : 0,
    t.rental_type === 'Rent' ? (t.advance_amount ?? t.security_deposit ?? 0) : 0,
    t.rental_type === 'Lease' ? (t.lease_amount ?? 0) : 0,
    (t.water_base_price === 1899 || t.water_base_price === undefined || t.water_base_price === null) ? 0 : Number(t.water_base_price),
    t.rental_type === 'Lease' ? (t.lease_term_years ? `${t.lease_term_years}year` : '2year') : '',
    t.occupancy_start_date || '',
    t.occupancy_end_date || '',
    t.emergency_contact || '',
    t.id_proof_number || '',
    t.is_active_tenant ? 'TRUE' : 'FALSE',
    new Date().toISOString(),
  ]);

  await writeSheetRange(accessToken, spreadsheetId, `${tenantTab}!A1:S${tenantRows.length + 1}`, [
    tenantHeaders,
    ...tenantRows,
  ]);

  // 4. Prepare Invoices Sheet Data
  const invoiceHeaders = [
    'Invoice_ID',
    'Invoice_Month',
    'Invoice_Date',
    'Due_Date',
    'Tenant_ID',
    'Tenant_Name',
    'Tenant_Mobile',
    'House_name',
    'floor',
    'house_type',
    'rental_type',
    'Rent_Amount',
    'Rent_Paid_Status',
    'Rent_Paid_Date',
    'lease_amount',
    'EB_RR_Number',
    'EB_Reading_Start',
    'EB_Reading_End',
    'EB_Bill_Amount',
    'EB_Paid_Status',
    'EB_Paid_At',
    'EB_Paid_Date',
    'Water_RR_Number',
    'Water_Reading_Start',
    'Water_Reading_End',
    'Water_RR_Number1',
    'Water1_Reading_Start',
    'Water1_Reading_End',
    'Water_Base_Price',
    'Water_Bill_Amount',
    'Water_Paid_Status',
    'Water_Paid_At',
    'Water_Paid_Date',
    'Motor_Reading_Start',
    'Motor_Reading_End',
    'Motor_Bill_Amount',
    'Maintenance_Charges',
    'Other_Charges',
    'Total_Amount',
    'Total_Due',
    'Payment_Status',
    'is_closed',
    'Payment_Date',
    'Payment_Mode',
    'Notes',
  ];

  const invoiceRows = invoices.map((inv) => [
    inv.Invoice_ID || '',
    inv.Invoice_Month || '',
    inv.Invoice_Date || '',
    inv.Due_Date || '',
    inv.Tenant_ID || '',
    inv.Tenant_Name || '',
    inv.Tenant_Mobile || '',
    inv.House_name || '',
    inv.floor || '',
    inv.house_type || '',
    inv.rental_type || 'Rent',
    inv.Rent_Amount ?? '',
    inv.Rent_Paid_Status || 'Due',
    inv.Rent_Paid_Date || '',
    inv.lease_amount ?? '',
    inv.EB_RR_Number || '',
    inv.EB_Reading_Start ?? '',
    inv.EB_Reading_End ?? '',
    inv.EB_Bill_Amount ?? inv.EB_Charges ?? '',
    inv.EB_Paid_Status || 'Due',
    inv.EB_Paid_At || '',
    inv.EB_Paid_Date || '',
    inv.Water_RR_Number || '',
    inv.Water_Reading_Start ?? '',
    inv.Water_Reading_End ?? '',
    inv.Water_RR_Number1 || '',
    inv.Water1_Reading_Start ?? '',
    inv.Water1_Reading_End ?? '',
    inv.Water_Base_Price ?? '',
    inv.Water_Bill_Amount ?? inv.Water_Charges ?? '',
    inv.Water_Paid_Status || 'Due',
    inv.Water_Paid_At || '',
    inv.Water_Paid_Date || '',
    inv.Motor_Reading_Start ?? '',
    inv.Motor_Reading_End ?? '',
    inv.Motor_Bill_Amount ?? '',
    inv.Maintenance_Charges ?? '',
    inv.Other_Charges ?? '',
    inv.Total_Amount ?? '',
    inv.Total_Due ?? '',
    inv.Payment_Status || 'Pending',
    inv.is_closed ? 'TRUE' : 'FALSE',
    inv.Payment_Date || '',
    inv.Payment_Mode || '',
    inv.Notes || '',
  ]);

  await writeSheetRange(accessToken, spreadsheetId, `${invoiceTab}!A1:AS${invoiceRows.length + 1}`, [
    invoiceHeaders,
    ...invoiceRows,
  ]);

  // 5. Prepare Maintenance Bills Sheet Data
  if (maintenanceBills.length > 0) {
    const maintenanceHeaders = [
      'Bill_ID',
      'House_name',
      'Billing_Month',
      'Bill_Date',
      'Due_Date',
      'Motor_Reading_Start',
      'Motor_Reading_End',
      'Motor_Units_Consumed',
      'Total_Motor_Bill_Amount',
      'Total_Other_Charges',
      'Total_Units_Count',
      'Total_Maintenance_Amount',
      'Per_Unit_Share',
      'Payment_Status',
      'charges',
      'Notes',
    ];

    const maintenanceRows = maintenanceBills.map((mb) => [
      mb.Bill_ID || '',
      mb.House_name || '',
      mb.Billing_Month || '',
      mb.Bill_Date || '',
      mb.Due_Date || '',
      mb.Motor_Reading_Start ?? '',
      mb.Motor_Reading_End ?? '',
      mb.Motor_Units_Consumed ?? '',
      mb.Total_Motor_Bill_Amount ?? '',
      mb.Total_Other_Charges ?? '',
      mb.Total_Units_Count ?? '',
      mb.Total_Maintenance_Amount ?? '',
      mb.Per_Unit_Share ?? '',
      mb.Payment_Status || 'Pending',
      JSON.stringify(mb.charges || []),
      mb.Notes || '',
    ]);

    await writeSheetRange(accessToken, spreadsheetId, `${maintenanceTab}!A1:P${maintenanceRows.length + 1}`, [
      maintenanceHeaders,
      ...maintenanceRows,
    ]);
  }

  // 6. Prepare Water Readings Sheet Data
  const waterHeaders = [
    'houseName',
    'floor',
    'houseType',
    'month',
    'water_RR_number',
    'water_reading_start',
    'water_reading_end',
    'water_RR_number1',
    'water1_reading_start',
    'water1_reading_end',
    'water_base_price',
    'water_bill_amount',
    'totalLitresConsumed',
    'recorded_at',
  ];

  const waterRows = waterReadings.map((wr) => [
    wr.houseName || '',
    wr.floor || '',
    wr.houseType || '',
    wr.month || '',
    wr.water_RR_number || wr.waterRrNumber || '',
    wr.water_reading_start ?? wr.waterReadingStart ?? '',
    wr.water_reading_end ?? wr.waterReadingEnd ?? '',
    wr.water_RR_number1 || wr.waterRrNumber1 || '',
    wr.water1_reading_start ?? wr.water1ReadingStart ?? '',
    wr.water1_reading_end ?? wr.water1ReadingEnd ?? '',
    wr.water_base_price ?? wr.waterBasePrice ?? '',
    wr.water_bill_amount ?? wr.waterBillAmount ?? wr.calculatedAmount ?? '',
    wr.totalLitresConsumed ?? '',
    wr.recorded_at || wr.recordedAt || new Date().toISOString(),
  ]);

  await writeSheetRange(accessToken, spreadsheetId, `${waterTab}!A1:N${waterRows.length + 1}`, [
    waterHeaders,
    ...waterRows,
  ]);

  // 7. Prepare EB Readings Sheet Data
  const ebHeaders = [
    'houseName',
    'floor',
    'houseType',
    'month',
    'EB_RR_number',
    'EB_reading_start',
    'EB_reading_end',
    'EB_units_consumed',
    'EB_bill_amount',
    'recorded_at',
  ];

  const ebRows = ebReadings.map((er) => [
    er.houseName || '',
    er.floor || '',
    er.houseType || '',
    er.month || '',
    er.EB_RR_number || er.ebRrNumber || '',
    er.EB_reading_start ?? er.ebReadingStart ?? '',
    er.EB_reading_end ?? er.ebReadingEnd ?? '',
    er.EB_units_consumed ?? er.unitsConsumed ?? er.ebUnitsConsumed ?? '',
    er.EB_bill_amount ?? er.ebBillAmount ?? '',
    er.recorded_at || er.recordedAt || new Date().toISOString(),
  ]);

  await writeSheetRange(accessToken, spreadsheetId, `${ebTab}!A1:J${ebRows.length + 1}`, [
    ebHeaders,
    ...ebRows,
  ]);

  return {
    housesCount: houses.length,
    tenantsCount: tenants.length,
    invoicesCount: invoices.length,
    maintenanceBillsCount: maintenanceBills.length,
    waterReadingsCount: waterReadings.length,
    ebReadingsCount: ebReadings.length,
  };
}

/**
 * Fetch and parse data from connected Google Sheet back into local app model
 */
export async function pullDataFromGoogleSheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  houses?: House[];
  tenants?: Tenant[];
  invoices?: MonthlyInvoice[];
  maintenanceBills?: HouseMaintenanceBill[];
  waterReadings?: RecordedWaterReading[];
  ebReadings?: RecordedEbReading[];
}> {
  const metadata = await getSpreadsheetInfo(accessToken, spreadsheetId);
  const tabNames = metadata.sheets.map((s) => s.title);

  const houseTab = tabNames.find((t) => t.toLowerCase().includes('house'));
  const tenantTab = tabNames.find((t) => t.toLowerCase().includes('tenant'));
  const invoiceTab = tabNames.find((t) => t.toLowerCase().includes('invoice'));
  const maintenanceTab = tabNames.find((t) => t.toLowerCase().includes('maintenance'));
  const waterTab = tabNames.find((t) => t.toLowerCase().includes('water'));
  const ebTab = tabNames.find((t) => t.toLowerCase().includes('eb'));

  const result: {
    houses?: House[];
    tenants?: Tenant[];
    invoices?: MonthlyInvoice[];
    maintenanceBills?: HouseMaintenanceBill[];
    waterReadings?: RecordedWaterReading[];
    ebReadings?: RecordedEbReading[];
  } = {};

  // Parse Houses
  if (houseTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${houseTab}!A1:N200`);
      const houses: House[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const houseId = map['houseid'] || `HSE-${i}`;
          const houseName = map['housename'] || map['name'] || '';
          if (!houseName) continue;

          houses.push({
            id: `hse-sheet-${houseId}-${i}`,
            House_ID: houseId,
            House_name: houseName,
            floor: map['floor'] || 'Ground',
            house_type: map['housetype'] || '2BHK',
            House_Address: map['houseaddress'] || map['address'] || '',
            EB_RR_Number: map['ebrrnumber'] || '',
            EB_Payment_Number: map['ebpaymentnumber'] || '',
            Water_RR_Number: map['waterrrnumber'] || '',
            Water_RR_Number2: map['waterrrnumber2'] || null,
            rent_amount: parseFloat(map['rentamount']) || 0,
            deposit_amount: parseFloat(map['depositamount']) || 0,
            is_occupied: map['isoccupied'] ? map['isoccupied'].toUpperCase() === 'TRUE' : false,
            notes: map['notes'] || '',
            createdAt: map['updatedat'] || new Date().toISOString(),
          });
        }
      }
      // Explicitly set result.houses (empty array if 0 data rows) so local storage syncs cleanly
      result.houses = houses;
    } catch (e) {
      console.warn('Could not read houses tab:', e);
    }
  }

  // Parse Tenants
  if (tenantTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${tenantTab}!A1:Z200`);
      const tenants: Tenant[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const tenantId = map['tenantid'] || `TNT-${i}`;
          const tenantName = map['tenantname'] || map['name'] || '';
          if (!tenantName) continue;

          const rentalType = (map['rentaltype']?.toUpperCase() === 'LEASE' ? 'Lease' : 'Rent') as 'Rent' | 'Lease';
          const isRent = rentalType === 'Rent';
          const rent = isRent ? parseFloat(map['rentamount']) || 0 : 0;
          const advance = isRent ? parseFloat(map['advanceamount']) || 0 : 0;
          const lease = !isRent ? parseFloat(map['leaseamount']) || 0 : 0;
          let rawWater = map['waterbaseprice'] || map['waterbase'] || map['waterbasecharges'] || '0';
          if (String(rawWater).includes('1899') || rawWater === '1899') {
            rawWater = '0';
          }
          const parsedWater = parseFloat(rawWater);
          const waterBasePrice = (isNaN(parsedWater) || parsedWater === 1899) ? 0 : parsedWater;
          const termStr = map['leaseterm'] || map['term'] || '';
          const leaseTermYears: 2 | 3 = termStr.includes('3') ? 3 : 2;

          tenants.push({
            id: `tnt-sheet-${tenantId}-${i}`,
            Tenant_ID: tenantId,
            Tenant_Name: tenantName,
            Tenant_Mobile: map['tenantmobile'] || map['mobile'] || '',
            Tenant_Email: map['tenantemail'] || map['email'] || '',
            House_name: map['housename'] || '',
            floor: map['floor'] || '',
            house_type: map['housetype'] || '',
            house_id: map['houseid'] || '',
            rental_type: rentalType,
            rent_amount: rent,
            advance_amount: advance,
            lease_amount: lease,
            water_base_price: waterBasePrice,
            lease_term_years: rentalType === 'Lease' ? leaseTermYears : undefined,
            monthly_rent: rent,
            security_deposit: advance,
            occupancy_start_date: map['occupancystartdate'] || '2025-01-01',
            occupancy_end_date: map['occupancyenddate'] || '2026-12-31',
            emergency_contact: map['emergencycontact'] || '',
            id_proof_number: map['idproofnumber'] || '',
            is_active_tenant: map['isactivetenant'] ? map['isactivetenant'].toUpperCase() === 'TRUE' : true,
            createdAt: map['updatedat'] || new Date().toISOString(),
          });
        }
      }
      // Explicitly set result.tenants (empty array if 0 data rows) so local storage syncs cleanly
      result.tenants = tenants;
    } catch (e) {
      console.warn('Could not read tenants tab:', e);
    }
  }

  // Parse Invoices
  if (invoiceTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${invoiceTab}!A1:AZ500`);
      const invoices: MonthlyInvoice[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const invoiceId = map['invoiceid'];
          if (!invoiceId) continue;

          const ebBill = parseFloat(map['ebbillamount'] || map['ebcharges']) || 0;
          const waterBill = parseFloat(map['waterbillamount'] || map['watercharges']) || 0;
          const motorBill = parseFloat(map['motorbillamount'] || '0') || 0;
          const totalAmount = parseFloat(map['totalamount']) || 0;
          const totalDue = map['totaldue'] !== undefined && map['totaldue'] !== '' ? parseFloat(map['totaldue']) : totalAmount;
          const isClosed = map['isclosed'] ? map['isclosed'].toUpperCase() === 'TRUE' : (map['paymentstatus'] === 'Paid and Closed');

          invoices.push({
            id: `inv-sheet-${invoiceId}-${i}`,
            Invoice_ID: invoiceId,
            Invoice_Month: map['invoicemonth'] || 'Current Month',
            Invoice_Date: map['invoicedate'] || '',
            Due_Date: map['duedate'] || '',
            Tenant_ID: map['tenantid'] || '',
            Tenant_Name: map['tenantname'] || '',
            Tenant_Mobile: map['tenantmobile'] || '',
            House_name: map['housename'] || '',
            floor: map['floor'] || '',
            house_type: map['housetype'] || '',
            house_id: map['houseid'] || '',
            rental_type: (map['rentaltype'] as any) || 'Rent',
            Rent_Amount: parseFloat(map['rentamount']) || 0,
            Rent_Paid_Status: (map['rentpaidstatus'] as any) || 'Due',
            Rent_Paid_Date: map['rentpaiddate'] || null,
            lease_amount: parseFloat(map['leaseamount']) || 0,
            EB_RR_Number: map['ebrrnumber'] || '',
            EB_Reading_Start: map['ebreadingstart'] ? parseFloat(map['ebreadingstart']) : null,
            EB_Reading_End: map['ebreadingend'] ? parseFloat(map['ebreadingend']) : null,
            EB_Units_Consumed: parseFloat(map['ebunitsconsumed']) || 0,
            EB_Bill_Amount: ebBill,
            EB_Paid_Status: (map['ebpaidstatus'] as any) || 'Due',
            EB_Paid_At: map['ebpaidat'] || null,
            EB_Paid_Date: map['ebpaiddate'] || null,
            EB_Charges: ebBill,
            Water_RR_Number: map['waterrrnumber'] || null,
            Water_Reading_Start: map['waterreadingstart'] ? parseFloat(map['waterreadingstart']) : null,
            Water_Reading_End: map['waterreadingend'] ? parseFloat(map['waterreadingend']) : null,
            Water_RR_Number1: map['waterrrnumber1'] || map['waterrrnumber2'] || null,
            Water1_Reading_Start: map['water1readingstart'] ? parseFloat(map['water1readingstart']) : null,
            Water1_Reading_End: map['water1readingend'] ? parseFloat(map['water1readingend']) : null,
            Water_Base_Price: parseFloat(map['waterbaseprice'] || '0') || undefined,
            Water_Bill_Amount: waterBill,
            Water_Paid_Status: (map['waterpaidstatus'] as any) || 'Due',
            Water_Paid_At: map['waterpaidat'] || null,
            Water_Paid_Date: map['waterpaiddate'] || null,
            Water_Charges: waterBill,
            Motor_Reading_Start: map['motorreadingstart'] ? parseFloat(map['motorreadingstart']) : null,
            Motor_Reading_End: map['motorreadingend'] ? parseFloat(map['motorreadingend']) : null,
            Motor_Bill_Amount: motorBill,
            Maintenance_Charges: parseFloat(map['maintenancecharges']) || 0,
            Other_Charges: parseFloat(map['othercharges']) || 0,
            Total_Amount: totalAmount,
            Total_Due: totalDue,
            Payment_Status: (map['paymentstatus'] as any) || 'Pending',
            is_closed: isClosed,
            Payment_Date: map['paymentdate'] || null,
            Payment_Mode: (map['paymentmode'] as any) || null,
            Notes: map['notes'] || '',
          });
        }
      }
      // Explicitly set result.invoices (empty array if 0 data rows) so local storage syncs cleanly
      result.invoices = invoices;
    } catch (e) {
      console.warn('Could not read invoices tab:', e);
    }
  }

  // Parse Maintenance Bills
  if (maintenanceTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${maintenanceTab}!A1:P200`);
      const maintenanceBills: HouseMaintenanceBill[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const billId = map['billid'];
          if (!billId) continue;

          let parsedCharges = [];
          try {
            if (map['charges']) {
              parsedCharges = JSON.parse(map['charges']);
            }
          } catch {
            parsedCharges = [];
          }

          maintenanceBills.push({
            id: `mb-sheet-${billId}-${i}`,
            Bill_ID: billId,
            House_name: map['housename'] || '',
            Billing_Month: map['billingmonth'] || '',
            Bill_Date: map['billdate'] || '',
            Due_Date: map['duedate'] || '',
            Motor_Reading_Start: map['motorreadingstart'] ? parseFloat(map['motorreadingstart']) : 0,
            Motor_Reading_End: map['motorreadingend'] ? parseFloat(map['motorreadingend']) : 0,
            Motor_Units_Consumed: parseFloat(map['motorunitsconsumed']) || 0,
            Total_Motor_Bill_Amount: parseFloat(map['totalmotorbillamount']) || 0,
            charges: parsedCharges,
            Total_Other_Charges: parseFloat(map['totalothercharges']) || 0,
            Total_Units_Count: parseInt(map['totalunitscount']) || 1,
            Total_Maintenance_Amount: parseFloat(map['totalmaintenanceamount']) || 0,
            Per_Unit_Share: parseFloat(map['perunitshare']) || 0,
            Payment_Status: (map['paymentstatus'] as any) || 'Pending',
            Notes: map['notes'] || '',
          });
        }
      }
      result.maintenanceBills = maintenanceBills;
    } catch (e) {
      console.warn('Could not read maintenance tab:', e);
    }
  }

  // Parse Water Readings
  if (waterTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${waterTab}!A1:N200`);
      const waterReadings: RecordedWaterReading[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const houseName = map['housename'];
          if (!houseName) continue;

          waterReadings.push({
            houseName,
            floor: map['floor'] || '',
            houseType: map['housetype'] || '',
            month: map['month'] || '',
            water_RR_number: map['waterrrnumber'] || '',
            water_reading_start: map['waterreadingstart'] ? parseFloat(map['waterreadingstart']) : 0,
            water_reading_end: map['waterreadingend'] ? parseFloat(map['waterreadingend']) : 0,
            water_RR_number1: map['waterrrnumber1'] || null,
            water1_reading_start: map['water1readingstart'] ? parseFloat(map['water1readingstart']) : null,
            water1_reading_end: map['water1readingend'] ? parseFloat(map['water1readingend']) : null,
            water_base_price: (() => {
              let r = map['waterbaseprice'] || '';
              if (String(r).includes('1899')) r = '0';
              const p = parseFloat(r);
              return (!r || isNaN(p) || p === 1899) ? 0 : p;
            })(),
            water_bill_amount: map['waterbillamount'] ? parseFloat(map['waterbillamount']) : 0,
            totalLitresConsumed: map['totallitresconsumed'] ? parseFloat(map['totallitresconsumed']) : 0,
            recorded_at: map['recordedat'] || new Date().toISOString(),
          });
        }
      }
      result.waterReadings = waterReadings;
    } catch (e) {
      console.warn('Could not read water readings tab:', e);
    }
  }

  // Parse EB Readings
  if (ebTab) {
    try {
      const rows = await readSheetRange(accessToken, spreadsheetId, `${ebTab}!A1:J200`);
      const ebReadings: RecordedEbReading[] = [];
      if (rows.length > 1) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          const map: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            map[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });

          const houseName = map['housename'];
          if (!houseName) continue;

          ebReadings.push({
            houseName,
            floor: map['floor'] || '',
            houseType: map['housetype'] || '',
            month: map['month'] || '',
            EB_RR_number: map['ebrrnumber'] || '',
            EB_reading_start: map['ebreadingstart'] ? parseFloat(map['ebreadingstart']) : 0,
            EB_reading_end: map['ebreadingend'] ? parseFloat(map['ebreadingend']) : 0,
            EB_units_consumed: map['ebunitsconsumed'] ? parseFloat(map['ebunitsconsumed']) : 0,
            EB_bill_amount: map['ebbillamount'] ? parseFloat(map['ebbillamount']) : 0,
            recorded_at: map['recordedat'] || new Date().toISOString(),
          });
        }
      }
      result.ebReadings = ebReadings;
    } catch (e) {
      console.warn('Could not read EB readings tab:', e);
    }
  }

  return result;
}
