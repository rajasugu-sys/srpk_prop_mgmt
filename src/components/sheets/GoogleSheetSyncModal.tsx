import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  Link2,
  CloudCheck,
  AlertCircle,
  ShieldCheck,
  LogOut,
  FolderOpen,
  Users,
  Share2,
} from 'lucide-react';
import { useProperty } from '../../context/PropertyContext';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';
import { GoogleSignInButton } from '../auth/GoogleSignInButton';
import { SyncConfirmModal } from './SyncConfirmModal';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    houses,
    tenants,
    invoices,
    maintenanceBills,
    exportCsvData,
    importCsvData,
    applyGoogleSheetData,
    resetToDefaults,
  } = useProperty();

  const {
    user,
    isAuthenticated,
    isAuthLoading,
    connectedSheet,
    driveSheets,
    isLoadingDriveSheets,
    isSyncing,
    syncStatus,
    inviteSheetId,
    loginWithGoogle,
    logoutFromGoogle,
    connectSheet,
    disconnectSheet,
    createNewGoogleSheet,
    refreshDriveSpreadsheets,
    syncToGoogleSheet,
    syncFromGoogleSheet,
  } = useGoogleSheets();

  const [activeTab, setActiveTab] = useState<'google' | 'collaborator' | 'drive_sheets' | 'csv_backup' | 'csv_import'>('google');
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [copiedEntity, setCopiedEntity] = useState<string | null>(null);
  const [copiedPartnerLink, setCopiedPartnerLink] = useState(false);
  const [importText, setImportText] = useState('');
  const [importEntity, setImportEntity] = useState<'houses' | 'tenants' | 'invoices'>('houses');
  const [importResult, setImportResult] = useState<{ success: boolean; count: number; error?: string } | null>(null);

  if (!isOpen) return null;

  const handleConnectManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSheetInput.trim()) return;
    const ok = await connectSheet(manualSheetInput.trim());
    if (ok) {
      setManualSheetInput('');
    }
  };

  const handleExecuteSyncToGoogleSheet = async () => {
    if (!connectedSheet) return;
    await syncToGoogleSheet(houses, tenants, invoices, maintenanceBills);
    setIsConfirmModalOpen(false);
  };

  const handlePullFromGoogleSheet = async () => {
    if (!connectedSheet) return;
    const res = await syncFromGoogleSheet();
    if (res.success && res.data) {
      applyGoogleSheetData(res.data, 'replace');
    }
  };

  const handleDownloadCsv = (entity: 'houses' | 'tenants' | 'invoices') => {
    const csvContent = exportCsvData(entity);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `SRKP_${entity}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsv = (entity: 'houses' | 'tenants' | 'invoices') => {
    const csvContent = exportCsvData(entity);
    navigator.clipboard.writeText(csvContent);
    setCopiedEntity(entity);
    setTimeout(() => setCopiedEntity(null), 2500);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;
    const result = importCsvData(importEntity, importText);
    setImportResult(result);
    if (result.success) {
      setTimeout(() => {
        setImportResult(null);
        setImportText('');
      }, 3500);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-gradient-to-tr from-emerald-600 to-teal-400 text-white rounded-xl shadow-md shadow-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold">Google Sheets Integration</h2>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isAuthenticated && connectedSheet
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {isAuthenticated && connectedSheet ? 'Connected & Synced' : 'Ready to Connect'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Direct two-way sync with your Google Sheet in Google Drive
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-2 overflow-x-auto gap-1">
            <button
              onClick={() => setActiveTab('google')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'google'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Google Drive Sync
            </button>
            <button
              onClick={() => setActiveTab('collaborator')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'collaborator'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Partner Sharing (Multi-User)</span>
            </button>
            <button
              onClick={() => setActiveTab('drive_sheets')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'drive_sheets'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Browse Drive Sheets ({driveSheets.length})
            </button>
            <button
              onClick={() => setActiveTab('csv_backup')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'csv_backup'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Offline Backup
            </button>
            <button
              onClick={() => setActiveTab('csv_import')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'csv_import'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Manual Import
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 max-h-[72vh] overflow-y-auto space-y-4">
            {/* Feedback notification toast */}
            {syncStatus && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 border ${
                  syncStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : syncStatus.type === 'error'
                    ? 'bg-red-50 text-red-800 border-red-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {syncStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : syncStatus.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  ) : (
                    <CloudCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                  <span>{syncStatus.message}</span>
                </div>
              </div>
            )}

            {/* Invite banner if opened via partner link */}
            {inviteSheetId && (!connectedSheet || connectedSheet.id !== inviteSheetId) && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <strong className="text-amber-900 font-semibold block">You were invited to sync with a Google Sheet:</strong>
                    <span className="font-mono text-[11px] text-amber-800 break-all">{inviteSheetId}</span>
                  </div>
                </div>
                {isAuthenticated ? (
                  <button
                    onClick={() => connectSheet(inviteSheetId)}
                    disabled={isSyncing}
                    className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs cursor-pointer shadow-xs"
                  >
                    {isSyncing ? 'Connecting...' : 'Connect to This Shared Sheet'}
                  </button>
                ) : (
                  <p className="text-[11px] text-amber-800">
                    Sign in with Google below to link this shared sheet to your app.
                  </p>
                )}
              </div>
            )}

            {/* TAB 1: GOOGLE DRIVE SYNC */}
            {activeTab === 'google' && (
              <div className="space-y-4">
                {/* Auth section */}
                {!isAuthenticated ? (
                  <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 rounded-2xl border border-indigo-100 text-center space-y-3.5">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Connect Your Google Account
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                        Sign in with Google to view and sync your property records directly to your Google Sheet in Google Drive.
                      </p>
                    </div>

                    <div className="pt-1 flex justify-center">
                      <GoogleSignInButton
                        onClick={loginWithGoogle}
                        loading={isAuthLoading}
                        text="Sign in to Connect Google Sheets"
                      />
                    </div>

                    <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Your existing local house and tenant records will be safely preserved.</span>
                    </div>
                  </div>
                ) : (
                  /* User is authenticated */
                  <div className="space-y-4">
                    {/* Account Bar */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {user?.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || 'Google Account'}
                            className="w-9 h-9 rounded-full border border-slate-300"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                            {user?.email?.charAt(0).toUpperCase() || 'G'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-bold text-slate-900">
                              {user?.displayName || 'Google Account'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                              Active
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block">{user?.email}</span>
                        </div>
                      </div>

                      <button
                        onClick={logoutFromGoogle}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        title="Sign Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sign Out</span>
                      </button>
                    </div>

                    {/* Connected Sheet Card */}
                    {connectedSheet ? (
                      <div className="p-4 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/70 rounded-2xl border border-emerald-200 space-y-3.5 shadow-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-2 bg-emerald-600 text-white rounded-xl">
                              <FileSpreadsheet className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                                Linked Google Sheet
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{connectedSheet.name}</h4>
                            </div>
                          </div>
                          <a
                            href={connectedSheet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 rounded-lg shadow-xs hover:bg-emerald-50 transition-colors"
                          >
                            <span>Open Sheet</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>

                        {/* Record count summary */}
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2 bg-white rounded-lg border border-emerald-100">
                            <span className="block text-sm font-bold text-slate-800">{houses.length}</span>
                            <span className="text-[10px] text-slate-500">Houses</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-emerald-100">
                            <span className="block text-sm font-bold text-slate-800">{tenants.length}</span>
                            <span className="text-[10px] text-slate-500">Tenants</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-emerald-100">
                            <span className="block text-sm font-bold text-slate-800">{invoices.length}</span>
                            <span className="text-[10px] text-slate-500">Invoices</span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={() => setIsConfirmModalOpen(true)}
                            disabled={isSyncing}
                            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4" />
                            <span>Sync to Google Sheet (Upload)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handlePullFromGoogleSheet}
                            disabled={isSyncing}
                            className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-4 h-4 text-slate-500" />
                            <span>Sync from Sheet (Pull)</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
                          <span>
                            Last synced:{' '}
                            <strong className="text-slate-700">{connectedSheet.lastSyncedAt || 'Not synced yet'}</strong>
                          </span>
                          <button
                            onClick={disconnectSheet}
                            className="text-slate-400 hover:text-slate-700 underline cursor-pointer"
                          >
                            Switch Sheet
                          </button>
                        </div>

                        {/* Invite partner shortcut */}
                        <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setActiveTab('collaborator')}
                            className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold flex items-center gap-1.5 cursor-pointer hover:underline"
                          >
                            <Users className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Share this Sheet with a Partner / Co-Manager &rarr;</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* No sheet connected yet */
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg flex-shrink-0">
                            <FolderOpen className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Choose or Create a Google Sheet</h4>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              Link your Google Sheet in Google Drive to start saving your house and tenant records.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => createNewGoogleSheet('SRKP Property Management - Bangalore')}
                            disabled={isSyncing}
                            className="p-3 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 rounded-xl text-left transition group cursor-pointer"
                          >
                            <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-xs mb-1">
                              <Plus className="w-4 h-4" />
                              <span>Create New Sheet</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Creates a dedicated &ldquo;SRKP Property Management&rdquo; spreadsheet in your Drive with all tabs ready.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTab('drive_sheets')}
                            className="p-3 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 rounded-xl text-left transition group cursor-pointer"
                          >
                            <div className="flex items-center space-x-2 text-indigo-700 font-semibold text-xs mb-1">
                              <FolderOpen className="w-4 h-4" />
                              <span>Select from Drive ({driveSheets.length})</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Pick your existing &ldquo;Bangalore_house_rent&rdquo; spreadsheet found in your Drive.
                            </p>
                          </button>
                        </div>

                        {/* Paste URL or ID */}
                        <form onSubmit={handleConnectManual} className="pt-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Or paste Google Sheet URL or ID:
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                              value={manualSheetInput}
                              onChange={(e) => setManualSheetInput(e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                              type="submit"
                              disabled={!manualSheetInput.trim() || isSyncing}
                              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer"
                            >
                              Connect
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )}

                {/* Safety Reassurance Card */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-slate-700 text-xs">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Data Protection &amp; Offline Persistence</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    All houses and tenants you create on this phone are stored in your device&apos;s local storage immediately. When you connect and tap <strong>&ldquo;Sync to Google Sheet&rdquo;</strong>, your records are safely written to your personal Google Drive spreadsheet with zero data loss.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: COLLABORATOR & MULTI-USER SHARING */}
            {activeTab === 'collaborator' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Partner &amp; Multi-User Architecture</h3>
                      <p className="text-xs text-slate-500">
                        How your partner&apos;s offline local storage connects to your Google Sheet in Google Drive
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step-by-step guidance */}
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        Share your Google Sheet with your Partner in Google Drive
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                      Your Google Sheet lives securely in your Google Drive. For another person to read or sync to it, Google Drive requires you to grant their Google account <strong>Editor</strong> access.
                    </p>
                    {connectedSheet ? (
                      <div className="pl-8 pt-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={connectedSheet.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold"
                          >
                            <span>Open &ldquo;{connectedSheet.name}&rdquo; in Google Drive</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <ol className="text-[11px] text-slate-500 list-decimal list-inside space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <li>Click the <strong>Share</strong> button at the top-right in Google Sheets.</li>
                          <li>Enter your partner&apos;s Google email address (e.g., <em>partner@gmail.com</em>).</li>
                          <li>Set their role to <strong>Editor</strong> and click <strong>Send</strong>.</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="pl-8">
                        <span className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg block border border-amber-200">
                          Connect or create a Google Sheet in the <strong>&ldquo;Google Drive Sync&rdquo;</strong> tab first.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        Send the Partner Invite Link
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                      Send your partner this pre-configured link. When they open it, the app automatically pre-links your Sheet ID:
                    </p>
                    {connectedSheet ? (
                      <div className="pl-8 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={`https://ais-pre-cnkihasxathmp34xek35m2-69900431065.us-east1.run.app/?sheetId=${connectedSheet.id}`}
                            className="flex-1 bg-slate-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono select-all focus:outline-none truncate"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  `https://ais-pre-cnkihasxathmp34xek35m2-69900431065.us-east1.run.app/?sheetId=${connectedSheet.id}`
                                );
                                setCopiedPartnerLink(true);
                                setTimeout(() => setCopiedPartnerLink(false), 2500);
                              } catch {
                                // ignore
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
                          >
                            {copiedPartnerLink ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedPartnerLink ? 'Copied!' : 'Copy Invite Link'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          When your partner opens this link, they tap <strong>&ldquo;Sign in with Google&rdquo;</strong> using their Google account to link to this sheet.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">
                        How Offline Local Storage Works Between Both Phones
                      </h4>
                    </div>
                    <div className="pl-8 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>Independent Offline Storage + Central Cloud Source of Truth</span>
                        </div>
                        <ul className="space-y-1.5 list-disc list-inside text-[11px] text-slate-600">
                          <li><strong>Zero-delay offline access:</strong> Each user has their own local storage on their phone, allowing both of you to view and add properties without internet connection.</li>
                          <li><strong>Pushing offline changes:</strong> When your partner adds a house or tenant, they tap <strong>&ldquo;Sync to Google Sheet (Upload)&rdquo;</strong> when back online. Their offline records write directly into your Google Sheet in Google Drive.</li>
                          <li><strong>Pulling partner updates:</strong> When you tap <strong>&ldquo;Sync from Sheet (Pull)&rdquo;</strong>, your app downloads the newest records and safely merges them into your local storage without overwriting or erasing your existing data.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 / Troubleshooting for Access Blocked */}
                  <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-300 space-y-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <h4 className="text-xs font-bold text-amber-900">
                        Fix &ldquo;Access blocked: ... has not completed the google verification process&rdquo;
                      </h4>
                    </div>
                    <div className="pl-7 space-y-2 text-xs text-amber-950/90 leading-relaxed">
                      <p className="text-[11px]">
                        Because this is your custom private business app, Google OAuth operates in secure <strong>&ldquo;Testing&rdquo; mode</strong>. Google requires you to add your partner&apos;s Google email as an authorized test user in Google Cloud Console (takes 1 minute):
                      </p>
                      <ol className="text-[11px] list-decimal list-inside space-y-1 bg-white p-3 rounded-lg border border-amber-200">
                        <li>Go to <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline font-semibold">Google Cloud Console &rarr; OAuth consent screen</a> (Project: <code className="bg-amber-100 px-1 rounded font-mono text-amber-900">gen-lang-client-0777079345</code>).</li>
                        <li>Scroll down to the <strong>Test users</strong> section &rarr; click <strong>+ ADD USERS</strong>.</li>
                        <li>Type your partner&apos;s Google account email &rarr; click <strong>SAVE</strong>.</li>
                        <li>Ask your partner to refresh the partner link and click <strong>&ldquo;Sign in with Google&rdquo;</strong> again. (If Google shows a yellow screen saying &ldquo;Google hasn&apos;t verified this app&rdquo;, they simply tap <em>&ldquo;Advanced&rdquo; &rarr; &ldquo;Go to SRKP Property Management (unsafe)&rdquo;</em>).</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BROWSE DRIVE SPREADSHEETS */}
            {activeTab === 'drive_sheets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Spreadsheets in Your Google Drive</h3>
                    <p className="text-[11px] text-slate-500">
                      Select your spreadsheet to link it with this property management app.
                    </p>
                  </div>
                  <button
                    onClick={refreshDriveSpreadsheets}
                    disabled={isLoadingDriveSheets}
                    className="p-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveSheets ? 'animate-spin' : ''}`} />
                    <span className="text-[11px]">Refresh</span>
                  </button>
                </div>

                {isLoadingDriveSheets ? (
                  <div className="py-8 text-center text-xs text-slate-500 space-y-2">
                    <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <span>Searching Google Drive for spreadsheets...</span>
                  </div>
                ) : driveSheets.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2.5">
                    <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-600">
                      No spreadsheets found or permissions not granted yet.
                    </p>
                    {isAuthenticated ? (
                      <button
                        onClick={() => createNewGoogleSheet('SRKP Property Management - Bangalore')}
                        className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        Create New Spreadsheet in Drive
                      </button>
                    ) : (
                      <GoogleSignInButton onClick={loginWithGoogle} text="Sign in to browse Drive" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {driveSheets.map((file) => {
                      const isSelected = connectedSheet?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 border-emerald-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 overflow-hidden">
                            <FileSpreadsheet
                              className={`w-5 h-5 flex-shrink-0 ${
                                isSelected ? 'text-emerald-600' : 'text-slate-400'
                              }`}
                            />
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate block">
                                ID: {file.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {isSelected ? (
                              <span className="px-2 py-1 text-[11px] bg-emerald-600 text-white rounded-lg font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Connected</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => connectSheet(file.id, file.name)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Connect
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OFFLINE BACKUP (CSV DOWNLOAD) */}
            {activeTab === 'csv_backup' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Export your current database as CSV files at any time. You can save these to your computer, email them, or import them into any spreadsheet program:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                    <strong className="text-xs font-bold text-slate-800 block">Houses ({houses.length})</strong>
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleDownloadCsv('houses')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleCopyCsv('houses')}
                        className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white cursor-pointer"
                        title="Copy CSV to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {copiedEntity === 'houses' && (
                      <span className="text-[10px] text-emerald-600 font-bold block">Copied!</span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                    <strong className="text-xs font-bold text-slate-800 block">Tenants ({tenants.length})</strong>
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleDownloadCsv('tenants')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleCopyCsv('tenants')}
                        className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white cursor-pointer"
                        title="Copy CSV to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {copiedEntity === 'tenants' && (
                      <span className="text-[10px] text-emerald-600 font-bold block">Copied!</span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-center space-y-2">
                    <strong className="text-xs font-bold text-slate-800 block">Invoices ({invoices.length})</strong>
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleDownloadCsv('invoices')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleCopyCsv('invoices')}
                        className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white cursor-pointer"
                        title="Copy CSV to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {copiedEntity === 'invoices' && (
                      <span className="text-[10px] text-emerald-600 font-bold block">Copied!</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: MANUAL CSV IMPORT */}
            {activeTab === 'csv_import' && (
              <form onSubmit={handleImportSubmit} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <label className="text-xs font-bold text-slate-700">Target Table:</label>
                  <select
                    value={importEntity}
                    onChange={(e) => setImportEntity(e.target.value as any)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <option value="houses">house_details</option>
                    <option value="tenants">tenant_details</option>
                    <option value="invoices">monthly_invoices</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paste CSV Data:
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Paste CSV rows here (including header row)..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {importResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      importResult.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {importResult.success
                      ? `Successfully imported ${importResult.count} records into ${importEntity}!`
                      : `Import failed: ${importResult.error}`}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!importText.trim()}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Parse &amp; Import Records</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-medium text-xs shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before writing to Google Sheet */}
      <SyncConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleExecuteSyncToGoogleSheet}
        sheetName={connectedSheet?.name || 'Google Sheet'}
        housesCount={houses.length}
        tenantsCount={tenants.length}
        invoicesCount={invoices.length}
        isSyncing={isSyncing}
      />
    </>
  );
};
