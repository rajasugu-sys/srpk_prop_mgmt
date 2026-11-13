import React, { useState, useEffect } from 'react';
import { X, Lock, Edit3, UserCheck, Phone, Mail, Calendar, IndianRupee, AlertTriangle, ShieldAlert, Droplets, Sparkles, RefreshCw } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { Tenant, RentalType, AttachedDocument } from '../../types';
import { calculateOccupancyEndDate } from '../../utils/formatters';
import { AttachmentField } from '../common/AttachmentField';

interface UpdateTenantModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateTenantModal: React.FC<UpdateTenantModalProps> = ({
  tenant,
  isOpen,
  onClose,
}) => {
  const { updateTenant } = useProperty();

  const [tenantName, setTenantName] = useState('');
  const [tenantMobile, setTenantMobile] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [rentalType, setRentalType] = useState<RentalType>('Rent');
  const [leaseTermYears, setLeaseTermYears] = useState<2 | 3>(2);
  const [waterBasePrice, setWaterBasePrice] = useState('400.00');
  const [rentAmount, setRentAmount] = useState('18000');
  const [advanceAmount, setAdvanceAmount] = useState('100000');
  const [leaseAmount, setLeaseAmount] = useState('1500000');
  const [occupancyEndDate, setOccupancyEndDate] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [isActiveTenant, setIsActiveTenant] = useState(true);
  const [attachedAgreement, setAttachedAgreement] = useState<AttachedDocument | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.Tenant_Name || '');
      setTenantMobile(tenant.Tenant_Mobile || '');
      setTenantEmail(tenant.Tenant_Email || '');
      
      const type: RentalType = tenant.rental_type || (tenant.lease_amount && tenant.lease_amount > 0 ? 'Lease' : 'Rent');
      setRentalType(type);
      setLeaseTermYears(tenant.lease_term_years || 2);
      const rawWbp = tenant.water_base_price;
      const cleanWbp = (rawWbp === undefined || rawWbp === null || rawWbp === 1899 || String(rawWbp).includes('1899')) ? 0 : rawWbp;
      setWaterBasePrice(String(cleanWbp));
      setRentAmount(String(tenant.rent_amount ?? tenant.monthly_rent ?? 0));
      setAdvanceAmount(String(tenant.advance_amount ?? tenant.security_deposit ?? 0));
      setLeaseAmount(String(tenant.lease_amount || 1500000));
      
      setOccupancyEndDate(tenant.occupancy_end_date || '');
      setEmergencyContact(tenant.emergency_contact || '');
      setIdProofNumber(tenant.id_proof_number || '');
      setIsActiveTenant(tenant.is_active_tenant ?? true);
      setAttachedAgreement(tenant.agreement_document || null);
      setError('');
    }
  }, [tenant, isOpen]);

  const handleAutoCalculateEndDate = (targetType: RentalType = rentalType, targetTerm: 2 | 3 = leaseTermYears) => {
    if (tenant?.occupancy_start_date) {
      const calculated = calculateOccupancyEndDate(tenant.occupancy_start_date, targetType, targetTerm);
      if (calculated) {
        setOccupancyEndDate(calculated);
      }
    }
  };

  if (!isOpen || !tenant) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      setError('Tenant Name cannot be empty');
      return;
    }
    if (!tenantMobile.trim()) {
      setError('Tenant Mobile cannot be empty');
      return;
    }
    if (!occupancyEndDate) {
      setError('Please provide a valid vacating/end date');
      return;
    }

    // Rental_Type logic:
    // If Rental_Type=Rent: Rent_Amount & Advance_Amount active, Lease_Amount = 0
    // If Rental_Type=Lease: Rent_Amount = 0, Advance_Amount = 0, Lease_Amount active
    const finalRent = rentalType === 'Rent' ? parseFloat(rentAmount) || 0 : 0;
    const finalAdvance = rentalType === 'Rent' ? parseFloat(advanceAmount) || 0 : 0;
    const finalLease = rentalType === 'Lease' ? parseFloat(leaseAmount) || 0 : 0;
    const finalWaterBase = parseFloat(waterBasePrice) || 0;

    // Save editable fields while keeping readonly fields intact
    updateTenant(tenant.id, {
      Tenant_Name: tenantName.trim(),
      Tenant_Mobile: tenantMobile.trim(),
      Tenant_Email: tenantEmail.trim(),
      rental_type: rentalType,
      rent_amount: finalRent,
      advance_amount: finalAdvance,
      lease_amount: finalLease,
      water_base_price: finalWaterBase,
      lease_term_years: rentalType === 'Lease' ? leaseTermYears : undefined,
      monthly_rent: finalRent,
      security_deposit: finalAdvance,
      occupancy_end_date: occupancyEndDate,
      emergency_contact: emergencyContact.trim(),
      id_proof_number: idProofNumber.trim(),
      is_active_tenant: isActiveTenant,
      agreement_document: attachedAgreement,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold">Update Tenant Details</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 font-semibold border border-slate-700">
                  {tenant.Tenant_ID}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {tenant.House_name} • {tenant.floor} ({tenant.house_type})
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

        {/* Form Body: requirement 1.3: some fields readonly, some fields editable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Readonly Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Lease &amp; Property (Readonly)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">Tenant ID</span>
                <input
                  type="text"
                  readOnly
                  value={tenant.Tenant_ID}
                  className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 text-slate-700 font-mono font-bold rounded-lg cursor-not-allowed select-all"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">Property Name</span>
                <input
                  type="text"
                  readOnly
                  value={tenant.House_name}
                  className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 text-slate-700 font-semibold rounded-lg cursor-not-allowed"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">Floor &amp; Unit Type</span>
                <input
                  type="text"
                  readOnly
                  value={`${tenant.floor} • ${tenant.house_type}`}
                  className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 text-slate-700 font-semibold rounded-lg cursor-not-allowed"
                />
              </div>

              <div>
                <span className="text-slate-500 block mb-0.5 font-medium">Lease Start Date</span>
                <input
                  type="text"
                  readOnly
                  value={tenant.occupancy_start_date || 'N/A'}
                  className="w-full px-2.5 py-1.5 bg-slate-200/70 border border-slate-300 text-slate-700 font-mono rounded-lg cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Editable Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-700 uppercase tracking-wider">
              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Editable Tenant Profile</span>
            </div>

            {/* Tenant Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tenant Name *
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Mobile & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Tenant Mobile *
                </label>
                <input
                  type="tel"
                  value={tenantMobile}
                  onChange={(e) => setTenantMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* RENTAL TYPE (RENT vs LEASE) OPTION */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Rental Type (Rent or Lease) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRentalType('Rent');
                      handleAutoCalculateEndDate('Rent', leaseTermYears);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                      rentalType === 'Rent'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Regular Rent</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${rentalType === 'Rent' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Monthly
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRentalType('Lease');
                      handleAutoCalculateEndDate('Lease', leaseTermYears);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                      rentalType === 'Lease'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Heavy Lease</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${rentalType === 'Lease' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      Lump Sum
                    </span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC VISIBILITY BASED ON RENTAL_TYPE */}
              {rentalType === 'Rent' ? (
                /* If Rental_Type=Rent: (Rent_Amount, Advance_Amount) visible, Lease_Amount = 0 (hidden) */
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Monthly Rent (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Advance Deposit (₹) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5000"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-500">
                    • <strong>Lease_Amount is set to ₹0</strong>.
                  </div>
                </div>
              ) : (
                /* If Rental_Type=Lease: Lease_Amount visible, (Rent_Amount, Advance_Amount) = 0 (hidden) */
                <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                  {/* 2 options for term: 2year or 3year */}
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                      Lease Term (Years) *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLeaseTermYears(2);
                          handleAutoCalculateEndDate('Lease', 2);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                          leaseTermYears === 2
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>2 Years</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${leaseTermYears === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          24 Months
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLeaseTermYears(3);
                          handleAutoCalculateEndDate('Lease', 3);
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
                          leaseTermYears === 3
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>3 Years</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${leaseTermYears === 3 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          36 Months
                        </span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-900 mb-1">
                      Lease Amount (Total Deposit ₹) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      value={leaseAmount}
                      onChange={(e) => setLeaseAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 font-mono"
                      required
                    />
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-800 border border-amber-200">
                    • <strong>Rent_Amount and Advance_Amount are set to ₹0.</strong> (Tenant pays only utility &amp; maintenance charges).
                  </div>
                </div>
              )}
            </div>

            {/* Water_Base_Price (decimal) */}
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center space-x-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>Water Base Price (₹ Decimal) *</span>
                </label>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full font-mono">
                  Water_Base_Price
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={waterBasePrice}
                  onChange={(e) => setWaterBasePrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-blue-800/80">
                Baseline water price (₹ / litre) for this tenant. Synced to Google Sheet <code className="text-blue-950 font-bold font-mono">tenant_details.Water_Base_Price</code>.
              </p>
            </div>

            {/* Occupancy End Date (vacating date) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Occupancy End Date (Vacating Date) *
                </label>
                <button
                  type="button"
                  onClick={() => handleAutoCalculateEndDate()}
                  className="inline-flex items-center space-x-1 text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                  title="Auto calculate end date from tenancy start date"
                >
                  <RefreshCw className="w-3 h-3 text-indigo-600" />
                  <span>Auto-Calculate ({rentalType === 'Rent' ? '11 Mo' : `${leaseTermYears} Yr`})</span>
                </button>
              </div>

              <input
                type="date"
                value={occupancyEndDate}
                onChange={(e) => setOccupancyEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              />

              <div className="p-2 bg-indigo-50/80 rounded-lg text-[11px] text-indigo-900 border border-indigo-100 flex items-start space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  {rentalType === 'Rent' ? (
                    <>Auto-calculates to end of 11th month from start date ({tenant.occupancy_start_date}).</>
                  ) : (
                    <>Auto-calculates to {leaseTermYears * 12} months ({leaseTermYears} years) from start date ({tenant.occupancy_start_date}).</>
                  )}
                </span>
              </div>
            </div>

            {/* Tenancy Agreement Attachment (Req 1: Upload option similar to add_new_tenant, prompt confirmation on overwrite, never deletable) */}
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
              <AttachmentField
                label="Tenancy Agreement Document (PDF Only)"
                subLabel="Attached PDF agreement document stored securely for this tenant (never deletable, overwritable with confirmation)."
                accept="application/pdf, .pdf"
                pdfOnly={true}
                document={attachedAgreement}
                onDocumentChange={(doc) => setAttachedAgreement(doc)}
                storageKeyPrefix={`tenant-agreement-${tenant.Tenant_ID}`}
                badgeText="PDF Agreement"
              />
            </div>

            {/* Emergency & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ID Proof (Aadhaar/PAN)
                </label>
                <input
                  type="text"
                  value={idProofNumber}
                  onChange={(e) => setIdProofNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Active Status Switch */}
            <div className="pt-2">
              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={isActiveTenant}
                  onChange={(e) => setIsActiveTenant(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">
                    Is Active Tenant ({isActiveTenant ? 'Active' : 'Vacated / Inactive'})
                  </span>
                  <span className="text-slate-500">
                    {isActiveTenant
                      ? 'Tenant is currently occupying this unit.'
                      : 'Unchecking will mark tenant as vacated and free up the unit as UnOccupied.'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Save Tenant Changes ({rentalType})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
