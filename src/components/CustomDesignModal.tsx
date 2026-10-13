import React, { useState } from 'react';
import { X, Upload, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBakery } from '../context/BakeryContext';
import { AudioRecorder } from './AudioRecorder';
import { api } from '../services/api';
import type { Order } from '../types';

interface CustomDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomDesignModal: React.FC<CustomDesignModalProps> = ({ isOpen, onClose }) => {
  const { activeShop, activeShopId, createOrder, currentCustomer } = useBakery();

  const [customerName, setCustomerName] = useState(currentCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentCustomer?.phone || '');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('1.5 kg');
  const [flavour, setFlavour] = useState('Belgian Chocolate');
  const [eggOrEggless, setEggOrEggless] = useState<'eggless' | 'contains_egg'>('eggless');
  const [occasion, setOccasion] = useState<string>('Birthday');
  const [birthdayPersonName, setBirthdayPersonName] = useState<string>('');
  const [nameOnCake, setNameOnCake] = useState<string>('');
  const [messageOnCake, setMessageOnCake] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [requiredDate, setRequiredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Custom cakes default to 2 days ahead
    return d.toISOString().split('T')[0];
  });
  const [requiredTime, setRequiredTime] = useState('6:00 PM');
  const [referencePhoto, setReferencePhoto] = useState<string | undefined>(undefined);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);

  // Sync if customer logs in
  React.useEffect(() => {
    if (currentCustomer) {
      if (!customerName) setCustomerName(currentCustomer.name);
      if (!customerPhone) setCustomerPhone(currentCustomer.phone);
    }
  }, [currentCustomer]);

  if (!isOpen) return null;

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
    if (!customerName.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!referencePhoto && !description.trim()) {
      setErrorMsg('Please provide either a reference photo or describe your cake concept.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

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

      const order = await createOrder({
        shopId: activeShop.id || activeShopId || 'shop-1',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        cakeName: 'Custom Bespoke Designer Cake',
        categorySlug: 'custom',
        size,
        flavour,
        eggOrEggless,
        occasion,
        birthdayPersonName: birthdayPersonName.trim() || undefined,
        nameOnCake: nameOnCake.trim() || undefined,
        messageOnCake: messageOnCake.trim() || undefined,
        quantity,
        unitPrice: 0, // Awaiting admin quotation
        totalAmount: 0,
        advancePaid: 0,
        balanceAmount: 0,
        requiredDate,
        requiredTime,
        fulfillmentType: 'pickup',
        specialInstructions: description.trim(),
        referencePhotoUrl: finalPhotoUrl,
        audioNoteUrl: finalAudioUrl,
        isCustomDesign: true,
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#D4A373', '#E06D80', '#42281D'],
      });

      setSubmittedOrder(order);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to submit custom request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#E8DACB] my-auto">
        {/* Header */}
        <div className="bg-[#42281D] text-white p-4 md:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#D4A373]" />
            <div>
              <h2 className="text-base md:text-lg font-bold font-serif leading-tight">
                {submittedOrder ? 'Custom Design Request Submitted' : 'Order Your Dream Custom Cake'}
              </h2>
              <p className="text-xs text-[#D4A373]">
                Upload your reference photo & voice instructions for an artisan price quotation
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

        {submittedOrder ? (
          <div className="p-6 md:p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-[#FAF4ED] border border-[#D4A373] rounded-full flex items-center justify-center mx-auto text-[#42281D]">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div>
              <h3 className="text-2xl font-bold font-serif text-[#42281D]">
                Request Sent to Master Baker!
              </h3>
              <p className="text-sm text-[#6B5A50] mt-1">
                Our pastry chef will review your design, calculate ingredients, and send you a price quotation.
              </p>
            </div>

            <div className="bg-[#FAF4ED] border-2 border-dashed border-[#D4A373] rounded-2xl p-5 max-w-md mx-auto text-center">
              <p className="text-xs uppercase tracking-wider text-[#8A7569] font-bold">Your Tracking Order Number</p>
              <p className="text-3xl font-extrabold text-[#42281D] font-mono tracking-wider my-1">
                {submittedOrder.orderNumber}
              </p>
              <p className="text-xs text-amber-800 font-semibold mt-2">
                Status: Under Review (Quotation Pending)
              </p>
            </div>

            <p className="text-xs text-[#6B5A50] max-w-md mx-auto">
              You can check the quotation anytime in the <strong>Track Order</strong> tab using your order number and mobile number!
            </p>

            <button
              type="button"
              onClick={onClose}
              className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold px-6 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
            >
              Done / Return to Bakery
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 1. Photo Upload */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-[#E06D80]" />
                1. Upload Reference Cake Photo *
              </label>
              <div className="border-2 border-dashed border-[#D9C8B8] hover:border-[#E06D80] rounded-2xl p-6 text-center bg-[#FAF4ED]/50 transition-colors">
                {referencePhoto ? (
                  <div className="relative inline-block">
                    <img
                      src={referencePhoto}
                      alt="Custom Design"
                      className="max-h-48 rounded-xl object-contain shadow-md mx-auto"
                    />
                    <button
                      type="button"
                      onClick={() => setReferencePhoto(undefined)}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 text-xs hover:bg-red-700 cursor-pointer shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-[#C88141] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#42281D]">
                      Tap to choose photo from mobile gallery or camera
                    </p>
                    <p className="text-[11px] text-[#8A7569] mt-0.5">PNG, JPG, or WEBP up to 8MB</p>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* 2. Concept Description */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                2. Describe Your Cake Idea & Themes
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe details: number of tiers, figurine themes (superheroes, cartoons, florals), colour palette, fondant vs cream..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
              />
            </div>

            {/* 3. Audio Voice Recording */}
            <AudioRecorder onAudioReady={setAudioUrl} existingAudioUrl={audioUrl} />

            {/* 4. Dietary Preference (Eggless / Egg) */}
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                Dietary Preference (100% Pure Veg Eggless vs Regular) *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setEggOrEggless('eggless')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    eggOrEggless === 'eggless'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-sm ring-1 ring-emerald-500'
                      : 'border-[#D9C8B8] bg-white text-[#6B5A50] hover:bg-[#FAF4ED]'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  </span>
                  <div>
                    <div className="text-xs font-bold text-emerald-800">100% Eggless</div>
                    <div className="text-[10px] text-emerald-600">Pure Vegetarian</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEggOrEggless('contains_egg')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    eggOrEggless === 'contains_egg'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold shadow-sm ring-1 ring-amber-500'
                      : 'border-[#D9C8B8] bg-white text-[#6B5A50] hover:bg-[#FAF4ED]'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 flex items-center justify-center shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  </span>
                  <div>
                    <div className="text-xs font-bold text-amber-800">Contains Egg</div>
                    <div className="text-[10px] text-amber-600">Traditional sponge</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 5. Occasion & Custom Text on Cake */}
            <div className="p-3.5 bg-[#FAF4ED] border border-[#E8DACB] rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Occasion
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  >
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Wedding / Engagement">Wedding / Engagement</option>
                    <option value="Baby Shower / Welcome Baby">Baby Shower / Welcome Baby</option>
                    <option value="Housewarming">Housewarming</option>
                    <option value="Farewell / Graduation">Farewell / Graduation</option>
                    <option value="Festival / Other">Festival / Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Birthday / Celebrant Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Diya / Rahul"
                    value={birthdayPersonName}
                    onChange={(e) => setBirthdayPersonName(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Name on Cake Plaque
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Happy 1st Birthday Diya"
                    value={nameOnCake}
                    onChange={(e) => setNameOnCake(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Message on Cake / Ribbon
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. You are our Superstar!"
                    value={messageOnCake}
                    onChange={(e) => setMessageOnCake(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 6. Specs: Size & Flavour */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Desired Weight / Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                >
                  <option value="0.5 kg">0.5 kg (Small Intimate Celebration, 4-5 servings)</option>
                  <option value="1.0 kg">1.0 kg (Standard Celebration, 8-10 servings)</option>
                  <option value="1.5 kg">1.5 kg (Medium Party, 12-15 servings)</option>
                  <option value="2.0 kg">2.0 kg (Grand Party, 18-20 servings)</option>
                  <option value="3.0 kg">3.0 kg (2-Tier Designer, 25-30 servings)</option>
                  <option value="4.0 kg">4.0 kg (Multi-Tier Grand)</option>
                  <option value="5.0 kg+">5.0 kg+ Mega Celebration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Inside Flavour
                </label>
                <select
                  value={flavour}
                  onChange={(e) => setFlavour(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                >
                  <option value="Belgian Chocolate">Belgian Chocolate</option>
                  <option value="Fresh Strawberry Ice Cake">Fresh Strawberry Ice Cake</option>
                  <option value="Red Velvet Cream Cheese">Red Velvet Cream Cheese</option>
                  <option value="Butterscotch Caramel Crunch">Butterscotch Caramel Crunch</option>
                  <option value="Pineapple Fresh Cream">Pineapple Fresh Cream</option>
                  <option value="Black Forest">Black Forest</option>
                  <option value="Mango Alphonso Cream">Mango Alphonso Cream</option>
                  <option value="Choco Truffle Dense">Choco Truffle Dense</option>
                </select>
              </div>
            </div>

            <div className="bg-[#FAF4ED] rounded-xl px-3.5 py-2.5 text-xs text-[#42281D] flex items-center justify-between border border-[#E8DACB]">
              <span className="font-semibold">Bakery Location:</span>
              <span className="font-bold text-[#E06D80]">{activeShop.name || 'Vinutha Bakery - Main Branch'}</span>
            </div>

            {/* 5. Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Event / Required Date *
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
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Required Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 6:00 PM"
                  value={requiredTime}
                  onChange={(e) => setRequiredTime(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Divya Prakash"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5">
                  Mobile Number (for Quotation alerts) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#6B5A50] hover:bg-[#FAF4ED] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Request...' : 'Submit Design for Quotation'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
