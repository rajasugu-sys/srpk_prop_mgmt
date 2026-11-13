import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PropertyProvider, useProperty } from './context/PropertyContext';
import { GoogleSheetsProvider, useGoogleSheets } from './context/GoogleSheetsContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HouseDashboard } from './components/houses/HouseDashboard';
import { TenantDashboard } from './components/tenants/TenantDashboard';
import { MonthlyInvoiceDashboard } from './components/invoices/MonthlyInvoiceDashboard';
import { GoogleSheetSyncModal } from './components/sheets/GoogleSheetSyncModal';
import { ActiveTab, Tenant } from './types';
import { TenantDetailsModal } from './components/tenants/TenantDetailsModal';
import { UpdateTenantModal } from './components/tenants/UpdateTenantModal';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';

function AppContent() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('houses');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const {
    houses,
    tenants,
    invoices,
    maintenanceBills,
    recordedWaterReadings,
    recordedEbReadings,
    applyGoogleSheetData,
  } = useProperty();

  const {
    isAuthenticated,
    connectedSheet,
    syncFromGoogleSheet,
    syncToGoogleSheet,
  } = useGoogleSheets();

  const [hasAutoPulled, setHasAutoPulled] = useState(false);
  const isInitialPullDoneRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string>('');

  // 1. Auto-pull from connected Google Sheet on app launch or browser refresh
  useEffect(() => {
    if (isAuthenticated && connectedSheet && !hasAutoPulled) {
      setHasAutoPulled(true);
      syncFromGoogleSheet()
        .then((res) => {
          if (res.success && res.data) {
            applyGoogleSheetData(res.data, 'replace');
          }
        })
        .catch((err) => {
          console.warn('Auto-pull from Google Sheet error:', err);
        })
        .finally(() => {
          // Allow state to settle and establish baseline before enabling auto-push
          setTimeout(() => {
            isInitialPullDoneRef.current = true;
          }, 800);
        });
    } else if (!isAuthenticated || !connectedSheet) {
      isInitialPullDoneRef.current = true;
    }
  }, [isAuthenticated, connectedSheet, hasAutoPulled, syncFromGoogleSheet, applyGoogleSheetData]);

  // Compute lightweight fingerprint of all records
  const currentFingerprint = useMemo(() => {
    return JSON.stringify({
      h: houses.map((h) => `${h.House_ID}-${h.is_occupied}-${h.rent_amount}-${h.EB_RR_Number}-${h.Water_RR_Number}`),
      t: tenants.map((t) => `${t.Tenant_ID}-${t.is_active_tenant}-${t.rent_amount}-${t.rental_type}-${t.lease_amount}-${t.water_base_price}-${t.agreement_document ? t.agreement_document.name : ''}`),
      i: invoices.map((i) => `${i.Invoice_ID}-${i.Payment_Status}-${i.Total_Due}-${i.Total_Amount}-${i.EB_Paid_Status}-${i.Water_Paid_Status}-${i.Rent_Paid_Status}-${i.is_closed}`),
      mb: maintenanceBills.map((b) => `${b.Bill_ID}-${b.Payment_Status}-${b.Total_Maintenance_Amount}-${b.Per_Unit_Share}`),
      wr: recordedWaterReadings.map((r) => `${r.houseName}-${r.floor}-${r.houseType}-${r.month}-${r.waterReadingEnd}-${r.water1ReadingEnd}`),
      er: recordedEbReadings.map((r) => `${r.houseName}-${r.floor}-${r.houseType}-${r.month}-${r.ebReadingEnd}-${r.ebBillAmount}`),
    });
  }, [houses, tenants, invoices, maintenanceBills, recordedWaterReadings, recordedEbReadings]);

  // 2. Automatic synchronization to Google Sheet on ANY create, edit, or delete
  useEffect(() => {
    if (!isInitialPullDoneRef.current) return;
    if (!isAuthenticated || !connectedSheet) return;

    // Set baseline on initial cycle
    if (!lastSavedFingerprintRef.current) {
      lastSavedFingerprintRef.current = currentFingerprint;
      return;
    }

    // If data hasn't changed, no sync needed
    if (currentFingerprint === lastSavedFingerprintRef.current) return;

    // Debounce by 1000ms to batch rapid mutations
    const timer = setTimeout(() => {
      lastSavedFingerprintRef.current = currentFingerprint;
      syncToGoogleSheet(
        houses,
        tenants,
        invoices,
        maintenanceBills,
        recordedWaterReadings,
        recordedEbReadings
      ).catch((err) => {
        console.warn('Auto-save to Google Sheet failed:', err);
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    currentFingerprint,
    isAuthenticated,
    connectedSheet,
    houses,
    tenants,
    invoices,
    maintenanceBills,
    recordedWaterReadings,
    recordedEbReadings,
    syncToGoogleSheet,
  ]);

  // For cross-component interactions (e.g. from House card directly to Tenant details)
  const [tenantForDetails, setTenantForDetails] = useState<Tenant | null>(null);
  const [tenantForEdit, setTenantForEdit] = useState<Tenant | null>(null);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Top Header */}
      <Header onOpenSyncModal={() => setIsSyncModalOpen(true)} />

      {/* PWA / Android Install Banner */}
      <PWAInstallBanner />

      {/* Navigation (Tabs for Desktop, Bottom Bar for Mobile) */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'sheets') {
            setIsSyncModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Main Content Area (pb-28 ensures full clearance on mobile devices like OnePlus 11R) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8">
        {activeTab === 'houses' && (
          <HouseDashboard
            onOpenTenantDetails={(tenant) => setTenantForDetails(tenant)}
          />
        )}

        {activeTab === 'tenants' && <TenantDashboard />}

        {activeTab === 'invoices' && <MonthlyInvoiceDashboard />}
      </main>

      {/* Google Sheets Sync & Datasource Modal */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      {/* Cross-modal Tenant Details & Edit Support */}
      <TenantDetailsModal
        tenant={tenantForDetails}
        isOpen={!!tenantForDetails}
        onClose={() => setTenantForDetails(null)}
        onEdit={(t) => setTenantForEdit(t)}
      />

      <UpdateTenantModal
        tenant={tenantForEdit}
        isOpen={!!tenantForEdit}
        onClose={() => setTenantForEdit(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <PropertyProvider>
      <GoogleSheetsProvider>
        <AppContent />
      </GoogleSheetsProvider>
    </PropertyProvider>
  );
}
