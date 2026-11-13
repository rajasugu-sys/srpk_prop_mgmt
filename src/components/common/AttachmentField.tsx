import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Eye,
  RefreshCw,
  AlertTriangle,
  Lock,
  Calendar,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';
import { AttachedDocument } from '../../types';
import { readFileAsDataUrl, saveDocument, formatFileSize, StoredDocument } from '../../utils/fileStorage';
import { DocumentViewerModal } from './DocumentViewerModal';

interface AttachmentFieldProps {
  label: string;
  subLabel?: string;
  accept?: string;
  pdfOnly?: boolean;
  document: AttachedDocument | null | undefined;
  onDocumentChange: (doc: AttachedDocument) => void;
  isLocked?: boolean;
  lockedReason?: string;
  storageKeyPrefix: string;
  badgeText?: string;
}

export const AttachmentField: React.FC<AttachmentFieldProps> = ({
  label,
  subLabel,
  accept = 'application/pdf, .pdf',
  pdfOnly = false,
  document,
  onDocumentChange,
  isLocked = false,
  lockedReason = 'Locked (Invoice Paid & Closed)',
  storageKeyPrefix,
  badgeText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overwrite confirmation modal state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);

  const handleButtonClick = () => {
    if (isLocked) return;
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check PDF restriction
    if (pdfOnly) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setErrorMessage('Only PDF documents (.pdf) are allowed for this attachment.');
        return;
      }
    }

    // If a document is already attached, prompt for confirmation before overwriting
    if (document) {
      setPendingFile(file);
      setShowOverwriteModal(true);
    } else {
      processFileUpload(file);
    }
  };

  const processFileUpload = async (file: File) => {
    try {
      setErrorMessage(null);
      const readResult = await readFileAsDataUrl(file);
      const docId = `${storageKeyPrefix}-${Date.now()}`;

      const newDoc: StoredDocument = {
        id: docId,
        name: readResult.name,
        file_type: readResult.file_type,
        size: readResult.size,
        uploaded_at: new Date().toISOString(),
        data_url: readResult.data_url,
      };

      // Persist in IndexedDB
      await saveDocument(newDoc);

      // Trigger parent callback
      onDocumentChange(newDoc);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setErrorMessage(err?.message || 'Failed to process file attachment.');
    } finally {
      setPendingFile(null);
      setShowOverwriteModal(false);
    }
  };

  const handleConfirmOverwrite = () => {
    if (pendingFile) {
      processFileUpload(pendingFile);
    }
  };

  const handleCancelOverwrite = () => {
    setPendingFile(null);
    setShowOverwriteModal(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileSelected}
        className="hidden"
        disabled={isLocked}
      />

      {/* Label & Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            {label}
          </label>
          {subLabel && <p className="text-[11px] text-slate-500">{subLabel}</p>}
        </div>
        {badgeText && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {badgeText}
          </span>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-1.5 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Current Attachment Card or Upload Button */}
      {document ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start space-x-2.5 overflow-hidden">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 mt-0.5">
                <FileCheck className="w-4 h-4" />
              </div>
              <div className="truncate">
                <span className="text-xs font-bold text-slate-900 block truncate font-mono">
                  {document.name}
                </span>
                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{formatFileSize(document.size)}</span>
                  <span>•</span>
                  <span>{document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : 'Attached'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsViewerOpen(true)}
                title="View document in full preview"
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>

              {!isLocked ? (
                <button
                  type="button"
                  onClick={handleButtonClick}
                  title="Replace / Overwrite with new document"
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace</span>
                </button>
              ) : (
                <span
                  title={lockedReason}
                  className="flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold"
                >
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Upload Button */
        <div>
          {!isLocked ? (
            <button
              type="button"
              onClick={handleButtonClick}
              className="w-full flex items-center justify-center space-x-2 p-3 bg-slate-50 hover:bg-slate-100 active:scale-99 border border-dashed border-slate-300 hover:border-indigo-400 rounded-xl text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-indigo-600" />
              <span>Attach {pdfOnly ? 'PDF Document' : 'Document / Receipt'}</span>
              <span className="text-[10px] text-slate-400">({pdfOnly ? 'PDF only, max 15MB' : 'PDF, JPG, PNG'})</span>
            </button>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400 flex items-center justify-center space-x-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>{lockedReason}</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal to Overwrite Existing Attachment */}
      {showOverwriteModal && pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Confirm Overwrite Document?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  An existing document <strong className="text-slate-900 font-mono">{document?.name}</strong> is currently attached.
                </p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                  Do you want to overwrite and replace it with <strong className="font-mono text-amber-950">{pendingFile.name}</strong> ({formatFileSize(pendingFile.size)})?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelOverwrite}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel Upload
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl shadow-xs transition cursor-pointer"
              >
                Confirm &amp; Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Full Preview Modal */}
      <DocumentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        document={document || null}
        title={label}
      />
    </div>
  );
};
