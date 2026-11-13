import React, { useState } from 'react';
import { X, User, Phone, Mail, Home, Calendar, IndianRupee, ShieldCheck, Edit3, MessageCircle, Droplets, FileText, Eye, Download, FileCheck } from 'lucide-react';
import { Tenant } from '../../types';
import { formatCurrency, formatMonthYear } from '../../utils/formatters';
import { formatFileSize, downloadDataUrl } from '../../utils/fileStorage';
import { DocumentViewerModal } from '../common/DocumentViewerModal';

interface TenantDetailsModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onEdit,
}) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!isOpen || !tenant) return null;

  const cleanPhone = tenant.Tenant_Mobile.replace(/[^0-9+]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">{tenant.Tenant_Name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                  {tenant.Tenant_ID}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {tenant.House_name} • {tenant.floor} (Readonly Details)
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

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status & Quick Contact Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  tenant.is_active_tenant
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tenant.is_active_tenant ? '● Active Tenant' : '○ Vacated / Past Tenant'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={`tel:${cleanPhone}`}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
              <a
                href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-semibold shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Unit & Property Details */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Property Unit</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Property / Complex</span>
                <strong className="text-slate-900 font-bold text-sm">{tenant.House_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Floor &amp; House Type</span>
                <strong className="text-slate-900 font-bold text-sm">
                  {tenant.floor} • {tenant.house_type}
                </strong>
              </div>
            </div>
          </div>

          {/* Lease & Tenancy Duration */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tenancy Agreement Period</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Move-in Start Date</span>
                <strong className="text-slate-800 font-mono">{tenant.occupancy_start_date || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Vacating Date (End Date)</span>
                <strong className="text-indigo-700 font-bold text-sm">
                  {formatMonthYear(tenant.occupancy_end_date)}
                </strong>
                <span className="text-[10px] text-slate-400 font-mono block">
                  ({tenant.occupancy_end_date})
                </span>
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-500">
              {tenant.rental_type === 'Lease' ? (
                <span>
                  • Term: <strong className="text-slate-800 font-semibold">{tenant.lease_term_years || 2} Years ({((tenant.lease_term_years || 2) * 12)} Months)</strong>
                </span>
              ) : (
                <span>
                  • Agreement: <strong className="text-slate-800 font-semibold">11-Month Periodic Tenancy</strong> (Vacating at end of 11th month)
                </span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contact &amp; Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Primary Mobile</span>
                <strong className="text-slate-800 font-mono">{tenant.Tenant_Mobile}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address</span>
                <span className="text-slate-800">{tenant.Tenant_Email || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Emergency Contact</span>
                <span className="text-slate-800">{tenant.emergency_contact || 'None listed'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ID Proof / Aadhaar</span>
                <span className="text-slate-800 font-mono font-semibold">{tenant.id_proof_number || 'Not verified'}</span>
              </div>
            </div>
          </div>

          {/* Water_Base_Price Utility Card */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider block">
                  Water Base Price (Monthly Rate)
                </span>
                <strong className="text-sm font-black text-blue-950 font-mono">
                  {formatCurrency(tenant.water_base_price ?? 0)}
                  <span className="text-xs font-normal text-blue-700 ml-1">/ month</span>
                </strong>
              </div>
            </div>
            <span className="text-[10px] font-mono text-blue-800 bg-white px-2 py-1 rounded-md border border-blue-200 font-semibold">
              Water_Base_Price
            </span>
          </div>

          {/* Tenancy Agreement Document Section (Req 1: Available to view, never deletable) */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center space-x-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Tenancy Agreement (PDF)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Permanent Record
              </span>
            </div>

            {tenant.agreement_document ? (
              <div className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <strong className="text-xs text-slate-900 font-mono block truncate">
                      {tenant.agreement_document.name}
                    </strong>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(tenant.agreement_document.size)} • Uploaded {tenant.agreement_document.uploaded_at ? new Date(tenant.agreement_document.uploaded_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsViewerOpen(true)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View PDF</span>
                  </button>
                  {tenant.agreement_document.data_url && (
                    <button
                      type="button"
                      onClick={() => downloadDataUrl(tenant.agreement_document!.name, tenant.agreement_document!.data_url!)}
                      title="Download PDF"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white/80 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                No agreement PDF attached yet. You can attach a document by clicking &quot;Edit Tenant Details&quot;.
              </div>
            )}
            <p className="text-[10px] text-slate-400 italic">
              Note: Tenancy agreements are permanently archived and can only be updated/overwritten with confirmation.
            </p>
          </div>

          {/* Financials based on Rental_Type */}
          {tenant.rental_type === 'Lease' ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Lease Agreement Terms
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                  {tenant.lease_term_years ? `${tenant.lease_term_years}-Year Lease` : 'Heavy Lease'}
                </span>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-xs text-amber-800">Lease Deposit:</span>
                <strong className="text-lg font-black text-slate-900 font-mono">
                  {formatCurrency(tenant.lease_amount || 0)}
                </strong>
              </div>
              <p className="text-[11px] text-amber-700">
                • <strong>Monthly Rent is ₹0.</strong> Tenant only pays monthly utility charges (EB, Water Base: {formatCurrency(tenant.water_base_price ?? 0)}, Maintenance).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs text-slate-500 block">Monthly Rent</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 uppercase">
                    Rent
                  </span>
                </div>
                <strong className="text-base font-extrabold text-slate-900 font-mono">
                  {formatCurrency(tenant.rent_amount ?? tenant.monthly_rent)}
                </strong>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">Advance Deposit</span>
                <strong className="text-base font-extrabold text-slate-900 font-mono">
                  {formatCurrency(tenant.advance_amount ?? tenant.security_deposit)}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Edit Action */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Close
          </button>
          
          {/* Requirement 3: with edit action available */}
          <button
            onClick={() => {
              onClose();
              onEdit(tenant);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Tenant Details</span>
          </button>
        </div>
      </div>

      {/* Full Preview Modal for Agreement Document */}
      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={tenant.agreement_document || null}
        title={`Tenancy Agreement — ${tenant.Tenant_Name}`}
      />
    </div>
  );
};
