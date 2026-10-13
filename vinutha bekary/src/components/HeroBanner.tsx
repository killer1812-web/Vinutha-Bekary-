import React from 'react';
import { Sparkles, ShoppingBag, QrCode, ArrowRight, Award, Clock, Heart, ShieldCheck } from 'lucide-react';
import { useBakery } from '../context/BakeryContext';

interface HeroBannerProps {
  onBrowseCakes: () => void;
  onCustomDesign: () => void;
  onCounterQR: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onBrowseCakes,
  onCustomDesign,
  onCounterQR,
}) => {
  const { activeShop } = useBakery();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF9] via-[#FAF4ED] to-[#F7F2EB] py-8 md:py-14 border-b border-[#E8DACB]">
      {/* Decorative ambient gradients */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#FDE8E9]/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#FAF0E6]/80 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Hero Copy & CTA */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#FCE7E9] border border-[#F8B4BD] text-[#B83C50] px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#E06D80]" />
              <span>Welcome to Vinutha Bakery • {activeShop.name.split('–')[1]?.trim() || activeShop.name}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#42281D] font-serif leading-[1.15] tracking-tight">
              Artisan Cakes & Freshly Baked Joy for Every Celebration
            </h1>

            <p className="text-sm md:text-base text-[#6B5A50] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Indulge in handcrafted <strong className="text-[#42281D]">Normal Sponge Cakes</strong>, chilled{' '}
              <strong className="text-[#42281D]">Fresh Fruit Ice Cakes</strong>, and luxurious bespoke multi-tiered designs. Scan our counter QR code for express self-ordering or upload your custom design photo with voice instructions!
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={onBrowseCakes}
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#D4A373]" />
                Browse Cakes & Prices
              </button>

              <button
                onClick={onCustomDesign}
                className="bg-white hover:bg-[#FAF6F0] text-[#5C3826] border-2 border-[#D9C8B8] hover:border-[#E06D80] text-xs md:text-sm font-bold px-5 py-3.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#E06D80]" />
                Upload Custom Design
              </button>

              <button
                onClick={onCounterQR}
                className="bg-[#FDE8E9] hover:bg-[#FBCAD0] text-[#B83C50] text-xs md:text-sm font-bold px-4 py-3.5 rounded-xl border border-[#F8B4BD] transition-all flex items-center gap-1.5 cursor-pointer"
                title="View Shop Counter QR Codes"
              >
                <QrCode className="w-4 h-4" />
                Counter QR Codes
              </button>
            </div>

            {/* Trust Badges */}
            <div className="pt-4 border-t border-[#E8DACB] grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C88141] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-[#42281D]">Baked Daily</p>
                  <p className="text-[10px] text-[#8A7569]">Oven fresh every day</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E06D80] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-[#42281D]">Pure Dairy</p>
                  <p className="text-[10px] text-[#8A7569]">Natural cream & butter</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-[#42281D]">100% Eggless</p>
                  <p className="text-[10px] text-[#8A7569]">Available on request</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#42281D] shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-[#42281D]">QR Self-Order</p>
                  <p className="text-[10px] text-[#8A7569]">Scan at shop counter</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Premium image container with soft bakery drop shadow */}
              <div className="aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white group">
                <img
                  src="/images/hero_cake.jpg"
                  alt="Vinutha Bakery Celebration Cakes"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>

              {/* Floating review card */}
              <div className="absolute -bottom-4 -left-4 sm:bottom-4 sm:-left-6 bg-white/95 backdrop-blur-md border border-[#E8DACB] p-3.5 rounded-2xl shadow-xl flex items-center gap-3 max-w-[240px]">
                <div className="w-10 h-10 rounded-xl bg-[#FDE8E9] flex items-center justify-center text-[#E06D80] shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#42281D]">4.9 ★ Rating</p>
                  <p className="text-[10px] text-[#8A7569]">Loved by 10,000+ happy celebration hosts</p>
                </div>
              </div>

              {/* Floating counter QR card */}
              <div className="absolute -top-3 -right-3 sm:top-4 sm:-right-4 bg-[#42281D]/90 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-xs">
                <QrCode className="w-4 h-4 text-[#D4A373]" />
                <span className="font-bold">2 Counter Branches</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
