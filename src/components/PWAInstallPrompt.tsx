import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User response to PWA install:', outcome);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#42281D] p-1 rounded-lg hover:bg-[#FAF4ED] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#42281D] to-[#2C1A11] p-2 mx-auto mb-3 shadow-md flex items-center justify-center border border-[#D4A373]/30">
          <img src="/favicon.svg" alt="Vinutha Bakery" className="w-full h-full object-contain" />
        </div>

        <h3 className="text-xl font-bold font-serif text-[#42281D] mb-1">
          Install Vinutha Bakery App
        </h3>
        <p className="text-xs text-[#6B5A50] mb-5">
          Add our app to your phone home screen for fast one-tap ordering, counter QR access, and live order tracking!
        </p>

        {isIOS ? (
          /* iOS Instructions */
          <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-4 text-left text-xs text-[#5C3826] space-y-2.5 mb-4">
            <p className="font-bold text-[#42281D] text-[11px] uppercase tracking-wider">
              How to Install on iPhone / iPad:
            </p>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E06D80] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                1
              </span>
              <span>
                Tap the <strong>Share button</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> at bottom of Safari.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E06D80] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                2
              </span>
              <span>
                Scroll down and select <strong>"Add to Home Screen"</strong>{' '}
                <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-[#42281D]" />.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#E06D80] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                3
              </span>
              <span>
                Tap <strong>"Add"</strong> in top-right corner to launch anytime!
              </span>
            </div>
          </div>
        ) : (
          /* Android / Chrome One-Tap Install */
          <div className="space-y-3 mb-4">
            <button
              onClick={handleInstallClick}
              className="w-full bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-[#D4A373]" />
              Tap to Install App on Android
            </button>
            <p className="text-[11px] text-[#8A7569]">
              Works instantly on Android, Samsung Internet, and Google Chrome.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="text-xs text-[#8A7569] hover:text-[#42281D] font-medium underline cursor-pointer"
        >
          Continue browsing in browser
        </button>
      </div>
    </div>
  );
};
