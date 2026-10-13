import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  LogOut,
  Bell,
  ArrowRight,
  ExternalLink,
  QrCode,
  DollarSign,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useBakery } from '../context/BakeryContext';
import type { Order } from '../types';

interface CustomerAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderCake: () => void;
  onOpenCustomDesign: () => void;
}

export const CustomerAccountDrawer: React.FC<CustomerAccountDrawerProps> = ({
  isOpen,
  onClose,
  onOpenOrderCake,
  onOpenCustomDesign,
}) => {
  const {
    currentCustomer,
    customerLogout,
    orders,
    customerNotifications,
    respondToCustomerQuote,
    markCustomerNotificationRead,
    activeShop,
    recordPayment,
  } = useBakery();

  const [activeTab, setActiveTab] = useState<'orders' | 'quotes' | 'notifications'>('orders');
  const [selectedOrderForUPI, setSelectedOrderForUPI] = useState<Order | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingUTR, setIsSubmittingUTR] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);

  if (!isOpen || !currentCustomer) return null;

  // Filter orders belonging to this customer
  const customerOrders = orders.filter((o) => {
    const oPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
    return oPhone === currentCustomer.phone;
  });

  const customQuoteOrders = customerOrders.filter((o) => o.isCustomDesign || o.status === 'price_quoted');
  const unreadNotifs = customerNotifications.filter((n) => n.status !== 'read');

  const handleAcceptQuote = async (orderId: string) => {
    await respondToCustomerQuote(orderId, true);
    // Find order to prompt payment
    const ord = customerOrders.find((o) => o.id === orderId);
    if (ord) setSelectedOrderForUPI(ord);
  };

  const handleDeclineQuote = async (orderId: string) => {
    await respondToCustomerQuote(orderId, false);
  };

  const handleConfirmUPIPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForUPI) return;
    if (!utrInput.trim() || utrInput.trim().length < 6) {
      setPaymentMsg('Please enter a valid 12-digit UPI Reference / UTR Number.');
      return;
    }

    try {
      setIsSubmittingUTR(true);
      const payAmount = selectedOrderForUPI.advancePaid === 0
        ? (selectedOrderForUPI.advanceRequired || Math.round(selectedOrderForUPI.totalAmount * 0.5))
        : selectedOrderForUPI.balanceAmount;

      await recordPayment(
        selectedOrderForUPI.id,
        payAmount,
        'upi_phonepe',
        utrInput.trim()
      );

      setPaymentMsg('Payment submitted successfully! Our staff will verify bank credit and update your balance.');
      setUtrInput('');
      setTimeout(() => {
        setSelectedOrderForUPI(null);
        setPaymentMsg(null);
      }, 3000);
    } catch {
      setPaymentMsg('Failed to submit payment reference. Please try again.');
    } finally {
      setIsSubmittingUTR(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-[#FFFDF9] w-full max-w-md h-full shadow-2xl flex flex-col border-l border-[#E8DACB] animate-slideLeft">
        {/* Top Header */}
        <div className="bg-[#42281D] text-white p-4 md:p-5 flex items-center justify-between border-b border-[#5C3826]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF4ED] text-[#42281D] font-bold flex items-center justify-center font-serif text-lg shadow-sm">
              {currentCustomer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight text-white">{currentCustomer.name}</h3>
              <p className="text-xs text-[#D4A373] font-mono">+91 {currentCustomer.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                customerLogout();
                onClose();
              }}
              title="Log out"
              className="text-[#FAF4ED]/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-[#FAF4ED]/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8DACB] bg-[#FAF4ED]/60 text-xs font-bold text-[#5C3826]">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-[#42281D] text-[#42281D] bg-[#FFFDF9]'
                : 'border-transparent text-[#8A7569] hover:text-[#42281D]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>My Orders ({customerOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'quotes'
                ? 'border-[#42281D] text-[#42281D] bg-[#FFFDF9]'
                : 'border-transparent text-[#8A7569] hover:text-[#42281D]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E06D80]" />
            <span>Quotes ({customQuoteOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-[#42281D] text-[#42281D] bg-[#FFFDF9]'
                : 'border-transparent text-[#8A7569] hover:text-[#42281D]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-[#C88141]" />
            <span>Alerts</span>
            {unreadNotifs.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#E06D80] animate-pulse" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {customerOrders.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-[#FAF4ED] rounded-full flex items-center justify-center mx-auto mb-3 text-[#C88141]">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#42281D]">No orders yet</h4>
                  <p className="text-xs text-[#6B5A50] mt-1 mb-4">
                    Explore our cake catalog or order custom celebration cakes.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOrderCake();
                    }}
                    className="bg-[#42281D] text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Browse Cakes
                  </button>
                </div>
              ) : (
                customerOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white border border-[#E8DACB] rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-[#42281D] bg-[#FAF4ED] px-2 py-0.5 rounded border border-[#E8DACB]">
                        {ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          ord.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'ready_for_pickup'
                            ? 'bg-blue-100 text-blue-800'
                            : ord.status === 'preparing'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#42281D]">{ord.cakeName}</h4>
                      <p className="text-xs text-[#6B5A50]">
                        {ord.size} • {ord.flavour}
                        {ord.eggOrEggless === 'eggless' ? ' • 🌱 Eggless' : ''}
                      </p>
                      {ord.nameOnCake && (
                        <p className="text-xs text-[#C88141] font-semibold mt-0.5">
                          Cake Plaque: "{ord.nameOnCake}"
                        </p>
                      )}
                    </div>

                    {/* Financial Ledger Snapshot */}
                    <div className="bg-[#FAF4ED] p-2.5 rounded-xl border border-[#E8DACB] text-xs grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-[#8A7569] uppercase">Total</p>
                        <p className="font-extrabold text-[#42281D] font-mono">₹{ord.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#8A7569] uppercase">Verified Paid</p>
                        <p className="font-extrabold text-emerald-700 font-mono">₹{ord.advancePaid}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#8A7569] uppercase">Balance</p>
                        <p className="font-extrabold text-[#E06D80] font-mono">₹{ord.balanceAmount}</p>
                      </div>
                    </div>

                    {/* Actions & UPI Payment */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] text-[#8A7569] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#C88141]" />
                        {ord.requiredDate} ({ord.requiredTime})
                      </span>

                      {ord.balanceAmount > 0 && ord.status !== 'cancelled' && (
                        <button
                          onClick={() => setSelectedOrderForUPI(ord)}
                          className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <DollarSign className="w-3 h-3 text-[#D4A373]" />
                          Pay Balance
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* QUOTES TAB */}
          {activeTab === 'quotes' && (
            <div className="space-y-3">
              {customQuoteOrders.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-[#FAF4ED] rounded-full flex items-center justify-center mx-auto mb-3 text-[#E06D80]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#42281D]">No custom quotes yet</h4>
                  <p className="text-xs text-[#6B5A50] mt-1 mb-4">
                    Have an Instagram design or celebration theme? Upload your reference photo!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenCustomDesign();
                    }}
                    className="bg-[#42281D] text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Upload Custom Design
                  </button>
                </div>
              ) : (
                customQuoteOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white border border-[#E8DACB] rounded-2xl p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#42281D]">
                        #{ord.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.quotationStatus === 'quoted'
                            ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                            : ord.quotationStatus === 'accepted'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {ord.quotationStatus || 'Under Review'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-[#42281D]">{ord.cakeName}</h4>
                      <p className="text-xs text-[#6B5A50]">{ord.size} • {ord.flavour}</p>
                      {ord.specialInstructions && (
                        <p className="text-xs text-[#8A7569] mt-1 bg-[#FAF4ED] p-2 rounded-lg italic">
                          "{ord.specialInstructions}"
                        </p>
                      )}
                    </div>

                    {ord.quotationStatus === 'quoted' && ord.quotedPrice ? (
                      <div className="bg-[#FAF4ED] border border-[#D4A373] p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#42281D]">Quoted Total Price:</span>
                          <span className="font-mono font-extrabold text-base text-[#42281D]">
                            ₹{ord.quotedPrice}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#6B5A50]">
                          <span>Advance Required to Confirm:</span>
                          <span className="font-mono font-bold text-[#E06D80]">
                            ₹{ord.advanceRequired || Math.round(ord.quotedPrice * 0.5)}
                          </span>
                        </div>
                        {ord.quoteExpiryDate && (
                          <p className="text-[10px] text-[#8A7569]">Valid until: {ord.quoteExpiryDate}</p>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleAcceptQuote(ord.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Accept & Pay Adv
                          </button>
                          <button
                            onClick={() => handleDeclineQuote(ord.id)}
                            className="bg-white border border-[#D9C8B8] text-[#6B5A50] hover:bg-red-50 hover:text-red-700 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        ⏳ Our master pastry chef is calculating ingredient costs and crafting your quote.
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {customerNotifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-12 h-12 bg-[#FAF4ED] rounded-full flex items-center justify-center mx-auto mb-3 text-[#C88141]">
                    <Bell className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#42281D]">No notifications</h4>
                  <p className="text-xs text-[#6B5A50] mt-1">
                    You will receive in-app alerts here for quotations and order updates.
                  </p>
                </div>
              ) : (
                customerNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markCustomerNotificationRead(notif.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      notif.status === 'read'
                        ? 'bg-white border-[#E8DACB]'
                        : 'bg-[#FAF4ED] border-[#D4A373] shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#42281D]">{notif.title}</span>
                      <span className="text-[10px] text-[#8A7569] font-mono">
                        {notif.orderNumber}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B5A50]">{notif.message}</p>
                    {notif.quotedPrice && notif.status === 'pending' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAcceptQuote(notif.orderId);
                          }}
                          className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                        >
                          Accept Quote
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeclineQuote(notif.orderId);
                          }}
                          className="bg-white border border-gray-300 text-gray-700 font-bold text-[10px] px-2.5 py-1 rounded"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* BOTTOM QUICK ACTION */}
        <div className="p-4 border-t border-[#E8DACB] bg-[#FAF4ED]">
          <button
            onClick={() => {
              onClose();
              onOpenCustomDesign();
            }}
            className="w-full bg-white hover:bg-[#FAF4ED] border-2 border-[#D4A373] text-[#42281D] text-xs font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E06D80]" />
            <span>Request a Custom Designer Cake</span>
          </button>
        </div>

        {/* UPI PAYMENT MODAL MODAL */}
        {selectedOrderForUPI && (
          <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFFDF9] rounded-3xl max-w-sm w-full p-5 border border-[#E8DACB] shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm font-serif text-[#42281D]">
                  UPI / PhonePe Payment
                </h4>
                <button
                  onClick={() => setSelectedOrderForUPI(null)}
                  className="text-gray-400 hover:text-[#42281D]"
                >
                  ✕
                </button>
              </div>

              {paymentMsg ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  {paymentMsg}
                </div>
              ) : (
                <form onSubmit={handleConfirmUPIPayment} className="space-y-3">
                  <div className="bg-[#FAF4ED] p-3 rounded-xl border border-[#E8DACB] text-xs space-y-1">
                    <p className="text-[#8A7569]">Order Number: <strong className="text-[#42281D]">{selectedOrderForUPI.orderNumber}</strong></p>
                    <p className="text-[#8A7569]">Payable Amount: <strong className="text-[#E06D80] text-sm font-mono">₹{selectedOrderForUPI.advancePaid === 0 ? (selectedOrderForUPI.advanceRequired || Math.round(selectedOrderForUPI.totalAmount * 0.5)) : selectedOrderForUPI.balanceAmount}</strong></p>
                    <p className="text-[10px] text-[#8A7569]">Payee: {activeShop.upiMerchantName || 'Vinutha Bakery'} ({activeShop.upiId || 'vinuthabakery@okaxis'})</p>
                  </div>

                  {/* QR Code */}
                  <div className="text-center p-3 bg-white rounded-2xl border border-[#E8DACB]">
                    <p className="text-[11px] font-bold text-[#42281D] mb-2">Scan with PhonePe, GPay, or Paytm</p>
                    <div className="inline-block p-2 bg-[#FAF4ED] rounded-xl border border-[#E0D3C5]">
                      <QRCodeSVG
                        value={`upi://pay?pa=${activeShop.upiId || 'vinuthabakery@okaxis'}&pn=${encodeURIComponent(activeShop.upiMerchantName || 'Vinutha Bakery')}&am=${selectedOrderForUPI.advancePaid === 0 ? (selectedOrderForUPI.advanceRequired || Math.round(selectedOrderForUPI.totalAmount * 0.5)) : selectedOrderForUPI.balanceAmount}&tn=${selectedOrderForUPI.orderNumber}&cu=INR`}
                        size={140}
                        level="M"
                        fgColor="#42281D"
                      />
                    </div>
                  </div>

                  {/* Deep Intent Link for mobile phones */}
                  <a
                    href={`upi://pay?pa=${activeShop.upiId || 'vinuthabakery@okaxis'}&pn=${encodeURIComponent(activeShop.upiMerchantName || 'Vinutha Bakery')}&am=${selectedOrderForUPI.advancePaid === 0 ? (selectedOrderForUPI.advanceRequired || Math.round(selectedOrderForUPI.totalAmount * 0.5)) : selectedOrderForUPI.balanceAmount}&tn=${selectedOrderForUPI.orderNumber}&cu=INR`}
                    className="w-full bg-[#5F259F] hover:bg-[#4E1E82] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Open PhonePe / UPI App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* UTR Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-[#42281D] mb-1">
                      Enter UPI Reference / UTR Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 428901234567"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#8A7569] mt-0.5">Found in your PhonePe / GPay payment receipt</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingUTR}
                    className="w-full bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmittingUTR ? 'Submitting...' : 'Submit for Shop Verification'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
