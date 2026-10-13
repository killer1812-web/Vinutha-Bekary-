import React from 'react';
import { QrCode, ShoppingBag, Sparkles, Check, Heart } from 'lucide-react';
import type { CakeItem } from '../types';

interface CakeCardProps {
  cake: CakeItem;
  onOrder: (cake: CakeItem) => void;
  onShowQR: (cake: CakeItem) => void;
}

export const CakeCard: React.FC<CakeCardProps> = ({ cake, onOrder, onShowQR }) => {
  return (
    <div className="bg-[#FFFDF9] rounded-2xl overflow-hidden border border-[#E8DACB] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative">
      {/* Cake Image Box */}
      <div className="relative aspect-4/3 overflow-hidden bg-[#FAF4ED]">
        <img
          src={cake.images[0] || '/images/hero_cake.jpg'}
          alt={cake.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
          {cake.badge && (
            <span className="bg-[#42281D]/90 backdrop-blur-md text-[#FFFDF9] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D4A373]" />
              {cake.badge}
            </span>
          )}
          {cake.categorySlug === 'ice-cakes' && (
            <span className="bg-[#E06D80] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Chilled Ice Cake
            </span>
          )}
          {/* Eggless Classification Badge */}
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1.5 backdrop-blur-md ${
              cake.eggOrEggless === 'eggless'
                ? 'bg-emerald-800/90 text-white border border-emerald-400'
                : 'bg-amber-900/90 text-amber-100 border border-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cake.eggOrEggless === 'eggless' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {cake.eggOrEggless === 'eggless' ? '100% Eggless' : 'Contains Egg'}
          </span>
        </div>

        {/* Individual Cake QR Code Quick Button */}
        <button
          onClick={() => onShowQR(cake)}
          title="View & Download Cake QR Code"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md text-[#42281D] hover:bg-white hover:text-[#E06D80] flex items-center justify-center shadow-md transition-all cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Unavailable pill */}
        {!cake.isAvailable && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider">
              Currently Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#C88141]">
              {cake.categorySlug.replace('-', ' ')}
            </span>
            <span className="text-[10px] font-bold text-[#6B5A50] bg-[#FAF4ED] px-2 py-0.5 rounded-md border border-[#E8DACB]">
              ⏱ Prep: {cake.prepTime || '2-3 hrs'}
            </span>
          </div>

          <h3 className="text-base md:text-lg font-bold text-[#42281D] font-serif group-hover:text-[#E06D80] transition-colors leading-snug">
            {cake.name}
          </h3>

          <p className="text-xs text-[#6B5A50] line-clamp-2 mt-1.5 leading-relaxed">
            {cake.description}
          </p>

          {/* Available Sizes pills */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cake.sizes.slice(0, 3).map((s) => (
              <span
                key={s.size}
                className="text-[10px] bg-[#FAF4ED] border border-[#E8DACB] text-[#5C3826] font-medium px-2 py-0.5 rounded"
              >
                {s.size}: ₹{s.price}
              </span>
            ))}
          </div>
        </div>

        {/* Footer with Price & Action */}
        <div className="mt-4 pt-3 border-t border-[#E8DACB] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[#8A7569] uppercase font-bold">Starts At</p>
            <p className="text-lg font-extrabold text-[#42281D] font-mono">₹{cake.basePrice}</p>
          </div>

          <button
            onClick={() => onOrder(cake)}
            disabled={!cake.isAvailable}
            className="bg-[#42281D] hover:bg-[#2C1A11] disabled:bg-gray-300 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#D4A373]" />
            Order Cake
          </button>
        </div>
      </div>
    </div>
  );
};
