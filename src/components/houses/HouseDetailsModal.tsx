import React from 'react';
import { X, Building2, Zap, Droplets, User, Calendar, IndianRupee, ShieldCheck, Home } from 'lucide-react';
import { House, Tenant } from '../../types';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';

interface HouseDetailsModalProps {
  house: House | null;
  tenant?: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTenantDetails?: (tenant: Tenant) => void;
}

export const HouseDetailsModal: React.FC<HouseDetailsModalProps> = ({
  house,
  tenant,
  isOpen,
  onClose,
  onOpenTenantDetails,
}) => {
  if (!isOpen || !house) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">{house.House_name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold border border-slate-700">
                  {house.House_ID}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {house.floor} • {house.house_type} (Readonly Details)
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

        {/* Content Body - Pure Readonly */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Occupancy Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Occupancy Status
            </span>
            {house.is_occupied ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Occupied</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 border border-slate-300">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>UnOccupied (Vacant)</span>
              </span>
            )}
          </div>

          {/* Connected Tenant (if occupied) */}
          {house.is_occupied && tenant ? (
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Current Active Tenant</span>
                </div>
                {onOpenTenantDetails && (
                  <button
                    onClick={() => onOpenTenantDetails(tenant)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                  >
                    View Tenant Card
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Tenant Name</span>
                  <strong className="text-slate-900 text-sm font-semibold">{tenant.Tenant_Name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Mobile</span>
                  <a href={`tel:${tenant.Tenant_Mobile}`} className="text-indigo-700 font-mono font-medium hover:underline">
                    {tenant.Tenant_Mobile}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block">Lease End Date</span>
                  <strong className="text-slate-900">{formatMonthYear(tenant.occupancy_end_date)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">
                    {tenant.rental_type === 'Lease' ? 'Lease Deposit' : 'Monthly Rent'}
                  </span>
                  <strong className="text-slate-900 font-mono">
                    {tenant.rental_type === 'Lease'
                      ? `${formatCurrency(tenant.lease_amount)} (Rent: ₹0)`
                      : formatCurrency(tenant.rent_amount ?? tenant.monthly_rent)}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center py-5">
              <Home className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-slate-700">Currently UnOccupied</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Unit is vacant and ready to be assigned from the Tenant Dashboard.
              </p>
            </div>
          )}

          {/* Unit Meter Information */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Utility Meter Registration
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Electricity Consumer &amp; RR</span>
                    <p className="font-mono text-sm font-bold text-slate-800">
                      {house.EB_RR_Number || 'No RR String'}
                      {house.EB_Payment_Number && (
                        <span className="block text-xs text-amber-700 font-sans font-medium">
                          EB Payment ID: {house.EB_Payment_Number}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">Power Meter</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Water RR No. 1</span>
                    <p className="font-mono text-sm font-bold text-slate-800">{house.Water_RR_Number || 'Not Registered'}</p>
                  </div>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">Primary Line</span>
              </div>

              {house.Water_RR_Number2 && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-700">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium">Water RR No. 2</span>
                      <p className="font-mono text-sm font-bold text-slate-800">{house.Water_RR_Number2}</p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 font-medium">Secondary Line</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing based on Rental_Type */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {house.rental_type === 'Lease' ? (
              <>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-xs text-amber-700 block font-semibold">Lease Deposit Terms</span>
                  <strong className="text-sm font-bold text-slate-900 font-mono">
                    {formatCurrency(house.lease_amount || 1500000)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Monthly Base Rent</span>
                  <strong className="text-sm font-bold text-emerald-700 font-mono">
                    ₹0 (Utilities only)
                  </strong>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Configured Rent</span>
                  <strong className="text-sm font-bold text-slate-800 font-mono">
                    {formatCurrency(house.rent_amount)} / mo
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 block">Security Advance</span>
                  <strong className="text-sm font-bold text-slate-800 font-mono">
                    {formatCurrency(house.advance_amount ?? house.deposit_amount)}
                  </strong>
                </div>
              </>
            )}
          </div>

          {house.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <strong className="block text-slate-700 mb-0.5">Notes:</strong>
              {house.notes}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-xs shadow-xs cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
