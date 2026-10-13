import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle, CheckCircle, Search, ShieldCheck } from 'lucide-react';
import { useBakery } from '../context/BakeryContext';
import type { Order } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderFound: (order: Order) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onOrderFound }) => {
  const { getOrderByIdOrToken, currentUser } = useBakery();
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'html5-qr-reader-region';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setSuccessOrder(null);
      setErrorMessage(null);
      setManualCode('');
    }
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setErrorMessage(null);
      setPermissionDenied(false);

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(qrRegionId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame scan errors are frequent before barcode is aligned, ignore
        }
      );

      setScannerActive(true);
    } catch (err: any) {
      console.warn('Camera error:', err);
      setScannerActive(false);
      setPermissionDenied(true);
      setErrorMessage(
        'Camera permission was denied or camera is unavailable. Use manual code lookup below.'
      );
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setScannerActive(false);
      }).catch((e) => console.log('Error stopping scanner:', e));
    }
  };

  const handleScanSuccess = (rawText: string) => {
    // Process text from QR: might be full URL like "...?token=vb-pick-12345" or raw token "vb-pick-12345"
    let token = rawText.trim();
    if (token.includes('token=')) {
      const parts = token.split('token=');
      token = parts[1].split('&')[0];
    } else if (token.includes('/order/')) {
      const parts = token.split('/order/');
      token = parts[1].split('?')[0];
    }

    const order = getOrderByIdOrToken(token);
    if (order) {
      // Permission check: if staff is assigned to shop, ensure order belongs to their shop
      if (currentUser?.role === 'shop_staff' && currentUser.assignedShopId && order.shopId !== currentUser.assignedShopId) {
        setErrorMessage(
          `Order #${order.orderNumber} belongs to another shop. Your login only has access to your assigned shop.`
        );
        return;
      }

      stopScanner();
      setSuccessOrder(order);
      setErrorMessage(null);
      setTimeout(() => {
        onOrderFound(order);
      }, 1000);
    } else {
      setErrorMessage(`No active order matching QR token: "${token}". Please check the token.`);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const order = getOrderByIdOrToken(manualCode.trim());
    if (order) {
      if (currentUser?.role === 'shop_staff' && currentUser.assignedShopId && order.shopId !== currentUser.assignedShopId) {
        setErrorMessage(
          `Order #${order.orderNumber} belongs to another shop. You can only view orders for your assigned shop.`
        );
        return;
      }
      setSuccessOrder(order);
      setErrorMessage(null);
      setTimeout(() => {
        onOrderFound(order);
      }, 800);
    } else {
      setErrorMessage(`No matching order found for "${manualCode}". Check order number or pickup token.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8DACB]">
        {/* Header */}
        <div className="bg-[#42281D] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#E06D80]" />
            <div>
              <h3 className="font-bold text-sm md:text-base">Counter Order QR Scanner</h3>
              <p className="text-[11px] text-[#D4A373]">Authorized staff customer pickup verification</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {/* Permission explanation banner */}
          <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-3 mb-4 text-xs text-[#5C3826] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Camera permission is only requested when you start scanning. Camera feeds are analyzed locally in your browser and never transmitted or recorded.
            </p>
          </div>

          {/* Scanner view area */}
          <div className="relative bg-black rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center mb-4">
            <div id={qrRegionId} className="w-full h-full" />

            {!scannerActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2C1A11]/90 text-white p-6 text-center">
                <Camera className="w-12 h-12 text-[#D4A373] mb-3 animate-bounce" />
                <p className="text-sm font-semibold mb-1">Live Camera Ready</p>
                <p className="text-xs text-white/70 max-w-xs mb-4">
                  Tap button below to start your device camera and scan customer order pickup QR.
                </p>
                <button
                  type="button"
                  onClick={startScanner}
                  className="bg-[#E06D80] hover:bg-[#C95468] text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
                >
                  Start Camera Scanner
                </button>
              </div>
            )}

            {scannerActive && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center">
                <button
                  type="button"
                  onClick={stopScanner}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg cursor-pointer"
                >
                  Stop Camera
                </button>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successOrder && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-3 text-xs text-emerald-900 animate-fadeIn">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Order Verified: #{successOrder.orderNumber}</p>
                <p className="text-emerald-700">
                  {successOrder.customerName} • {successOrder.cakeName} ({successOrder.size})
                </p>
              </div>
            </div>
          )}

          {/* Manual Input Fallback */}
          <div className="pt-3 border-t border-[#E8DACB]">
            <p className="text-xs font-semibold text-[#42281D] mb-2 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#C88141]" />
              Manual Order Code Lookup (Fallback)
            </p>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Order # (e.g. VB-2610-101) or Token"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 bg-white border border-[#D9C8B8] rounded-lg px-3 py-2 text-xs text-[#2C1A11] focus:outline-none focus:ring-2 focus:ring-[#E06D80]"
              />
              <button
                type="submit"
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all"
              >
                Find Order
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
