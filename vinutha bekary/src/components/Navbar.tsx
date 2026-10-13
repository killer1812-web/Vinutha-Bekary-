import React, { useState } from 'react';
import {
  MapPin,
  QrCode,
  Download,
  Shield,
  Search,
  PackageCheck,
  Menu,
  X,
  Sparkles,
  Phone,
  User,
  Bell,
} from 'lucide-react';
import { useBakery } from '../context/BakeryContext';

interface NavbarProps {
  onOpenTrackOrder: () => void;
  onOpenCustomDesign: () => void;
  onOpenCounterQR: () => void;
  onOpenAdminPortal: () => void;
  onOpenCustomerAuth: () => void;
  onOpenCustomerDrawer: () => void;
  onInstallPWA: () => void;
  canInstallPWA: boolean;
  activeSection: string;
  onNavigateSection: (section: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenTrackOrder,
  onOpenCustomDesign,
  onOpenCounterQR,
  onOpenAdminPortal,
  onOpenCustomerAuth,
  onOpenCustomerDrawer,
  onInstallPWA,
  canInstallPWA,
  activeSection,
  onNavigateSection,
}) => {
  const { activeShop, currentUser, currentCustomer, customerNotifications, isBackendConnected } = useBakery();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = customerNotifications?.filter((n) => !n.isRead && n.status !== 'read').length || 0;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-b border-[#E8DACB] shadow-xs">
      {/* Top micro-announcement bar */}
      <div className="bg-[#42281D] text-[#FFFDF9] py-1.5 px-4 text-[11px] font-medium flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-full truncate">
          <span className="flex items-center gap-1 text-[#D4A373]">
            <Sparkles className="w-3 h-3 text-[#E06D80]" />
            Counter Self-Order:
          </span>
          <span className="truncate">
            Visiting in person? Scan our shop counter QR code to browse and order instantly!
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-semibold shrink-0">
          <span className="flex items-center gap-1 text-[#D4A373]">
            <Phone className="w-3 h-3" />
            {activeShop.phone}
          </span>
          <span className="text-[#A39284]">|</span>
          <button
            onClick={onOpenCounterQR}
            className="text-[#FFFDF9] hover:text-[#E06D80] transition-colors cursor-pointer flex items-center gap-1"
          >
            <QrCode className="w-3 h-3 text-[#D4A373]" />
            Shop Counter QR
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection('catalog');
            }}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#42281D] to-[#2C1A11] p-1.5 shadow-md flex items-center justify-center text-white border border-[#D4A373]/30">
              <img src="/favicon.svg" alt="VB" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg md:text-xl font-extrabold tracking-tight font-serif text-[#42281D] group-hover:text-[#E06D80] transition-colors">
                  VINUTHA BAKERY
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold text-[#C88141] tracking-widest -mt-0.5">
                Est. Quality Oven Bakes
              </p>
            </div>
          </a>

          {/* Single Shop Location Pill */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#FAF4ED] border border-[#E0D3C5] text-[#42281D] text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs">
            <MapPin className="w-3.5 h-3.5 text-[#E06D80]" />
            <span className="truncate max-w-[200px]">{activeShop.name}</span>
          </div>

          {isBackendConnected && (
            <span className="hidden xl:inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Backend
            </span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-bold text-[#5C3826]">
          <button
            onClick={() => onNavigateSection('catalog')}
            className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'catalog' ? 'bg-[#FAF4ED] text-[#42281D]' : 'hover:text-[#42281D]'
            }`}
          >
            Cake Catalog
          </button>

          <button
            onClick={() => onNavigateSection('categories')}
            className="px-3 py-2 rounded-xl hover:text-[#42281D] transition-colors cursor-pointer"
          >
            Normal vs Ice Cakes
          </button>

          <button
            onClick={onOpenCustomDesign}
            className="px-3 py-2 rounded-xl hover:text-[#42281D] transition-colors cursor-pointer flex items-center gap-1 text-[#E06D80]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Custom Cake Upload
          </button>

          <button
            onClick={onOpenTrackOrder}
            className="px-3 py-2 rounded-xl hover:text-[#42281D] transition-colors cursor-pointer flex items-center gap-1"
          >
            <PackageCheck className="w-3.5 h-3.5 text-[#C88141]" />
            Track Order
          </button>

          <button
            onClick={() => onNavigateSection('shops')}
            className="px-3 py-2 rounded-xl hover:text-[#42281D] transition-colors cursor-pointer"
          >
            Our Bakery
          </button>
        </nav>

        {/* Right CTA Area: Customer Account + PWA + Admin */}
        <div className="flex items-center gap-2">
          {/* Customer Login / My Orders Drawer */}
          {currentCustomer ? (
            <button
              onClick={onOpenCustomerDrawer}
              className="relative flex items-center gap-1.5 bg-[#FAF4ED] hover:bg-[#F2E5D5] text-[#42281D] border border-[#E0D3C5] text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              title="My Orders & Quotes"
            >
              <User className="w-3.5 h-3.5 text-[#E06D80]" />
              <span className="hidden sm:inline">Hi, {currentCustomer.name.split(' ')[0]}</span>
              <span className="sm:hidden font-mono text-[11px]">Orders</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#E06D80] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenCustomerAuth}
              className="flex items-center gap-1.5 bg-[#FAF4ED] hover:bg-[#F2E5D5] text-[#42281D] border border-[#E0D3C5] text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Sign in with mobile number to track orders and custom quotes"
            >
              <User className="w-3.5 h-3.5 text-[#8A7569]" />
              <span className="hidden sm:inline">Customer Login</span>
              <span className="sm:hidden">Login</span>
            </button>
          )}

          {/* PWA Install Button */}
          <button
            onClick={onInstallPWA}
            className="hidden lg:flex items-center gap-1.5 bg-[#FDE8E9] hover:bg-[#FBCAD0] text-[#B83C50] text-xs font-bold px-3 py-2 rounded-xl border border-[#F8B4BD] transition-all cursor-pointer shadow-xs"
            title="Install Vinutha Bakery App on your Phone"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>

          {/* Admin / Staff Portal Entry */}
          <button
            onClick={onOpenAdminPortal}
            className="flex items-center gap-1.5 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-[#D4A373]" />
            <span className="hidden sm:inline">
              {currentUser ? currentUser.name.split(' ')[0] : 'Staff Portal'}
            </span>
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-[#42281D] p-2 rounded-xl hover:bg-[#FAF4ED] transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF9] border-t border-[#E8DACB] px-4 py-4 space-y-3 shadow-xl">
          {/* Mobile Single Shop Info */}
          <div className="bg-[#FAF4ED] p-3 rounded-xl border border-[#E8DACB]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#42281D]">{activeShop.name}</p>
                <p className="text-[11px] text-[#8A7569]">{activeShop.address}</p>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Open Daily
              </span>
            </div>
          </div>

          {/* Customer Logged In / Sign In Button */}
          {currentCustomer ? (
            <button
              onClick={() => {
                onOpenCustomerDrawer();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-[#FAF4ED] to-[#FDE8E9] border border-[#E8DACB] flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#E06D80]" />
                <div>
                  <p className="text-xs font-bold text-[#42281D]">My Account & Orders</p>
                  <p className="text-[10px] text-[#6B5A50]">{currentCustomer.name} • {currentCustomer.phone}</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <span className="bg-[#E06D80] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenCustomerAuth();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left p-3 rounded-xl bg-[#FAF4ED] border border-[#E8DACB] flex items-center gap-2"
            >
              <User className="w-4 h-4 text-[#8A7569]" />
              <div className="text-xs font-bold text-[#42281D]">Customer Login (Track Orders & Quotes)</div>
            </button>
          )}

          <div className="flex flex-col gap-1 text-sm font-semibold text-[#42281D]">
            <button
              onClick={() => {
                onNavigateSection('catalog');
                setIsMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-[#FAF4ED]"
            >
              🎂 Browse Cake Catalog
            </button>
            <button
              onClick={() => {
                onOpenCustomDesign();
                setIsMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-[#FAF4ED] text-[#E06D80] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Upload Custom Cake Reference
            </button>
            <button
              onClick={() => {
                onOpenTrackOrder();
                setIsMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-[#FAF4ED] flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4 text-[#C88141]" />
              Track Cake Order Status
            </button>
            <button
              onClick={() => {
                onOpenCounterQR();
                setIsMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-[#FAF4ED] flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-[#42281D]" />
              Counter QR Codes & Posters
            </button>
            <button
              onClick={() => {
                onInstallPWA();
                setIsMobileMenuOpen(false);
              }}
              className="text-left px-3 py-2 rounded-xl bg-[#FDE8E9] text-[#B83C50] font-bold flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Install App on Home Screen
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
