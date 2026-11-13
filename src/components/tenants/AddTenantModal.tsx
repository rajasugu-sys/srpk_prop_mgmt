import React, { useState, useEffect } from 'react';
import { X, UserPlus, Home, Calendar, Phone, Mail, IndianRupee, ShieldAlert, Sparkles, Droplets } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { generateNextTenantId, calculateOccupancyEndDate } from '../../utils/formatters';
import { RentalType, AttachedDocument } from '../../types';
import { AttachmentField } from '../common/AttachmentField';

interface AddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedHouseName: string;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  isOpen,
  onClose,
  selectedHouseName,
}) => {
  const { houses, tenants, addTenant } = useProperty();

  // 2.1 Add_New_Tenant view should open with Tenant_ID auto populated
  const autoPopulatedTenantId = generateNextTenantId(tenants.map((t) => t.Tenant_ID));

  // Find unoccupied units for the selected_house_name
  const availableUnits = houses.filter(
    (h) => h.House_name.toLowerCase() === selectedHouseName.toLowerCase() && !h.is_occupied
  );

  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [tenantName, setTenantName] = useState('');
  const [tenantMobile, setTenantMobile] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  
  // Rental_Type state: 'Rent' or 'Lease'
  const [rentalType, setRentalType] = useState<RentalType>('Rent');
  const [leaseTermYears, setLeaseTermYears] = useState<2 | 3>(2);
  const [waterBasePrice, setWaterBasePrice] = useState('0');
  const [rentAmount, setRentAmount] = useState('18000');
  const [advanceAmount, setAdvanceAmount] = useState('100000');
  const [leaseAmount, setLeaseAmount] = useState('1500000');

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return calculateOccupancyEndDate(today, 'Rent', 2);
  });
  const [emergencyContact, setEmergencyContact] = useState('');

  // Auto calculate Occupancy_end_date:
  // - If Rental_Type="Rent": auto calculated to end of 11th month from Occupancy_start_date
  // - If Rental_Type="Lease": 2 options (term=2year or 3year), auto calculated to number of months as per term from Occupancy_start_date
  useEffect(() => {
    if (startDate) {
      const calculated = calculateOccupancyEndDate(startDate, rentalType, leaseTermYears);
      if (calculated) {
        setEndDate(calculated);
      }
    }
  }, [startDate, rentalType, leaseTermYears]);
  const [idProof, setIdProof] = useState('');
  const [attachedAgreement, setAttachedAgreement] = useState<AttachedDocument | null>(null);
  const [error, setError] = useState('');

  // When available units change or modal opens, select first available
  useEffect(() => {
    if (availableUnits.length > 0) {
      const first = availableUnits[0];
      setSelectedUnitId(first.id);
      if (first.rent_amount) setRentAmount(String(first.rent_amount));
      if (first.deposit_amount || first.advance_amount) {
        setAdvanceAmount(String(first.deposit_amount || first.advance_amount));
      }
      if (first.lease_amount) setLeaseAmount(String(first.lease_amount));
    } else {
      setSelectedUnitId('');
    }
  }, [isOpen, selectedHouseName, houses]);

  const handleUnitChange = (houseId: string) => {
    setSelectedUnitId(houseId);
    const unit = availableUnits.find((u) => u.id === houseId);
    if (unit) {
      if (unit.rent_amount) setRentAmount(String(unit.rent_amount));
      if (unit.deposit_amount || unit.advance_amount) {
        setAdvanceAmount(String(unit.deposit_amount || unit.advance_amount));
      }
      if (unit.lease_amount) setLeaseAmount(String(unit.lease_amount));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName.trim()) {
      setError('Please provide Tenant Name');
      return;
    }
    if (!tenantMobile.trim()) {
      setError('Please provide Tenant Mobile number');
      return;
    }
    if (!selectedUnitId) {
      setError('Please choose an available house unit');
      return;
    }

    const selectedUnit = availableUnits.find((u) => u.id === selectedUnitId);
    if (!selectedUnit) {
      setError('Selected unit is invalid or already occupied');
      return;
    }

    // Rental_Type rule enforcement:
    // If Rental_Type=Rent: Rent_Amount and Advance_Amount active, Lease_Amount = 0
    // If Rental_Type=Lease: Rent_Amount = 0, Advance_Amount = 0, Lease_Amount active
    const finalRent = rentalType === 'Rent' ? parseFloat(rentAmount) || 0 : 0;
    const finalAdvance = rentalType === 'Rent' ? parseFloat(advanceAmount) || 0 : 0;
    const finalLease = rentalType === 'Lease' ? parseFloat(leaseAmount) || 0 : 0;
    const finalWaterBase = parseFloat(waterBasePrice) || 0;

    addTenant({
      Tenant_Name: tenantName.trim(),
      Tenant_Mobile: tenantMobile.trim(),
      Tenant_Email: tenantEmail.trim(),
      House_name: selectedHouseName,
      floor: selectedUnit.floor,
      house_type: selectedUnit.house_type,
      rental_type: rentalType,
      rent_amount: finalRent,
      advance_amount: finalAdvance,
      lease_amount: finalLease,
      water_base_price: finalWaterBase,
      lease_term_years: rentalType === 'Lease' ? leaseTermYears : undefined,
      monthly_rent: finalRent,
      security_deposit: finalAdvance,
      occupancy_start_date: startDate,
      occupancy_end_date: endDate,
      emergency_contact: emergencyContact.trim(),
      id_proof_number: idProof.trim(),
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
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add New Tenant</h2>
              <p className="text-xs text-slate-300">
                Property: <strong className="text-white">{selectedHouseName}</strong>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* 2.1 Auto Populated Tenant_ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tenant ID (Auto Populated)
            </label>
            <input
              type="text"
              readOnly
              value={autoPopulatedTenantId}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-sm font-mono font-bold cursor-not-allowed"
            />
          </div>

          {/* Unoccupied Unit Selection */}
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
            <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Assign Unoccupied Unit ({selectedHouseName}) *
            </label>
            {availableUnits.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                All units in {selectedHouseName} are currently occupied.
              </div>
            ) : (
              <select
                value={selectedUnitId}
                onChange={(e) => handleUnitChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                required
              >
                {availableUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.floor} • {unit.house_type} (Unit ID: {unit.House_ID})
                    {unit.EB_Payment_Number ? ` • EB Pay# ${unit.EB_Payment_Number}` : ''}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500">
              Saving sets unit <code className="text-indigo-600 font-bold">is_occupied</code> to <strong className="text-emerald-700">TRUE</strong>.
            </p>
          </div>

          {/* Tenant Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tenant Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Ramesh Kumar"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tenant Mobile *
              </label>
              <input
                type="tel"
                placeholder="+91 98450 12345"
                value={tenantMobile}
                onChange={(e) => setTenantMobile(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="tenant@example.com"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
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
                  onClick={() => setRentalType('Rent')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
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
                  onClick={() => setRentalType('Lease')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center space-x-1.5 cursor-pointer ${
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
                      Rent Amount (₹/mo) *
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
                      Advance Amount (Deposit ₹) *
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
                  • <strong>Lease_Amount is set to ₹0</strong> (standard monthly rental agreement).
                </div>
              </div>
            ) : (
              /* If Rental_Type=Lease: Lease_Amount visible, (Rent_Amount, Advance_Amount) = 0 (hidden) */
              <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                {/* 2 Options for Lease Term: 2year or 3year */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5">
                    Lease Term (Years) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setLeaseTermYears(2)}
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
                      onClick={() => setLeaseTermYears(3)}
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
                    placeholder="e.g., 1500000"
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 font-mono"
                    required
                  />
                </div>
                <div className="p-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-800 border border-amber-200">
                  • <strong>Rent_Amount and Advance_Amount are set to ₹0.</strong> Tenant pays zero monthly rent; only recurring utility (EB/Water/Maintenance) charges apply.
                </div>
              </div>
            )}
          </div>

          {/* Water_Base_Price (decimal) in tenant_details table */}
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
              Base recurring water charge (₹ / litre) for this tenant. Saved into Google Sheet <code className="text-blue-950 font-bold font-mono">tenant_details.Water_Base_Price</code>.
            </p>
          </div>

          {/* Occupancy Dates with Auto-Calculation */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Occupancy Agreement Dates</span>
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                {rentalType === 'Rent' ? 'Auto 11-Month Term' : `Auto ${leaseTermYears}-Year Term (${leaseTermYears * 12} mo)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vacating Date (End) *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-indigo-50/50 border border-indigo-300 rounded-xl text-sm font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="p-2 bg-indigo-50/80 rounded-lg text-[11px] text-indigo-900 border border-indigo-100 flex items-start space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                {rentalType === 'Rent' ? (
                  <><strong>Auto-Calculated:</strong> End of the 11th month from start date (standard Bangalore 11-month agreement).</>
                ) : (
                  <><strong>Auto-Calculated:</strong> {leaseTermYears * 12} months ({leaseTermYears} years) as per term from start date.</>
                )}
              </span>
            </div>
          </div>

          {/* Tenancy Agreement PDF Attachment (Req 1: Only 1 document, warning prompt to overwrite, never deletable) */}
          <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
            <AttachmentField
              label="Tenancy Agreement Document (PDF Only)"
              subLabel="Upload the signed lease or rental agreement. Only 1 document can be attached per tenant."
              accept="application/pdf, .pdf"
              pdfOnly={true}
              document={attachedAgreement}
              onDocumentChange={(doc) => setAttachedAgreement(doc)}
              storageKeyPrefix={`tenant-agreement-${autoPopulatedTenantId}`}
              badgeText="PDF Agreement"
            />
          </div>

          {/* Additional details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Contact
              </label>
              <input
                type="text"
                placeholder="Name & Contact number"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Aadhaar / ID Proof #
              </label>
              <input
                type="text"
                placeholder="AADHAAR / PAN / DL"
                value={idProof}
                onChange={(e) => setIdProof(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 font-mono"
              />
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
              disabled={availableUnits.length === 0}
              className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Save Tenant ({rentalType})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
