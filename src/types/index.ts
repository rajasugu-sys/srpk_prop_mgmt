export type RentalType = 'Rent' | 'Lease';

export interface House {
  id: string; // Internal unique ID or House_ID
  House_ID: string; // e.g., "1", "2", ... "12"
  House_name: string; // e.g., "Bglr Old SR", "Bglr New SR"
  floor: string; // e.g., "Ground", "First", "Second", "Third"
  house_type: string; // e.g., "2BHK", "1BHK", "1RK", "1RK CENTER", "1RK LAST"
  House_Address?: string;
  EB_RR_Number: string; // Electricity Board Revenue Register No., e.g., "7EEHK 39158"
  EB_Payment_Number?: string; // e.g. "353155000", "7294734228"
  Water_RR_Number: string; // Water Board Consumer RR No., e.g., "1052360-11/22"
  Water_RR_Number2?: string | null; // Secondary water meter, e.g. "1207385-05/22"
  rental_type?: RentalType; // Default 'Rent'
  rent_amount: number; // For Rent
  advance_amount?: number; // Advance / Security Deposit for Rent
  deposit_amount: number; // Backwards compatible alias
  lease_amount?: number; // For Lease
  is_occupied: boolean;
  notes?: string;
  createdAt: string;
}

export interface AttachedDocument {
  id: string; // Key or file ID
  name: string; // Original filename, e.g. "Rental_Agreement_TNT101.pdf"
  file_type: string; // e.g. "application/pdf", "image/jpeg"
  size: number; // in bytes
  uploaded_at: string; // ISO date string
  data_url?: string; // Data URL or base64
}

export interface Tenant {
  id: string;
  Tenant_ID: string; // e.g., TNT-101
  Tenant_Name: string;
  Tenant_Mobile: string;
  Tenant_Email?: string;
  House_name: string;
  floor: string;
  house_type: string;
  house_id: string; // Linked House_ID
  rental_type: RentalType; // 'Rent' | 'Lease'
  rent_amount: number; // If Rent: > 0; If Lease: 0
  advance_amount: number; // If Rent: deposit amount; If Lease: 0
  lease_amount: number; // If Lease: > 0; If Rent: 0
  water_base_price?: number; // Water_Base_Price (decimal) in tenant_details table
  lease_term_years?: 2 | 3; // For Lease: term=2year or 3year
  monthly_rent: number; // Compatibility alias for rent_amount
  security_deposit: number; // Compatibility alias for advance_amount
  occupancy_start_date: string; // YYYY-MM-DD
  occupancy_end_date: string; // YYYY-MM-DD
  emergency_contact?: string;
  id_proof_number?: string;
  agreement_document?: AttachedDocument | null; // Attached PDF Lease/Rent Agreement (never deletable, only overwritable upon confirmation)
  is_active_tenant: boolean;
  createdAt: string;
}

export type InvoiceStatus = 'Pending' | 'Partially Paid' | 'Paid' | 'Paid and Closed' | 'Overdue';

export interface MonthlyInvoice {
  id: string;
  Invoice_ID: string; // e.g., INV-2026-10-001
  Invoice_Month: string; // e.g., "October 2026"
  Invoice_Date: string; // YYYY-MM-DD
  Due_Date: string; // YYYY-MM-DD
  Tenant_ID: string;
  Tenant_Name: string;
  Tenant_Mobile: string;
  House_name: string;
  floor: string;
  house_type: string;
  house_id: string;
  rental_type?: RentalType; // 'Rent' | 'Lease'
  Rent_Amount: number; // 0 if Lease
  Rent_Paid_Status?: 'Due' | 'Paid';
  Rent_Paid_Date?: string | null;
  lease_amount?: number; // Total lease value reference

  // Electricity Board (EB)
  EB_RR_Number: string;
  EB_Reading_Start?: number | null;
  EB_Reading_End?: number | null;
  EB_Units_Consumed?: number;
  EB_Bill_Amount: number;
  EB_Paid_Status?: 'Due' | 'Paid';
  EB_Paid_At?: string | null;
  EB_Paid_Date?: string | null;
  EB_Charges: number; // Backward compatibility alias

  // Water Meters & Charges
  Water_RR_Number?: string | null;
  Water_Reading_Start?: number | null;
  Water_Reading_End?: number | null;
  Water_RR_Number1?: string | null; // Secondary meter RR
  Water1_Reading_Start?: number | null;
  Water1_Reading_End?: number | null;
  Water_Base_Price?: number;
  Water_Bill_Amount: number;
  Water_Paid_Status?: 'Due' | 'Paid';
  Water_Paid_At?: string | null;
  Water_Paid_Date?: string | null;
  Water_Charges: number; // Backward compatibility alias

  // Motor Meter & Charges
  Motor_Reading_Start?: number | null;
  Motor_Reading_End?: number | null;
  Motor_Bill_Amount?: number;

  // Additional Charges
  Maintenance_Charges: number;
  Other_Charges: number;
  Maintenance_Bill_ID?: string; // Reference to HouseMaintenanceBill

  // Attachments (Can be replaced until invoice is marked Paid & Closed)
  eb_bill_document?: AttachedDocument | null;
  paid_receipt_document?: AttachedDocument | null;

  // Carried Forward Unsettled Balance (Req 6)
  previous_balance_carried_forward?: number;
  previous_balance_month?: string;

  // Financial Totals & Status
  Total_Amount: number;
  Total_Due: number; // Total after deducting paid components
  payable_to_owner?: number; // Total Payable to Owner = Rent + Water + Maintenance + Other + Previous Dues (excludes EB) (Req 4)
  payable_to_owner_due?: number; // Remaining unpaid amount owed to owner
  Payment_Status: InvoiceStatus;
  is_closed?: boolean; // Locked when Paid and Closed
  Payment_Date?: string | null;
  Payment_Mode?: 'UPI' | 'Net Banking' | 'Cash' | 'Cheque' | null;
  Notes?: string;
}

export interface MaintenanceChargeItem {
  id: string;
  name: string; // Dynamic charge name (e.g., Sweeper, Common Lighting, Security, Tank Cleaning)
  amount: number; // Decimal amount
}

export interface HouseMaintenanceBill {
  id: string;
  Bill_ID: string; // e.g., "MB-2026-10-001"
  House_name: string; // Selected house name (e.g. "Bglr Old SR")
  Billing_Month: string; // e.g. "October 2026"
  Bill_Date: string; // YYYY-MM-DD
  Due_Date?: string; // YYYY-MM-DD

  // 4.2.1 & 4.2.2: Motor Meter Readings
  Motor_Reading_Start?: number | null;
  Motor_Reading_End?: number | null;
  Motor_Units_Consumed?: number;

  // 4.2.3: Total Motor Bill Amount (decimal)
  Total_Motor_Bill_Amount: number;

  // 4.2.4: Dynamic maintenance charges (0 to n items)
  charges: MaintenanceChargeItem[];
  Total_Other_Charges: number; // Sum of dynamic charge items

  // 4.2.5: Division by total units in selected house
  Total_Units_Count: number; // Number of units in this house
  Total_Maintenance_Amount: number; // Motor Bill + Other Charges
  Per_Unit_Share: number; // (Total_Motor_Bill_Amount + Total_Other_Charges) / Total_Units_Count

  // Attachments (Can be replaced until bill is marked Paid & Closed)
  motor_eb_bill_document?: AttachedDocument | null;
  paid_receipt_document?: AttachedDocument | null;

  Payment_Status?: 'Paid' | 'Pending';
  Notes?: string;
  createdAt?: string;
}

export interface RecordedWaterReading {
  houseName: string;
  floor: string;
  houseType: string;
  tenantId?: string;
  tenantName?: string;
  month: string;
  // Primary
  water_RR_number: string;
  water_reading_start: number;
  water_reading_end: number;
  waterRrNumber?: string;
  waterReadingStart?: number;
  waterReadingEnd?: number;
  // Secondary
  water_RR_number1?: string | null;
  water1_reading_start?: number | null;
  water1_reading_end?: number | null;
  waterRrNumber1?: string | null;
  water1ReadingStart?: number | null;
  water1ReadingEnd?: number | null;
  // Pricing
  water_base_price: number;
  water_bill_amount: number;
  waterBasePrice?: number;
  waterBillAmount?: number;
  totalLitresConsumed?: number;
  calculatedAmount?: number;
  recorded_at?: string;
  recordedAt?: string;
}

export interface RecordedEbReading {
  houseName: string;
  floor: string;
  houseType: string;
  tenantId?: string;
  tenantName?: string;
  month: string;
  EB_RR_number: string;
  EB_reading_start: number;
  EB_reading_end: number;
  EB_units_consumed: number;
  EB_bill_amount: number;
  ebRrNumber?: string;
  ebReadingStart?: number;
  ebReadingEnd?: number;
  ebUnitsConsumed?: number;
  ebBillAmount?: number;
  unitsConsumed?: number;
  recorded_at?: string;
  recordedAt?: string;
}

export type ActiveTab = 'houses' | 'tenants' | 'invoices' | 'sheets';
