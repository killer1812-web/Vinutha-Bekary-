import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Shop } from '../types';
import { Printer, Download, Sparkles, MapPin, Phone, MessageSquare, ArrowLeft, Wifi, Globe, Laptop } from 'lucide-react';

interface CounterPosterPrintProps {
  shop: Shop;
  qrUrl?: string;
  onBack: () => void;
}

const LAN_IP_URL = 'http://10.10.68.243:5173';

export const CounterPosterPrint: React.FC<CounterPosterPrintProps> = ({ shop, qrUrl, onBack }) => {
  const posterRef = useRef<HTMLDivElement>(null);

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const defaultPosterUrl = qrUrl || (isLocalhost ? `${LAN_IP_URL}/?shop=${shop.id}` : `${window.location.origin}/?shop=${shop.id}`);
  const [activeQrUrl, setActiveQrUrl] = useState(defaultPosterUrl);
  const [urlMode, setUrlMode] = useState<'wifi' | 'public' | 'localhost'>(isLocalhost ? 'wifi' : 'public');

  const handleUrlModeChange = (mode: 'wifi' | 'public' | 'localhost') => {
    setUrlMode(mode);
    if (mode === 'wifi') {
      setActiveQrUrl(`${LAN_IP_URL}/?shop=${shop.id}`);
    } else if (mode === 'public') {
      const publicDomain = localStorage.getItem('vb_qr_custom_host') || 'https://vinuthabakery.com';
      setActiveQrUrl(`${publicDomain}/?shop=${shop.id}`);
    } else {
      setActiveQrUrl(`${window.location.origin}/?shop=${shop.id}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById(`counter-qr-${shop.id}`);
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
        downloadLink.download = `Vinutha-Bakery-${shop.code}-Counter-QR.png`;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-[#F7F2EB] py-6 px-4">
      {/* Top Controls Bar (hidden during printing) */}
      <div className="max-w-xl mx-auto mb-6 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#5C3826] bg-white px-3.5 py-2 rounded-lg border border-[#E0D3C5] hover:bg-[#FAF6F0] shadow-xs cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQR}
              className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#5C3826] bg-white px-3.5 py-2 rounded-lg border border-[#E0D3C5] hover:bg-[#FAF6F0] shadow-xs cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-[#C88141]" />
              Download PNG
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-white bg-[#42281D] hover:bg-[#2C1A11] px-4 py-2 rounded-lg shadow-md cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4 text-[#D4A373]" />
              Print A4 Poster
            </button>
          </div>
        </div>

        {/* URL Target Switcher */}
        <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[#42281D]">Poster QR Destination:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleUrlModeChange('wifi')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                urlMode === 'wifi' ? 'bg-[#42281D] text-white shadow-xs' : 'bg-white text-[#5C3826] border border-[#D9C8B8]'
              }`}
            >
              <Wifi className="w-3 h-3 text-[#E06D80]" />
              Wi-Fi LAN IP
            </button>
            <button
              onClick={() => handleUrlModeChange('public')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                urlMode === 'public' ? 'bg-[#42281D] text-white shadow-xs' : 'bg-white text-[#5C3826] border border-[#D9C8B8]'
              }`}
            >
              <Globe className="w-3 h-3 text-[#C88141]" />
              Public URL
            </button>
            <button
              onClick={() => handleUrlModeChange('localhost')}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                urlMode === 'localhost' ? 'bg-[#42281D] text-white shadow-xs' : 'bg-white text-[#5C3826] border border-[#D9C8B8]'
              }`}
            >
              <Laptop className="w-3 h-3" />
              Localhost
            </button>
          </div>
        </div>
      </div>

      {/* Printable Poster Container */}
      <div
        ref={posterRef}
        className="max-w-[560px] mx-auto bg-[#FFFDF9] border-8 border-[#42281D] rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden text-center"
        style={{
          boxShadow: '0 20px 40px -15px rgba(66, 40, 29, 0.25)',
        }}
      >
        {/* Subtle decorative vintage borders */}
        <div className="border border-[#D4A373] p-6 rounded-xl relative">
          <div className="absolute top-2 left-2 text-[#D4A373] text-lg">✦</div>
          <div className="absolute top-2 right-2 text-[#D4A373] text-lg">✦</div>
          <div className="absolute bottom-2 left-2 text-[#D4A373] text-lg">✦</div>
          <div className="absolute bottom-2 right-2 text-[#D4A373] text-lg">✦</div>

          {/* Bakery Logo & Badge */}
          <div className="inline-flex items-center justify-center gap-2 bg-[#FCE7E9] text-[#B83C50] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Counter Self-Order Portal
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#42281D] tracking-tight font-serif mb-1">
            VINUTHA BAKERY
          </h1>
          <p className="text-xs md:text-sm font-medium text-[#C88141] uppercase tracking-widest mb-4">
            Fresh Oven Bakes & Custom Celebration Cakes
          </p>

          <div className="h-0.5 w-24 bg-[#E06D80] mx-auto mb-5 rounded-full" />

          {/* Catchy headline */}
          <h2 className="text-xl md:text-2xl font-bold text-[#2C1A11] mb-2 leading-snug">
            {shop.counterPosterTitle}
          </h2>
          <p className="text-xs md:text-sm text-[#6B5A50] max-w-sm mx-auto mb-6">
            Point your mobile camera at this QR code to browse Normal Cakes, Ice Cakes, and customize your celebration order!
          </p>

          {/* High-Resolution QR Code */}
          <div className="bg-white p-5 rounded-2xl border-2 border-[#EADCCF] inline-block shadow-md mb-6">
            <QRCodeSVG
              id={`counter-qr-${shop.id}`}
              value={activeQrUrl}
              size={230}
              level="H"
              includeMargin={false}
              fgColor="#2C1A11"
              bgColor="#FFFFFF"
            />
          </div>

          {/* Scanned Shop Indicator */}
          <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-3.5 mb-5 text-left max-w-md mx-auto">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#E06D80] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#42281D] uppercase tracking-wide">
                  {shop.name}
                </p>
                <p className="text-[11px] text-[#6B5A50] mt-0.5 leading-relaxed">
                  {shop.address}
                </p>
              </div>
            </div>
          </div>

          {/* Contact & WhatsApp */}
          <div className="flex items-center justify-center gap-6 text-xs text-[#5C3826] font-semibold pt-2 border-t border-[#E8DACB]">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#C88141]" />
              {shop.phone}
            </span>
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              WhatsApp: {shop.whatsapp}
            </span>
          </div>

          <p className="text-[10px] text-[#A39284] mt-3 uppercase tracking-wider font-mono">
            Direct Link: {activeQrUrl}
          </p>
        </div>
      </div>
    </div>
  );
};
