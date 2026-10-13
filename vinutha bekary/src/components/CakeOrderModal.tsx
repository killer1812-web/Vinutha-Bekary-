import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  Truck,
  Plus,
  Trash2,
  ExternalLink,
  QrCode,
  DollarSign,
  Heart,
  PartyPopper,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { useBakery } from '../context/BakeryContext';
import type { CakeItem, Order, OrderItem } from '../types';
import { AudioRecorder } from './AudioRecorder';
import { api } from '../services/api';

interface CakeOrderModalProps {
  cake: CakeItem | null;
  isOpen: boolean;
  onClose: () => void;
  tableNumber?: string | null;
}

export const CakeOrderModal: React.FC<CakeOrderModalProps> = ({ cake, isOpen, onClose, tableNumber }) => {
  const {
    activeShop,
    createOrder,
    currentCustomer,
    customerLogin,
    cakes,
    recordPayment,
  } = useBakery();

  // Primary Cake Customization
  const [selectedSize, setSelectedSize] = useState<string>('1.0 kg');
  const [selectedFlavour, setSelectedFlavour] = useState<string>('Standard');
  const [quantity, setQuantity] = useState<number>(1);

  // Occasion Details (Requirement 7)
  const [occasion, setOccasion] = useState<'Birthday' | 'Anniversary' | 'Celebration' | 'Other'>('Birthday');
  const [birthdayPersonName, setBirthdayPersonName] = useState('');
  const [nameOnCake, setNameOnCake] = useState('');
  const [messageOnCake, setMessageOnCake] = useState('');

  // Customer Details
  const [customerName, setCustomerName] = useState(() => currentCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(() => currentCustomer?.phone || '');

  // Delivery & Schedule
  const [requiredDate, setRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [requiredTime, setRequiredTime] = useState('5:00 PM');
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [referencePhoto, setReferencePhoto] = useState<string | undefined>(undefined);

  // Multi-Item Cart Support ("Add Another Item" - Requirement 10)
  const [additionalItems, setAdditionalItems] = useState<OrderItem[]>([]);
  const [isAddingAnotherItem, setIsAddingAnotherItem] = useState(false);
  const [selectedExtraCakeId, setSelectedExtraCakeId] = useState<string>('');
  const [extraSize, setExtraSize] = useState('1.0 kg');
  const [extraQuantity, setExtraQuantity] = useState(1);

  // UTR / Payment Reference Entry
  const [advanceUTR, setAdvanceUTR] = useState('');
  const [isSubmittingUTR, setIsSubmittingUTR] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);

  // Flow State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (cake) {
      setSelectedSize(cake.sizes[0]?.size || '1.0 kg');
      setSelectedFlavour(cake.flavours[0] || 'Standard');
      setQuantity(1);
    }
  }, [cake]);

  useEffect(() => {
    if (currentCustomer) {
      if (!customerName) setCustomerName(currentCustomer.name);
      if (!customerPhone) setCustomerPhone(currentCustomer.phone);
    }
  }, [currentCustomer]);

  if (!isOpen || !cake) return null;

  // Primary item price calculation
  const currentSizeObj = cake.sizes.find((s) => s.size === selectedSize) || cake.sizes[0];
  const primaryUnitPrice = currentSizeObj ? currentSizeObj.price : cake.basePrice;
  const primaryTotalPrice = primaryUnitPrice * quantity;

  // Additional items total
  const additionalTotal = additionalItems.reduce((sum, item) => sum + item.totalPrice, 0);

  // Total order amount
  const grandTotal = primaryTotalPrice + additionalTotal;
  const advancePercentage = activeShop.advancePercentage || 50;
  const advanceRequired = Math.round(grandTotal * (advancePercentage / 100));
  const balanceRemaining = grandTotal - advanceRequired;

  const handleAddExtraItem = () => {
    const extraCake = cakes.find((c) => c.id === selectedExtraCakeId) || cakes[0];
    if (!extraCake) return;
    const szObj = extraCake.sizes.find((s) => s.size === extraSize) || extraCake.sizes[0];
    const uPrice = szObj ? szObj.price : extraCake.basePrice;

    const newItem: OrderItem = {
      id: `item-${Date.now()}`,
      cakeId: extraCake.id,
      cakeName: extraCake.name,
      size: extraSize,
      eggOrEggless: extraCake.eggOrEggless,
      quantity: extraQuantity,
      unitPrice: uPrice,
      totalPrice: uPrice * extraQuantity,
    };

    setAdditionalItems([...additionalItems, newItem]);
    setIsAddingAnotherItem(false);
    setSelectedExtraCakeId('');
    setExtraQuantity(1);
  };

  const handleRemoveExtraItem = (itemId: string) => {
    setAdditionalItems(additionalItems.filter((it) => it.id !== itemId));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('Image size should be under 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePhoto(reader.result as string);
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!cake.isAvailable) {
      setErrorMsg('Sorry, this cake is currently unavailable or out of stock.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      setErrorMsg('Please provide a delivery address.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Auto customer session creation / update
      if (!currentCustomer) {
        await customerLogin(customerName.trim(), cleanPhone).catch(() => {});
      }

      // Upload reference photo to backend if base64
      let finalPhotoUrl = referencePhoto;
      if (referencePhoto && referencePhoto.startsWith('data:image')) {
        try {
          finalPhotoUrl = await api.uploadBase64(referencePhoto, 'image');
        } catch (e) {
          console.warn('Upload fallback to data url', e);
        }
      }

      // Upload recorded audio note to backend if base64
      let finalAudioUrl = audioUrl;
      if (audioUrl && audioUrl.startsWith('data:audio')) {
        try {
          finalAudioUrl = await api.uploadBase64(audioUrl, 'audio');
        } catch (e) {
          console.warn('Audio upload fallback to data url', e);
        }
      }

      // Build items array
      const allOrderItems: OrderItem[] = [
        {
          id: `item-primary-${Date.now()}`,
          cakeId: cake.id,
          cakeName: cake.name,
          size: selectedSize,
          flavour: selectedFlavour,
          eggOrEggless: cake.eggOrEggless,
          quantity,
          unitPrice: primaryUnitPrice,
          totalPrice: primaryTotalPrice,
        },
        ...additionalItems,
      ];

      const newOrder = await createOrder({
        shopId: 'shop-1',
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        cakeId: cake.id,
        cakeName: cake.name,
        categorySlug: cake.categorySlug,
        size: selectedSize,
        flavour: selectedFlavour,
        eggOrEggless: cake.eggOrEggless,
        quantity,
        unitPrice: primaryUnitPrice,
        items: allOrderItems,
        totalAmount: grandTotal,
        advanceRequired,
        advancePaid: 0,
        balanceAmount: grandTotal,
        requiredDate,
        requiredTime,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : undefined,
        occasion,
        birthdayPersonName: occasion === 'Birthday' ? birthdayPersonName.trim() : undefined,
        nameOnCake: nameOnCake.trim() || undefined,
        messageOnCake: messageOnCake.trim() || undefined,
        customMessage: messageOnCake.trim() || nameOnCake.trim() || undefined,
        specialInstructions: [
          tableNumber ? `Dine-in Order (Table: ${tableNumber})` : null,
          specialInstructions.trim() || null,
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
        referencePhotoUrl: finalPhotoUrl,
        audioNoteUrl: finalAudioUrl,
        isCustomDesign: false,
      });

      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E06D80', '#D4A373', '#42281D', '#5F259F'],
      });

      setPlacedOrder(newOrder);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUTRSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placedOrder) return;
    if (!advanceUTR.trim() || advanceUTR.trim().length < 6) {
      setErrorMsg('Please enter a valid 12-digit UPI UTR number.');
      return;
    }

    try {
      setIsSubmittingUTR(true);
      await recordPayment(
        placedOrder.id,
        placedOrder.advanceRequired || advanceRequired,
        'upi_phonepe',
        advanceUTR.trim()
      );
      setUtrSuccessMsg('UTR reference submitted! Our cashier will verify payment and confirm your order.');
      setAdvanceUTR('');
    } catch {
      setErrorMsg('Failed to record payment reference.');
    } finally {
      setIsSubmittingUTR(false);
    }
  };

  const upiPayLink = placedOrder
    ? `upi://pay?pa=${activeShop.upiId || 'vinuthabakery@okaxis'}&pn=${encodeURIComponent(activeShop.upiMerchantName || 'Vinutha Bakery')}&am=${placedOrder.advanceRequired || advanceRequired}&tn=${placedOrder.orderNumber}&cu=INR`
    : `upi://pay?pa=${activeShop.upiId || 'vinuthabakery@okaxis'}&pn=${encodeURIComponent(activeShop.upiMerchantName || 'Vinutha Bakery')}&am=${advanceRequired}&tn=CAKE-ADV&cu=INR`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E8DACB] my-auto">
        {/* Header */}
        <div className="bg-[#42281D] text-white p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#E06D80]" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold font-serif leading-tight">
                  {placedOrder ? 'Order Confirmed!' : `Customise & Order: ${cake.name}`}
                </h2>
                {tableNumber && (
                  <span className="bg-[#FAF4ED] text-[#42281D] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                    📍 Table {tableNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#D4A373]">
                {placedOrder ? 'Proceed with UPI Advance Payment' : `${activeShop.name} • Baked Fresh to Order`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ORDER SUCCESS & UPI PAYMENT VIEW */}
        {placedOrder ? (
          <div className="p-6 md:p-8 space-y-5 max-h-[80vh] overflow-y-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FDE8E9] rounded-full flex items-center justify-center mx-auto text-[#E06D80] animate-bounce mb-2">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold font-serif text-[#42281D]">
                Thank You, {placedOrder.customerName}!
              </h3>
              <p className="text-xs text-[#6B5A50] mt-1">
                Your order is saved in the bakery system. Show counter QR or pay advance below.
              </p>
            </div>

            {/* Order Reference Box */}
            <div className="bg-[#FAF4ED] border-2 border-dashed border-[#D4A373] rounded-2xl p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-[#8A7569] font-bold">Unique Order Number</p>
              <p className="text-2xl font-extrabold text-[#42281D] font-mono tracking-wider my-0.5">
                {placedOrder.orderNumber}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="bg-amber-100 text-amber-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                  Status: {placedOrder.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="bg-emerald-100 text-emerald-900 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                  Total: ₹{placedOrder.totalAmount}
                </span>
              </div>
            </div>

            {/* UPI Payment Box (Requirement 11 & 12) */}
            <div className="bg-white border-2 border-[#5F259F]/30 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8DACB] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#5F259F] text-white flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#42281D]">UPI Advance Payment</h4>
                    <p className="text-[11px] text-[#8A7569]">Payee: {activeShop.upiMerchantName || 'Vinutha Bakery'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-[#8A7569]">Advance Required</p>
                  <p className="text-lg font-mono font-extrabold text-[#5F259F]">
                    ₹{placedOrder.advanceRequired || advanceRequired}
                  </p>
                </div>
              </div>

              {/* Dynamic QR and Intent Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="text-center p-3 bg-[#FAF4ED] rounded-xl border border-[#E8DACB]">
                  <QRCodeSVG value={upiPayLink} size={130} level="M" fgColor="#42281D" className="mx-auto" />
                  <p className="text-[10px] text-[#8A7569] font-mono mt-1.5">Scan with PhonePe, GPay, Paytm</p>
                </div>

                <div className="space-y-2.5 text-center sm:text-left">
                  <p className="text-xs text-[#6B5A50] leading-relaxed">
                    Opening from your phone? Tap below to open PhonePe or any installed UPI application:
                  </p>
                  <a
                    href={upiPayLink}
                    className="w-full bg-[#5F259F] hover:bg-[#4E1E82] text-white text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>Pay ₹{placedOrder.advanceRequired || advanceRequired} with PhonePe / UPI</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <p className="text-[10px] text-[#8A7569]">
                    Remaining Balance: ₹{placedOrder.balanceAmount} due on pickup.
                  </p>
                </div>
              </div>

              {/* UTR Verification Form */}
              <form onSubmit={handleUTRSubmission} className="pt-2 border-t border-[#E8DACB] space-y-2">
                <label className="block text-xs font-bold text-[#42281D]">
                  Enter 12-Digit UPI Reference (UTR) Number after paying:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 428901234567"
                    value={advanceUTR}
                    onChange={(e) => setAdvanceUTR(e.target.value)}
                    className="flex-1 bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono text-[#2C1A11] focus:ring-2 focus:ring-[#5F259F] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingUTR}
                    className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingUTR ? 'Submitting...' : 'Confirm'}
                  </button>
                </div>
                {utrSuccessMsg && (
                  <p className="text-xs text-emerald-700 font-semibold">{utrSuccessMsg}</p>
                )}
                <p className="text-[10px] text-[#8A7569]">
                  ⚠️ Payments remain pending verification until verified by bakery cashier or bank ledger.
                </p>
              </form>
            </div>

            {/* Counter Pickup Token Card */}
            <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-2xl p-4 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl border border-[#E0D3C5] shrink-0">
                <QRCodeSVG value={placedOrder.pickupQrToken} size={80} level="M" fgColor="#42281D" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-[#42281D]">Counter Pickup Token</p>
                <p className="font-mono text-[#8A7569] text-[11px]">{placedOrder.pickupQrToken}</p>
                <p className="text-[11px] text-[#6B5A50]">
                  Pickup on <strong className="text-[#42281D]">{placedOrder.requiredDate}</strong> at{' '}
                  <strong className="text-[#42281D]">{placedOrder.requiredTime}</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
              >
                Done / Back to Bakery
              </button>
            </div>
          </div>
        ) : (
          /* ORDER CUSTOMIZATION & CHECKOUT FORM */
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {/* Cake Snapshot */}
            <div className="flex items-center gap-4 bg-[#FAF4ED] p-3.5 rounded-2xl border border-[#E8DACB]">
              <img
                src={cake.images[0] || '/images/hero_cake.jpg'}
                alt={cake.name}
                className="w-20 h-20 rounded-xl object-cover border border-[#D9C8B8] shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E06D80] bg-[#FDE8E9] px-2 py-0.5 rounded">
                    {cake.categorySlug.replace('-', ' ')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    cake.eggOrEggless === 'eggless' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cake.eggOrEggless === 'eggless' ? '🌱 100% Eggless' : 'Contains Egg'}
                  </span>
                </div>
                <h4 className="font-bold text-[#42281D] text-sm md:text-base truncate mt-1">{cake.name}</h4>
                <p className="text-xs text-[#6B5A50]">Preparation Time: <strong>{cake.prepTime || '2-3 hours'}</strong></p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Size & Pricing Selector */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-2">
                1. Select Cake Size & Weight
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {cake.sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    onClick={() => setSelectedSize(s.size)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedSize === s.size
                        ? 'border-[#E06D80] bg-[#FFF5F5] ring-2 ring-[#E06D80]/20'
                        : 'border-[#E2D5C8] bg-white hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <p className="text-xs font-bold text-[#42281D]">{s.size}</p>
                    <p className="text-xs text-[#C88141] font-semibold font-mono">₹{s.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Flavour Options & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-2">
                  2. Choose Flavour
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {cake.flavours.map((flv) => (
                    <button
                      key={flv}
                      type="button"
                      onClick={() => setSelectedFlavour(flv)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                        selectedFlavour === flv
                          ? 'bg-[#42281D] text-white border-[#42281D]'
                          : 'bg-white text-[#5C3826] border-[#D9C8B8] hover:bg-[#FAF4ED]'
                      }`}
                    >
                      {flv}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-xl border border-[#D9C8B8] bg-white text-base font-bold text-[#42281D] hover:bg-[#FAF4ED] cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-base font-bold text-[#42281D] font-mono w-8 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 rounded-xl border border-[#D9C8B8] bg-white text-base font-bold text-[#42281D] hover:bg-[#FAF4ED] cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Occasion & Personalization (Requirement 7) */}
            <div className="bg-[#FAF4ED]/70 p-4 rounded-2xl border border-[#E8DACB] space-y-3">
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider">
                3. Occasion & Personalization Details
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Birthday', 'Anniversary', 'Celebration', 'Other'] as const).map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasion(occ)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      occasion === occ
                        ? 'bg-[#42281D] text-white border-[#42281D]'
                        : 'bg-white text-[#5C3826] border-[#D9C8B8] hover:bg-[#FAF4ED]'
                    }`}
                  >
                    {occ === 'Birthday' && <PartyPopper className="w-3.5 h-3.5 text-[#D4A373]" />}
                    {occ === 'Anniversary' && <Heart className="w-3.5 h-3.5 text-[#E06D80]" />}
                    <span>{occ}</span>
                  </button>
                ))}
              </div>

              {occasion === 'Birthday' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] mb-1">
                    Birthday Person's Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul, Aadhya (Age: 5)"
                    value={birthdayPersonName}
                    onChange={(e) => setBirthdayPersonName(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] mb-1">
                    Name to write on Cake Plaque
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sneha"
                    value={nameOnCake}
                    onChange={(e) => setNameOnCake(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] mb-1">
                    Message to pipe on Cake
                  </label>
                  <input
                    type="text"
                    placeholder='e.g. "Happy 25th Birthday!"'
                    value={messageOnCake}
                    onChange={(e) => setMessageOnCake(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. Multi-Item Cart Support ("Add Another Item" - Requirement 10) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#42281D] uppercase tracking-wider">
                  4. Extra Items in this Order
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingAnotherItem(!isAddingAnotherItem)}
                  className="text-xs font-bold text-[#E06D80] hover:text-[#B83C50] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item</span>
                </button>
              </div>

              {/* List of already added extra items */}
              {additionalItems.length > 0 && (
                <div className="space-y-2">
                  {additionalItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-[#E8DACB] p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#42281D]">{item.cakeName}</p>
                        <p className="text-[11px] text-[#6B5A50]">{item.size} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-[#42281D]">₹{item.totalPrice}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline form to add another cake */}
              {isAddingAnotherItem && (
                <div className="bg-[#FAF4ED] p-3 rounded-2xl border border-[#D4A373] space-y-2.5">
                  <p className="text-xs font-bold text-[#42281D]">Select Additional Cake:</p>
                  <select
                    value={selectedExtraCakeId}
                    onChange={(e) => setSelectedExtraCakeId(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-medium text-[#2C1A11]"
                  >
                    <option value="">-- Choose a Cake --</option>
                    {cakes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Starts ₹{c.basePrice})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#8A7569]">Size:</label>
                      <select
                        value={extraSize}
                        onChange={(e) => setExtraSize(e.target.value)}
                        className="w-full bg-white border border-[#D9C8B8] rounded-xl px-2 py-1.5 text-xs"
                      >
                        <option value="0.5 kg">0.5 kg</option>
                        <option value="1.0 kg">1.0 kg</option>
                        <option value="1.5 kg">1.5 kg</option>
                        <option value="2.0 kg">2.0 kg</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#8A7569]">Qty:</label>
                      <input
                        type="number"
                        min={1}
                        value={extraQuantity}
                        onChange={(e) => setExtraQuantity(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-white border border-[#D9C8B8] rounded-xl px-2 py-1.5 text-xs text-center"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingAnotherItem(false)}
                      className="text-xs text-gray-500 px-3 py-1.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddExtraItem}
                      disabled={!selectedExtraCakeId}
                      className="bg-[#42281D] text-white text-xs font-bold px-4 py-1.5 rounded-xl disabled:opacity-50"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Customer Details (Auto Login) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Reddy"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Mobile Number (10 Digits) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Date, Time & Fulfillment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C88141]" />
                  Required Date *
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#C88141]" />
                  Required Time *
                </label>
                <select
                  value={requiredTime}
                  onChange={(e) => setRequiredTime(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                >
                  <option value="11:00 AM">Morning (11:00 AM)</option>
                  <option value="1:00 PM">Afternoon (1:00 PM)</option>
                  <option value="4:00 PM">Evening (4:00 PM)</option>
                  <option value="5:30 PM">Evening (5:30 PM)</option>
                  <option value="7:00 PM">Night (7:00 PM)</option>
                  <option value="8:30 PM">Night (8:30 PM)</option>
                </select>
              </div>
            </div>

            {/* Pickup or Delivery */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-2">
                Fulfillment Preference
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentType('pickup')}
                  className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    fulfillmentType === 'pickup'
                      ? 'border-[#42281D] bg-[#FAF4ED] font-bold text-[#42281D]'
                      : 'border-[#D9C8B8] bg-white text-[#6B5A50]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#E06D80]" />
                  <span className="text-xs">Counter Pickup</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentType('delivery')}
                  className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    fulfillmentType === 'delivery'
                      ? 'border-[#42281D] bg-[#FAF4ED] font-bold text-[#42281D]'
                      : 'border-[#D9C8B8] bg-white text-[#6B5A50]'
                  }`}
                >
                  <Truck className="w-4 h-4 text-[#C88141]" />
                  <span className="text-xs">Home Delivery</span>
                </button>
              </div>

              {fulfillmentType === 'delivery' && (
                <div className="mt-3">
                  <input
                    type="text"
                    required
                    placeholder="Enter complete delivery street address & landmark"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Voice & Reference Note */}
            <AudioRecorder onAudioReady={setAudioUrl} existingAudioUrl={audioUrl} />

            {/* Reference Image */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                Special Decoration Photo (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#5C3826] text-xs font-medium px-4 py-2 rounded-xl cursor-pointer">
                  <span>Browse Phone Gallery / File</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
                {referencePhoto && (
                  <div className="relative">
                    <img
                      src={referencePhoto}
                      alt="Ref"
                      className="w-12 h-12 rounded-lg object-cover border border-[#D9C8B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setReferencePhoto(undefined)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Combined Pricing Ledger Summary */}
            <div className="bg-[#FAF4ED] border border-[#E8DACB] rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-[#6B5A50]">
                <span>
                  {cake.name} ({selectedSize} × {quantity})
                </span>
                <span className="font-semibold text-[#42281D]">₹{primaryTotalPrice}</span>
              </div>
              {additionalItems.map((it) => (
                <div key={it.id} className="flex justify-between text-xs text-[#6B5A50]">
                  <span>{it.cakeName} ({it.size} × {it.quantity})</span>
                  <span className="font-semibold text-[#42281D]">₹{it.totalPrice}</span>
                </div>
              ))}
              <div className="border-t border-[#E8DACB] pt-2 flex justify-between items-center">
                <div>
                  <p className="text-sm font-extrabold text-[#42281D]">Combined Order Total</p>
                  <p className="text-[10px] text-[#8A7569]">Advance ({advancePercentage}%): ₹{advanceRequired}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold text-[#E06D80] font-mono">₹{grandTotal}</p>
                  <p className="text-[11px] text-[#6B5A50]">
                    Adv: ₹{advanceRequired} | Bal: ₹{balanceRemaining}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6B5A50] hover:bg-[#FAF4ED] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !cake.isAvailable}
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Order...</span>
                ) : (
                  <>
                    <span>Confirm Order & Pay Online</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
