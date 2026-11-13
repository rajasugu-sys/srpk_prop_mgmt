import React, { useState, useMemo } from 'react';
import { Users, Phone, Edit3, Plus, Building, UserCheck, AlertCircle, ArrowUpRight, ShieldCheck, Home, FileText, Tag, Droplets } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { Tenant, RentalType } from '../../types';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';
import { AddTenantModal } from './AddTenantModal';
import { UpdateTenantModal } from './UpdateTenantModal';
import { TenantDetailsModal } from './TenantDetailsModal';

export const TenantDashboard: React.FC = () => {
  const {
    houses,
    tenants,
    selectedHouseName,
    setSelectedHouseName,
    uniqueHouseNames,
  } = useProperty();

  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [tenantForDetails, setTenantForDetails] = useState<Tenant | null>(null);
  const [rentalTypeFilter, setRentalTypeFilter] = useState<'All' | 'Rent' | 'Lease'>('All');

  // 1.1: for selected_house_name, need the Tenant_details card displayed for each tenant if is_active_tenant=true
  const activeTenantsForHouse = useMemo(() => {
    return tenants.filter((t) => {
      if (!t.is_active_tenant || t.House_name !== selectedHouseName) return false;
      if (rentalTypeFilter !== 'All') {
        const type = t.rental_type || (t.lease_amount && t.lease_amount > 0 ? 'Lease' : 'Rent');
        if (type !== rentalTypeFilter) return false;
      }
      return true;
    });
  }, [tenants, selectedHouseName, rentalTypeFilter]);

  // 2. Check if all houses are occupied of selected_house_name
  const houseUnitsForSelected = houses.filter((h) => h.House_name === selectedHouseName);
  const unoccupiedUnits = houseUnitsForSelected.filter((h) => !h.is_occupied);
  const allHousesOccupied = houseUnitsForSelected.length > 0 && unoccupiedUnits.length === 0;
  const noHousesExist = houseUnitsForSelected.length === 0;
  const isAddTenantDisabled = allHousesOccupied || noHousesExist;

  // Financial metrics for selected property
  const allActiveInHouse = tenants.filter((t) => t.is_active_tenant && t.House_name === selectedHouseName);
  const rentTenants = allActiveInHouse.filter((t) => (t.rental_type || 'Rent') === 'Rent');
  const leaseTenants = allActiveInHouse.filter((t) => t.rental_type === 'Lease');

  const totalMonthlyRent = rentTenants.reduce((sum, t) => sum + (t.rent_amount ?? t.monthly_rent ?? 0), 0);
  const totalLeaseAmount = leaseTenants.reduce((sum, t) => sum + (t.lease_amount || 0), 0);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header with Dropdown to choose House_name */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Users className="w-4 h-4" />
              <span>Tenant Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Active Tenants &amp; Resident Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage leases, view tenant contacts, and update agreements by Rental Type (Rent or Lease).
            </p>
          </div>

          {/* 1. Dropdown to choose House_name & Rental Type Filter */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <label htmlFor="tenant-house-select" className="text-xs font-bold text-slate-600 pl-2">
                House:
              </label>
              <select
                id="tenant-house-select"
                value={selectedHouseName}
                onChange={(e) => setSelectedHouseName(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer min-w-[160px]"
              >
                {uniqueHouseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rental Type Filter Pill Selector */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {(['All', 'Rent', 'Lease'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setRentalTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    rentalTypeFilter === type
                      ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'All' ? 'All Types' : type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected House Occupancy Status Alert if 100% occupied */}
        {allHousesOccupied && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>100% Occupied:</strong> All {houseUnitsForSelected.length} units in{' '}
                <strong className="underline">{selectedHouseName}</strong> are currently occupied.
                The <strong>&quot;+ Add Tenant&quot;</strong> button is disabled until a unit is vacated or a new unit is added.
              </span>
            </div>
          </div>
        )}

        {/* Quick summary strip with Rent Roll & Lease Deposits */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">Active Tenants</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-black text-indigo-900">{allActiveInHouse.length}</span>
              <span className="text-[11px] text-slate-500">
                ({rentTenants.length} Rent, {leaseTenants.length} Lease)
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 block">Available Units</span>
            <span className="text-lg font-black text-emerald-900">{unoccupiedUnits.length} Vacant</span>
          </div>

          <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-[11px] font-semibold text-indigo-700 block">Monthly Rent Roll</span>
            <span className="text-lg font-black text-indigo-950 font-mono">
              {formatCurrency(totalMonthlyRent)}
            </span>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 block">Total Lease Deposits</span>
            <span className="text-lg font-black text-amber-950 font-mono">
              {formatCurrency(totalLeaseAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 1.1 Tenant Details Card List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Active Tenants ({activeTenantsForHouse.length})
            {rentalTypeFilter !== 'All' && ` • Filtered by ${rentalTypeFilter}`}
          </h2>
          <span className="text-xs text-slate-500">Tap card to view details • Click pencil to edit</span>
        </div>

        {activeTenantsForHouse.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">
              No active {rentalTypeFilter !== 'All' ? rentalTypeFilter : ''} tenants in {selectedHouseName}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {unoccupiedUnits.length > 0
                ? `You have ${unoccupiedUnits.length} vacant unit(s) available. Use the + button at bottom right to add a tenant.`
                : 'Add a new unit to this house first, then you can assign a tenant.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTenantsForHouse.map((tenant) => {
              const isLease = tenant.rental_type === 'Lease';

              return (
                /* 3. Clicking on Tenant_details card opens details page of tenant in readonly mode */
                <div
                  key={tenant.id}
                  onClick={() => setTenantForDetails(tenant)}
                  className={`bg-white rounded-2xl p-5 border shadow-xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${
                    isLease ? 'border-amber-200 hover:border-amber-400' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Accent line based on Rental Type */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isLease ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                          isLease
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}
                      >
                        {tenant.Tenant_Name.split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>

                      <div>
                        {/* 1.2: Tenant_details card displays Tenant_Name and Rental_Type Badge */}
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {tenant.Tenant_Name}
                          </h3>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                              isLease
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {isLease && tenant.lease_term_years ? `${tenant.lease_term_years}Y Lease` : (tenant.rental_type || 'Rent')}
                          </span>
                        </div>

                        {/* 1.2: Tenant_Mobile */}
                        <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono font-medium">{tenant.Tenant_Mobile}</span>
                        </div>

                        {/* 1.2: house_details.floor + house_details.house_type & Water_Base_Price */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200">
                            <Home className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {tenant.floor} • {tenant.house_type}
                            </span>
                          </div>

                          <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-200">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            <span>Water: {formatCurrency(tenant.water_base_price ?? 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 1.2 Edit Action: opens editable form "Update_Tenant_Details" */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // prevent opening details modal
                        setTenantToEdit(tenant);
                      }}
                      title="Edit Tenant Details"
                      className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* DISPLAYED BASED ON RENTAL_TYPE */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {isLease ? (
                      /* Lease Tenant Display: Lease_Amount visible, rent is zero/utilities only */
                      <div>
                        <span className="text-amber-800 text-[11px] font-bold block uppercase tracking-wider">
                          Lease Deposit
                        </span>
                        <strong className="text-slate-900 font-mono text-sm">
                          {formatCurrency(tenant.lease_amount || 0)}
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          Monthly Rent: ₹0 (Utilities only)
                        </span>
                      </div>
                    ) : (
                      /* Rent Tenant Display: Rent_Amount and Advance_Amount visible */
                      <div>
                        <span className="text-indigo-800 text-[11px] font-bold block uppercase tracking-wider">
                          Monthly Rent
                        </span>
                        <div className="flex items-baseline space-x-1.5">
                          <strong className="text-slate-900 font-mono text-sm">
                            {formatCurrency(tenant.rent_amount ?? tenant.monthly_rent ?? 0)}
                          </strong>
                          <span className="text-[11px] text-slate-500 font-mono">
                            (Adv: {formatCurrency(tenant.advance_amount ?? tenant.security_deposit ?? 0)})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">Vacating Date</span>
                      <strong className="text-indigo-700 font-medium">
                        {formatMonthYear(tenant.occupancy_end_date)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Floating Action Button at bottom right corner to add new tenant */}
      {/* Requirement 2: If all the houses are occupied of selected_house_name, this should be disabled */}
      <div className="fixed bottom-20 md:bottom-8 right-5 z-40 group">
        <button
          onClick={() => {
            if (!isAddTenantDisabled) {
              setIsAddTenantOpen(true);
            }
          }}
          disabled={isAddTenantDisabled}
          title={
            isAddTenantDisabled
              ? `Cannot add tenant: All units in ${selectedHouseName} are occupied.`
              : `Add New Tenant to ${selectedHouseName}`
          }
          className={`flex items-center space-x-2 px-4 py-3.5 rounded-full font-bold text-sm shadow-xl transition-all ${
            isAddTenantDisabled
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-2 border-slate-400/30'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-indigo-600/30 border-2 border-indigo-400/40 cursor-pointer'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Tenant</span>
        </button>

        {/* Tooltip if disabled */}
        {isAddTenantDisabled && (
          <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-lg text-center">
            {noHousesExist
              ? `No houses created under ${selectedHouseName}. Add a house first.`
              : `All units in ${selectedHouseName} are occupied. Add new unit or vacate existing.`}
          </div>
        )}
      </div>

      {/* 2.1 & 2.2 Add_New_Tenant View with Tenant_ID auto populated */}
      <AddTenantModal
        isOpen={isAddTenantOpen}
        onClose={() => setIsAddTenantOpen(false)}
        selectedHouseName={selectedHouseName}
      />

      {/* 1.2 & 1.3 Update_Tenant_Details form */}
      <UpdateTenantModal
        tenant={tenantToEdit}
        isOpen={!!tenantToEdit}
        onClose={() => setTenantToEdit(null)}
      />

      {/* 3. Readonly Tenant Details Modal */}
      <TenantDetailsModal
        tenant={tenantForDetails}
        isOpen={!!tenantForDetails}
        onClose={() => setTenantForDetails(null)}
        onEdit={(t) => setTenantToEdit(t)}
      />
    </div>
  );
};
