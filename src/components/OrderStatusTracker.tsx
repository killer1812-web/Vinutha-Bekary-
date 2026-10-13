import React, { useState } from 'react';
import { Search, PackageCheck, AlertCircle, CheckCircle, Clock, MapPin, Calendar, Check, X, Phone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useBakery } from '../context/BakeryContext';
import type { Order, OrderStatus } from '../types';

interface OrderStatusTrackerProps {
  onClose?: () => void;
}

const STATUS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'price_quoted', label: 'Price Quoted' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Baking & Decorating' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup' },
  { key: 'completed', label: 'Completed' },
];

export const OrderStatusTracker: React.FC<OrderStatusTrackerProps> = ({ onClose }) => {
  const { orders, respondToQuotation, shops } = useBakery();

  const [orderQuery, setOrderQuery] = useState('');
  const [phoneQuery, setPhoneQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setHasSearched(true);

    const cleanOrder = orderQuery.trim().toLowerCase();
    const cleanPhone = phoneQuery.trim().replace(/\D/g, '');

    if (!cleanOrder) {
      setErrorMsg('Please enter your Order Number (e.g. VB-2610-101)');
      return;
    }

    const match = orders.find((o) => {
      const matchOrder = o.orderNumber.toLowerCase() === cleanOrder || o.id.toLowerCase() === cleanOrder;
      if (!matchOrder) return false;
      // If phone provided, verify matching phone
      if (cleanPhone) {
        return o.customerPhone.replace(/\D/g, '').includes(cleanPhone);
      }
      return true;
    });

    if (match) {
      setSearchedOrder(match);
    } else {
      setSearchedOrder(null);
      setErrorMsg('No order found with that Order Number and Mobile Number. Please verify your details.');
    }
  };

  const currentShop = searchedOrder ? shops.find((s) => s.id === searchedOrder.shopId) : null;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-[#FAF4ED] text-[#C88141] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-[#E8DACB]">
          <PackageCheck className="w-4 h-4 text-[#E06D80]" />
          Live Bakery Tracker
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#42281D] font-serif">
          Track Your Cake Order Status
        </h2>
        <p className="text-xs md:text-sm text-[#6B5A50] mt-1 max-w-md mx-auto">
          Enter your unique order number and mobile number to see baking progress, quotations, or your pickup QR pass.
        </p>
      </div>

      {/* Search Box */}
      <form
        onSubmit={handleSearch}
        className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 md:p-5 shadow-sm mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
              Order Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. VB-2610-101"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2.5 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none font-mono uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
              Mobile Number (Verification)
            </label>
            <input
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2.5 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
        >
          <Search className="w-4 h-4" />
          Check Real-Time Status
        </button>

        {errorMsg && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>

      {/* Order Details Display */}
      {searchedOrder && (
        <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 md:p-6 shadow-md space-y-6 animate-fadeIn">
          {/* Order Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DACB] pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7569]">
                Verified Order
              </span>
              <h3 className="text-xl font-extrabold text-[#42281D] font-mono">
                #{searchedOrder.orderNumber}
              </h3>
              <p className="text-xs text-[#6B5A50] mt-0.5">
                Placed on {searchedOrder.createdAt} for <strong>{searchedOrder.customerName}</strong>
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  searchedOrder.status === 'ready_for_pickup'
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : searchedOrder.status === 'price_quoted'
                    ? 'bg-amber-100 text-amber-800'
                    : searchedOrder.status === 'confirmed' || searchedOrder.status === 'preparing'
                    ? 'bg-blue-100 text-blue-800'
                    : searchedOrder.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {searchedOrder.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* CUSTOM QUOTATION REVIEW SECTION (If order is price_quoted) */}
          {searchedOrder.status === 'price_quoted' && (
            <div className="bg-[#FFF8E7] border-2 border-amber-300 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#42281D]">Custom Cake Quotation Ready for Review</h4>
                  <p className="text-xs text-[#6B5A50] mt-0.5">
                    Our master pastry chef has evaluated your custom design and submitted a tailored price quote:
                  </p>
                  <p className="text-2xl font-extrabold text-[#42281D] font-mono mt-2">
                    ₹{searchedOrder.quotedPrice?.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-[#8A7569]">
                      (for {searchedOrder.size} {searchedOrder.cakeName})
                    </span>
                  </p>
                </div>
              </div>

              {searchedOrder.quotationStatus === 'quoted' && (
                <div className="pt-2 flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      respondToQuotation(searchedOrder.id, true);
                      setSearchedOrder({
                        ...searchedOrder,
                        status: 'confirmed',
                        quotationStatus: 'accepted',
                      });
                    }}
                    className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Accept Quote & Confirm Order
                  </button>
                  <button
                    onClick={() => {
                      respondToQuotation(searchedOrder.id, false);
                      setSearchedOrder({
                        ...searchedOrder,
                        status: 'cancelled',
                        quotationStatus: 'rejected',
                      });
                    }}
                    className="flex-1 min-w-[140px] bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <X className="w-4 h-4" />
                    Decline Quote
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Ready for Pickup Celebration Alert */}
          {searchedOrder.status === 'ready_for_pickup' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-emerald-900">Cake Ready for Pickup!</h4>
                <p className="text-xs text-emerald-700">
                  Your cake is freshly baked, decorated, and chilled at the counter. Show the QR code below to collect!
                </p>
              </div>
            </div>
          )}

          {/* Pickup QR Code Card */}
          <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="p-3 bg-white rounded-xl border border-[#D9C8B8] shadow-sm shrink-0">
              <QRCodeSVG value={searchedOrder.pickupQrToken} size={130} level="H" fgColor="#42281D" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#E06D80] bg-[#FDE8E9] px-2 py-0.5 rounded">
                Counter Pickup Pass
              </span>
              <h4 className="text-sm font-bold text-[#42281D] mt-1">Show at Bakery Counter</h4>
              <p className="text-xs text-[#6B5A50] mt-1">
                Branch: <strong>{currentShop?.name}</strong>
              </p>
              <p className="text-[11px] text-[#8A7569] font-mono mt-1">Token: {searchedOrder.pickupQrToken}</p>
            </div>
          </div>

          {/* Order Snapshot Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-[#E8DACB]">
              <p className="font-bold text-[#42281D] uppercase tracking-wider text-[11px]">Cake Details</p>
              <p className="text-[#6B5A50]">
                <strong>Item:</strong> {searchedOrder.cakeName}
              </p>
              <p className="text-[#6B5A50]">
                <strong>Size & Flavour:</strong> {searchedOrder.size} • {searchedOrder.flavour}
              </p>
              {searchedOrder.customMessage && (
                <p className="text-[#6B5A50]">
                  <strong>Message on Cake:</strong> "{searchedOrder.customMessage}"
                </p>
              )}
              {searchedOrder.specialInstructions && (
                <p className="text-[#6B5A50]">
                  <strong>Notes:</strong> {searchedOrder.specialInstructions}
                </p>
              )}
            </div>

            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-[#E8DACB]">
              <p className="font-bold text-[#42281D] uppercase tracking-wider text-[11px]">Fulfillment & Schedule</p>
              <p className="text-[#6B5A50] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#C88141]" />
                <strong>Date:</strong> {searchedOrder.requiredDate}
              </p>
              <p className="text-[#6B5A50] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C88141]" />
                <strong>Time:</strong> {searchedOrder.requiredTime}
              </p>
              <p className="text-[#6B5A50] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#E06D80]" />
                <strong>Pickup Shop:</strong> {currentShop?.code} – {currentShop?.address}
              </p>
              <div className="pt-1.5 border-t border-[#E8DACB] flex justify-between font-bold text-[#42281D]">
                <span>Total: ₹{searchedOrder.totalAmount}</span>
                <span className="text-emerald-700">Bal on Pickup: ₹{searchedOrder.balanceAmount}</span>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="pt-2 border-t border-[#E8DACB]">
            <h4 className="text-xs font-bold text-[#42281D] uppercase tracking-wider mb-3">Order Progress Log</h4>
            <div className="space-y-3">
              {searchedOrder.statusHistory.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E06D80] mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#42281D] uppercase tracking-wide text-[11px]">
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[#8A7569]">{item.timestamp}</span>
                    </div>
                    <p className="text-[#6B5A50] mt-0.5">{item.notes}</p>
                    <p className="text-[10px] text-[#A39284]">Updated by {item.updatedBy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
