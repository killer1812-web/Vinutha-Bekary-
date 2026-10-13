import React, { useState } from 'react';
import { X, User, Phone, Sparkles, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useBakery } from '../context/BakeryContext';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { customerLogin } = useBakery();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 letters).');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await customerLogin(name.trim(), cleanPhone);
      if (res.success) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.error || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to bakery backend');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E8DACB] my-auto">
        {/* Header */}
        <div className="bg-[#42281D] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E06D80]/20 border border-[#E06D80]/40 flex items-center justify-center text-[#E06D80]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg leading-tight">Customer Portal Login</h3>
              <p className="text-[11px] text-[#D4A373]">Vinutha Bakery • Express Name & Mobile Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-[#FAF4ED] p-3.5 rounded-2xl border border-[#E8DACB] text-xs text-[#6B5A50] space-y-1">
            <p className="font-bold text-[#42281D] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Simple, No-OTP Mobile Login
            </p>
            <p className="text-[11px] leading-relaxed">
              Enter your name and 10-digit mobile number. You can return anytime with the same number to check your cake orders, quotations, and payments.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#C88141]" />
              Your Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ananya Rao"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2.5 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-[#C88141]" />
              Mobile Phone Number (10 Digits) *
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#D9C8B8] bg-[#FAF4ED] text-xs text-[#5C3826] font-bold">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                placeholder="9845012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-[#D9C8B8] rounded-r-xl px-3.5 py-2.5 text-xs text-[#2C1A11] font-mono focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-[#8A7569] mt-1">Used strictly to verify and deliver your cake orders.</p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold py-3 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <span>Continue to Customer Portal</span>
                  <ArrowRight className="w-4 h-4 text-[#D4A373]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
