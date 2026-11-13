import React, { useState } from 'react';
import { Building2, FileSpreadsheet, Share2, CheckCircle2, CloudUpload } from 'lucide-react';

import { useProperty } from '../context/PropertyContext';
import { useGoogleSheets } from '../context/GoogleSheetsContext';
import { PWAInstallButton } from './pwa/PWAInstallButton';
import { ShareAppModal } from './share/ShareAppModal';

interface HeaderProps {
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSyncModal }) => {
  const { houses, tenants, invoices } = useProperty();
  const { isAuthenticated, connectedSheet, isSyncing } = useGoogleSheets();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const totalOccupied = houses.filter((h) => h.is_occupied).length;
  const occupancyRate = houses.length > 0 ? Math.round((totalOccupied / houses.length) * 100) : 0;
  const pendingInvoices = invoices.filter((i) => i.Payment_Status !== 'Paid').length;

  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Building2 className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">SRKP</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
                  Property Suite
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Tenancy &amp; Occupancy Management
              </p>
            </div>
          </div>

          {/* Top Quick Status & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden md:flex items-center space-x-3 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Occupancy:</span>
                <strong className="text-white font-semibold">
                  {totalOccupied}/{houses.length} ({occupancyRate}%)
                </strong>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${pendingInvoices > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span>Due Bills:</span>
                <strong className="text-white font-semibold">{pendingInvoices}</strong>
              </div>
            </div>

            {/* Share / App URL Button */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              title="View and copy public App URL"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">App URL</span>
            </button>

            {/* Install Android App / PWA Button */}
            <PWAInstallButton />

            {/* Google Sheets Sync Button */}
            <button
              onClick={onOpenSyncModal}
              title={
                isAuthenticated && connectedSheet
                  ? `Google Sheet connected: ${connectedSheet.name} (Auto-sync active${connectedSheet.lastSyncedAt ? `, last saved at ${connectedSheet.lastSyncedAt}` : ''})`
                  : 'Connect Google Sheet for automatic database storage'
              }
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all active:scale-95 cursor-pointer ${
                isAuthenticated && connectedSheet
                  ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/35'
                  : 'bg-indigo-600/25 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/35'
              }`}
            >
              {isSyncing ? (
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              ) : isAuthenticated && connectedSheet ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <CloudUpload className="w-4 h-4 text-indigo-400" />
              )}
              <span className="hidden sm:inline">
                {isSyncing
                  ? 'Auto-saving...'
                  : isAuthenticated && connectedSheet
                  ? connectedSheet.lastSyncedAt
                    ? `Saved ${connectedSheet.lastSyncedAt}`
                    : 'Auto-synced'
                  : 'Sync Google Sheet'}
              </span>
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isAuthenticated && connectedSheet ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isAuthenticated && connectedSheet ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Share / App URL Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </header>
  );
};
