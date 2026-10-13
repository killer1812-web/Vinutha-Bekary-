import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, MapPin, Sparkles, Check, Copy, Wifi, Globe, Laptop, AlertTriangle } from 'lucide-react';
import { useBakery } from '../context/BakeryContext';
import type { Shop } from '../types';

interface ShopCounterQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintPoster: (shop: Shop, qrUrl?: string) => void;
}

const LAN_IP_URL = 'http://10.10.68.243:5173';

export const ShopCounterQRModal: React.FC<ShopCounterQRModalProps> = ({
  isOpen,
  onClose,
  onOpenPrintPoster,
}) => {
  const { shops, activeShopId, setActiveShopId } = useBakery();
  const [selectedShopId, setSelectedShopId] = useState(activeShopId);
  const [copied, setCopied] = useState(false);

  // Host configuration for phone-reachable QR code
  const isCurrentlyLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [hostMode, setHostMode] = useState<'network' | 'custom' | 'origin'>(() => {
    const saved = localStorage.getItem('vb_qr_host_mode');
    if (saved === 'custom' || saved === 'network' || saved === 'origin') return saved;
    return isCurrentlyLocalhost ? 'network' : 'origin';
  });

  const [customHost, setCustomHost] = useState(() => {
    return localStorage.getItem('vb_qr_custom_host') || 'https://vinuthabakery.com';
  });

  const [selectedTable, setSelectedTable] = useState<string>('Counter');

  if (!isOpen) return null;

  const currentShop = shops.find((s) => s.id === selectedShopId) || shops[0];

  // Determine effective base URL
  let effectiveHost = window.location.origin;
  if (hostMode === 'network') {
    effectiveHost = LAN_IP_URL;
  } else if (hostMode === 'custom') {
    effectiveHost = customHost.trim() || LAN_IP_URL;
  } else if (hostMode === 'origin') {
    effectiveHost = window.location.origin;
  }

  // Table query parameter
  const tableQuery = selectedTable && selectedTable !== 'Counter' ? `&table=${encodeURIComponent(selectedTable)}` : '';
  const permanentUrl = `${effectiveHost}/?shop=${currentShop.id}${tableQuery}`;

  const handleHostModeChange = (mode: 'network' | 'custom' | 'origin') => {
    setHostMode(mode);
    localStorage.setItem('vb_qr_host_mode', mode);
  };

  const handleCustomHostChange = (val: string) => {
    setCustomHost(val);
    localStorage.setItem('vb_qr_custom_host', val);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(permanentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svgElement = document.getElementById(`modal-shop-qr-${currentShop.id}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 600;
      canvas.height = 600;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `Vinutha-Bakery-${currentShop.code}-Counter-QR.png`;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const isLocalhostWarning = permanentUrl.includes('localhost') || permanentUrl.includes('127.0.0.1');

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8DACB] my-auto">
        {/* Header */}
        <div className="bg-[#42281D] text-white p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#E06D80]" />
            <div>
              <h3 className="font-bold text-sm md:text-base font-serif">Bakery Counter QR Codes</h3>
              <p className="text-xs text-[#D4A373]">Scannable by normal phone cameras for instant ordering</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-6 text-center space-y-4">
          {/* Shop Selector Tabs */}
          <div className="flex gap-2 bg-[#FAF4ED] p-1.5 rounded-xl border border-[#E8DACB]">
            {shops.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedShopId(s.id);
                  setActiveShopId(s.id);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedShopId === s.id
                    ? 'bg-[#42281D] text-white shadow-sm'
                    : 'text-[#5C3826] hover:bg-white/60'
                }`}
              >
                {s.code}: {s.name.split('–')[1]?.trim() || s.name}
              </button>
            ))}
          </div>

          {/* Network Target Selector (Solves the "Localhost cannot be scanned by mobile" problem) */}
          <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-3 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#42281D] uppercase tracking-wider">
                QR Target URL Mode:
              </span>
              <span className="text-[10px] text-[#8A7569]">Select device accessibility</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleHostModeChange('network')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  hostMode === 'network'
                    ? 'bg-[#42281D] text-white shadow-xs'
                    : 'bg-white border border-[#D9C8B8] text-[#5C3826] hover:bg-[#FAF4ED]'
                }`}
              >
                <Wifi className="w-3 h-3 text-[#E06D80]" />
                Wi-Fi LAN IP
              </button>

              <button
                type="button"
                onClick={() => handleHostModeChange('custom')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  hostMode === 'custom'
                    ? 'bg-[#42281D] text-white shadow-xs'
                    : 'bg-white border border-[#D9C8B8] text-[#5C3826] hover:bg-[#FAF4ED]'
                }`}
              >
                <Globe className="w-3 h-3 text-[#C88141]" />
                Public HTTPS
              </button>

              <button
                type="button"
                onClick={() => handleHostModeChange('origin')}
                className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  hostMode === 'origin'
                    ? 'bg-[#42281D] text-white shadow-xs'
                    : 'bg-white border border-[#D9C8B8] text-[#5C3826] hover:bg-[#FAF4ED]'
                }`}
              >
                <Laptop className="w-3 h-3" />
                This Browser
              </button>
            </div>

            {hostMode === 'custom' && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="https://your-bakery-domain.com"
                  value={customHost}
                  onChange={(e) => handleCustomHostChange(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-lg px-2.5 py-1.5 text-xs text-[#2C1A11]"
                />
              </div>
            )}

            {/* Table / Location Selector */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#E8DACB]">
              <span className="text-[11px] font-bold text-[#42281D]">Placement / Table:</span>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs text-[#2C1A11]"
              >
                <option value="Counter">Shop Counter</option>
                <option value="Table 1">Table 1</option>
                <option value="Table 2">Table 2</option>
                <option value="Table 3">Table 3</option>
                <option value="Table 4">Table 4</option>
                <option value="Table 5">Table 5</option>
                <option value="Takeaway">Takeaway Stand</option>
              </select>
            </div>
          </div>

          {/* Localhost Warning if accidentally selected */}
          {isLocalhostWarning ? (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Warning:</strong> Scanning a QR with <code>localhost</code> from another phone will fail because <code>localhost</code> points to the phone itself. Please click <strong>"Wi-Fi LAN IP"</strong> above so external phones can reach this computer.
              </div>
            </div>
          ) : (
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-left text-[11px] text-emerald-800 flex items-center gap-1.5">
              <span className="font-bold">✓ Phone Reachable:</span> Mobile cameras on the same Wi-Fi can scan and order directly.
            </div>
          )}

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl border-2 border-[#EADCCF] inline-block shadow-md">
            <QRCodeSVG
              id={`modal-shop-qr-${currentShop.id}`}
              value={permanentUrl}
              size={210}
              level="H"
              fgColor="#42281D"
              bgColor="#FFFFFF"
            />
          </div>

          <div className="bg-[#FAF4ED] p-2 rounded-xl text-[11px] font-mono text-[#5C3826] break-all border border-[#E8DACB]">
            {permanentUrl}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={downloadQR}
              className="bg-white hover:bg-[#FAF4ED] text-[#5C3826] border border-[#D9C8B8] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-[#C88141]" />
              Download PNG
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenPrintPoster(currentShop, permanentUrl);
              }}
              className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-[#D4A373]" />
              Print A4 Poster
            </button>

            <button
              onClick={copyUrl}
              className="bg-white hover:bg-[#FAF4ED] text-[#5C3826] border border-[#D9C8B8] text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-[#8A7569]" />
                  Copy QR Link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
