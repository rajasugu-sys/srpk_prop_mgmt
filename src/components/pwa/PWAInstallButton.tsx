import React, { useState } from 'react';
import { Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();

  const handleClick = async () => {
    // If the browser provided native install prompt on Android, try it directly
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (isInstalled && variant === 'banner') {
    return null;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 transition-all active:scale-95 ${
          isInstalled
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1.5 rounded-lg font-medium'
            : variant === 'pill'
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs px-3 py-1.5 rounded-full shadow-sm shadow-emerald-500/20'
            : 'bg-gradient-to-r from-indigo-600/90 to-sky-600/90 hover:from-indigo-600 hover:to-sky-600 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-sm border border-indigo-400/20'
        } ${className}`}
        title={isInstalled ? 'App is installed' : 'Install Android App or APK'}
      >
        {isInstalled ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>App Installed</span>
          </>
        ) : (
          <>
            <Smartphone className="w-3.5 h-3.5 text-sky-200" />
            <span>Install App</span>
          </>
        )}
      </button>

      <PWAInstallModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        isAndroid={isAndroid}
        onInstall={install}
      />
    </>
  );
};
