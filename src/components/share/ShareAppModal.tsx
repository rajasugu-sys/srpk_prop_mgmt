import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Globe, 
  Smartphone, 
  Sparkles, 
  ShieldCheck,
  Share2,
  AlertCircle
} from 'lucide-react';
import { useGoogleSheets } from '../../context/GoogleSheetsContext';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const { connectedSheet } = useGoogleSheets();
  const [copiedShared, setCopiedShared] = useState(false);
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedPartner, setCopiedPartner] = useState(false);

  if (!isOpen) return null;

  // The permanent shared URL for publishing and opening on mobile
  const sharedUrl = 'https://ais-pre-cnkihasxathmp34xek35m2-69900431065.us-east1.run.app';
  const devUrl = 'https://ais-dev-cnkihasxathmp34xek35m2-69900431065.us-east1.run.app';

  const copyToClipboard = async (text: string, setCopied: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 p-0.5 shadow-md flex items-center justify-center">
              <Share2 className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h2 id="share-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                SRKP Property App URL
              </h2>
              <p className="text-xs text-slate-400">Share, publish, or open on your Android device</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-200 text-sm">
          {/* Main Production / Shared URL */}
          <div className="p-4 bg-slate-800/80 border border-indigo-500/40 rounded-xl space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-xs">Public / Shared App URL (For Publishing)</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                Use for Publishing &amp; Android
              </span>
            </div>

            <p className="text-xs text-slate-300">
              This is the live URL to provide when publishing, generating an Android APK, or opening in Chrome on your phone:
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={sharedUrl}
                className="flex-1 bg-slate-950 text-indigo-300 text-xs px-3 py-2 rounded-lg border border-slate-700 font-mono select-all focus:outline-none focus:border-indigo-500 truncate"
              />
              <button
                onClick={() => copyToClipboard(sharedUrl, setCopiedShared)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
              >
                {copiedShared ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedShared ? 'Copied!' : 'Copy URL'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Open directly on phone or browser:</span>
              <a
                href={sharedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium hover:underline"
              >
                Open in new tab
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Development URL */}
          <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300 text-xs">Development / Preview URL:</span>
              <button
                onClick={() => copyToClipboard(devUrl, setCopiedDev)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedDev ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedDev ? 'Copied' : 'Copy Dev URL'}
              </button>
            </div>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded-md border border-slate-800 truncate select-all">
              {devUrl}
            </div>
          </div>

          {/* Quick Guide for Android Phone & Publishing */}
          <div className="p-3.5 bg-indigo-950/20 border border-indigo-900/40 rounded-xl space-y-2">
            <h4 className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              How to Open &amp; Install on Your Android Phone:
            </h4>
            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
              <li>Copy the <strong>Public App URL</strong> above.</li>
              <li>Send it to your phone (via WhatsApp, email, or message) and open in <strong>Google Chrome</strong>.</li>
              <li>Tap the Chrome menu <strong>⋮</strong> &rarr; tap <strong>&ldquo;Install app&rdquo;</strong> (or <strong>&ldquo;Add to Home screen&rdquo;</strong>).</li>
            </ol>
          </div>

          {/* Partner & Multi-User Sharing Guide */}
          <div className="p-4 bg-gradient-to-br from-emerald-950/40 via-slate-800/80 to-slate-900 border border-emerald-500/30 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-xs">Sharing with a Partner or Co-Manager</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-medium">
                Multi-User Sync
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Each user runs the app with their own offline local storage. To connect their phone to your Google Sheet:
            </p>

            {connectedSheet ? (
              <div className="p-3 bg-slate-950/80 border border-emerald-600/30 rounded-lg space-y-2">
                <span className="text-[11px] font-semibold text-emerald-300 block">
                  Partner Invite Link (Pre-configured with your Google Sheet):
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${sharedUrl}?sheetId=${connectedSheet.id}`}
                    className="flex-1 bg-slate-900 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md border border-slate-700 font-mono select-all focus:outline-none truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(`${sharedUrl}?sheetId=${connectedSheet.id}`, setCopiedPartner)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer flex-shrink-0"
                  >
                    {copiedPartner ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPartner ? 'Copied!' : 'Copy Partner Link'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-white">Share your Google Sheet in Google Drive:</strong>
                  <p className="text-slate-400 text-[11px]">
                    Open your Google Sheet in Drive &rarr; click <strong>Share</strong> &rarr; enter your partner&apos;s Google email address &rarr; choose <strong>Editor</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-white">Partner opens the Invite Link:</strong>
                  <p className="text-slate-400 text-[11px]">
                    When your partner opens the link on their phone and signs in with their Google account, the app automatically connects to your Google Sheet ID.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-white">Offline storage + Cloud Sync:</strong>
                  <p className="text-slate-400 text-[11px]">
                    Both of you work offline locally. When your partner taps <strong>Sync to Google Sheet (Upload)</strong>, their offline records write directly to your Google Sheet. When you tap <strong>Sync from Sheet (Pull)</strong>, their additions merge into your phone!
                  </p>
                </div>
              </div>
            </div>

            {/* Google OAuth Verification Warning Solution */}
            <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Fix &ldquo;Access blocked: ... has not completed google verification&rdquo;</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Because this app is your private business tool (in Google Cloud &ldquo;Testing&rdquo; mode), Google blocks any email from signing in unless added to your <strong>Test Users</strong> list:
              </p>
              <ol className="text-[11px] text-slate-300 list-decimal list-inside space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-amber-500/20">
                <li>Open <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline font-semibold">Google Cloud Console &rarr; OAuth consent screen</a> (Project: <code className="text-amber-300">gen-lang-client-0777079345</code>).</li>
                <li>Scroll down to <strong>Test users</strong> &rarr; click <strong>+ Add Users</strong>.</li>
                <li>Enter your partner&apos;s Google email address &rarr; click <strong>Save</strong>.</li>
                <li>Your partner can now open the invite link and sign in immediately! (If Google shows &ldquo;Google hasn&apos;t verified this app&rdquo;, they click <em>Advanced &rarr; Proceed</em>).</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
