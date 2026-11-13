import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { House, Tenant, MonthlyInvoice, HouseMaintenanceBill, AttachedDocument, RecordedWaterReading, RecordedEbReading } from '../types';
import { INITIAL_HOUSES, INITIAL_TENANTS, INITIAL_INVOICES, INITIAL_MAINTENANCE_BILLS } from '../data/initialData';
import { generateNextHouseId, generateNextTenantId, generateNextInvoiceId, generateNextMaintenanceBillId } from '../utils/formatters';

interface PropertyContextType {
  houses: House[];
  tenants: Tenant[];
  invoices: MonthlyInvoice[];
  maintenanceBills: HouseMaintenanceBill[];
  selectedHouseName: string;
  setSelectedHouseName: (name: string) => void;
  uniqueHouseNames: string[];
  
  // House actions
  addHouse: (data: {
    House_name: string;
    floor: string;
    house_type: string;
    EB_RR_Number: string;
    EB_Payment_Number?: string;
    Water_RR_Number: string;
    Water_RR_Number2?: string | null;
    House_Address?: string;
    rent_amount?: number;
    deposit_amount?: number;
    notes?: string;
  }) => House;
  updateHouse: (idOrHouseId: string, updates: Partial<House>) => void;
  deleteHouse: (idOrHouseId: string) => void;
  
  // Tenant actions
  addTenant: (data: {
    Tenant_Name: string;
    Tenant_Mobile: string;
    Tenant_Email?: string;
    House_name: string;
    floor: string;
    house_type: string;
    rental_type: 'Rent' | 'Lease';
    rent_amount?: number;
    advance_amount?: number;
    lease_amount?: number;
    water_base_price?: number;
    lease_term_years?: 2 | 3;
    monthly_rent?: number;
    security_deposit?: number;
    occupancy_start_date: string;
    occupancy_end_date: string;
    emergency_contact?: string;
    id_proof_number?: string;
    agreement_document?: AttachedDocument | null;
  }) => Tenant;
  updateTenant: (idOrTenantId: string, updates: Partial<Tenant>) => void;
  deleteTenant: (idOrTenantId: string) => void;

  // Invoice actions
  addInvoice: (data: Omit<MonthlyInvoice, 'id' | 'Invoice_ID'> & { Invoice_ID?: string }) => MonthlyInvoice;
  updateInvoice: (idOrInvoiceId: string, updates: Partial<MonthlyInvoice>) => void;
  deleteInvoice: (idOrInvoiceId: string) => void;
  generateBulkInvoicesForMonth: (monthYear: string) => number;

  // Maintenance Bill actions
  addMaintenanceBill: (data: Omit<HouseMaintenanceBill, 'id' | 'Bill_ID'> & { Bill_ID?: string }) => HouseMaintenanceBill;
  updateMaintenanceBill: (idOrBillId: string, updates: Partial<HouseMaintenanceBill>) => void;
  deleteMaintenanceBill: (idOrBillId: string) => void;
  getMaintenanceBillForHouse: (houseName: string, billingMonth: string) => HouseMaintenanceBill | undefined;

  // Meter Readings actions (Water & EB)
  recordedWaterReadings: RecordedWaterReading[];
  recordedEbReadings: RecordedEbReading[];
  saveBatchWaterReadings: (readings: RecordedWaterReading[]) => void;
  saveBatchEbReadings: (readings: RecordedEbReading[]) => void;
  getWaterReading: (houseName: string, floor: string, houseType: string, month: string) => RecordedWaterReading | undefined;
  getEbReading: (houseName: string, floor: string, houseType: string, month: string) => RecordedEbReading | undefined;

  // Sync & Export
  resetToDefaults: () => void;
  exportCsvData: (entity: 'houses' | 'tenants' | 'invoices' | 'all') => string;
  importCsvData: (entity: 'houses' | 'tenants' | 'invoices', csvText: string) => { success: boolean; count: number; error?: string };
  applyGoogleSheetData: (
    data: {
      houses?: House[];
      tenants?: Tenant[];
      invoices?: MonthlyInvoice[];
      maintenanceBills?: HouseMaintenanceBill[];
      waterReadings?: RecordedWaterReading[];
      ebReadings?: RecordedEbReading[];
    },
    mode?: 'replace' | 'merge'
  ) => { mergedHouses: number; mergedTenants: number; mergedInvoices: number; mergedMaintenanceBills?: number };
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

const STORAGE_KEYS = {
  HOUSES: 'srkp_houses_v3_rental_type',
  TENANTS: 'srkp_tenants_v3_rental_type',
  INVOICES: 'srkp_invoices_v3_rental_type',
  MAINTENANCE_BILLS: 'srkp_maintenance_bills_v1',
  SELECTED_HOUSE: 'srkp_selected_house_v3_rental_type',
  WATER_READINGS: 'srkp_water_readings_v1',
  EB_READINGS: 'srkp_eb_readings_v1',
};

export const PropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [houses, setHouses] = useState<House[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HOUSES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load houses from storage', e);
    }
    return INITIAL_HOUSES;
  });

  const [tenants, setTenants] = useState<Tenant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TENANTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((t: Tenant) => ({
          ...t,
          water_base_price: (t.water_base_price === 1899 || !t.water_base_price) ? 0 : t.water_base_price,
        }));
      }
    } catch (e) {
      console.error('Failed to load tenants from storage', e);
    }
    return INITIAL_TENANTS.map((t) => ({
      ...t,
      water_base_price: (t.water_base_price === 1899 || !t.water_base_price) ? 0 : t.water_base_price,
    }));
  });

  const [invoices, setInvoices] = useState<MonthlyInvoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load invoices from storage', e);
    }
    return INITIAL_INVOICES;
  });

  const [maintenanceBills, setMaintenanceBills] = useState<HouseMaintenanceBill[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE_BILLS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load maintenance bills from storage', e);
    }
    return INITIAL_MAINTENANCE_BILLS;
  });

  const [recordedWaterReadings, setRecordedWaterReadings] = useState<RecordedWaterReading[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WATER_READINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load water readings from storage', e);
    }
    return [];
  });

  const [recordedEbReadings, setRecordedEbReadings] = useState<RecordedEbReading[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EB_READINGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load eb readings from storage', e);
    }
    return [];
  });

  const [selectedHouseName, setSelectedHouseNameState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_HOUSE);
      if (saved) return saved;
    } catch (e) {
      console.error('Failed to load selected house from storage', e);
    }
    return 'Bglr Old SR';
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HOUSES, JSON.stringify(houses));
    } catch (e) {
      console.error('Failed to save houses', e);
    }
  }, [houses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants));
    } catch (e) {
      console.error('Failed to save tenants', e);
    }
  }, [tenants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.error('Failed to save invoices', e);
    }
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MAINTENANCE_BILLS, JSON.stringify(maintenanceBills));
    } catch (e) {
      console.error('Failed to save maintenance bills', e);
    }
  }, [maintenanceBills]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WATER_READINGS, JSON.stringify(recordedWaterReadings));
    } catch (e) {
      console.error('Failed to save water readings', e);
    }
  }, [recordedWaterReadings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.EB_READINGS, JSON.stringify(recordedEbReadings));
    } catch (e) {
      console.error('Failed to save eb readings', e);
    }
  }, [recordedEbReadings]);

  const setSelectedHouseName = (name: string) => {
    setSelectedHouseNameState(name);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_HOUSE, name);
    } catch (e) {
      console.error('Failed to save selected house', e);
    }
  };

  // Derive unique house names
  const uniqueHouseNames = useMemo(() => {
    const set = new Set<string>();
    houses.forEach((h) => {
      if (h.House_name?.trim()) set.add(h.House_name.trim());
    });
    // Ensure current selected exists or default
    if (set.size === 0) set.add('SRKP Towers');
    return Array.from(set).sort();
  }, [houses]);

  // If selectedHouseName is not in uniqueHouseNames, reset to first
  useEffect(() => {
    if (uniqueHouseNames.length > 0 && !uniqueHouseNames.includes(selectedHouseName)) {
      setSelectedHouseName(uniqueHouseNames[0]);
    }
  }, [uniqueHouseNames, selectedHouseName]);

  // House operations
  const addHouse = (data: {
    House_name: string;
    floor: string;
    house_type: string;
    EB_RR_Number: string;
    EB_Payment_Number?: string;
    Water_RR_Number: string;
    Water_RR_Number2?: string | null;
    House_Address?: string;
    rent_amount?: number;
    deposit_amount?: number;
    notes?: string;
  }): House => {
    const existingIds = houses.map((h) => h.House_ID);
    const newHouseId = generateNextHouseId(existingIds);
    const now = new Date().toISOString();

    const newHouse: House = {
      id: `hse-${Date.now()}`,
      House_ID: newHouseId,
      House_name: data.House_name.trim(),
      floor: data.floor.trim(),
      house_type: data.house_type.trim(),
      House_Address: data.House_Address?.trim() || '',
      EB_RR_Number: data.EB_RR_Number.trim(),
      EB_Payment_Number: data.EB_Payment_Number?.trim() || '',
      Water_RR_Number: data.Water_RR_Number.trim(),
      Water_RR_Number2: data.Water_RR_Number2 ? data.Water_RR_Number2.trim() : null,
      rent_amount: data.rent_amount || 0,
      deposit_amount: data.deposit_amount || 0,
      is_occupied: false, // Requirement 2.2: is_occupied set to FALSE
      notes: data.notes || '',
      createdAt: now,
    };

    setHouses((prev) => [newHouse, ...prev]);
    return newHouse;
  };

  const updateHouse = (idOrHouseId: string, updates: Partial<House>) => {
    setHouses((prev) =>
      prev.map((h) => {
        if (h.id === idOrHouseId || h.House_ID === idOrHouseId) {
          return { ...h, ...updates };
        }
        return h;
      })
    );
  };

  const deleteHouse = (idOrHouseId: string) => {
    setHouses((prev) => prev.filter((h) => h.id !== idOrHouseId && h.House_ID !== idOrHouseId));
  };

  // Tenant operations
  const addTenant = (data: {
    Tenant_Name: string;
    Tenant_Mobile: string;
    Tenant_Email?: string;
    House_name: string;
    floor: string;
    house_type: string;
    rental_type: 'Rent' | 'Lease';
    rent_amount?: number;
    advance_amount?: number;
    lease_amount?: number;
    water_base_price?: number;
    lease_term_years?: 2 | 3;
    monthly_rent?: number;
    security_deposit?: number;
    occupancy_start_date: string;
    occupancy_end_date: string;
    emergency_contact?: string;
    id_proof_number?: string;
    agreement_document?: AttachedDocument | null;
  }): Tenant => {
    const existingIds = tenants.map((t) => t.Tenant_ID);
    const newTenantId = generateNextTenantId(existingIds);
    const now = new Date().toISOString();

    // Find corresponding house unit
    const matchedHouse = houses.find(
      (h) =>
        h.House_name.toLowerCase() === data.House_name.toLowerCase() &&
        h.floor.toLowerCase() === data.floor.toLowerCase() &&
        h.house_type.toLowerCase() === data.house_type.toLowerCase()
    );

    const houseIdToLink = matchedHouse ? matchedHouse.House_ID : '';

    const isRent = (data.rental_type || 'Rent') === 'Rent';
    const finalRent = isRent ? (data.rent_amount ?? data.monthly_rent ?? 0) : 0;
    const finalAdvance = isRent ? (data.advance_amount ?? data.security_deposit ?? 0) : 0;
    const finalLease = isRent ? 0 : (data.lease_amount ?? 0);
    const waterBase = data.water_base_price !== undefined ? data.water_base_price : 0;

    const newTenant: Tenant = {
      id: `tnt-${Date.now()}`,
      Tenant_ID: newTenantId,
      Tenant_Name: data.Tenant_Name.trim(),
      Tenant_Mobile: data.Tenant_Mobile.trim(),
      Tenant_Email: data.Tenant_Email?.trim() || '',
      House_name: data.House_name.trim(),
      floor: data.floor.trim(),
      house_type: data.house_type.trim(),
      house_id: houseIdToLink,
      rental_type: data.rental_type || 'Rent',
      rent_amount: finalRent,
      advance_amount: finalAdvance,
      lease_amount: finalLease,
      water_base_price: waterBase,
      lease_term_years: !isRent ? (data.lease_term_years || 2) : undefined,
      monthly_rent: finalRent,
      security_deposit: finalAdvance,
      occupancy_start_date: data.occupancy_start_date,
      occupancy_end_date: data.occupancy_end_date,
      emergency_contact: data.emergency_contact || '',
      id_proof_number: data.id_proof_number || '',
      agreement_document: data.agreement_document || null,
      is_active_tenant: true,
      createdAt: now,
    };

    // Requirement 2.2: is_occupied field in house_details table should be set to TRUE
    // for (Selected_House + selected_floor + selected_house_type)
    setHouses((prev) =>
      prev.map((h) => {
        if (
          h.House_name.toLowerCase() === data.House_name.toLowerCase() &&
          h.floor.toLowerCase() === data.floor.toLowerCase() &&
          h.house_type.toLowerCase() === data.house_type.toLowerCase()
        ) {
          return {
            ...h,
            is_occupied: true,
            rental_type: data.rental_type || 'Rent',
            rent_amount: finalRent,
            advance_amount: finalAdvance,
            deposit_amount: finalAdvance,
            lease_amount: finalLease,
          };
        }
        return h;
      })
    );

    setTenants((prev) => [newTenant, ...prev]);
    return newTenant;
  };

  const updateTenant = (idOrTenantId: string, updates: Partial<Tenant>) => {
    const sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.rental_type === 'Rent') {
      sanitizedUpdates.lease_amount = 0;
      if (sanitizedUpdates.rent_amount !== undefined) sanitizedUpdates.monthly_rent = sanitizedUpdates.rent_amount;
      if (sanitizedUpdates.advance_amount !== undefined) sanitizedUpdates.security_deposit = sanitizedUpdates.advance_amount;
    } else if (sanitizedUpdates.rental_type === 'Lease') {
      sanitizedUpdates.rent_amount = 0;
      sanitizedUpdates.advance_amount = 0;
      sanitizedUpdates.monthly_rent = 0;
      sanitizedUpdates.security_deposit = 0;
    }

    setTenants((prev) =>
      prev.map((t) => {
        if (t.id === idOrTenantId || t.Tenant_ID === idOrTenantId) {
          return { ...t, ...sanitizedUpdates };
        }
        return t;
      })
    );

    // If tenant was marked inactive (vacated), update house to is_occupied = false
    if (updates.is_active_tenant === false) {
      setTenants((currentTenants) => {
        const found = currentTenants.find(
          (t) => t.id === idOrTenantId || t.Tenant_ID === idOrTenantId
        );
        if (found) {
          setHouses((currentHouses) =>
            currentHouses.map((h) => {
              if (
                h.House_ID === found.house_id ||
                (h.House_name.toLowerCase() === found.House_name.toLowerCase() &&
                  h.floor.toLowerCase() === found.floor.toLowerCase() &&
                  h.house_type.toLowerCase() === found.house_type.toLowerCase())
              ) {
                return { ...h, is_occupied: false };
              }
              return h;
            })
          );
        }
        return currentTenants;
      });
    } else if (updates.is_active_tenant === true) {
      // If reactivated
      setTenants((currentTenants) => {
        const found = currentTenants.find(
          (t) => t.id === idOrTenantId || t.Tenant_ID === idOrTenantId
        );
        if (found) {
          setHouses((currentHouses) =>
            currentHouses.map((h) => {
              if (
                h.House_ID === found.house_id ||
                (h.House_name.toLowerCase() === found.House_name.toLowerCase() &&
                  h.floor.toLowerCase() === found.floor.toLowerCase() &&
                  h.house_type.toLowerCase() === found.house_type.toLowerCase())
              ) {
                return { ...h, is_occupied: true };
              }
              return h;
            })
          );
        }
        return currentTenants;
      });
    }
  };

  const deleteTenant = (idOrTenantId: string) => {
    const toDelete = tenants.find((t) => t.id === idOrTenantId || t.Tenant_ID === idOrTenantId);
    if (toDelete) {
      // Free up house unit if this was an active tenant
      setHouses((prev) =>
        prev.map((h) => {
          if (
            h.House_ID === toDelete.house_id ||
            (h.House_name.toLowerCase() === toDelete.House_name.toLowerCase() &&
              h.floor.toLowerCase() === toDelete.floor.toLowerCase() &&
              h.house_type.toLowerCase() === toDelete.house_type.toLowerCase())
          ) {
            return { ...h, is_occupied: false };
          }
          return h;
        })
      );
    }
    setTenants((prev) => prev.filter((t) => t.id !== idOrTenantId && t.Tenant_ID !== idOrTenantId));
  };

  // Invoice operations
  const addInvoice = (data: Omit<MonthlyInvoice, 'id' | 'Invoice_ID'> & { Invoice_ID?: string }): MonthlyInvoice => {
    const existingIds = invoices.map((i) => i.Invoice_ID);
    const newInvoiceId = data.Invoice_ID || generateNextInvoiceId(existingIds);

    const newInvoice: MonthlyInvoice = {
      ...data,
      id: `inv-${Date.now()}`,
      Invoice_ID: newInvoiceId,
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const updateInvoice = (idOrInvoiceId: string, updates: Partial<MonthlyInvoice>) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === idOrInvoiceId || inv.Invoice_ID === idOrInvoiceId) {
          const updated = { ...inv, ...updates };
          if (updated.Payment_Status === 'Paid and Closed') {
            updated.is_closed = true;
            updated.Total_Due = 0;
          } else if (updates.is_closed === false) {
            updated.is_closed = false;
          }
          return updated;
        }
        return inv;
      })
    );
  };

  const deleteInvoice = (idOrInvoiceId: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== idOrInvoiceId && i.Invoice_ID !== idOrInvoiceId));
  };

  const generateBulkInvoicesForMonth = (monthYear: string): number => {
    const activeTenants = tenants.filter((t) => t.is_active_tenant);
    let createdCount = 0;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const dueDateStr = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0];

    const newInvoices: MonthlyInvoice[] = [];

    activeTenants.forEach((t) => {
      // Check if invoice already exists for this tenant & month
      const exists = invoices.some(
        (inv) => inv.Tenant_ID === t.Tenant_ID && inv.Invoice_Month.toLowerCase() === monthYear.toLowerCase()
      );
      if (!exists) {
        // Find house details
        const house = houses.find(
          (h) =>
            h.House_ID === t.house_id ||
            (h.House_name.toLowerCase() === t.House_name.toLowerCase() &&
              h.floor.toLowerCase() === t.floor.toLowerCase() &&
              h.house_type.toLowerCase() === t.house_type.toLowerCase())
        );

        const ebRR = house ? house.EB_RR_Number : 'N/A';
        const isLease = t.rental_type === 'Lease';
        const rent = isLease ? 0 : (t.rent_amount ?? t.monthly_rent ?? 18000);
        
        // Find previous invoice for this tenant to chain readings
        const prevInvoice = invoices.find((inv) => inv.Tenant_ID === t.Tenant_ID);
        const ebStart = prevInvoice?.EB_Reading_End || 4000;
        const ebUnits = Math.floor(Math.random() * 120) + 80;
        const ebEnd = ebStart + ebUnits;
        const ebCharges = ebUnits * 8;

        const waterBasePrice = t.water_base_price ?? 400;
        const waterStart = prevInvoice?.Water_Reading_End || 1000;
        const waterEnd = waterStart + 1;
        const waterCharges = waterBasePrice;

        const motorStart = prevInvoice?.Motor_Reading_End || 500;
        const motorEnd = motorStart + 2;
        const motorBill = 0;

        const maintenance = 1500;
        const total = rent + ebCharges + waterCharges + motorBill + maintenance;

        const allIds = [...invoices.map((i) => i.Invoice_ID), ...newInvoices.map((i) => i.Invoice_ID)];
        const nextId = generateNextInvoiceId(allIds);

        newInvoices.push({
          id: `inv-${Date.now()}-${createdCount}`,
          Invoice_ID: nextId,
          Invoice_Month: monthYear,
          Invoice_Date: todayStr,
          Due_Date: dueDateStr,
          Tenant_ID: t.Tenant_ID,
          Tenant_Name: t.Tenant_Name,
          Tenant_Mobile: t.Tenant_Mobile,
          House_name: t.House_name,
          floor: t.floor,
          house_type: t.house_type,
          house_id: t.house_id,
          rental_type: t.rental_type || 'Rent',
          Rent_Amount: rent,
          Rent_Paid_Status: 'Due',
          Rent_Paid_Date: null,
          lease_amount: isLease ? t.lease_amount : 0,
          EB_RR_Number: ebRR,
          EB_Reading_Start: ebStart,
          EB_Reading_End: ebEnd,
          EB_Units_Consumed: ebUnits,
          EB_Bill_Amount: ebCharges,
          EB_Paid_Status: 'Due',
          EB_Charges: ebCharges,
          Water_RR_Number: house?.Water_RR_Number || '',
          Water_Reading_Start: waterStart,
          Water_Reading_End: waterEnd,
          Water_RR_Number1: house?.Water_RR_Number2 || null,
          Water1_Reading_Start: null,
          Water1_Reading_End: null,
          Water_Base_Price: waterBasePrice,
          Water_Bill_Amount: waterCharges,
          Water_Paid_Status: 'Due',
          Water_Charges: waterCharges,
          Motor_Reading_Start: motorStart,
          Motor_Reading_End: motorEnd,
          Motor_Bill_Amount: motorBill,
          Maintenance_Charges: maintenance,
          Other_Charges: 0,
          Total_Amount: total,
          Total_Due: total,
          Payment_Status: 'Pending',
          is_closed: false,
          Payment_Date: null,
          Payment_Mode: null,
          Notes: isLease
            ? `Lease agreement for ${monthYear} (Rent ₹0, utilities only)`
            : `Auto-generated for ${monthYear}`,
        });
        createdCount++;
      }
    });

    if (newInvoices.length > 0) {
      setInvoices((prev) => [...newInvoices, ...prev]);
    }

    return createdCount;
  };

  // Maintenance bill operations
  const addMaintenanceBill = (data: Omit<HouseMaintenanceBill, 'id' | 'Bill_ID'> & { Bill_ID?: string }): HouseMaintenanceBill => {
    const existingIds = maintenanceBills.map((b) => b.Bill_ID);
    const newBillId = data.Bill_ID || generateNextMaintenanceBillId(existingIds);

    const newBill: HouseMaintenanceBill = {
      ...data,
      id: `mb-${Date.now()}`,
      Bill_ID: newBillId,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    setMaintenanceBills((prev) => [newBill, ...prev]);
    return newBill;
  };

  const updateMaintenanceBill = (idOrBillId: string, updates: Partial<HouseMaintenanceBill>) => {
    setMaintenanceBills((prev) =>
      prev.map((bill) => {
        if (bill.id === idOrBillId || bill.Bill_ID === idOrBillId) {
          return { ...bill, ...updates };
        }
        return bill;
      })
    );
  };

  const deleteMaintenanceBill = (idOrBillId: string) => {
    setMaintenanceBills((prev) => prev.filter((b) => b.id !== idOrBillId && b.Bill_ID !== idOrBillId));
  };

  const getMaintenanceBillForHouse = (houseName: string, billingMonth: string): HouseMaintenanceBill | undefined => {
    return maintenanceBills.find(
      (b) =>
        b.House_name.trim().toLowerCase() === houseName.trim().toLowerCase() &&
        b.Billing_Month.trim().toLowerCase() === billingMonth.trim().toLowerCase()
    );
  };

  const saveBatchWaterReadings = (readings: RecordedWaterReading[]) => {
    setRecordedWaterReadings((prev) => {
      const next = [...prev];
      readings.forEach((r) => {
        const idx = next.findIndex(
          (existing) =>
            existing.houseName.trim().toLowerCase() === r.houseName.trim().toLowerCase() &&
            existing.floor.trim().toLowerCase() === r.floor.trim().toLowerCase() &&
            existing.houseType.trim().toLowerCase() === r.houseType.trim().toLowerCase() &&
            existing.month.trim().toLowerCase() === r.month.trim().toLowerCase()
        );
        if (idx >= 0) {
          next[idx] = r;
        } else {
          next.push(r);
        }
      });
      return next;
    });
  };

  const saveBatchEbReadings = (readings: RecordedEbReading[]) => {
    setRecordedEbReadings((prev) => {
      const next = [...prev];
      readings.forEach((r) => {
        const idx = next.findIndex(
          (existing) =>
            existing.houseName.trim().toLowerCase() === r.houseName.trim().toLowerCase() &&
            existing.floor.trim().toLowerCase() === r.floor.trim().toLowerCase() &&
            existing.houseType.trim().toLowerCase() === r.houseType.trim().toLowerCase() &&
            existing.month.trim().toLowerCase() === r.month.trim().toLowerCase()
        );
        if (idx >= 0) {
          next[idx] = r;
        } else {
          next.push(r);
        }
      });
      return next;
    });
  };

  const getWaterReading = (houseName: string, floor: string, houseType: string, month: string): RecordedWaterReading | undefined => {
    return recordedWaterReadings.find(
      (r) =>
        r.houseName.trim().toLowerCase() === houseName.trim().toLowerCase() &&
        r.floor.trim().toLowerCase() === floor.trim().toLowerCase() &&
        r.houseType.trim().toLowerCase() === houseType.trim().toLowerCase() &&
        r.month.trim().toLowerCase() === month.trim().toLowerCase()
    );
  };

  const getEbReading = (houseName: string, floor: string, houseType: string, month: string): RecordedEbReading | undefined => {
    return recordedEbReadings.find(
      (r) =>
        r.houseName.trim().toLowerCase() === houseName.trim().toLowerCase() &&
        r.floor.trim().toLowerCase() === floor.trim().toLowerCase() &&
        r.houseType.trim().toLowerCase() === houseType.trim().toLowerCase() &&
        r.month.trim().toLowerCase() === month.trim().toLowerCase()
    );
  };

  const resetToDefaults = () => {
    setHouses(INITIAL_HOUSES);
    setTenants(INITIAL_TENANTS);
    setInvoices(INITIAL_INVOICES);
    setMaintenanceBills(INITIAL_MAINTENANCE_BILLS);
    setSelectedHouseName('Bglr Old SR');
    localStorage.removeItem(STORAGE_KEYS.HOUSES);
    localStorage.removeItem(STORAGE_KEYS.TENANTS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.MAINTENANCE_BILLS);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_HOUSE);
  };

  // CSV Export utility
  const exportCsvData = (entity: 'houses' | 'tenants' | 'invoices' | 'all'): string => {
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    if (entity === 'houses') {
      const headers = ['House_ID', 'House_name', 'floor', 'house_type', 'EB_RR_Number', 'Water_RR_Number', 'Water_RR_Number2', 'rent_amount', 'deposit_amount', 'is_occupied', 'notes'];
      const rows = houses.map((h) => [
        h.House_ID,
        h.House_name,
        h.floor,
        h.house_type,
        h.EB_RR_Number,
        h.Water_RR_Number,
        h.Water_RR_Number2 || '',
        h.rent_amount,
        h.deposit_amount,
        h.is_occupied ? 'TRUE' : 'FALSE',
        h.notes || '',
      ].map(escapeCsv).join(','));
      return [headers.join(','), ...rows].join('\n');
    }

    if (entity === 'tenants') {
      const headers = ['Tenant_ID', 'Tenant_Name', 'Tenant_Mobile', 'Tenant_Email', 'House_name', 'floor', 'house_type', 'Rental_Type', 'Rent_Amount', 'Advance_Amount', 'Lease_Amount', 'Water_Base_Price', 'Lease_Term', 'occupancy_start_date', 'occupancy_end_date', 'is_active_tenant'];
      const rows = tenants.map((t) => [
        t.Tenant_ID,
        t.Tenant_Name,
        t.Tenant_Mobile,
        t.Tenant_Email || '',
        t.House_name,
        t.floor,
        t.house_type,
        t.rental_type || 'Rent',
        t.rental_type === 'Rent' ? (t.rent_amount ?? t.monthly_rent ?? 0) : 0,
        t.rental_type === 'Rent' ? (t.advance_amount ?? t.security_deposit ?? 0) : 0,
        t.rental_type === 'Lease' ? (t.lease_amount ?? 0) : 0,
        t.water_base_price !== undefined ? t.water_base_price : 0,
        t.rental_type === 'Lease' ? (t.lease_term_years ? `${t.lease_term_years}year` : '2year') : '',
        t.occupancy_start_date,
        t.occupancy_end_date,
        t.is_active_tenant ? 'TRUE' : 'FALSE',
      ].map(escapeCsv).join(','));
      return [headers.join(','), ...rows].join('\n');
    }

    if (entity === 'invoices') {
      const headers = ['Invoice_ID', 'Invoice_Month', 'Invoice_Date', 'Due_Date', 'Tenant_ID', 'Tenant_Name', 'Tenant_Mobile', 'House_name', 'floor', 'house_type', 'Rental_Type', 'Rent_Amount', 'EB_RR_Number', 'EB_Charges', 'Water_Charges', 'Maintenance_Charges', 'Total_Amount', 'Payment_Status', 'Payment_Date', 'Payment_Mode'];
      const rows = invoices.map((i) => [
        i.Invoice_ID,
        i.Invoice_Month,
        i.Invoice_Date,
        i.Due_Date,
        i.Tenant_ID,
        i.Tenant_Name,
        i.Tenant_Mobile,
        i.House_name,
        i.floor,
        i.house_type,
        i.rental_type || 'Rent',
        i.Rent_Amount,
        i.EB_RR_Number,
        i.EB_Charges,
        i.Water_Charges,
        i.Maintenance_Charges,
        i.Total_Amount,
        i.Payment_Status,
        i.Payment_Date || '',
        i.Payment_Mode || '',
      ].map(escapeCsv).join(','));
      return [headers.join(','), ...rows].join('\n');
    }

    // Combine all
    return [
      '### HOUSES ###',
      exportCsvData('houses'),
      '\n### TENANTS ###',
      exportCsvData('tenants'),
      '\n### INVOICES ###',
      exportCsvData('invoices'),
    ].join('\n');
  };

  // CSV Import utility
  const importCsvData = (entity: 'houses' | 'tenants' | 'invoices', csvText: string) => {
    try {
      const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        return { success: false, count: 0, error: 'CSV must contain a header row and at least one data row.' };
      }

      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim());

      if (entity === 'houses') {
        const imported: House[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const key = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            row[key] = cols[idx] || '';
          });

          const houseId = row['houseid'] || row['id'] || String(i);
          const houseName = row['housename'] || row['name'] || 'Bglr Old SR';
          const floor = row['floor'] || 'Ground';
          const houseType = row['housetype'] || row['type'] || '2BHK';
          const isOccupied = row['isoccupied'] ? row['isoccupied'].toUpperCase() === 'TRUE' : false;
          const ebRR = row['ebrrnumber'] || '';
          const ebPayNo = row['ebpaymentnumber'] || '';
          const water1 = row['waterrrnumber1'] || row['waterrrnumber'] || '';
          const water2 = row['waterrrnumber2'] || null;
          const address = row['houseaddress'] || row['address'] || '';
          const rent = parseFloat(row['rentamount'] || row['rent'] || '18000') || 18000;
          const deposit = parseFloat(row['depositamount'] || row['deposit'] || '100000') || 100000;

          if (houseId && houseName) {
            imported.push({
              id: `hse-imp-${Date.now()}-${i}`,
              House_ID: houseId,
              House_name: houseName,
              floor: floor,
              house_type: houseType,
              House_Address: address,
              EB_RR_Number: ebRR,
              EB_Payment_Number: ebPayNo,
              Water_RR_Number: water1,
              Water_RR_Number2: water2,
              rent_amount: rent,
              deposit_amount: deposit,
              is_occupied: isOccupied,
              notes: address ? `Address: ${address}` : '',
              createdAt: new Date().toISOString(),
            });
          }
        }
        if (imported.length > 0) {
          setHouses(imported);
          return { success: true, count: imported.length };
        }
      } else if (entity === 'tenants') {
        const imported: Tenant[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const key = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            row[key] = cols[idx] || '';
          });

          const tenantId = row['tenantid'] || row['id'];
          const tenantName = row['tenantname'] || row['name'];
          const rentalType = (row['rentaltype']?.toUpperCase() === 'LEASE' ? 'Lease' : 'Rent') as 'Rent' | 'Lease';
          const isRent = rentalType === 'Rent';
          const rentAmount = isRent ? parseFloat(row['rentamount'] || row['monthlyrent'] || '0') || 0 : 0;
          const advanceAmount = isRent ? parseFloat(row['advanceamount'] || row['securitydeposit'] || '0') || 0 : 0;
          const leaseAmount = !isRent ? parseFloat(row['leaseamount'] || '0') || 0 : 0;
          const waterBasePrice = parseFloat(row['waterbaseprice'] || row['waterbase'] || '0') || 0;
          const termStr = row['leaseterm'] || row['term'] || '';
          const leaseTermYears: 2 | 3 = termStr.includes('3') ? 3 : 2;

          if (tenantId && tenantName) {
            imported.push({
              id: `tnt-imp-${Date.now()}-${i}`,
              Tenant_ID: tenantId,
              Tenant_Name: tenantName,
              Tenant_Mobile: row['tenantmobile'] || row['mobile'] || '',
              Tenant_Email: row['tenantemail'] || row['email'] || '',
              House_name: row['housename'] || '',
              floor: row['floor'] || '',
              house_type: row['housetype'] || '',
              house_id: row['houseid'] || '',
              rental_type: rentalType,
              rent_amount: rentAmount,
              advance_amount: advanceAmount,
              lease_amount: leaseAmount,
              water_base_price: waterBasePrice,
              lease_term_years: !isRent ? leaseTermYears : undefined,
              monthly_rent: rentAmount,
              security_deposit: advanceAmount,
              occupancy_start_date: row['occupancystartdate'] || '2025-01-01',
              occupancy_end_date: row['occupancyenddate'] || '2026-12-31',
              is_active_tenant: String(row['isactivetenant'] || 'TRUE').toUpperCase() === 'TRUE',
              createdAt: new Date().toISOString(),
            });
          }
        }
        if (imported.length > 0) {
          setTenants(imported);
          return { success: true, count: imported.length };
        }
      } else if (entity === 'invoices') {
        const imported: MonthlyInvoice[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
          const row: any = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] || '';
          });

          if (row.Invoice_ID) {
            imported.push({
              id: `inv-imp-${Date.now()}-${i}`,
              Invoice_ID: row.Invoice_ID,
              Invoice_Month: row.Invoice_Month || 'October 2026',
              Invoice_Date: row.Invoice_Date || '2026-10-01',
              Due_Date: row.Due_Date || '2026-10-10',
              Tenant_ID: row.Tenant_ID || '',
              Tenant_Name: row.Tenant_Name || '',
              Tenant_Mobile: row.Tenant_Mobile || '',
              House_name: row.House_name || '',
              floor: row.floor || '',
              house_type: row.house_type || '',
              house_id: row.house_id || '',
              Rent_Amount: parseFloat(row.Rent_Amount) || 0,
              EB_RR_Number: row.EB_RR_Number || '',
              EB_Bill_Amount: parseFloat(row.EB_Bill_Amount || row.EB_Charges) || 0,
              EB_Charges: parseFloat(row.EB_Charges || row.EB_Bill_Amount) || 0,
              Water_Bill_Amount: parseFloat(row.Water_Bill_Amount || row.Water_Charges) || 0,
              Water_Charges: parseFloat(row.Water_Charges || row.Water_Bill_Amount) || 0,
              Maintenance_Charges: parseFloat(row.Maintenance_Charges) || 0,
              Other_Charges: parseFloat(row.Other_Charges) || 0,
              Total_Amount: parseFloat(row.Total_Amount) || 0,
              Total_Due: parseFloat(row.Total_Due || row.Total_Amount) || 0,
              Payment_Status: (row.Payment_Status as any) || 'Pending',
              Payment_Date: row.Payment_Date || null,
              Payment_Mode: (row.Payment_Mode as any) || null,
            });
          }
        }
        if (imported.length > 0) {
          setInvoices(imported);
          return { success: true, count: imported.length };
        }
      }

      return { success: false, count: 0, error: 'No valid records found in CSV' };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Error parsing CSV' };
    }
  };

  const applyGoogleSheetData = (
    data: {
      houses?: House[];
      tenants?: Tenant[];
      invoices?: MonthlyInvoice[];
      maintenanceBills?: HouseMaintenanceBill[];
      waterReadings?: RecordedWaterReading[];
      ebReadings?: RecordedEbReading[];
    },
    mode: 'replace' | 'merge' = 'replace'
  ) => {
    let mergedHouses = 0;
    let mergedTenants = 0;
    let mergedInvoices = 0;
    let mergedMaintenanceBills = 0;

    if (mode === 'replace') {
      if (data.houses !== undefined) {
        setHouses(data.houses);
        localStorage.setItem(STORAGE_KEYS.HOUSES, JSON.stringify(data.houses));
        mergedHouses = data.houses.length;
      }
      if (data.tenants !== undefined) {
        const cleanTenants = data.tenants.map((t) => ({
          ...t,
          water_base_price: (t.water_base_price === 1899 || !t.water_base_price) ? 0 : t.water_base_price,
        }));
        setTenants(cleanTenants);
        localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(cleanTenants));
        mergedTenants = cleanTenants.length;
      }
      if (data.invoices !== undefined) {
        setInvoices(data.invoices);
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
        mergedInvoices = data.invoices.length;
      }
      if (data.maintenanceBills !== undefined) {
        setMaintenanceBills(data.maintenanceBills);
        localStorage.setItem(STORAGE_KEYS.MAINTENANCE_BILLS, JSON.stringify(data.maintenanceBills));
        mergedMaintenanceBills = data.maintenanceBills.length;
      }
      if (data.waterReadings !== undefined) {
        setRecordedWaterReadings(data.waterReadings);
        localStorage.setItem(STORAGE_KEYS.WATER_READINGS, JSON.stringify(data.waterReadings));
      }
      if (data.ebReadings !== undefined) {
        setRecordedEbReadings(data.ebReadings);
        localStorage.setItem(STORAGE_KEYS.EB_READINGS, JSON.stringify(data.ebReadings));
      }
      return { mergedHouses, mergedTenants, mergedInvoices, mergedMaintenanceBills };
    }

    if (data.houses && data.houses.length > 0) {
      setHouses((prevHouses) => {
        const next = [...prevHouses];
        data.houses!.forEach((sheetHouse) => {
          const idx = next.findIndex(
            (h) =>
              h.House_ID === sheetHouse.House_ID ||
              (h.House_name.toLowerCase() === sheetHouse.House_name.toLowerCase() &&
                h.floor.toLowerCase() === sheetHouse.floor.toLowerCase() &&
                h.house_type.toLowerCase() === sheetHouse.house_type.toLowerCase())
          );
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...sheetHouse, id: next[idx].id };
          } else {
            next.push(sheetHouse);
          }
          mergedHouses++;
        });
        return next;
      });
    }

    if (data.tenants && data.tenants.length > 0) {
      setTenants((prevTenants) => {
        const next = [...prevTenants];
        data.tenants!.forEach((sheetTenant) => {
          const idx = next.findIndex(
            (t) =>
              t.Tenant_ID === sheetTenant.Tenant_ID ||
              (t.Tenant_Name.toLowerCase() === sheetTenant.Tenant_Name.toLowerCase() &&
                t.House_name.toLowerCase() === sheetTenant.House_name.toLowerCase() &&
                t.floor.toLowerCase() === sheetTenant.floor.toLowerCase())
          );
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...sheetTenant, id: next[idx].id };
          } else {
            next.push(sheetTenant);
          }
          mergedTenants++;
        });
        return next;
      });
    }

    if (data.invoices && data.invoices.length > 0) {
      setInvoices((prevInvoices) => {
        const next = [...prevInvoices];
        data.invoices!.forEach((sheetInv) => {
          const idx = next.findIndex((i) => i.Invoice_ID === sheetInv.Invoice_ID);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...sheetInv, id: next[idx].id };
          } else {
            next.push(sheetInv);
          }
          mergedInvoices++;
        });
        return next;
      });
    }

    if (data.maintenanceBills && data.maintenanceBills.length > 0) {
      setMaintenanceBills((prevBills) => {
        const next = [...prevBills];
        data.maintenanceBills!.forEach((sheetMb) => {
          const idx = next.findIndex((b) => b.Bill_ID === sheetMb.Bill_ID);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...sheetMb, id: next[idx].id };
          } else {
            next.push(sheetMb);
          }
          mergedMaintenanceBills++;
        });
        return next;
      });
    }

    return { mergedHouses, mergedTenants, mergedInvoices, mergedMaintenanceBills };
  };

  return (
    <PropertyContext.Provider
      value={{
        houses,
        tenants,
        invoices,
        maintenanceBills,
        recordedWaterReadings,
        recordedEbReadings,
        saveBatchWaterReadings,
        saveBatchEbReadings,
        getWaterReading,
        getEbReading,
        selectedHouseName,
        setSelectedHouseName,
        uniqueHouseNames,
        addHouse,
        updateHouse,
        deleteHouse,
        addTenant,
        updateTenant,
        deleteTenant,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        generateBulkInvoicesForMonth,
        addMaintenanceBill,
        updateMaintenanceBill,
        deleteMaintenanceBill,
        getMaintenanceBillForHouse,
        resetToDefaults,
        exportCsvData,
        importCsvData,
        applyGoogleSheetData,
      }}
    >
      {children}
    </PropertyContext.Provider>
  );
};

export const useProperty = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('useProperty must be used within a PropertyProvider');
  }
  return context;
};
