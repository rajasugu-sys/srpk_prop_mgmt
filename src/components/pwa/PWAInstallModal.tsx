import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  X, 
  Zap, 
  Layers, 
  FileCode,
  ShieldCheck,
  Check
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isAndroid: boolean;
  onInstall: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  isAndroid,
  onInstall,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'apk'>('direct');
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const sharedAppUrl = 'https://ais-pre-cnkihasxathmp34xek35m2-69900431065.us-east1.run.app';
  const currentUrl = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') && window.location.origin !== 'null')
    ? window.location.origin
    : sharedAppUrl;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDirectInstall = async () => {
    setInstalling(true);
    await onInstall();
    setInstalling(false);
  };

  const handleDownloadManifest = () => {
    const manifestUrl = '/manifest.webmanifest';
    const link = document.createElement('a');
    link.href = manifestUrl;
    link.download = 'manifest.json';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <img src="/icon.svg" alt="SRKP Icon" className="w-full h-full rounded-[10px] object-cover" />
            </div>
            <div>
              <h2 id="pwa-install-title" className="text-lg font-bold text-white flex items-center gap-2">
                SRKP Property App
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30">
                  Android Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">Installable mobile app &amp; APK package</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-slate-800 gap-1">
          <button
            onClick={() => setActiveTab('direct')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'direct'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Direct Android Install (WebAPK)
          </button>
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'apk'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Download className="w-4 h-4" />
            Build Standalone .APK File
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-200 text-sm">
          {activeTab === 'direct' ? (
            <div className="space-y-4">
              {/* Status Banner */}
              {isInstalled ? (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-3 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-200">Already Installed!</p>
                    <p className="text-emerald-400/90">This app is currently running in standalone app mode.</p>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-700/50 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-white text-sm">Instant Android Installation</h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Android WebAPK engine will install SRKP directly onto your home screen and app drawer as an independent native app.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDirectInstall}
                    disabled={installing}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 font-semibold text-white text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {installing ? 'Installing...' : 'Install SRKP Property App Now'}
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-3">
                  <p className="text-xs text-slate-300">
                    You can install SRKP Property directly on Android through Google Chrome in 2 taps:
                  </p>
                  <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      Tap the <strong>⋮ (three dots)</strong> menu at the top-right in Google Chrome.
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>&ldquo;Install app&rdquo;</strong> (or <strong>&ldquo;Add to Home screen&rdquo;</strong>).
                    </li>
                    <li className="leading-relaxed">
                      Tap <strong>&ldquo;Install&rdquo;</strong>. Android generates the standalone WebAPK automatically.
                    </li>
                  </ol>
                </div>
              )}

              {/* Native App Benefits */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Android App Features
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Full screen (no URL bar)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Offline caching enabled
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Adaptive Android icon
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Fast local storage &amp; PDF
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Want a standalone <strong>.apk</strong> or <strong>.aab</strong> file to sideload via USB or publish to the Google Play Store?
                  Follow these 2 official methods:
                </p>
              </div>

              {/* PWABuilder Method */}
              <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-white text-xs">Method 1: PWABuilder (1-Click APK)</span>
                  </div>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  PWABuilder is Google &amp; Microsoft&apos;s open source PWA packaging tool. It takes your app URL and generates a signed Android APK package in seconds.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-slate-950 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 font-mono truncate"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <a
                  href="https://www.pwabuilder.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 font-medium text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  Open PWABuilder.com
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Bubblewrap CLI Method */}
              <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white text-xs">Method 2: Google Bubblewrap (Android CLI)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Generate native Android Studio project using Google&apos;s official Trusted Web Activity CLI:
                </p>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto space-y-1">
                  <div># Install Google Bubblewrap CLI</div>
                  <div className="text-slate-300">npm i -g @bubblewrap/cli</div>
                  <div># Initialize Android project</div>
                  <div className="text-slate-300">bubblewrap init --manifest={currentUrl}/manifest.webmanifest</div>
                  <div># Build release APK</div>
                  <div className="text-slate-300">bubblewrap build</div>
                </div>
              </div>

              {/* Manifest Download */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Need manifest file directly?</span>
                <button
                  onClick={handleDownloadManifest}
                  className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download manifest.webmanifest
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
