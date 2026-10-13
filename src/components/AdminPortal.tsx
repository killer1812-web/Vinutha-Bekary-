import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Truck,
  Boxes,
  Cake,
  BarChart3,
  Users,
  QrCode,
  Bell,
  LogOut,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  Camera,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Check,
  X,
  Sparkles,
  Edit,
  Trash2,
  Upload,
  Image as ImageIcon,
  Settings,
} from 'lucide-react';
import { useBakery } from '../context/BakeryContext';
import type {
  Order,
  OrderStatus,
  Expense,
  ExpenseCategory,
  Supplier,
  PurchaseRecord,
  PurchaseItem,
  InventoryItem,
  CakeItem,
  CakeSizeOption,
} from '../types';
import { QRScannerModal } from './QRScannerModal';
import { api } from '../services/api';

interface AdminPortalProps {
  onClose: () => void;
  onOpenCounterPoster: (shopId: string) => void;
}

type AdminTab =
  | 'overview'
  | 'orders'
  | 'scanner'
  | 'expenses'
  | 'purchases'
  | 'inventory'
  | 'cakes'
  | 'reports'
  | 'staff'
  | 'settings';

export const AdminPortal: React.FC<AdminPortalProps> = ({ onClose, onOpenCounterPoster }) => {
  const {
    shops,
    activeShopId,
    setActiveShopId,
    activeShop,
    updateShopSettings,
    verifyOrderPayment,
    currentUser,
    login,
    logout,
    switchDemoRole,
    staffUsers,
    orders,
    updateOrderStatus,
    submitQuotation,
    recordPayment,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    suppliers,
    addSupplier,
    purchaseRecords,
    addPurchaseRecord,
    inventory,
    adjustStock,
    stockMovements,
    cakes,
    addCake,
    updateCake,
    deleteCake,
    notifications,
    markNotificationRead,
  } = useBakery();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Shop filter for Super Admin (Owner): 'all' | 'shop-1' | 'shop-2'
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const staffShopId = currentUser?.assignedShopId || 'shop-1';
  const [selectedShopFilter, setSelectedShopFilter] = useState<'all' | 'shop-1' | 'shop-2'>(() =>
    isSuperAdmin ? 'all' : (staffShopId as 'shop-1' | 'shop-2')
  );

  // Effective shop filter enforced by role:
  // If staff, they are strictly forced to their assigned shop!
  const effectiveShopFilter = isSuperAdmin ? selectedShopFilter : staffShopId;

  // Login form state (if not logged in)
  const [loginUsername, setLoginUsername] = useState('owner');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Scanner modal state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedOrderDetails, setScannedOrderDetails] = useState<Order | null>(null);

  // Expense Dialog State (Create & Edit)
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('ingredients');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'upi' | 'card' | 'bank_transfer'>('cash');
  const [expenseShopId, setExpenseShopId] = useState(isSuperAdmin ? 'shop-1' : staffShopId);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState<string | undefined>(undefined);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('all');

  // New Purchase Bill Dialog State
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [purchaseShopId, setPurchaseShopId] = useState(isSuperAdmin ? 'shop-1' : staffShopId);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState(() => suppliers[0]?.id || '');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchaseItemsList, setPurchaseItemsList] = useState<PurchaseItem[]>([
    { id: '1', name: 'Fresh Dairy Milk', quantity: 20, unit: 'liters', unitPrice: 45, totalPrice: 900 },
  ]);
  const [purchaseAmountPaid, setPurchaseAmountPaid] = useState<number>(900);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'credit'>('upi');
  const [purchaseBillUrl, setPurchaseBillUrl] = useState<string | undefined>(undefined);

  // Quotation review dialog state
  const [quotingOrder, setQuotingOrder] = useState<Order | null>(null);
  const [quoteInputPrice, setQuoteInputPrice] = useState<number>(1500);
  const [quoteInputAdvance, setQuoteInputAdvance] = useState<number>(750);
  const [quoteInputNotes, setQuoteInputNotes] = useState('');

  // Cake Modal State (Create & Edit with photo preview, sizes & prices)
  const [isNewCakeOpen, setIsNewCakeOpen] = useState(false);
  const [editingCakeId, setEditingCakeId] = useState<string | null>(null);
  const [cakeFormName, setCakeFormName] = useState('');
  const [cakeFormCategory, setCakeFormCategory] = useState<'normal-cakes' | 'ice-cakes' | 'birthday' | 'anniversary' | 'custom'>('normal-cakes');
  const [cakeFormBasePrice, setCakeFormBasePrice] = useState<number>(650);
  const [cakeFormDesc, setCakeFormDesc] = useState('');
  const [cakeFormEggOrEggless, setCakeFormEggOrEggless] = useState<'eggless' | 'contains_egg'>('eggless');
  const [cakeFormPrepTime, setCakeFormPrepTime] = useState('30 mins');
  const [cakeFormImages, setCakeFormImages] = useState<string[]>(['/images/chocolate_truffle.jpg']);
  const [cakeFormSizes, setCakeFormSizes] = useState<CakeSizeOption[]>([
    { size: '0.5 kg', price: 350 },
    { size: '1.0 kg', price: 650 },
    { size: '1.5 kg', price: 950 },
    { size: '2.0 kg', price: 1250 },
  ]);
  const [cakeFormIsAvailable, setCakeFormIsAvailable] = useState<boolean>(true);
  const [cakeFormStockStatus, setCakeFormStockStatus] = useState<'in_stock' | 'low_stock' | 'out_of_stock'>('in_stock');
  const [cakeFormFlavours, setCakeFormFlavours] = useState('Vanilla Bean, Dark Belgian Chocolate, Fresh Strawberry');
  const [cakeFormBadge, setCakeFormBadge] = useState('Bestseller');
  const [cakeFormError, setCakeFormError] = useState<string | null>(null);
  const [cakeFormSuccess, setCakeFormSuccess] = useState<string | null>(null);
  const [isUploadingCakePhoto, setIsUploadingCakePhoto] = useState(false);

  // Shop Settings State (Super Admin)
  const [settingsShopName, setSettingsShopName] = useState(activeShop.name);
  const [settingsTagline, setSettingsTagline] = useState(activeShop.tagline);
  const [settingsAddress, setSettingsAddress] = useState(activeShop.address);
  const [settingsPhone, setSettingsPhone] = useState(activeShop.phone);
  const [settingsWhatsapp, setSettingsWhatsapp] = useState(activeShop.whatsapp);
  const [settingsOperatingHours, setSettingsOperatingHours] = useState(activeShop.operatingHours);
  const [settingsUpiId, setSettingsUpiId] = useState(activeShop.upiId || 'vinuthabakery@okaxis');
  const [settingsAdvancePercent, setSettingsAdvancePercent] = useState(
    activeShop.advancePaymentPercentage || activeShop.advancePercentage || 50
  );
  const [settingsCounterQrUrl, setSettingsCounterQrUrl] = useState(
    activeShop.counterQrUrl || activeShop.qrOrderUrl || ''
  );
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Filtered dataset based on permissions and shop selector
  const filteredOrders = orders.filter((o) =>
    effectiveShopFilter === 'all' ? true : o.shopId === effectiveShopFilter
  );

  const filteredExpenses = expenses.filter((e) =>
    effectiveShopFilter === 'all' ? true : e.shopId === effectiveShopFilter
  );

  const filteredPurchases = purchaseRecords.filter((p) =>
    effectiveShopFilter === 'all' ? true : p.shopId === effectiveShopFilter
  );

  const filteredInventory = inventory.filter((i) =>
    effectiveShopFilter === 'all' ? true : i.shopId === effectiveShopFilter
  );

  // Financial Aggregations
  const totalSalesRevenue = filteredOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const totalAdvanceCollected = filteredOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o.advancePaid || 0), 0);

  const totalCustomerBalanceDue = filteredOrders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'completed')
    .reduce((sum, o) => sum + (o.balanceAmount || 0), 0);

  const totalOperatingExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const totalSupplierPurchases = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const totalSupplierOutstandingLiabilities = filteredPurchases.reduce(
    (sum, p) => sum + (p.outstandingBalance || 0),
    0
  );

  // Estimated gross profit calculation with clear disclosure:
  const estimatedProfit = totalSalesRevenue - totalOperatingExpenses;

  // Low stock items count
  const lowStockItems = filteredInventory.filter((i) => i.currentQuantity <= i.minStockLevel);

  // If user is not logged in, render the secure staff login portal
  if (!currentUser) {
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await login(loginUsername, loginPassword);
      if (!res.success) {
        setLoginError(res.error || 'Login failed');
      } else {
        setLoginError(null);
      }
    };

    return (
      <div className="fixed inset-0 z-50 bg-[#F7F2EB] flex items-center justify-center p-4">
        <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-[#42281D] p-1.5 rounded-lg hover:bg-[#FAF4ED] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#FAF4ED] border border-[#D4A373] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <ShieldAlert className="w-7 h-7 text-[#42281D]" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-[#42281D]">Vinutha Bakery Portal</h2>
            <p className="text-xs text-[#8A7569] mt-1">
              Secure Staff & Owner Multi-Shop Management System
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Username or Email
              </label>
              <input
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2.5 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2.5 text-xs text-[#2C1A11] focus:ring-2 focus:ring-[#E06D80] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs md:text-sm font-bold py-2.5 px-4 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              Sign In to Bakery Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Role Switcher (For Pair Testing) */}
          <div className="mt-6 pt-5 border-t border-[#E8DACB]">
            <p className="text-[11px] font-bold text-[#8A7569] uppercase tracking-wider mb-2 text-center">
              Quick Role Test Logins:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchDemoRole('owner');
                }}
                className="bg-[#FAF4ED] hover:bg-[#F2E5D5] border border-[#E0D3C5] p-2 rounded-xl text-left cursor-pointer transition-colors"
              >
                <p className="text-[11px] font-bold text-[#42281D]">Super Admin</p>
                <p className="text-[9px] text-[#C88141]">Owner (Both Shops)</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('staff1');
                }}
                className="bg-[#FAF4ED] hover:bg-[#F2E5D5] border border-[#E0D3C5] p-2 rounded-xl text-left cursor-pointer transition-colors"
              >
                <p className="text-[11px] font-bold text-[#42281D]">Shop 1 Staff</p>
                <p className="text-[9px] text-[#C88141]">Main Bazaar Only</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchDemoRole('staff2');
                }}
                className="bg-[#FAF4ED] hover:bg-[#F2E5D5] border border-[#E0D3C5] p-2 rounded-xl text-left cursor-pointer transition-colors"
              >
                <p className="text-[11px] font-bold text-[#42281D]">Shop 2 Staff</p>
                <p className="text-[9px] text-[#C88141]">Station Road Only</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Expense CRUD Handlers
  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseTitle('');
    setExpenseCategory('ingredients');
    setExpenseAmount(0);
    setExpensePaymentMethod('cash');
    setExpenseShopId(isSuperAdmin ? 'shop-1' : staffShopId);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseDescription('');
    setExpenseNotes('');
    setExpenseReceiptUrl(undefined);
    setIsNewExpenseOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseTitle(exp.title);
    setExpenseCategory(exp.category);
    setExpenseAmount(exp.amount);
    setExpensePaymentMethod(exp.paymentMethod);
    setExpenseShopId(exp.shopId);
    setExpenseDate(exp.date);
    setExpenseDescription(exp.description);
    setExpenseNotes(exp.notes || exp.description);
    setExpenseReceiptUrl(exp.receiptUrl);
    setIsNewExpenseOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || expenseAmount <= 0) return;

    const payload = {
      shopId: isSuperAdmin ? expenseShopId : staffShopId,
      date: expenseDate || new Date().toISOString().split('T')[0],
      title: expenseTitle.trim(),
      category: expenseCategory,
      description: expenseNotes.trim() || expenseDescription.trim() || 'Recorded via staff expense module',
      amount: expenseAmount,
      paymentMethod: expensePaymentMethod,
      paidBy: currentUser?.name || 'Staff',
      receiptUrl: expenseReceiptUrl,
      notes: expenseNotes.trim(),
    };

    if (editingExpenseId) {
      await updateExpense(editingExpenseId, payload);
    } else {
      await addExpense(payload);
    }

    setIsNewExpenseOpen(false);
    setEditingExpenseId(null);
    setExpenseTitle('');
    setExpenseAmount(0);
    setExpenseNotes('');
    setExpenseReceiptUrl(undefined);
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      await deleteExpense(id);
    }
  };

  // Cake CRUD & Photo Upload Handlers
  const handleOpenAddCake = () => {
    setEditingCakeId(null);
    setCakeFormName('');
    setCakeFormCategory('normal-cakes');
    setCakeFormBasePrice(650);
    setCakeFormDesc('');
    setCakeFormEggOrEggless('eggless');
    setCakeFormPrepTime('30 mins');
    setCakeFormImages(['/images/hero_cake.jpg']);
    setCakeFormSizes([
      { size: '0.5 kg', price: 350 },
      { size: '1.0 kg', price: 650 },
      { size: '1.5 kg', price: 950 },
      { size: '2.0 kg', price: 1250 },
    ]);
    setCakeFormIsAvailable(true);
    setCakeFormStockStatus('in_stock');
    setCakeFormFlavours('Vanilla Bean, Dark Belgian Chocolate, Fresh Strawberry');
    setCakeFormBadge('Bestseller');
    setCakeFormError(null);
    setCakeFormSuccess(null);
    setIsNewCakeOpen(true);
  };

  const handleOpenEditCake = (cake: CakeItem) => {
    setEditingCakeId(cake.id);
    setCakeFormName(cake.name);
    setCakeFormCategory(cake.categorySlug as any);
    setCakeFormBasePrice(cake.basePrice);
    setCakeFormDesc(cake.description);
    setCakeFormEggOrEggless(cake.eggOrEggless || 'eggless');
    setCakeFormPrepTime(cake.prepTime || '30 mins');
    setCakeFormImages(cake.images && cake.images.length > 0 ? cake.images : ['/images/hero_cake.jpg']);
    setCakeFormSizes(
      cake.sizes && cake.sizes.length > 0
        ? cake.sizes
        : [{ size: '1.0 kg', price: cake.basePrice }]
    );
    setCakeFormIsAvailable(cake.isAvailable);
    setCakeFormStockStatus(cake.stockStatus || 'in_stock');
    setCakeFormFlavours(Array.isArray(cake.flavours) ? cake.flavours.join(', ') : '');
    setCakeFormBadge(cake.badge || '');
    setCakeFormError(null);
    setCakeFormSuccess(null);
    setIsNewCakeOpen(true);
  };

  const handleSaveCake = async (e: React.FormEvent) => {
    e.preventDefault();
    setCakeFormError(null);
    setCakeFormSuccess(null);

    if (!cakeFormName.trim()) {
      setCakeFormError('Please enter a cake product title.');
      return;
    }
    if (cakeFormBasePrice <= 0) {
      setCakeFormError('Base price must be greater than 0.');
      return;
    }
    if (cakeFormSizes.length === 0) {
      setCakeFormError('Please configure at least one weight and price option.');
      return;
    }
    if (cakeFormSizes.some((s) => s.price <= 0 || !s.size.trim())) {
      setCakeFormError('All weight tiers must have a valid size label and positive price.');
      return;
    }

    const flavoursList = cakeFormFlavours
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const cakePayload = {
      name: cakeFormName.trim(),
      categorySlug: cakeFormCategory,
      description:
        cakeFormDesc.trim() ||
        'Artisanal handcrafted cake freshly baked to order using premium quality ingredients.',
      basePrice: cakeFormBasePrice,
      eggOrEggless: cakeFormEggOrEggless,
      prepTime: cakeFormPrepTime.trim() || '30 mins',
      sizes: cakeFormSizes,
      flavours: flavoursList.length > 0 ? flavoursList : ['Vanilla Bean', 'Belgian Chocolate'],
      decorations: ['Whipped Frosting', 'Chocolate Drip', 'Custom Name Plaque'],
      images: cakeFormImages.length > 0 ? cakeFormImages : ['/images/hero_cake.jpg'],
      isAvailable: cakeFormIsAvailable,
      stockStatus: cakeFormStockStatus,
      badge: cakeFormBadge.trim() || undefined,
    };

    try {
      if (editingCakeId) {
        await updateCake(editingCakeId, cakePayload);
        setCakeFormSuccess('Cake product updated successfully!');
      } else {
        await addCake(cakePayload);
        setCakeFormSuccess('New cake product added successfully!');
      }
      setTimeout(() => {
        setIsNewCakeOpen(false);
        setEditingCakeId(null);
        setCakeFormSuccess(null);
      }, 700);
    } catch (err: any) {
      setCakeFormError(err.message || 'Failed to save cake product');
    }
  };

  const handleDeleteCake = async (cakeId: string) => {
    if (window.confirm('Are you sure you want to delete this cake product from the menu?')) {
      await deleteCake(cakeId);
    }
  };

  const handleCakePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCakeFormError('Image size must be less than 10MB');
      return;
    }

    try {
      setIsUploadingCakePhoto(true);
      setCakeFormError(null);
      const url = await api.uploadFile(file);
      setCakeFormImages((prev) => [url, ...prev]);
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCakeFormImages((prev) => [reader.result as string, ...prev]);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingCakePhoto(false);
    }
  };

  const handleAddCakeSizePreset = (sizeLabel: string, priceMultiplier: number) => {
    const calculatedPrice = Math.round(cakeFormBasePrice * priceMultiplier);
    setCakeFormSizes((prev) => [...prev, { size: sizeLabel, price: calculatedPrice }]);
  };

  const handleRemoveCakeSize = (index: number) => {
    setCakeFormSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCakeSize = (index: number, newSize: string, newPrice: number) => {
    setCakeFormSizes((prev) =>
      prev.map((item, i) => (i === index ? { size: newSize, price: newPrice } : item))
    );
  };

  // Handle saving new purchase record
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseInvoiceNo.trim() || purchaseItemsList.length === 0) return;

    const selectedSup = suppliers.find((s) => s.id === purchaseSupplierId) || suppliers[0];
    const subtotal = purchaseItemsList.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + tax;
    const balance = Math.max(0, totalAmount - purchaseAmountPaid);
    const paymentStatus =
      balance === 0 ? 'paid' : purchaseAmountPaid > 0 ? 'partially_paid' : 'unpaid';

    addPurchaseRecord({
      shopId: purchaseShopId,
      supplierId: selectedSup.id,
      supplierName: selectedSup.name,
      invoiceNumber: purchaseInvoiceNo.trim(),
      date: purchaseDate,
      items: purchaseItemsList,
      subtotal,
      tax,
      discount: 0,
      totalAmount,
      amountPaid: purchaseAmountPaid,
      outstandingBalance: balance,
      paymentStatus,
      paymentMethod: purchasePaymentMethod,
      invoiceFileUrl: purchaseBillUrl,
      notes: 'Recorded in supplier stock ledger with automatic inventory increment',
    });

    setIsNewPurchaseOpen(false);
    setPurchaseInvoiceNo('');
    setPurchaseBillUrl(undefined);
    setPurchaseItemsList([
      { id: '1', name: 'Fresh Dairy Milk', quantity: 20, unit: 'liters', unitPrice: 45, totalPrice: 900 },
    ]);
  };

  // Handle submitting custom quotation
  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingOrder || quoteInputPrice <= 0) return;

    await submitQuotation(
      quotingOrder.id,
      quoteInputPrice,
      quoteInputNotes.trim() || `Quotation of ₹${quoteInputPrice} provided by ${currentUser?.name || 'Admin'}`,
      quoteInputAdvance > 0 ? quoteInputAdvance : Math.round(quoteInputPrice * 0.5)
    );
    setQuotingOrder(null);
  };

  // Handle saving shop settings & UPI config
  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      await updateShopSettings({
        name: settingsShopName.trim(),
        tagline: settingsTagline.trim(),
        address: settingsAddress.trim(),
        phone: settingsPhone.trim(),
        whatsapp: settingsWhatsapp.trim(),
        operatingHours: settingsOperatingHours.trim(),
        upiId: settingsUpiId.trim(),
        advancePercentage: Number(settingsAdvancePercent) || 50,
        advancePaymentPercentage: Number(settingsAdvancePercent) || 50,
        counterQrUrl: settingsCounterQrUrl.trim(),
      });
      setSettingsSuccessMsg('Bakery settings and UPI configuration updated successfully!');
      setTimeout(() => setSettingsSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update shop settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // CSV Report Export Handler
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Order Number,Shop,Customer,Phone,Cake,Size,Flavour,Status,Total,Advance,Balance,Date\n' +
      filteredOrders
        .map(
          (o) =>
            `"${o.orderNumber}","${o.shopId}","${o.customerName}","${o.customerPhone}","${o.cakeName}","${o.size}","${o.flavour}","${o.status}",${o.totalAmount},${o.advancePaid},${o.balanceAmount},"${o.requiredDate}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vinutha-Bakery-Report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F7F2EB] flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-[#42281D] text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md border-b border-[#5C3826] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF4ED] text-[#42281D] flex items-center justify-center font-bold shadow-sm">
            VB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm md:text-base font-serif tracking-wide">
                Vinutha Bakery Management System
              </h1>
              <span className="bg-[#E06D80] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {currentUser.role.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-[#D4A373]">
              User: <strong className="text-white">{currentUser.name}</strong> •{' '}
              {currentUser.assignedShopId
                ? shops.find((s) => s.id === currentUser.assignedShopId)?.name
                : 'All Branches (Super Admin)'}
            </p>
          </div>
        </div>

        {/* Multi-Shop Selector (Super Admin Only) & Action buttons */}
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="flex items-center bg-[#2C1A11] rounded-xl p-1 border border-[#5C3826]">
              <span className="text-[11px] text-[#D4A373] px-2 font-semibold hidden sm:inline">Shop:</span>
              <button
                onClick={() => setSelectedShopFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedShopFilter === 'all'
                    ? 'bg-[#E06D80] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                All Shops
              </button>
              <button
                onClick={() => setSelectedShopFilter('shop-1')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedShopFilter === 'shop-1'
                    ? 'bg-[#E06D80] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Shop 1 (Bazaar)
              </button>
              <button
                onClick={() => setSelectedShopFilter('shop-2')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedShopFilter === 'shop-2'
                    ? 'bg-[#E06D80] text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                Shop 2 (Station)
              </button>
            </div>
          )}

          {/* Staff Counter Scanner Quick Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 bg-[#E06D80] hover:bg-[#C95468] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow cursor-pointer transition-all"
            title="Scan Customer Pickup QR Code"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Scan Order QR</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Close modal back to customer site */}
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Portal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tab Bar */}
      <nav className="bg-[#FAF4ED] border-b border-[#E8DACB] px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Orders & Quotes ({filteredOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'scanner'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" />
          Counter QR Scanner
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'expenses'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Expenses ({filteredExpenses.length})
        </button>

        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'purchases'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Supplier Invoices & Bills
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'bg-[#42281D] text-white shadow-sm'
              : 'text-[#6B5A50] hover:bg-white/60'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          Inventory Stock ({lowStockItems.length > 0 && `⚠️ ${lowStockItems.length}`})
        </button>

        {(isSuperAdmin || currentUser?.role === 'shop_staff' || currentUser?.role === 'shop_admin' || (currentUser?.role as string) === 'staff') && (
          <button
            onClick={() => setActiveTab('cakes')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cakes'
                ? 'bg-[#42281D] text-white shadow-sm'
                : 'text-[#6B5A50] hover:bg-white/60'
            }`}
          >
            <Cake className="w-3.5 h-3.5" />
            Cake Catalog Manager
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-[#42281D] text-white shadow-sm'
                : 'text-[#6B5A50] hover:bg-white/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Financial Reports
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'staff'
                ? 'bg-[#42281D] text-white shadow-sm'
                : 'text-[#6B5A50] hover:bg-white/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Staff & Shops
          </button>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#42281D] text-white shadow-sm'
                : 'text-[#6B5A50] hover:bg-white/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Shop Settings & UPI
          </button>
        )}
      </nav>

      {/* Main Tab Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {isSuperAdmin ? (
                <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8A7569] mb-1">
                    <span className="font-bold uppercase tracking-wider">Total Sales</span>
                    <DollarSign className="w-4 h-4 text-[#C88141]" />
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono">
                    ₹{totalSalesRevenue.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Adv: ₹{totalAdvanceCollected} | Bal: ₹{totalCustomerBalanceDue}
                  </p>
                </div>
              ) : (
                <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8A7569] mb-1">
                    <span className="font-bold uppercase tracking-wider">Branch Orders</span>
                    <ShoppingBag className="w-4 h-4 text-[#E06D80]" />
                  </div>
                  <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono">
                    {filteredOrders.length}
                  </p>
                  <p className="text-[11px] text-[#6B5A50] mt-1">
                    Today: {filteredOrders.filter((o) => o.requiredDate === new Date().toISOString().split('T')[0]).length} orders
                  </p>
                </div>
              )}

              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#8A7569] mb-1">
                  <span className="font-bold uppercase tracking-wider">Pickups Ready</span>
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono">
                  {filteredOrders.filter((o) => o.status === 'ready_for_pickup').length}
                </p>
                <p className="text-[11px] text-[#6B5A50] mt-1">
                  Prep: {filteredOrders.filter((o) => o.status === 'preparing').length} | New: {filteredOrders.filter((o) => o.status === 'pending').length}
                </p>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#8A7569] mb-1">
                  <span className="font-bold uppercase tracking-wider">
                    {isSuperAdmin ? 'Total Expenses' : "Today's Expenses"}
                  </span>
                  <Receipt className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono">
                  ₹{isSuperAdmin ? totalOperatingExpenses.toLocaleString() : filteredExpenses.filter(e => e.date === new Date().toISOString().split('T')[0]).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-[#6B5A50] mt-1">
                  {isSuperAdmin
                    ? `${filteredExpenses.length} entries recorded`
                    : `${filteredExpenses.filter(e => e.date === new Date().toISOString().split('T')[0]).length} entries today`}
                </p>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-[#8A7569] mb-1">
                  <span className="font-bold uppercase tracking-wider">Low Stock</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono">
                  {lowStockItems.length}
                </p>
                <p className="text-[11px] text-amber-800 font-medium mt-1">
                  {lowStockItems.length > 0 ? 'Items need reordering' : 'All stocks healthy'}
                </p>
              </div>
            </div>

            {/* Two-Shop Comparison Section (When Super Admin views All Shops) */}
            {isSuperAdmin && (
              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-sm md:text-base font-serif text-[#42281D]">
                      Two-Shop Branch Performance Comparison
                    </h3>
                    <p className="text-xs text-[#8A7569]">Compare sales, orders, and expenses side-by-side</p>
                  </div>
                  <span className="bg-[#FAF4ED] text-[#C88141] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#E8DACB]">
                    Live Synced
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {shops.map((shop) => {
                    const shopOrders = orders.filter((o) => o.shopId === shop.id && o.status !== 'cancelled');
                    const shopSales = shopOrders.reduce((sum, o) => sum + o.totalAmount, 0);
                    const shopExp = expenses
                      .filter((e) => e.shopId === shop.id)
                      .reduce((sum, e) => sum + e.amount, 0);
                    const shopLow = inventory.filter(
                      (i) => i.shopId === shop.id && i.currentQuantity <= i.minStockLevel
                    ).length;

                    return (
                      <div
                        key={shop.id}
                        className="bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#E06D80] bg-white px-2 py-0.5 rounded border border-[#E8DACB]">
                              {shop.code}
                            </span>
                            <h4 className="font-bold text-sm text-[#42281D] mt-1">{shop.name}</h4>
                          </div>
                          <button
                            onClick={() => onOpenCounterPoster(shop.id)}
                            className="text-xs font-semibold text-[#5C3826] bg-white px-2.5 py-1 rounded-lg border border-[#D9C8B8] hover:bg-[#FAF6F0] cursor-pointer flex items-center gap-1"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Counter Poster
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8DACB] text-center">
                          <div className="bg-white p-2 rounded-lg border border-[#E8DACB]">
                            <p className="text-[10px] text-[#8A7569] uppercase font-bold">Sales</p>
                            <p className="text-xs font-bold text-[#42281D] font-mono mt-0.5">
                              ₹{shopSales.toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-[#E8DACB]">
                            <p className="text-[10px] text-[#8A7569] uppercase font-bold">Orders</p>
                            <p className="text-xs font-bold text-[#42281D] font-mono mt-0.5">
                              {shopOrders.length}
                            </p>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-[#E8DACB]">
                            <p className="text-[10px] text-[#8A7569] uppercase font-bold">Expenses</p>
                            <p className="text-xs font-bold text-red-600 font-mono mt-0.5">
                              ₹{shopExp.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {shopLow > 0 && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                            {shopLow} ingredient(s) below minimum stock level
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Orders Overview */}
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm md:text-base font-serif text-[#42281D]">
                  Recent Cake Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-[#E06D80] hover:underline cursor-pointer"
                >
                  View All Orders →
                </button>
              </div>

              <div className="space-y-2.5">
                {filteredOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="p-3 bg-[#FAF4ED] border border-[#E8DACB] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#42281D]">#{order.orderNumber}</span>
                        <span className="font-bold text-[#2C1A11]">{order.customerName}</span>
                        <span className="text-[#8A7569]">({order.customerPhone})</span>
                      </div>
                      <p className="text-[#6B5A50] mt-0.5">
                        {order.cakeName} • {order.size} • Needed: <strong>{order.requiredDate}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-[#42281D] font-mono">₹{order.totalAmount}</p>
                        <p className="text-[10px] text-emerald-700">Adv: ₹{order.advancePaid}</p>
                      </div>

                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className="bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs font-semibold text-[#42281D] focus:outline-none cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="under_review">Under Review</option>
                        <option value="price_quoted">Price Quoted</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready_for_pickup">Ready for Pickup</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ORDERS & QUOTATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Customer Orders & Custom Quotations
                </h3>
                <p className="text-xs text-[#8A7569]">
                  Review custom designs, set quotes, and manage baking status
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#5C3826] text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#C88141]" />
                Export CSV Report
              </button>
            </div>

            {/* Orders Table */}
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF4ED] text-[#42281D] uppercase text-[10px] font-bold tracking-wider border-b border-[#E8DACB]">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Cake / Custom Design</th>
                      <th className="p-3">Shop</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DACB]">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-[#FAF4ED]/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-[#42281D]">
                          #{order.orderNumber}
                          {order.isCustomDesign && (
                            <span className="block text-[9px] text-[#E06D80] font-bold">CUSTOM DESIGN</span>
                          )}
                        </td>

                        <td className="p-3">
                          <p className="font-bold text-[#2C1A11]">{order.customerName}</p>
                          <p className="text-[11px] text-[#8A7569]">{order.customerPhone}</p>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#42281D]">{order.cakeName}</span>
                            {order.eggOrEggless && (
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                order.eggOrEggless === 'eggless'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.eggOrEggless === 'eggless' ? '🌱 Eggless' : '🥚 With Egg'}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#6B5A50] mt-0.5">
                            {order.size} • {order.flavour}
                          </p>

                          {order.items && order.items.length > 1 && (
                            <div className="text-[10px] text-[#8A7569] bg-[#FAF4ED] p-1 rounded mt-1 border border-[#E8DACB]">
                              <strong>Cart ({order.items.length} items):</strong>
                              {order.items.map((it, idx) => (
                                <div key={idx}>• {it.quantity}x {it.cakeName} ({it.size})</div>
                              ))}
                            </div>
                          )}

                          {order.occasion && (
                            <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                              🎉 {order.occasion}{order.birthdayPersonName ? ` (${order.birthdayPersonName})` : ''}
                            </p>
                          )}
                          {order.nameOnCake && (
                            <p className="text-[10px] text-[#42281D] font-medium">🎂 Plaque: "{order.nameOnCake}"</p>
                          )}
                          {order.messageOnCake && (
                            <p className="text-[10px] text-[#6B5A50] italic">✉️ Ribbon: "{order.messageOnCake}"</p>
                          )}
                          {order.customMessage && (
                            <p className="text-[10px] text-[#C88141] italic">"{order.customMessage}"</p>
                          )}
                          {order.referencePhotoUrl && (
                            <a
                              href={order.referencePhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-600 font-bold hover:underline block mt-0.5"
                            >
                              📷 View Reference Photo
                            </a>
                          )}
                          {order.audioNoteUrl && (
                            <div className="mt-1">
                              <audio src={order.audioNoteUrl} controls className="h-6 w-36" />
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-mono text-[11px] font-bold text-[#5C3826]">
                          {order.shopId.toUpperCase()}
                        </td>

                        <td className="p-3 font-mono">
                          <p className="font-bold text-[#42281D]">₹{order.totalAmount}</p>
                          <p className="text-[10px] text-emerald-700">Adv: ₹{order.advancePaid}</p>
                          <p className="text-[10px] text-red-600">Bal: ₹{order.balanceAmount}</p>
                          {order.upiTransactionRef && (
                            <div className="mt-1 pt-1 border-t border-[#E8DACB]">
                              <p className="text-[9px] text-[#8A7569]">UTR: {order.upiTransactionRef}</p>
                              {order.isPaymentVerified ? (
                                <span className="inline-block text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">
                                  ✓ Bank Verified
                                </span>
                              ) : (
                                <span className="inline-block text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                                  ⏳ Unverified UPI
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                            className="bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs font-semibold text-[#42281D] focus:outline-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="price_quoted">Price Quoted</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready_for_pickup">Ready for Pickup</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>

                        <td className="p-3 space-x-1 whitespace-nowrap">
                          {order.upiTransactionRef && !order.isPaymentVerified && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Confirm receipt of bank credit for UTR ${order.upiTransactionRef}?`)) {
                                  verifyOrderPayment(order.id, undefined, true);
                                }
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer shadow-xs animate-pulse"
                              title={`Verify bank credit for UTR ${order.upiTransactionRef}`}
                            >
                              ✓ Verify UPI
                            </button>
                          )}
                          {order.isCustomDesign && order.status === 'under_review' && (
                            <button
                              onClick={() => {
                                setQuotingOrder(order);
                                setQuoteInputPrice(1800);
                                setQuoteInputAdvance(900);
                              }}
                              className="bg-[#C88141] hover:bg-[#B06D32] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer shadow-sm"
                            >
                              Send Quote
                            </button>
                          )}
                          {order.balanceAmount > 0 && (
                            <button
                              onClick={() => {
                                const amt = Number(prompt(`Record payment for #${order.orderNumber}:`, String(order.balanceAmount)));
                                if (amt && amt > 0) recordPayment(order.id, amt);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                            >
                              + Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: COUNTER QR SCANNER (STAFF PICKUP VERIFICATION) */}
        {/* ========================================================================= */}
        {activeTab === 'scanner' && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#FAF4ED] border border-[#D4A373] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm text-[#42281D]">
                <Camera className="w-8 h-8 text-[#E06D80]" />
              </div>
              <h3 className="text-xl font-bold font-serif text-[#42281D]">Counter Pickup QR Scanner</h3>
              <p className="text-xs text-[#6B5A50] max-w-md mx-auto mt-1 mb-5">
                Scan customer order pickup tokens or QR code passes presented on customer phone screens at the bakery counter.
              </p>

              <button
                onClick={() => setIsScannerOpen(true)}
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white font-bold text-xs md:text-sm px-6 py-3 rounded-xl shadow-lg cursor-pointer transition-all inline-flex items-center gap-2"
              >
                <Camera className="w-4 h-4 text-[#D4A373]" />
                Launch Camera QR Scanner
              </button>
            </div>

            {scannedOrderDetails && (
              <div className="bg-[#FFFDF9] border-2 border-emerald-500 rounded-2xl p-5 shadow-md animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#E8DACB] pb-3 mb-3">
                  <h4 className="font-bold text-sm text-[#42281D]">
                    Scanned Order Verified: #{scannedOrderDetails.orderNumber}
                  </h4>
                  <span className="bg-emerald-100 text-emerald-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {scannedOrderDetails.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#6B5A50]">
                  <p>
                    <strong>Customer:</strong> {scannedOrderDetails.customerName} ({scannedOrderDetails.customerPhone})
                  </p>
                  <p>
                    <strong>Cake:</strong> {scannedOrderDetails.cakeName} ({scannedOrderDetails.size} • {scannedOrderDetails.flavour})
                  </p>
                  <p>
                    <strong>Total:</strong> ₹{scannedOrderDetails.totalAmount} |{' '}
                    <strong className="text-red-600">Balance Due: ₹{scannedOrderDetails.balanceAmount}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8DACB] flex gap-2">
                  <button
                    onClick={() => {
                      updateOrderStatus(scannedOrderDetails.id, 'completed', 'Order picked up by customer at counter');
                      setScannedOrderDetails({ ...scannedOrderDetails, status: 'completed', balanceAmount: 0 });
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl cursor-pointer"
                  >
                    Mark Handed Over & Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: EXPENSES */}
        {/* ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Header and Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Daily Shop Expense Tracking
                </h3>
                <p className="text-xs text-[#8A7569]">
                  {isSuperAdmin
                    ? 'Audited store overheads, raw materials, dairy, utilities, and daily shop running costs across all branches'
                    : `Logging daily running expenses for ${shops.find((s) => s.id === staffShopId)?.name || 'Assigned Branch'}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      const csvContent =
                        'data:text/csv;charset=utf-8,' +
                        'Date,Shop,Title,Category,Amount,Payment Method,Paid By,Description\n' +
                        filteredExpenses
                          .map(
                            (e) =>
                              `"${e.date}","${e.shopId}","${e.title}","${e.category}",${e.amount},"${e.paymentMethod}","${e.paidBy}","${e.description}"`
                          )
                          .join('\n');
                      const link = document.createElement('a');
                      link.setAttribute('href', encodeURI(csvContent));
                      link.setAttribute('download', `Vinutha-Expenses-${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex items-center gap-1.5 bg-[#FAF4ED] hover:bg-[#F2E5D5] text-[#42281D] text-xs font-bold px-3 py-2 rounded-xl cursor-pointer border border-[#E8DACB] transition-all"
                    title="Export expense data to CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C88141]" />
                    Export CSV
                  </button>
                )}

                <button
                  onClick={handleOpenAddExpense}
                  className="flex items-center gap-1.5 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4 text-[#D4A373]" />
                  Record New Expense
                </button>
              </div>
            </div>

            {/* Financial Summary Cards */}
            {isSuperAdmin ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-[#8A7569] uppercase tracking-wider">
                    Total Operating Expenses
                  </span>
                  <p className="text-xl md:text-2xl font-extrabold text-red-600 font-mono mt-0.5">
                    ₹{totalOperatingExpenses.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#6B5A50] mt-1">{filteredExpenses.length} total entries</p>
                </div>
                <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-[#8A7569] uppercase tracking-wider">
                    Shop 1 (Bazaar) Total
                  </span>
                  <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono mt-0.5">
                    ₹{expenses.filter((e) => e.shopId === 'shop-1').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#6B5A50] mt-1">Branch overheads</p>
                </div>
                <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-[#8A7569] uppercase tracking-wider">
                    Shop 2 (Station) Total
                  </span>
                  <p className="text-xl md:text-2xl font-extrabold text-[#42281D] font-mono mt-0.5">
                    ₹{expenses.filter((e) => e.shopId === 'shop-2').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#6B5A50] mt-1">Branch overheads</p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-[#FAF4ED] text-[#C88141] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-[#E8DACB] uppercase tracking-wider">
                    Branch Staff Portal: {shops.find((s) => s.id === staffShopId)?.name}
                  </span>
                  <p className="text-xs text-[#8A7569]">
                    Authorized staff expense entries for your assigned bakery counter. Overall financial analytics and total revenue are restricted to Admin.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-[#8A7569] font-bold uppercase">Today's Branch Expenses</span>
                    <p className="text-lg font-bold text-red-600 font-mono">
                      ₹{filteredExpenses.filter((e) => e.date === new Date().toISOString().split('T')[0]).reduce((s, e) => s + e.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right border-l border-[#E8DACB] pl-4">
                    <span className="text-[10px] text-[#8A7569] font-bold uppercase">Total Branch Records</span>
                    <p className="text-lg font-bold text-[#42281D] font-mono">
                      {filteredExpenses.length} entries
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[#8A7569] font-bold text-[11px] whitespace-nowrap mr-1">Filter Category:</span>
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'ingredients', label: 'Ingredients' },
                { id: 'milk_and_cream', label: 'Milk & Cream' },
                { id: 'flour', label: 'Flour' },
                { id: 'sugar', label: 'Sugar' },
                { id: 'decorations', label: 'Decorations' },
                { id: 'packaging', label: 'Packaging' },
                { id: 'electricity', label: 'Electricity' },
                { id: 'delivery', label: 'Delivery' },
                { id: 'rent', label: 'Rent' },
                { id: 'cleaning', label: 'Cleaning' },
                { id: 'repairs', label: 'Repairs' },
                { id: 'other', label: 'Other' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setExpenseFilterCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    expenseFilterCategory === cat.id
                      ? 'bg-[#42281D] text-white shadow-xs'
                      : 'bg-[#FAF4ED] text-[#6B5A50] hover:bg-[#F2E5D5]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Expenses Table */}
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF4ED] text-[#42281D] uppercase text-[10px] font-bold tracking-wider border-b border-[#E8DACB]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Shop</th>
                      <th className="p-3">Expense Title & Description</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Paid By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DACB]">
                    {filteredExpenses
                      .filter((exp) =>
                        expenseFilterCategory === 'all' ? true : exp.category === expenseFilterCategory
                      )
                      .map((exp) => (
                        <tr key={exp.id} className="hover:bg-[#FAF4ED]/50 transition-colors">
                          <td className="p-3 font-mono text-[11px] text-[#6B5A50] whitespace-nowrap">{exp.date}</td>
                          <td className="p-3 font-mono font-bold text-[#42281D] whitespace-nowrap">
                            {exp.shopId.toUpperCase()}
                          </td>
                          <td className="p-3 max-w-xs">
                            <p className="font-bold text-[#42281D]">{exp.title}</p>
                            <p className="text-[11px] text-[#6B5A50] truncate">{exp.description}</p>
                            {exp.receiptUrl && (
                              <a
                                href={exp.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5 hover:underline"
                              >
                                📎 View Receipt
                              </a>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="bg-[#FAF4ED] text-[#C88141] font-bold text-[10px] px-2 py-0.5 rounded uppercase border border-[#E8DACB]">
                              {exp.category.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-red-600 whitespace-nowrap">₹{exp.amount}</td>
                          <td className="p-3 uppercase text-[11px] font-medium text-[#6B5A50] whitespace-nowrap">
                            {exp.paymentMethod}
                          </td>
                          <td className="p-3 text-[11px] text-[#42281D] font-medium whitespace-nowrap">{exp.paidBy}</td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditExpense(exp)}
                                className="p-1.5 rounded-lg text-[#C88141] hover:bg-[#FAF4ED] transition-colors cursor-pointer"
                                title="Edit Expense"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {filteredExpenses.filter((exp) =>
                      expenseFilterCategory === 'all' ? true : exp.category === expenseFilterCategory
                    ).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-[#8A7569] text-xs">
                          No expense entries found for the selected category.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: SUPPLIER PURCHASES & INVOICES */}
        {/* ========================================================================= */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Supplier Invoices & Stock Purchases
                </h3>
                <p className="text-xs text-[#8A7569]">
                  Saving bills automatically increments the receiving shop's inventory stock!
                </p>
              </div>

              <button
                onClick={() => setIsNewPurchaseOpen(true)}
                className="flex items-center gap-1.5 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-[#D4A373]" />
                Add Supplier Purchase Bill
              </button>
            </div>

            {/* Purchases Table */}
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF4ED] text-[#42281D] uppercase text-[10px] font-bold tracking-wider border-b border-[#E8DACB]">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Shop</th>
                    <th className="p-3">Supplier Name</th>
                    <th className="p-3">Items Purchased</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DACB]">
                  {filteredPurchases.map((pur) => (
                    <tr key={pur.id} className="hover:bg-[#FAF4ED]/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#42281D]">#{pur.invoiceNumber}</td>
                      <td className="p-3 font-mono text-[11px] text-[#6B5A50]">{pur.date}</td>
                      <td className="p-3 font-mono font-bold text-[#42281D]">
                        {pur.shopId.toUpperCase()}
                      </td>
                      <td className="p-3 font-bold text-[#2C1A11]">{pur.supplierName}</td>
                      <td className="p-3">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#6B5A50]">
                          {pur.items.map((it, idx) => (
                            <li key={idx}>
                              {it.name} – {it.quantity} {it.unit} (@ ₹{it.unitPrice})
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-3 font-mono font-bold text-[#42281D]">
                        ₹{pur.totalAmount}
                        {pur.outstandingBalance > 0 && (
                          <span className="block text-[10px] text-red-600">
                            Due: ₹{pur.outstandingBalance}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${
                            pur.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {pur.paymentStatus.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: INVENTORY & STOCK */}
        {/* ========================================================================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Shop Ingredients & Packaging Inventory
                </h3>
                <p className="text-xs text-[#8A7569]">
                  Live raw material stock levels with low-stock warnings and adjustment logs
                </p>
              </div>

              {lowStockItems.length > 0 && (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {lowStockItems.length} Low Stock Alert(s)
                </span>
              )}
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {filteredInventory.map((item) => {
                const isLow = item.currentQuantity <= item.minStockLevel;
                return (
                  <div
                    key={item.id}
                    className={`bg-[#FFFDF9] border rounded-2xl p-4 shadow-sm flex flex-col justify-between ${
                      isLow ? 'border-amber-400 bg-amber-50/20' : 'border-[#E8DACB]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C88141]">
                          {item.category} • {item.shopId.toUpperCase()}
                        </span>
                        {isLow && (
                          <span className="bg-red-100 text-red-700 font-bold text-[10px] px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-[#42281D] leading-tight">{item.name}</h4>

                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-[#42281D] font-mono">
                          {item.currentQuantity}
                        </span>
                        <span className="text-xs text-[#8A7569] font-medium">{item.unit}</span>
                        <span className="text-[10px] text-[#A39284] ml-auto">
                          Min threshold: {item.minStockLevel} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#E8DACB] flex items-center justify-between">
                      <span className="text-[10px] text-[#8A7569]">Last restock: {item.lastRestocked}</span>
                      <button
                        onClick={() => {
                          const newQ = prompt(`Adjust stock for ${item.name} (${item.unit}):`, String(item.currentQuantity));
                          if (newQ !== null && !isNaN(Number(newQ))) {
                            const reason = prompt('Reason for adjustment:', 'Stock physical audit') || '';
                            adjustStock(item.id, Number(newQ), reason);
                          }
                        }}
                        className="text-xs font-bold text-[#5C3826] bg-[#FAF4ED] hover:bg-[#F2E5D5] border border-[#E0D3C5] px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        Adjust Qty
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: CAKE CATALOG MANAGER (SUPER ADMIN) */}
        {/* ========================================================================= */}
        {activeTab === 'cakes' && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Cake Product Catalog & Pricing Manager
                </h3>
                <p className="text-xs text-[#8A7569]">
                  Add new cake creations, update pricing per size, upload photos, and toggle availability
                </p>
              </div>

              <button
                onClick={handleOpenAddCake}
                className="flex items-center gap-1.5 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-[#D4A373]" />
                Add New Cake Item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cakes.map((cake) => (
                <div
                  key={cake.id}
                  className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-3">
                      <img
                        src={cake.images[0] || '/images/hero_cake.jpg'}
                        alt={cake.name}
                        className="w-20 h-20 rounded-xl object-cover border border-[#E8DACB] shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/hero_cake.jpg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-[#E06D80] uppercase tracking-wider">
                            {cake.categorySlug.replace('-', ' ')}
                          </span>
                          {cake.badge && (
                            <span className="bg-[#FAF4ED] text-[#C88141] text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-[#E8DACB]">
                              {cake.badge}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs md:text-sm text-[#42281D] truncate mt-0.5">{cake.name}</h4>
                        <p className="text-xs font-bold text-[#C88141] mt-0.5 font-mono">Base: ₹{cake.basePrice}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <button
                            onClick={() => updateCake(cake.id, { isAvailable: !cake.isAvailable })}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              cake.isAvailable
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {cake.isAvailable ? '✓ Available' : '✕ Unavailable'}
                          </button>

                          <button
                            onClick={() =>
                              updateCake(cake.id, {
                                stockStatus: cake.stockStatus === 'out_of_stock' ? 'in_stock' : 'out_of_stock',
                              })
                            }
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                              cake.stockStatus === 'out_of_stock'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {cake.stockStatus === 'out_of_stock' ? 'Out of Stock' : 'In Stock'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Configured Weights & Prices */}
                    <div className="mt-3 pt-2 border-t border-[#E8DACB]">
                      <span className="text-[10px] font-bold text-[#8A7569] uppercase tracking-wider block mb-1">
                        Weights & Prices ({cake.sizes.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cake.sizes.map((s) => (
                          <span
                            key={s.size}
                            className="bg-[#FAF4ED] text-[#42281D] text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border border-[#E8DACB]"
                          >
                            {s.size}: <strong>₹{s.price}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#E8DACB] flex justify-between items-center text-xs">
                    <button
                      onClick={() => handleOpenEditCake(cake)}
                      className="flex items-center gap-1 text-xs font-bold text-[#C88141] hover:text-[#A76326] cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Cake
                    </button>
                    <button
                      onClick={() => handleDeleteCake(cake.id)}
                      className="flex items-center gap-1 text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: FINANCIAL REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          !isSuperAdmin ? (
            <div className="bg-[#FFFDF9] border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-sm my-10">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-[#42281D]">Access Restricted: Admin Only</h3>
              <p className="text-xs text-[#8A7569] mt-2 leading-relaxed">
                Staff accounts are restricted from accessing multi-shop financial ledgers, store revenue, and net profit calculations. Please use the Expenses module to record branch expenses.
              </p>
            </div>
          ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base font-serif text-[#42281D]">
                  Vinutha Bakery Financial Reports & Ledger
                </h3>
                <p className="text-xs text-[#8A7569]">
                  Audited overview of sales, operating expenses, supplier liabilities, and estimated gross profit
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all"
              >
                <Download className="w-3.5 h-3.5 text-[#D4A373]" />
                Download CSV Financial Export
              </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-[#8A7569] uppercase tracking-wider">Total Sales Revenue</p>
                <p className="text-3xl font-extrabold text-[#42281D] font-mono mt-1">
                  ₹{totalSalesRevenue.toLocaleString()}
                </p>
                <div className="mt-2 text-xs text-[#6B5A50] space-y-0.5">
                  <p>• Advance Payments: ₹{totalAdvanceCollected.toLocaleString()}</p>
                  <p>• Remaining Customer Dues: ₹{totalCustomerBalanceDue.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-[#8A7569] uppercase tracking-wider">
                  Operating Expenses
                </p>
                <p className="text-3xl font-extrabold text-red-600 font-mono mt-1">
                  ₹{totalOperatingExpenses.toLocaleString()}
                </p>
                <p className="text-xs text-[#6B5A50] mt-2">
                  Overheads, dairy, utilities & repair expenses
                </p>
              </div>

              <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-[#8A7569] uppercase tracking-wider">
                  Estimated Gross Profit
                </p>
                <p className="text-3xl font-extrabold text-emerald-700 font-mono mt-1">
                  ₹{estimatedProfit.toLocaleString()}
                </p>
                <p className="text-[11px] text-[#A39284] mt-2 leading-relaxed">
                  * Note: Estimate based on recorded customer sales minus operating expenses. Inventory consumption calculation reflects standard periodic accounting.
                </p>
              </div>
            </div>

            {/* Supplier Liabilities Table */}
            <div className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-sm font-serif text-[#42281D] mb-3">
                Supplier Outstanding Balances & Payables
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF4ED] text-[#42281D] uppercase text-[10px] font-bold tracking-wider border-b border-[#E8DACB]">
                    <tr>
                      <th className="p-2.5">Supplier Name</th>
                      <th className="p-2.5">Contact Person</th>
                      <th className="p-2.5">Phone</th>
                      <th className="p-2.5">GST Number</th>
                      <th className="p-2.5 text-right">Current Payable Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DACB]">
                    {suppliers.map((sup) => (
                      <tr key={sup.id}>
                        <td className="p-2.5 font-bold text-[#42281D]">{sup.name}</td>
                        <td className="p-2.5 text-[#6B5A50]">{sup.contactPerson}</td>
                        <td className="p-2.5 text-[#6B5A50]">{sup.phone}</td>
                        <td className="p-2.5 font-mono text-[#8A7569]">{sup.gstNumber || 'N/A'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-600">
                          ₹{sup.balance.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}

        {/* ========================================================================= */}
        {/* TAB 9: STAFF & SHOPS (SUPER ADMIN ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'staff' && isSuperAdmin && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-base font-serif text-[#42281D]">
                Staff Accounts & Shop Branch Assignment
              </h3>
              <p className="text-xs text-[#8A7569]">
                Role-based access enforcement: Shop staff are strictly isolated to their assigned branch
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {staffUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-4 shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase text-[#E06D80] bg-[#FDE8E9] px-2 py-0.5 rounded">
                      {user.role.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      Active
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-[#42281D]">{user.name}</h4>
                  <p className="text-xs text-[#6B5A50]">Username: <strong className="font-mono">{user.username}</strong></p>
                  <p className="text-xs text-[#6B5A50]">Phone: {user.phone}</p>

                  <div className="pt-2 border-t border-[#E8DACB] text-[11px] text-[#42281D] font-medium">
                    Branch:{' '}
                    {user.assignedShopId
                      ? shops.find((s) => s.id === user.assignedShopId)?.name
                      : 'Global Access (Both Shops)'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: SHOP SETTINGS & UPI CONFIGURATION (SUPER ADMIN ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && isSuperAdmin && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="font-bold text-base font-serif text-[#42281D]">
                Bakery Shop Profile & UPI Configuration
              </h3>
              <p className="text-xs text-[#8A7569]">
                Configure shop address, operating hours, phone numbers, and official UPI ID for PhonePe / QR payments
              </p>
            </div>

            {settingsSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveShopSettings} className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Bakery Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsShopName}
                    onChange={(e) => setSettingsShopName(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={settingsTagline}
                    onChange={(e) => setSettingsTagline(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Physical Shop Address *
                </label>
                <input
                  type="text"
                  required
                  value={settingsAddress}
                  onChange={(e) => setSettingsAddress(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    value={settingsPhone}
                    onChange={(e) => setSettingsPhone(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={settingsWhatsapp}
                    onChange={(e) => setSettingsWhatsapp(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={settingsOperatingHours}
                    onChange={(e) => setSettingsOperatingHours(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                  />
                </div>
              </div>

              {/* UPI & Payment Settings */}
              <div className="p-4 bg-[#FAF4ED] border border-[#E8DACB] rounded-xl space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#42281D] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#E06D80]" />
                  UPI & Payment Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                      Official Merchant UPI ID *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. vinuthabakery@okaxis"
                      value={settingsUpiId}
                      onChange={(e) => setSettingsUpiId(e.target.value)}
                      className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#42281D]"
                    />
                    <p className="text-[10px] text-[#8A7569] mt-0.5">Used for customer PhonePe intent links & QR codes</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                      Required Advance Payment (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settingsAdvancePercent}
                      onChange={(e) => setSettingsAdvancePercent(Number(e.target.value))}
                      className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#42281D]"
                    />
                    <p className="text-[10px] text-[#8A7569] mt-0.5">e.g. 50% advance to confirm cake baking</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                    Counter QR Destination URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://10.10.68.243:5173/?table=counter"
                    value={settingsCounterQrUrl}
                    onChange={(e) => setSettingsCounterQrUrl(e.target.value)}
                    className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-mono text-[#2C1A11]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSavingSettings ? 'Saving Settings...' : 'Save Bakery Settings & UPI'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onOrderFound={(order) => {
          setIsScannerOpen(false);
          setScannedOrderDetails(order);
          setActiveTab('scanner');
        }}
      />

      {/* NEW & EDIT EXPENSE MODAL */}
      {isNewExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveExpense}
            className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E8DACB] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#42281D]">
                  {editingExpenseId ? 'Edit Shop Expense Record' : 'Record New Daily Shop Expense'}
                </h4>
                <p className="text-[11px] text-[#8A7569]">
                  {isSuperAdmin
                    ? 'Super Admin full expense management'
                    : `Staff expense logger for ${shops.find((s) => s.id === staffShopId)?.name}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewExpenseOpen(false);
                  setEditingExpenseId(null);
                }}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Shop Branch
                </label>
                <select
                  value={expenseShopId}
                  onChange={(e) => setExpenseShopId(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Expense Title / Item *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50L Nandini Full Cream Milk, 25kg Maida Flour"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                >
                  <option value="ingredients">Ingredients</option>
                  <option value="milk_and_cream">Milk and Cream</option>
                  <option value="flour">Flour</option>
                  <option value="sugar">Sugar</option>
                  <option value="decorations">Decorations & Toppings</option>
                  <option value="packaging">Packaging & Boxes</option>
                  <option value="electricity">Electricity & Utilities</option>
                  <option value="delivery">Delivery & Transport</option>
                  <option value="rent">Shop Rent</option>
                  <option value="cleaning">Cleaning & Hygiene</option>
                  <option value="repairs">Repairs & Maintenance</option>
                  <option value="other">Other Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={expenseAmount || ''}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={expensePaymentMethod}
                onChange={(e) => setExpensePaymentMethod(e.target.value as any)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
              >
                <option value="cash">Cash Counter Drawer</option>
                <option value="upi">UPI (GPay / PhonePe / QR)</option>
                <option value="card">Card Terminal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Receipt / Bill Photo (Optional)
              </label>
              <div className="flex items-center gap-2">
                <label className="bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#5C3826] text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#C88141]" />
                  Upload Receipt
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const url = await api.uploadFile(file);
                          setExpenseReceiptUrl(url);
                        } catch {
                          const r = new FileReader();
                          r.onloadend = () => setExpenseReceiptUrl(r.result as string);
                          r.readAsDataURL(file);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {expenseReceiptUrl && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-emerald-700 font-bold">✓ Attached</span>
                    <button
                      type="button"
                      onClick={() => setExpenseReceiptUrl(undefined)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="Vendor name, bill number, or reason for expense..."
                value={expenseNotes}
                onChange={(e) => setExpenseNotes(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E8DACB]">
              <button
                type="button"
                onClick={() => {
                  setIsNewExpenseOpen(false);
                  setEditingExpenseId(null);
                }}
                className="px-3 py-1.5 text-xs text-[#6B5A50] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all"
              >
                {editingExpenseId ? 'Save Changes' : 'Save Expense Record'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW PURCHASE BILL MODAL */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePurchase}
            className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E8DACB] pb-3">
              <div>
                <h4 className="font-bold text-sm text-[#42281D]">Enter Supplier Purchase Invoice</h4>
                <p className="text-[11px] text-[#8A7569]">
                  Inventory stock will automatically be incremented
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Receiving Shop
                </label>
                <select
                  value={purchaseShopId}
                  onChange={(e) => setPurchaseShopId(e.target.value)}
                  disabled={!isSuperAdmin}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Supplier
                </label>
                <select
                  value={purchaseSupplierId}
                  onChange={(e) => setPurchaseSupplierId(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                >
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Invoice Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-2026-99"
                  value={purchaseInvoiceNo}
                  onChange={(e) => setPurchaseInvoiceNo(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>
            </div>

            {/* Line item entry */}
            <div className="border border-[#E8DACB] rounded-xl p-3 bg-[#FAF4ED] space-y-2">
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider">
                Line Items
              </label>
              {purchaseItemsList.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center text-xs">
                  <input
                    type="text"
                    value={item.name}
                    placeholder="Item name"
                    onChange={(e) => {
                      const updated = [...purchaseItemsList];
                      updated[idx].name = e.target.value;
                      setPurchaseItemsList(updated);
                    }}
                    className="col-span-2 bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    placeholder="Qty"
                    onChange={(e) => {
                      const updated = [...purchaseItemsList];
                      updated[idx].quantity = Number(e.target.value);
                      updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                      setPurchaseItemsList(updated);
                    }}
                    className="bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.unitPrice}
                    placeholder="Price"
                    onChange={(e) => {
                      const updated = [...purchaseItemsList];
                      updated[idx].unitPrice = Number(e.target.value);
                      updated[idx].totalPrice = updated[idx].quantity * updated[idx].unitPrice;
                      setPurchaseItemsList(updated);
                    }}
                    className="bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Amount Paid (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={purchaseAmountPaid}
                  onChange={(e) => setPurchaseAmountPaid(Number(e.target.value))}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={purchasePaymentMethod}
                  onChange={(e) => setPurchasePaymentMethod(e.target.value as 'cash' | 'upi' | 'bank_transfer' | 'credit')}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                >
                  <option value="upi">UPI / Online Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit / Payable</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewPurchaseOpen(false)}
                className="px-3 py-1.5 text-xs text-[#6B5A50] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md"
              >
                Save Bill & Increment Stock
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QUOTATION DIALOG */}
      {quotingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendQuote}
            className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-3"
          >
            <h4 className="font-bold text-sm text-[#42281D]">
              Price Quotation for #{quotingOrder.orderNumber}
            </h4>
            <p className="text-xs text-[#6B5A50]">
              Customer: {quotingOrder.customerName} • {quotingOrder.size} {quotingOrder.flavour}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Total Quoted Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={quoteInputPrice}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setQuoteInputPrice(p);
                    setQuoteInputAdvance(Math.round(p * 0.5));
                  }}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-[#42281D]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Advance Required (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={quoteInputPrice}
                  value={quoteInputAdvance}
                  onChange={(e) => setQuoteInputAdvance(Number(e.target.value))}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-[#42281D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Quotation Notes / Terms
              </label>
              <input
                type="text"
                placeholder="e.g. Handcrafted fondant detailing, 2-tier structure"
                value={quoteInputNotes}
                onChange={(e) => setQuoteInputNotes(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuotingOrder(null)}
                className="px-3 py-1.5 text-xs text-[#6B5A50] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md"
              >
                Send Quotation to Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NEW & EDIT CAKE ITEM MODAL (Accessible to Admin and Authorized Staff) */}
      {isNewCakeOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCake}
            className="bg-[#FFFDF9] border border-[#E8DACB] rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3.5 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E8DACB] pb-3">
              <div>
                <h4 className="font-bold text-sm md:text-base text-[#42281D]">
                  {editingCakeId ? 'Edit Cake Product' : 'Add New Cake to Menu'}
                </h4>
                <p className="text-[11px] text-[#8A7569]">
                  Manage cake details, weights, prices, availability, and high-resolution photos
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewCakeOpen(false);
                  setEditingCakeId(null);
                }}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error & Success Messages */}
            {cakeFormError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{cakeFormError}</span>
              </div>
            )}
            {cakeFormSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{cakeFormSuccess}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Cake Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Belgian Truffle Delight, Fresh Butterscotch Crown"
                  value={cakeFormName}
                  onChange={(e) => setCakeFormName(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={cakeFormCategory}
                  onChange={(e) => setCakeFormCategory(e.target.value as any)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                >
                  <option value="normal-cakes">Normal Fresh Cakes</option>
                  <option value="ice-cakes">Ice & Pastry Cakes</option>
                  <option value="birthday">Birthday Cakes</option>
                  <option value="anniversary">Anniversary Cakes</option>
                  <option value="custom">Custom Celebration Cakes</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Base Price for 1.0 kg (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={cakeFormBasePrice}
                  onChange={(e) => setCakeFormBasePrice(Number(e.target.value))}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Dietary Type (Eggless vs With Egg) *
                </label>
                <select
                  value={cakeFormEggOrEggless}
                  onChange={(e) => setCakeFormEggOrEggless(e.target.value as 'eggless' | 'contains_egg')}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs font-semibold text-[#2C1A11]"
                >
                  <option value="eggless">🌱 100% Eggless (Pure Veg)</option>
                  <option value="contains_egg">🥚 Contains Egg (Regular)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Preparation Time *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 30 mins, 2 hours, Same Day"
                  value={cakeFormPrepTime}
                  onChange={(e) => setCakeFormPrepTime(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>
            </div>

            {/* Cake Photo Upload & Preview */}
            <div className="border border-[#E8DACB] rounded-xl p-3 bg-[#FAF4ED] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider">
                  Cake Photos & Image Gallery
                </label>
                <label className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1 shadow-xs">
                  <Upload className="w-3 h-3 text-[#D4A373]" />
                  <span>{isUploadingCakePhoto ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingCakePhoto}
                    onChange={handleCakePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photos Previews */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cakeFormImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-[#D9C8B8] bg-white shadow-xs">
                    <img
                      src={imgUrl}
                      alt={`Cake preview ${idx}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/hero_cake.jpg';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setCakeFormImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-0.5 opacity-90 hover:opacity-100 transition-opacity"
                      title="Remove Photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-[#42281D]/80 text-[8px] text-white font-bold text-center py-0.5">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Direct image url add */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Or enter image URL (e.g. /images/hero_cake.jpg)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setCakeFormImages((prev) => [...prev, val]);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  id="cake-img-url-input"
                  className="flex-1 bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-[11px] text-[#2C1A11]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('cake-img-url-input') as HTMLInputElement;
                    if (el && el.value.trim()) {
                      setCakeFormImages((prev) => [...prev, el.value.trim()]);
                      el.value = '';
                    }
                  }}
                  className="bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#42281D] text-[11px] font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  + Add URL
                </button>
              </div>
            </div>

            {/* Dynamic Cake Sizes & Weight Pricing */}
            <div className="border border-[#E8DACB] rounded-xl p-3 bg-[#FAF4ED] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider">
                  Weight Tiers & Individual Pricing *
                </label>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleAddCakeSizePreset('0.5 kg', 0.55)}
                    className="text-[10px] bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#42281D] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    + 0.5 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCakeSizePreset('1.0 kg', 1.0)}
                    className="text-[10px] bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#42281D] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    + 1.0 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCakeSizePreset('1.5 kg', 1.45)}
                    className="text-[10px] bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#42281D] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    + 1.5 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCakeSizePreset('2.0 kg', 1.9)}
                    className="text-[10px] bg-white border border-[#D9C8B8] hover:bg-[#FAF4ED] text-[#42281D] font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    + 2.0 kg
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddCakeSizePreset('Custom Weight', 1.0)}
                    className="text-[10px] bg-[#E06D80] text-white font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    + Custom
                  </button>
                </div>
              </div>

              {/* Sizes Rows */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {cakeFormSizes.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white border border-[#D9C8B8] rounded-lg p-1.5 shadow-xs">
                    <input
                      type="text"
                      placeholder="e.g. 0.5 kg or 3.0 kg"
                      value={s.size}
                      onChange={(e) => handleUpdateCakeSize(idx, e.target.value, s.price)}
                      className="flex-1 bg-transparent text-xs font-semibold text-[#2C1A11] px-1 focus:outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold text-[#8A7569]">₹</span>
                      <input
                        type="number"
                        min={50}
                        value={s.price}
                        onChange={(e) => handleUpdateCakeSize(idx, s.size, Number(e.target.value))}
                        className="w-20 bg-[#FAF4ED] border border-[#E8DACB] rounded px-1.5 py-0.5 text-xs font-mono font-bold text-[#42281D]"
                      />
                    </div>
                    {cakeFormSizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCakeSize(idx)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Remove weight tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Availability & Stock Controls */}
            <div className="grid grid-cols-2 gap-3 bg-[#FAF4ED] border border-[#E8DACB] rounded-xl p-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Catalog Visibility
                </label>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={cakeFormIsAvailable}
                    onChange={(e) => setCakeFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-[#E06D80] focus:ring-[#E06D80]"
                  />
                  <span className="text-xs font-bold text-[#42281D]">
                    {cakeFormIsAvailable ? 'Active (Customers Can Order)' : 'Hidden / Inactive'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Stock Status
                </label>
                <select
                  value={cakeFormStockStatus}
                  onChange={(e) => setCakeFormStockStatus(e.target.value as any)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-lg px-2 py-1 text-xs text-[#2C1A11] font-semibold"
                >
                  <option value="in_stock">In Stock (Ready to Bake)</option>
                  <option value="out_of_stock">Out of Stock (Temporarily Unavailable)</option>
                </select>
              </div>
            </div>

            {/* Flavours & Badge */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Flavours (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Vanilla, Belgian Chocolate, Strawberry"
                  value={cakeFormFlavours}
                  onChange={(e) => setCakeFormFlavours(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                  Product Badge (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Bestseller, Chef Special, Signature"
                  value={cakeFormBadge}
                  onChange={(e) => setCakeFormBadge(e.target.value)}
                  className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-[#42281D] uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Delicious artisanal cake made with fresh cream, gourmet chocolate and signature toppings..."
                value={cakeFormDesc}
                onChange={(e) => setCakeFormDesc(e.target.value)}
                className="w-full bg-white border border-[#D9C8B8] rounded-xl px-3 py-2 text-xs text-[#2C1A11]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#E8DACB]">
              <button
                type="button"
                onClick={() => {
                  setIsNewCakeOpen(false);
                  setEditingCakeId(null);
                }}
                className="px-3 py-1.5 text-xs text-[#6B5A50] hover:bg-[#FAF4ED] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#42281D] hover:bg-[#2C1A11] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer shadow-md transition-all"
              >
                {editingCakeId ? 'Save Cake Updates' : 'Publish Cake to Menu'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
