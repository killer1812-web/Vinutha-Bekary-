import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Sparkles, ExternalLink } from 'lucide-react';
import type { CakeItem } from '../types';

interface CakeQRModalProps {
  cake: CakeItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectForOrder: (cake: CakeItem) => void;
}

export const CakeQRModal: React.FC<CakeQRModalProps> = ({
  cake,
  isOpen,
  onClose,
  onSelectForOrder,
}) => {
  if (!isOpen || !cake) return null;

  // Stable URL pointing to the cake item
  const cakeUrl = `${window.location.origin}/?cake=${cake.id}`;

  const downloadQR = () => {
    const svgElement = document.getElementById(`cake-qr-${cake.id}`);
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 500;
      canvas.height = 500;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 500, 500);
        ctx.drawImage(img, 50, 50, 400, 400);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `Vinutha-Cake-QR-${cake.id}.png`;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-[#E8DACB] text-center p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-[#FAF4ED] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="inline-flex items-center gap-1 bg-[#FDE8E9] text-[#B83C50] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
          <Sparkles className="w-3 h-3" />
          Individual Cake QR Code
        </span>

        <h3 className="text-lg font-bold text-[#42281D] font-serif mb-1">{cake.name}</h3>
        <p className="text-xs text-[#8A7569] mb-4">
          Scan with mobile camera to view live price (starting ₹{cake.basePrice}) & order directly!
        </p>

        <div className="p-4 bg-white rounded-2xl border-2 border-[#EADCCF] inline-block shadow-sm mb-4">
          <QRCodeSVG
            id={`cake-qr-${cake.id}`}
            value={cakeUrl}
            size={180}
            level="H"
            fgColor="#42281D"
            bgColor="#FFFFFF"
          />
        </div>

        <p className="text-[10px] text-[#A39284] font-mono break-all mb-4 px-2">
          {cakeUrl}
        </p>

        <div className="flex gap-2">
          <button
            onClick={downloadQR}
            className="flex-1 bg-white hover:bg-[#FAF4ED] text-[#5C3826] border border-[#D9C8B8] text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#C88141]" />
            Download PNG
          </button>
          <button
            onClick={() => {
              onClose();
              onSelectForOrder(cake);
            }}
            className="flex-1 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Order Cake Now
          </button>
        </div>
      </div>
    </div>
  );
};
