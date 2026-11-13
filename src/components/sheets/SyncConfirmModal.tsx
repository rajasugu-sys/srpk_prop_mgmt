import React from 'react';
import { AlertCircle, FileSpreadsheet, ShieldAlert, X } from 'lucide-react';

interface SyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sheetName: string;
  housesCount: number;
  tenantsCount: number;
  invoicesCount: number;
  isSyncing: boolean;
}

export const SyncConfirmModal: React.FC<SyncConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  sheetName,
  housesCount,
  tenantsCount,
  invoicesCount,
  isSyncing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Confirm Google Sheet Sync</h3>
              <p className="text-xs text-slate-300">Google Drive data update confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">You are about to write data to your Google Sheet:</p>
              <p className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-900 truncate">
                {sheetName}
              </p>
            </div>
          </div>

          <p className="text-slate-700 font-medium">
            This will update the following tabs in your Google Drive spreadsheet:
          </p>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-lg font-black text-slate-800">{housesCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Houses</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-lg font-black text-slate-800">{tenantsCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Tenants</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="block text-lg font-black text-slate-800">{invoicesCount}</span>
              <span className="text-[11px] text-slate-500 font-medium">Invoices</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-[11px]">
            <AlertCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>All local records on this phone will be safely preserved and synchronized.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isSyncing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Syncing to Drive...</span>
              </>
            ) : (
              <span>Confirm &amp; Sync Now</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
