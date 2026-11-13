import React, { useState } from 'react';
import { Plus, Building, Zap, Droplets, CheckCircle2, AlertCircle, Home, UserCheck, Shield } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { House, Tenant } from '../../types';
import { formatMonthYear, formatCurrency } from '../../utils/formatters';
import { AddHouseModal } from './AddHouseModal';
import { HouseDetailsModal } from './HouseDetailsModal';

interface HouseDashboardProps {
  onOpenTenantDetails?: (tenant: Tenant) => void;
}

export const HouseDashboard: React.FC<HouseDashboardProps> = ({ onOpenTenantDetails }) => {
  const { houses, tenants, selectedHouseName, setSelectedHouseName, uniqueHouseNames } = useProperty();

  const [isAddHouseOpen, setIsAddHouseOpen] = useState(false);
  const [selectedHouseForDetails, setSelectedHouseForDetails] = useState<House | null>(null);

  // 1.1: for selected_house_name, need the Occupancy_details card displayed for each house
  const filteredHouses = houses.filter((h) => h.House_name === selectedHouseName);

  // Stats for selected house
  const occupiedCount = filteredHouses.filter((h) => h.is_occupied).length;
  const totalCount = filteredHouses.length;
  const occupancyPercentage = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

  // Helper to find active tenant for a house unit
  const getTenantForHouse = (house: House): Tenant | undefined => {
    return tenants.find(
      (t) =>
        t.is_active_tenant &&
        (t.house_id === house.House_ID ||
          (t.House_name.toLowerCase() === house.House_name.toLowerCase() &&
            t.floor.toLowerCase() === house.floor.toLowerCase() &&
            t.house_type.toLowerCase() === house.house_type.toLowerCase()))
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Header with Dropdown to choose House_name */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
              <Building className="w-4 h-4" />
              <span>House Dashboard</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Property &amp; Occupancy Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Select property complex to inspect unit occupancy, RR meters, and leasing terms.
            </p>
          </div>

          {/* 1. Dropdown to choose House_name */}
          <div className="flex items-center space-x-2 self-start sm:self-auto bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <label htmlFor="house-select" className="text-xs font-bold text-slate-600 pl-2">
              House:
            </label>
            <select
              id="house-select"
              value={selectedHouseName}
              onChange={(e) => setSelectedHouseName(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer min-w-[180px]"
            >
              {uniqueHouseNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected House Quick Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Units</span>
            <span className="text-lg font-black text-slate-900">{totalCount} Units</span>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 block">Occupied</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black text-emerald-900">{occupiedCount}</span>
              <span className="text-xs text-emerald-700 font-medium">({occupancyPercentage}%)</span>
            </div>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 block">UnOccupied / Vacant</span>
            <span className="text-lg font-black text-amber-900">{totalCount - occupiedCount}</span>
          </div>

          <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-100">
            <span className="text-[11px] font-semibold text-indigo-700 block">Property ID</span>
            <span className="text-sm font-bold text-indigo-950 font-mono truncate block">
              {selectedHouseName}
            </span>
          </div>
        </div>
      </div>

      {/* 1.1 List of Occupancy_details cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Units in {selectedHouseName} ({filteredHouses.length})
          </h2>
          <span className="text-xs text-slate-500">Tap card to inspect readonly details</span>
        </div>

        {filteredHouses.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
            <Building className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No units added in {selectedHouseName}</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Use the + button at the bottom right corner to add the first house unit for this property.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHouses.map((house) => {
              const tenant = getTenantForHouse(house);

              return (
                <div
                  key={house.id}
                  onClick={() => setSelectedHouseForDetails(house)}
                  className={`bg-white rounded-2xl p-5 border transition-all duration-150 shadow-xs hover:shadow-md cursor-pointer group relative overflow-hidden ${
                    house.is_occupied
                      ? 'border-slate-200 hover:border-emerald-400'
                      : 'border-amber-200/80 bg-amber-50/20 hover:border-amber-400'
                  }`}
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      house.is_occupied ? 'bg-emerald-500' : 'bg-amber-400'
                    }`}
                  />

                  {/* Card Header: 1.2 & 1.3 floor + house_type */}
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {house.floor} • {house.house_type}
                        </h3>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                          {house.House_ID}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{house.House_name}</p>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold tracking-tight border ${
                        house.is_occupied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {house.is_occupied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Occupied
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          UnOccupied
                        </>
                      )}
                    </span>
                  </div>

                  {/* Utility RR Numbers: EB_RR_Number + Water_RR_Number + Water_RR_Number2(if not null) */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 bg-slate-50/80 -mx-5 -mb-5 px-5 pb-4 rounded-b-2xl space-y-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <div className="flex items-center space-x-1 text-slate-700 font-mono font-medium">
                        <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-slate-400">EB:</span>
                        <span className="font-semibold">
                          {house.EB_RR_Number
                            ? house.EB_RR_Number
                            : house.EB_Payment_Number
                            ? `Pay# ${house.EB_Payment_Number}`
                            : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-slate-700 font-mono font-medium">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-slate-400">Water:</span>
                        <span className="font-semibold">{house.Water_RR_Number || 'N/A'}</span>
                        {house.Water_RR_Number2 && (
                          <span className="text-blue-700 font-semibold">
                            + {house.Water_RR_Number2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Occupancy Status Statement:
                        1.2: if isOccupied=TRUE -> {"Occupied by" tenant_details.Tenant_name "vacating" tenant_details.occupancy_end_date(mmmm/yyyy)}
                        1.3: if isOccupied=FALSE -> {"UnOccupied"}
                    */}
                    <div className="pt-2 border-t border-slate-200/60">
                      {house.is_occupied ? (
                        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 shadow-2xs text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-normal text-slate-600">Occupied by </span>
                              <strong className="text-slate-900 font-bold">
                                {tenant ? tenant.Tenant_Name : 'Assigned Tenant'}
                              </strong>
                              <span className="font-normal text-slate-600"> vacating </span>
                              <strong className="text-indigo-700 font-bold">
                                {formatMonthYear(tenant?.occupancy_end_date)}
                              </strong>
                            </div>
                          </div>

                          {/* Financial terms displayed based on rental_type */}
                          <span
                            className={`shrink-0 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              (tenant?.rental_type === 'Lease' || house.rental_type === 'Lease')
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {(tenant?.rental_type === 'Lease' || house.rental_type === 'Lease')
                              ? `Lease: ${formatCurrency(tenant?.lease_amount || house.lease_amount || 0)}`
                              : `${formatCurrency(tenant?.rent_amount ?? tenant?.monthly_rent ?? house.rent_amount)}/mo`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-xs text-amber-900 bg-white p-2 rounded-lg border border-amber-200 shadow-2xs font-bold">
                          <Home className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>UnOccupied</span>
                          <span className="text-slate-400 font-normal ml-auto text-[11px]">
                            {house.rental_type === 'Lease'
                              ? `Lease: ${formatCurrency(house.lease_amount || 1500000)}`
                              : `${formatCurrency(house.rent_amount)} / mo`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Floating Action Button at the bottom right corner, to add new House */}
      <button
        onClick={() => setIsAddHouseOpen(true)}
        title="Add New House / Unit"
        className="fixed bottom-20 md:bottom-8 right-5 z-40 flex items-center space-x-2 px-4 py-3.5 rounded-full bg-slate-900 text-amber-400 hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/30 border-2 border-amber-400/40 font-bold text-sm transition-all cursor-pointer group"
      >
        <Plus className="w-5 h-5 text-amber-400 group-hover:rotate-90 transition-transform" />
        <span className="hidden sm:inline text-white">Add House</span>
      </button>

      {/* 2.1 & 2.2 Add_New_House Modal */}
      <AddHouseModal
        isOpen={isAddHouseOpen}
        onClose={() => setIsAddHouseOpen(false)}
        defaultHouseName={selectedHouseName}
      />

      {/* 3. Readonly House Details Modal */}
      <HouseDetailsModal
        house={selectedHouseForDetails}
        tenant={selectedHouseForDetails ? getTenantForHouse(selectedHouseForDetails) : null}
        isOpen={!!selectedHouseForDetails}
        onClose={() => setSelectedHouseForDetails(null)}
        onOpenTenantDetails={onOpenTenantDetails}
      />
    </div>
  );
};
