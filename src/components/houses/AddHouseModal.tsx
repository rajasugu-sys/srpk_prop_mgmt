import React, { useState } from 'react';
import { X, Building2, Plus, Zap, Droplets, IndianRupee } from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { generateNextHouseId } from '../../utils/formatters';

interface AddHouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultHouseName?: string;
}

export const AddHouseModal: React.FC<AddHouseModalProps> = ({
  isOpen,
  onClose,
  defaultHouseName,
}) => {
  const { houses, addHouse, uniqueHouseNames } = useProperty();

  // 2.1 Add_New_House view should open with House_ID auto populated
  const autoPopulatedHouseId = generateNextHouseId(houses.map((h) => h.House_ID));

  const [houseName, setHouseName] = useState(defaultHouseName || uniqueHouseNames[0] || 'SRKP Towers');
  const [isCustomHouseName, setIsCustomHouseName] = useState(false);
  const [customHouseName, setCustomHouseName] = useState('');
  
  const [floor, setFloor] = useState('Ground');
  const [houseType, setHouseType] = useState('2BHK');
  const [ebRRNumber, setEbRRNumber] = useState('');
  const [ebPaymentNumber, setEbPaymentNumber] = useState('');
  const [waterRRNumber, setWaterRRNumber] = useState('');
  const [waterRRNumber2, setWaterRRNumber2] = useState('');
  const [rentAmount, setRentAmount] = useState('18000');
  const [depositAmount, setDepositAmount] = useState('100000');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalHouseName = isCustomHouseName ? customHouseName.trim() : houseName.trim();

    if (!finalHouseName) {
      setError('Please provide a House / Property Name');
      return;
    }
    if (!floor.trim()) {
      setError('Please specify Floor');
      return;
    }
    if (!houseType.trim()) {
      setError('Please specify House Type');
      return;
    }
    if (!ebRRNumber.trim() && !ebPaymentNumber.trim()) {
      setError('Please provide either EB RR Number or EB Payment Number');
      return;
    }
    if (!waterRRNumber.trim()) {
      setError('Please provide Water RR Number');
      return;
    }

    // Check for duplicate in same house + floor + house_type
    const exists = houses.some(
      (h) =>
        h.House_name.toLowerCase() === finalHouseName.toLowerCase() &&
        h.floor.toLowerCase() === floor.trim().toLowerCase() &&
        h.house_type.toLowerCase() === houseType.trim().toLowerCase()
    );

    if (exists) {
      setError(`A unit with ${floor} and ${houseType} already exists in ${finalHouseName}. Please adjust floor or unit specification.`);
      return;
    }

    // 2.2: When Save button is pressed, new record for the selected_house should be added
    // and is_occupied field in house_details table should be set to FALSE for (Selected_House + selected_floor + selected_house_type)
    addHouse({
      House_name: finalHouseName,
      floor: floor.trim(),
      house_type: houseType.trim(),
      EB_RR_Number: ebRRNumber.trim(),
      EB_Payment_Number: ebPaymentNumber.trim(),
      Water_RR_Number: waterRRNumber.trim(),
      Water_RR_Number2: waterRRNumber2.trim() ? waterRRNumber2.trim() : null,
      rent_amount: parseFloat(rentAmount) || 0,
      deposit_amount: parseFloat(depositAmount) || 0,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add New House / Unit</h2>
              <p className="text-xs text-slate-300">Creates record with is_occupied = FALSE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* 2.1 Auto-populated House_ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              House ID (Auto Populated)
            </label>
            <input
              type="text"
              readOnly
              value={autoPopulatedHouseId}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-300 text-slate-600 rounded-xl text-sm font-mono font-semibold cursor-not-allowed select-all"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Auto-generated sequential identifier.
            </span>
          </div>

          {/* House / Property Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                House / Property Name *
              </label>
              <button
                type="button"
                onClick={() => setIsCustomHouseName(!isCustomHouseName)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
              >
                {isCustomHouseName ? 'Select Existing Property' : '+ Add New Property'}
              </button>
            </div>

            {isCustomHouseName ? (
              <input
                type="text"
                placeholder="e.g., SRKP Grandeur"
                value={customHouseName}
                onChange={(e) => setCustomHouseName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            ) : (
              <select
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                {uniqueHouseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Floor & House Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Floor *
              </label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Ground">Ground</option>
                <option value="First">First</option>
                <option value="Second">Second</option>
                <option value="Third">Third</option>
                <option value="Fourth">Fourth</option>
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                House Type *
              </label>
              <select
                value={houseType}
                onChange={(e) => setHouseType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="2BHK">2BHK</option>
                <option value="1BHK">1BHK</option>
                <option value="1RK">1RK</option>
                <option value="1RK CENTER">1RK CENTER</option>
                <option value="1RK LAST">1RK LAST</option>
                <option value="3BHK">3BHK</option>
                <option value="2 BHK">2 BHK</option>
                <option value="1 BHK">1 BHK</option>
                <option value="3 BHK">3 BHK</option>
              </select>
            </div>
          </div>

          {/* Utility Meter Numbers */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Utility Meter RR Numbers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  EB RR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g., 7EEHK 39158"
                  value={ebRRNumber}
                  onChange={(e) => setEbRRNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  EB Payment Number (Consumer ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 353155000"
                  value={ebPaymentNumber}
                  onChange={(e) => setEbPaymentNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Water RR Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g., BWSSB-88345"
                  value={waterRRNumber}
                  onChange={(e) => setWaterRRNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Water RR Number 2 (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional 2nd meter"
                  value={waterRRNumber2}
                  onChange={(e) => setWaterRRNumber2(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Rent & Deposit Expectations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expected Rent (₹/mo)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                min="0"
                step="5000"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Unit Notes &amp; Features
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Facing north, semi-furnished with modular kitchen"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
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
              <Plus className="w-4 h-4" />
              <span>Save House (Unoccupied)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
