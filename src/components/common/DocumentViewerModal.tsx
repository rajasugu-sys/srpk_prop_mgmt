import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Printer,
  Calendar,
  AlertCircle,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { AttachedDocument } from '../../types';
import { getDocument, downloadDataUrl, formatFileSize } from '../../utils/fileStorage';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: AttachedDocument | null;
  title?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  title = 'Attached Document',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !document) {
      setDataUrl(null);
      setError(null);
      return;
    }

    if (document.data_url) {
      setDataUrl(document.data_url);
      setLoading(false);
      return;
    }

    // Attempt to load from IndexedDB
    setLoading(true);
    getDocument(document.id)
      .then((stored) => {
        if (stored?.data_url) {
          setDataUrl(stored.data_url);
        } else {
          setError('Document content could not be located in local storage.');
        }
      })
      .catch((err) => {
        console.error('Failed to load document content:', err);
        setError('Failed to retrieve document from storage.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const isPdf =
    document.file_type === 'application/pdf' ||
    document.name.toLowerCase().endsWith('.pdf') ||
    (dataUrl && dataUrl.startsWith('data:application/pdf'));

  const isImage =
    document.file_type.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(document.name) ||
    (dataUrl && dataUrl.startsWith('data:image/'));

  const handleDownload = () => {
    if (dataUrl) {
      downloadDataUrl(document.name, dataUrl);
    }
  };

  const handleOpenNewWindow = () => {
    if (!dataUrl) return;
    const win = window.open();
    if (win) {
      if (isPdf) {
        win.document.write(
          `<html><head><title>${document.name}</title></head><body style="margin:0;"><iframe src="${dataUrl}" style="border:none; width:100vw; height:100vh;"></iframe></body></html>`
        );
      } else {
        win.document.write(
          `<html><head><title>${document.name}</title></head><body style="margin:0; display:flex; justify-content:center; align-items:center; background:#111;"><img src="${dataUrl}" style="max-width:100vw; max-height:100vh; object-fit:contain;" /></body></html>`
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5 overflow-hidden pr-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold truncate">{title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                  {formatFileSize(document.size)}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
                {document.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {dataUrl && (
              <>
                <button
                  type="button"
                  onClick={handleDownload}
                  title="Download File"
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewWindow}
                  title="Open in new window"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-100 flex flex-col justify-center items-center min-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading document from secure storage...</span>
            </div>
          ) : error ? (
            <div className="p-6 bg-white rounded-xl border border-red-200 text-center max-w-md shadow-xs space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-red-900 uppercase">Document Unavailable</h4>
                <p className="text-xs text-slate-600 mt-1">{error}</p>
              </div>
            </div>
          ) : dataUrl ? (
            isPdf ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={dataUrl}
                  title={document.name}
                  className="w-full h-[68vh] rounded-xl border border-slate-300 bg-white shadow-inner"
                />
              </div>
            ) : isImage ? (
              <div className="w-full flex items-center justify-center p-2">
                <img
                  src={dataUrl}
                  alt={document.name}
                  className="max-h-[68vh] max-w-full object-contain rounded-xl border border-slate-300 bg-white shadow-md"
                />
              </div>
            ) : (
              <div className="p-6 bg-white rounded-xl border border-slate-200 text-center space-y-3">
                <FileText className="w-12 h-12 text-indigo-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{document.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    File Type: {document.file_type} ({formatFileSize(document.size)})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Download File
                </button>
              </div>
            )
          ) : null}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Uploaded: {document.uploaded_at ? new Date(document.uploaded_at).toLocaleString() : 'Recently'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
