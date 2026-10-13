import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Search,
  Filter,
  MapPin,
  Phone,
  MessageSquare,
  QrCode,
  Download,
  Shield,
  Heart,
  PackageCheck,
  ChevronRight,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useBakery } from './context/BakeryContext';
import type { CakeItem, Shop } from './types';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { CakeCard } from './components/CakeCard';
import { CakeOrderModal } from './components/CakeOrderModal';
import { CustomDesignModal } from './components/CustomDesignModal';
import { CakeQRModal } from './components/CakeQRModal';
import { ShopCounterQRModal } from './components/ShopCounterQRModal';
import { CounterPosterPrint } from './components/CounterPosterPrint';
import { OrderStatusTracker } from './components/OrderStatusTracker';
import { AdminPortal } from './components/AdminPortal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerAccountDrawer } from './components/CustomerAccountDrawer';

export function App() {
  const { cakes, categories, shops, activeShopId, setActiveShopId, activeShop } = useBakery();

  // Active section & filter state
  const [activeSection, setActiveSection] = useState<'catalog' | 'categories' | 'track' | 'shops'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEgglessOnly, setIsEgglessOnly] = useState(false);

  // Modals state
  const [selectedCakeForOrder, setSelectedCakeForOrder] = useState<CakeItem | null>(null);
  const [selectedCakeForQR, setSelectedCakeForQR] = useState<CakeItem | null>(null);
  const [isCustomDesignOpen, setIsCustomDesignOpen] = useState(false);
  const [isCounterQROpen, setIsCounterQROpen] = useState(false);
  const [printPosterShop, setPrintPosterShop] = useState<Shop | null>(null);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isInstallPromptOpen, setIsInstallPromptOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // QR scan welcome banner from URL parameter
  const [scannedWelcomeShop, setScannedWelcomeShop] = useState<string | null>(null);
  const [scannedTable, setScannedTable] = useState<string | null>(null);

  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const cakeParam = params.get('cake');
    const tableParam = params.get('table');

    if (tableParam) {
      setScannedTable(tableParam);
    }

    if (shopParam && (shopParam === 'shop-1' || shopParam === 'shop-2')) {
      setActiveShopId(shopParam);
      const foundShop = shops.find((s) => s.id === shopParam);
      if (foundShop) {
        setScannedWelcomeShop(foundShop.name);
      }
    }

    if (cakeParam) {
      const matchCake = cakes.find((c) => c.id === cakeParam);
      if (matchCake) {
        setSelectedCakeForOrder(matchCake);
      }
    }

    // PWA Install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [cakes, shops, setActiveShopId]);

  // Filter cakes
  const filteredCakes = cakes.filter((cake) => {
    const matchesCategory = selectedCategory === 'all' || cake.categorySlug === selectedCategory;
    const matchesEggless = !isEgglessOnly || cake.eggOrEggless === 'eggless';
    const matchesSearch =
      searchQuery.trim() === '' ||
      cake.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cake.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cake.flavours.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesEggless && matchesSearch;
  });

  // If viewing printable counter poster, render full-screen print view
  if (printPosterShop) {
    return <CounterPosterPrint shop={printPosterShop} onBack={() => setPrintPosterShop(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-[#2C1A11]">
      {/* Navigation */}
      <Navbar
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenCustomDesign={() => setIsCustomDesignOpen(true)}
        onOpenCounterQR={() => setIsCounterQROpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        onOpenCustomerAuth={() => setIsCustomerAuthOpen(true)}
        onOpenCustomerDrawer={() => setIsCustomerDrawerOpen(true)}
        onInstallPWA={() => setIsInstallPromptOpen(true)}
        canInstallPWA={!!deferredPrompt}
        activeSection={activeSection}
        onNavigateSection={(sec) => {
          if (sec === 'track') setIsTrackOrderOpen(true);
          else setActiveSection(sec as any);
        }}
      />

      {/* Scanned Counter QR Welcome Alert */}
      {(scannedWelcomeShop || scannedTable) && (
        <div className="bg-[#FAF4ED] border-b border-[#E8DACB] px-4 py-3 text-center text-xs text-[#42281D] animate-fadeIn">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-bold flex-wrap">
              <QrCode className="w-4 h-4 text-[#E06D80]" />
              Welcome! You scanned the counter QR code for <u>{scannedWelcomeShop || activeShop.name}</u>
              {scannedTable && (
                <span className="bg-[#E06D80] text-white text-[10px] px-2 py-0.5 rounded-full ml-1 font-bold shadow-xs">
                  {scannedTable.toLowerCase() === 'counter' ? 'Counter' : `Table ${scannedTable}`}
                </span>
              )}
              . Menu, cake weights and live prices are loaded.
            </span>
            <button
              onClick={() => {
                setScannedWelcomeShop(null);
                setScannedTable(null);
              }}
              className="text-[#8A7569] hover:text-[#42281D] font-bold text-xs cursor-pointer"
            >
              ✕ Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner
        onBrowseCakes={() => {
          setActiveSection('catalog');
          const el = document.getElementById('cake-catalog');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onCustomDesign={() => setIsCustomDesignOpen(true)}
        onCounterQR={() => setIsCounterQROpen(true)}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 md:py-12 w-full space-y-14">
        {/* ======================================================================= */}
        {/* SECTION 1: CAKE CATALOG & MENU */}
        {/* ======================================================================= */}
        <section id="cake-catalog" className="scroll-mt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-flex items-center gap-1 bg-[#FAF4ED] text-[#C88141] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#E8DACB]">
                <Sparkles className="w-3.5 h-3.5 text-[#E06D80]" />
                Fresh Celebration Cakes
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-[#42281D] font-serif tracking-tight">
                Our Signature Cake Creations
              </h2>
              <p className="text-xs md:text-sm text-[#6B5A50] mt-1 max-w-xl">
                Browse our daily-baked sponge cakes, decadent chilled ice cakes, and celebratory designs. Tap any cake to customize size, flavour, and message.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-[#8A7569] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search cake name, flavour..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#FFFDF9] border border-[#D9C8B8] rounded-xl pl-9 pr-4 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none shadow-xs"
              />
            </div>
          </div>

          {/* Category Filter Pills & Eggless Toggle */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-8">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
                selectedCategory === 'all'
                  ? 'bg-[#42281D] text-white shadow-md'
                  : 'bg-[#FFFDF9] text-[#5C3826] border border-[#E0D3C5] hover:bg-[#FAF6F0]'
              }`}
            >
              All Cakes ({cakes.length})
            </button>

            {/* Dedicated 100% Eggless Only Toggle Button */}
            <button
              onClick={() => setIsEgglessOnly(!isEgglessOnly)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1.5 border ${
                isEgglessOnly
                  ? 'bg-emerald-700 border-emerald-800 text-white shadow-md ring-2 ring-emerald-400'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border-2 border-current flex items-center justify-center shrink-0">
                <span className="w-1 h-1 rounded-full bg-current"></span>
              </span>
              <span>{isEgglessOnly ? '✓ 100% Eggless Only' : '🌱 Eggless Only'}</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => {
                  if (cat.slug === 'custom') {
                    setIsCustomDesignOpen(true);
                  } else {
                    setSelectedCategory(cat.slug);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs flex items-center gap-1.5 ${
                  selectedCategory === cat.slug
                    ? 'bg-[#42281D] text-white shadow-md'
                    : 'bg-[#FFFDF9] text-[#5C3826] border border-[#E0D3C5] hover:bg-[#FAF6F0]'
                }`}
              >
                {cat.slug === 'custom' && <Sparkles className="w-3.5 h-3.5 text-[#E06D80]" />}
                <span>{cat.name}</span>
                {cat.badge && (
                  <span className="text-[9px] bg-[#FAF4ED] text-[#C88141] px-1.5 py-0.2 rounded font-extrabold border border-[#E8DACB]">
                    {cat.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Cakes Grid */}
          {filteredCakes.length === 0 ? (
            <div className="text-center py-12 bg-[#FAF4ED] rounded-3xl border border-[#E8DACB] p-6">
              <ShoppingBag className="w-12 h-12 text-[#C88141] mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-[#42281D]">No cakes found matching your search</h3>
              <p className="text-xs text-[#6B5A50] mt-1 mb-4">
                Looking for a specific theme or design? Upload a custom reference photo!
              </p>
              <button
                onClick={() => setIsCustomDesignOpen(true)}
                className="bg-[#42281D] text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
              >
                Upload Custom Cake Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCakes.map((cake) => (
                <CakeCard
                  key={cake.id}
                  cake={cake}
                  onOrder={(c) => setSelectedCakeForOrder(c)}
                  onShowQR={(c) => setSelectedCakeForQR(c)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ======================================================================= */}
        {/* SECTION 2: NORMAL CAKES VS ICE CAKES SHOWCASE */}
        {/* ======================================================================= */}
        <section className="bg-gradient-to-br from-[#FFF5F5] to-[#FAF4ED] border border-[#F8B4BD]/60 rounded-3xl p-6 md:p-10 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="inline-flex items-center gap-1.5 bg-white text-[#E06D80] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#F8B4BD]">
              <Sparkles className="w-3.5 h-3.5" />
              Category Guide
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#42281D] font-serif">
              Normal Cakes vs. Chilled Ice Cakes
            </h2>
            <p className="text-xs md:text-sm text-[#6B5A50] mt-1">
              At Vinutha Bakery, we specialize in both traditional oven-baked celebration cakes and velvety chilled ice cakes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Normal Cakes Card */}
            <div className="bg-[#FFFDF9] rounded-2xl p-6 border border-[#E8DACB] shadow-sm flex flex-col justify-between">
              <div>
                <span className="bg-[#42281D] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Category 1: Normal Cakes
                </span>
                <h3 className="text-xl font-bold font-serif text-[#42281D] mt-3 mb-2">
                  Traditional Sponge & Buttercream Cakes
                </h3>
                <p className="text-xs text-[#6B5A50] leading-relaxed mb-4">
                  Baked with rich golden butter, finest wheat flour, and classic whipped frostings. Perfect for ambient transport, birthdays, and anniversaries that sit beautifully without immediate refrigeration.
                </p>
                <ul className="text-xs text-[#5C3826] space-y-1.5 mb-5">
                  <li>✓ Belgian Dark Chocolate Truffle</li>
                  <li>✓ Authentic German Black Forest</li>
                  <li>✓ Red Velvet Cream Cheese Heart</li>
                  <li>✓ Vanilla Buttercream Confetti</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedCategory('normal-cakes');
                  document.getElementById('cake-catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#FAF4ED] hover:bg-[#F2E5D5] text-[#42281D] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#E0D3C5] transition-all cursor-pointer flex items-center justify-between"
              >
                <span>View All Normal Cakes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Ice Cakes Card */}
            <div className="bg-[#FFFDF9] rounded-2xl p-6 border border-[#E8DACB] shadow-sm flex flex-col justify-between">
              <div>
                <span className="bg-[#E06D80] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Category 2: Chilled Ice Cakes
                </span>
                <h3 className="text-xl font-bold font-serif text-[#42281D] mt-3 mb-2">
                  Velvety Chilled Ice Cream & Mousse Cakes
                </h3>
                <p className="text-xs text-[#6B5A50] leading-relaxed mb-4">
                  Cold, light-as-air mousse and chilled dairy layers blended with real fruit compotes and frozen creams. Served cold from our specialized bakery chilling displays for maximum indulgence.
                </p>
                <ul className="text-xs text-[#5C3826] space-y-1.5 mb-5">
                  <li>✓ Fresh Strawberry Chilled Ice Cake</li>
                  <li>✓ Pineapple Fresh Cream Ice Cake</li>
                  <li>✓ Chilled Mango Passion Mousse</li>
                  <li>✓ Cold Chocolate Truffle Mousse</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedCategory('ice-cakes');
                  document.getElementById('cake-catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#FFF5F5] hover:bg-[#FDE8E9] text-[#B83C50] text-xs font-bold py-2.5 px-4 rounded-xl border border-[#F8B4BD] transition-all cursor-pointer flex items-center justify-between"
              >
                <span>View All Chilled Ice Cakes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* SECTION 3: CUSTOM CAKE UPLOAD CALLOUT */}
        {/* ======================================================================= */}
        <section className="bg-[#42281D] text-white rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8 space-y-3">
              <span className="inline-flex items-center gap-1.5 bg-[#E06D80] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#D4A373]" />
                Bespoke Cake Studio
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold font-serif">
                Have a Unique Cake Idea or Photo?
              </h2>
              <p className="text-xs md:text-sm text-[#D4A373] max-w-xl leading-relaxed">
                Found a dream design on Instagram or Pinterest? Upload your photo, describe your cake concept, and record voice instructions. Our master cake artist will review the design and provide an immediate price quotation!
              </p>
            </div>

            <div className="md:col-span-4 flex justify-start md:justify-end">
              <button
                onClick={() => setIsCustomDesignOpen(true)}
                className="bg-white hover:bg-[#FAF4ED] text-[#42281D] text-xs md:text-sm font-bold px-6 py-3.5 rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#E06D80]" />
                Upload Photo & Get Quote
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* SECTION 4: OUR BAKERY & COUNTER SELF-ORDERING */}
        {/* ======================================================================= */}
        <section id="our-shops" className="scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="inline-flex items-center gap-1.5 bg-[#FAF4ED] text-[#C88141] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#E8DACB]">
              <MapPin className="w-3.5 h-3.5 text-[#E06D80]" />
              Visit Our Bakery
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#42281D] font-serif">
              {activeShop.name}
            </h2>
            <p className="text-xs md:text-sm text-[#6B5A50] mt-1">
              Freshly baked every single day with pure butter, rich creams, and authentic recipes. Visit us in person or scan our counter QR code!
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-[#FFFDF9] border border-[#E8DACB] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-[#FAF4ED] border border-[#E8DACB] text-[#E06D80] px-2.5 py-0.5 rounded-lg">
                  {activeShop.code || 'MAIN'}
                </span>
                <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Open 7 Days a Week
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold font-serif text-[#42281D]">{activeShop.name}</h3>
                <p className="text-xs text-[#C88141] font-semibold mt-0.5">{activeShop.tagline}</p>
              </div>

              <div className="space-y-2.5 text-xs text-[#6B5A50]">
                <p className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#E06D80] shrink-0 mt-0.5" />
                  <span>{activeShop.address}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#C88141] shrink-0" />
                  <span>{activeShop.operatingHours}</span>
                </p>
                <p className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#42281D] shrink-0" />
                  <span>{activeShop.phone}</span>
                </p>
              </div>

              <div className="pt-3 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setPrintPosterShop(activeShop);
                  }}
                  className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <QrCode className="w-4 h-4 text-[#D4A373]" />
                  Print Counter Poster
                </button>

                <a
                  href={`https://wa.me/${(activeShop.whatsapp || activeShop.phone).replace(/\D/g, '')}?text=Hello%20Vinutha%20Bakery,%20I%20would%20like%20to%20inquire%20about%20a%20cake`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Counter QR Card Display */}
            <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-2xl p-5 text-center shrink-0 w-full md:w-64">
              <p className="text-[11px] font-bold text-[#8A7569] uppercase tracking-wider mb-2">Counter Self-Order QR</p>
              <div className="bg-white p-3 rounded-xl border border-[#E8DACB] inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    activeShop.counterQrUrl || `${window.location.origin}/?table=counter`
                  )}`}
                  alt="Shop Counter QR"
                  className="w-36 h-36 mx-auto rounded-lg"
                />
              </div>
              <p className="text-[10px] text-[#6B5A50] mt-2 font-medium">Scan with any phone camera to view menu & place order</p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#42281D] text-[#FAF4ED] border-t border-[#5C3826] py-12 px-4 mt-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-xs">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white p-1">
                <img src="/favicon.svg" alt="VB" className="w-full h-full object-contain" />
              </div>
              <span className="font-serif font-extrabold text-base text-white">VINUTHA BAKERY</span>
            </div>
            <p className="text-[#D4A373] leading-relaxed">
              Serving handcrafted birthday cakes, chilled ice cakes, romantic anniversary creations, and daily fresh oven bakes.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Bakery Location</h4>
            <p className="text-[#D4A373]">
              <strong>{activeShop.name}:</strong> {activeShop.address}
            </p>
            <p className="text-[#D4A373]">Hours: {activeShop.operatingHours}</p>
            <p className="text-[#D4A373]">Contact: {activeShop.phone}</p>
            {activeShop.upiId && <p className="text-[#D4A373]">UPI: {activeShop.upiId}</p>}
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Customer Services</h4>
            <p>
              <button onClick={() => setIsCustomerDrawerOpen(true)} className="hover:text-[#E06D80] cursor-pointer">
                My Orders & Active Quotes
              </button>
            </p>
            <p>
              <button onClick={() => setIsTrackOrderOpen(true)} className="hover:text-[#E06D80] cursor-pointer">
                Track Any Order by ID
              </button>
            </p>
            <p>
              <button onClick={() => setIsCustomDesignOpen(true)} className="hover:text-[#E06D80] cursor-pointer">
                Upload Custom Cake Reference
              </button>
            </p>
            <p>
              <button onClick={() => setIsCounterQROpen(true)} className="hover:text-[#E06D80] cursor-pointer">
                Counter QR Self-Order Portals
              </button>
            </p>
            <p>
              <button onClick={() => setIsInstallPromptOpen(true)} className="hover:text-[#E06D80] cursor-pointer">
                Install Mobile App (PWA)
              </button>
            </p>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Bakery Administration</h4>
            <p className="text-[#D4A373]">
              Authorized staff and manager portal for cake orders, price quotations, payments, and expenses.
            </p>
            <button
              onClick={() => setIsAdminPortalOpen(true)}
              className="bg-[#FAF4ED] hover:bg-white text-[#42281D] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Shield className="w-3.5 h-3.5 text-[#E06D80]" />
              Staff & Admin Portal
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#5C3826] flex flex-wrap items-center justify-between text-[11px] text-[#A39284] gap-2">
          <p>© {new Date().getFullYear()} Vinutha Bakery. All Rights Reserved. Crafted with love & premium ingredients.</p>
          <p>Single-Shop System • 100% Eggless Options • UPI PhonePe Ready • Progressive Web App (PWA)</p>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Cake Order Modal */}
      <CakeOrderModal
        cake={selectedCakeForOrder}
        isOpen={!!selectedCakeForOrder}
        onClose={() => setSelectedCakeForOrder(null)}
        tableNumber={scannedTable}
      />

      {/* 2. Custom Cake Design Upload Modal */}
      <CustomDesignModal
        isOpen={isCustomDesignOpen}
        onClose={() => setIsCustomDesignOpen(false)}
      />

      {/* 3. Individual Cake QR Code Modal */}
      <CakeQRModal
        cake={selectedCakeForQR}
        isOpen={!!selectedCakeForQR}
        onClose={() => setSelectedCakeForQR(null)}
        onSelectForOrder={(c) => setSelectedCakeForOrder(c)}
      />

      {/* 4. Shop Counter QR Codes Modal */}
      <ShopCounterQRModal
        isOpen={isCounterQROpen}
        onClose={() => setIsCounterQROpen(false)}
        onOpenPrintPoster={(shop) => setPrintPosterShop(shop)}
      />

      {/* 5. Order Status Tracker Modal */}
      {isTrackOrderOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E8DACB] my-auto relative">
            <button
              onClick={() => setIsTrackOrderOpen(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-[#42281D] p-2 rounded-xl hover:bg-[#FAF4ED] cursor-pointer"
            >
              ✕
            </button>
            <OrderStatusTracker onClose={() => setIsTrackOrderOpen(false)} />
          </div>
        </div>
      )}

      {/* 6. Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isCustomerAuthOpen}
        onClose={() => setIsCustomerAuthOpen(false)}
        onSuccess={() => setIsCustomerDrawerOpen(true)}
      />

      {/* 7. Customer Account Drawer */}
      <CustomerAccountDrawer
        isOpen={isCustomerDrawerOpen}
        onClose={() => setIsCustomerDrawerOpen(false)}
        onOpenOrderCake={() => {
          setIsCustomerDrawerOpen(false);
          const el = document.getElementById('cake-catalog');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenCustomDesign={() => {
          setIsCustomerDrawerOpen(false);
          setIsCustomDesignOpen(true);
        }}
      />

      {/* 8. Admin & Staff Portal Modal */}
      {isAdminPortalOpen && (
        <AdminPortal
          onClose={() => setIsAdminPortalOpen(false)}
          onOpenCounterPoster={(shopId) => {
            const sh = shops.find((s) => s.id === shopId) || shops[0];
            setPrintPosterShop(sh);
            setIsAdminPortalOpen(false);
          }}
        />
      )}

      {/* 9. PWA Install Prompt */}
      <PWAInstallPrompt
        isOpen={isInstallPromptOpen}
        onClose={() => setIsInstallPromptOpen(false)}
        deferredPrompt={deferredPrompt}
      />
    </div>
  );
}

export default App;
