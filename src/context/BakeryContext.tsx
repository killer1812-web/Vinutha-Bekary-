import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Shop,
  StaffUser,
  CakeCategory,
  CakeItem,
  Order,
  OrderStatus,
  Expense,
  Supplier,
  PurchaseRecord,
  InventoryItem,
  StockMovement,
  AppNotification,
  AuditLog,
  CustomerUser,
  CustomerNotification,
  StockRequirement,
} from '../types';
import {
  INITIAL_SHOPS,
  INITIAL_STAFF,
  INITIAL_CATEGORIES,
  INITIAL_CAKES,
  INITIAL_SUPPLIERS,
  INITIAL_INVENTORY,
  INITIAL_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_PURCHASES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialData';
import { api } from '../services/api';

interface BakeryContextType {
  shops: Shop[];
  activeShopId: string;
  setActiveShopId: (id: string) => void;
  activeShop: Shop;
  isBackendConnected: boolean;
  updateShopSettings: (settings: Partial<Shop>) => Promise<void>;

  // Customer Auth & Portal
  currentCustomer: CustomerUser | null;
  customerNotifications: CustomerNotification[];
  customerLogin: (name: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  customerLogout: () => void;
  respondToCustomerQuote: (orderId: string, accept: boolean) => Promise<void>;
  markCustomerNotificationRead: (id: string) => Promise<void>;

  // Staff / Admin Auth
  currentUser: StaffUser | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchDemoRole: (roleKey: 'owner' | 'staff1' | 'staff2' | 'customer') => void;
  staffUsers: StaffUser[];
  addStaffUser: (user: Omit<StaffUser, 'id'>) => void;

  // Cakes
  cakes: CakeItem[];
  categories: CakeCategory[];
  addCake: (cake: Omit<CakeItem, 'id'>) => Promise<void>;
  updateCake: (id: string, updates: Partial<CakeItem>) => Promise<void>;
  deleteCake: (id: string) => Promise<void>;

  // Orders & Payments
  orders: Order[];
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
  submitQuotation: (
    orderId: string,
    quotedPrice: number,
    notes?: string,
    advanceRequired?: number,
    expiryDate?: string
  ) => Promise<void>;
  respondToQuotation: (orderId: string, accept: boolean) => Promise<void>;
  recordPayment: (
    orderId: string,
    amount: number,
    paymentMethod?: string,
    transactionRef?: string
  ) => Promise<void>;
  verifyOrderPayment: (orderId: string, paymentId?: string, isVerified?: boolean) => Promise<void>;
  getOrderByIdOrToken: (identifier: string) => Order | undefined;

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  updateExpense: (id: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Suppliers & Purchases
  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  purchaseRecords: PurchaseRecord[];
  addPurchaseRecord: (record: Omit<PurchaseRecord, 'id' | 'createdAt'>) => Promise<void>;

  // Inventory & Stock
  inventory: InventoryItem[];
  adjustStock: (itemId: string, newQty: number, reason: string) => Promise<void>;
  stockMovements: StockMovement[];

  // Staff Stock Requirements & Admin Purchase List
  stockRequirements: StockRequirement[];
  createStockRequirement: (
    reqData: Omit<StockRequirement, 'id' | 'createdAt' | 'updatedAt' | 'quantityToPurchase'>
  ) => Promise<StockRequirement>;
  updateStockRequirementStatus: (
    id: string,
    status: 'Requested' | 'Approved' | 'Purchased' | 'Cancelled',
    purchasePrice?: number
  ) => Promise<void>;

  // Notifications & Audits
  notifications: AppNotification[];
  markNotificationRead: (id: string) => Promise<void>;
  auditLogs: AuditLog[];
}

const BakeryContext = createContext<BakeryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SHOPS: 'vb_shops_v1',
  CAKES: 'vb_cakes_v1',
  ORDERS: 'vb_orders_v1',
  EXPENSES: 'vb_expenses_v1',
  SUPPLIERS: 'vb_suppliers_v1',
  PURCHASES: 'vb_purchases_v1',
  INVENTORY: 'vb_inventory_v1',
  MOVEMENTS: 'vb_movements_v1',
  NOTIFICATIONS: 'vb_notifications_v1',
  STOCK_REQUIREMENTS: 'vb_stock_reqs_v1',
  USER: 'vb_current_user_v1',
  ACTIVE_SHOP: 'vb_active_shop_v1',
  STAFF: 'vb_staff_v1',
  CUSTOMER: 'vb_current_customer_v1',
  CUSTOMER_NOTIFS: 'vb_cust_notifs_v1',
};

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('Failed to load storage for', key, e);
    return fallback;
  }
}

function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save storage for', key, e);
  }
}

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shops, setShops] = useState<Shop[]>(() => loadStorage(STORAGE_KEYS.SHOPS, INITIAL_SHOPS));
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Customer Session (Name + 10-digit Phone)
  const [currentCustomer, setCurrentCustomer] = useState<CustomerUser | null>(() =>
    loadStorage(STORAGE_KEYS.CUSTOMER, null)
  );
  const [customerNotifications, setCustomerNotifications] = useState<CustomerNotification[]>(() =>
    loadStorage(STORAGE_KEYS.CUSTOMER_NOTIFS, [])
  );

  const [activeShopId, setActiveShopIdState] = useState<string>(() =>
    loadStorage(STORAGE_KEYS.ACTIVE_SHOP, 'shop-1')
  );

  const setActiveShopId = (id: string) => {
    setActiveShopIdState(id);
    saveStorage(STORAGE_KEYS.ACTIVE_SHOP, id);
  };

  const activeShop = shops.find((s) => s.id === activeShopId) || shops[0];

  // Auth State
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(() => loadStorage(STORAGE_KEYS.STAFF, INITIAL_STAFF));
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => loadStorage(STORAGE_KEYS.USER, null));

  // Domain states
  const [cakes, setCakes] = useState<CakeItem[]>(() => loadStorage(STORAGE_KEYS.CAKES, INITIAL_CAKES));
  const [orders, setOrders] = useState<Order[]>(() => loadStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadStorage(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS));
  const [purchaseRecords, setPurchaseRecords] = useState<PurchaseRecord[]>(() =>
    loadStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES)
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(() =>
    loadStorage(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY)
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => loadStorage(STORAGE_KEYS.MOVEMENTS, []));
  const [stockRequirements, setStockRequirements] = useState<StockRequirement[]>(() =>
  loadStorage(STORAGE_KEYS.STOCK_REQUIREMENTS, [])
);
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS)
  );
  const [auditLogs] = useState<AuditLog[]>([]);

  // Connect to Backend on mount & synchronize
  const syncWithBackend = useCallback(async () => {
    try {
      const isOnline = await api.checkHealth();
      if (!isOnline) {
        setIsBackendConnected(false);
        return;
      }

      setIsBackendConnected(true);

      const [bShop, bShops, bCakes, bOrders, bExpenses, bPurchases, bInventory, bSuppliers, bNotifs, bStockRequirements] =
        await Promise.all([
          api.getShop().catch(() => null),
          api.getShops().catch(() => null),
          api.getCakes().catch(() => null),
          api.getOrders().catch(() => null),
          api.getExpenses().catch(() => null),
          api.getPurchases().catch(() => null),
          api.getInventory().catch(() => null),
          api.getSuppliers().catch(() => null),
          api.getNotifications().catch(() => null),
          api.getStockRequirements().catch(() => null),
        ]);

      if (bShop && bShops) {
        setShops(bShops.map((s) => (s.id === bShop.id ? bShop : s)));
      }
      if (bCakes && bCakes.length > 0) setCakes(bCakes);
      if (bOrders && bOrders.length > 0) setOrders(bOrders);
      if (bExpenses && bExpenses.length > 0) setExpenses(bExpenses);
      if (bPurchases && bPurchases.length > 0) setPurchaseRecords(bPurchases);
      if (bInventory && bInventory.length > 0) setInventory(bInventory);
      if (bSuppliers && bSuppliers.length > 0) setSuppliers(bSuppliers);
      if (bNotifs && bNotifs.length > 0) setNotifications(bNotifs);
      if (bStockRequirements !== null) {setStockRequirements(bStockRequirements);

      }

      // Customer specific sync
      const custToken = api.getCustomerToken();
      if (custToken) {
        const [cOrders, cNotifs] = await Promise.all([
          api.getCustomerOrders().catch(() => null),
          api.getCustomerNotifications().catch(() => null),
        ]);
        if (cNotifs) setCustomerNotifications(cNotifs);
        if (cOrders && cOrders.length > 0) {
          setOrders((prev) => {
            const others = prev.filter(
              (o) => !cOrders.some((co) => co.id === o.id || co.orderNumber === o.orderNumber)
            );
            return [...cOrders, ...others];
          });
        }
      }
    } catch (e) {
      console.warn('Backend sync note: running in resilient local mode', e);
      setIsBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
    // Optional periodic sync every 15 seconds to keep devices synchronized
    const interval = setInterval(syncWithBackend, 15000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Sync to localStorage as local cache
  useEffect(() => saveStorage(STORAGE_KEYS.CAKES, cakes), [cakes]);
  useEffect(() => saveStorage(STORAGE_KEYS.ORDERS, orders), [orders]);
  useEffect(() => saveStorage(STORAGE_KEYS.EXPENSES, expenses), [expenses]);
  useEffect(() => saveStorage(STORAGE_KEYS.SUPPLIERS, suppliers), [suppliers]);
  useEffect(() => saveStorage(STORAGE_KEYS.PURCHASES, purchaseRecords), [purchaseRecords]);
  useEffect(() => saveStorage(STORAGE_KEYS.INVENTORY, inventory), [inventory]);
  useEffect(() => saveStorage(STORAGE_KEYS.MOVEMENTS, stockMovements), [stockMovements]);
  useEffect(() => saveStorage(STORAGE_KEYS.STOCK_REQUIREMENTS, stockRequirements), [stockRequirements]);
  useEffect(() => saveStorage(STORAGE_KEYS.NOTIFICATIONS, notifications), [notifications]);
  useEffect(() => saveStorage(STORAGE_KEYS.USER, currentUser), [currentUser]);
  useEffect(() => saveStorage(STORAGE_KEYS.STAFF, staffUsers), [staffUsers]);

  // Auth Functions
  const login = async (username: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.login(username, pass);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        if (res.user.assignedShopId) {
          setActiveShopId(res.user.assignedShopId);
        }
        return { success: true };
      }
    } catch {
      // Fallback to local check
    }

    const cleanUser = username.trim().toLowerCase();
    const user = staffUsers.find(
      (u) => u.username.toLowerCase() === cleanUser || (cleanUser.includes('owner') && u.role === 'super_admin')
    );
    if (!user) {
      return { success: false, error: 'User account not found. Try "owner", "staff1", or "staff2".' };
    }
    if (pass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    setCurrentUser(user);
    if (user.assignedShopId) {
      setActiveShopId(user.assignedShopId);
    }
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const switchDemoRole = (roleKey: 'owner' | 'staff1' | 'staff2' | 'customer') => {
    if (roleKey === 'customer') {
      setCurrentUser(null);
      return;
    }
    const target = staffUsers.find((u) => u.username === roleKey);
    if (target) {
      setCurrentUser(target);
      if (target.assignedShopId) {
        setActiveShopId(target.assignedShopId);
      }
    }
  };

  const addStaffUser = (user: Omit<StaffUser, 'id'>) => {
    const newUser: StaffUser = {
      ...user,
      id: `usr-${Date.now()}`,
    };
    setStaffUsers((prev) => [...prev, newUser]);
  };

  // Cake CRUD
  const addCake = async (cake: Omit<CakeItem, 'id'>) => {
    try {
      const saved = await api.createCake(cake);
      setCakes((prev) => [saved, ...prev]);
    } catch {
      const newCake: CakeItem = { ...cake, id: `cake-${Date.now()}` };
      setCakes((prev) => [newCake, ...prev]);
    }
  };

  const updateCake = async (id: string, updates: Partial<CakeItem>) => {
    try {
      const updated = await api.updateCake(id, updates);
      setCakes((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setCakes((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    }
  };

  const deleteCake = async (id: string) => {
    try {
      await api.deleteCake(id);
    } catch {}
    setCakes((prev) => prev.filter((c) => c.id !== id));
  };

  // Order Operations
  const createOrder = async (orderData: Partial<Order>): Promise<Order> => {
    try {
      const created = await api.createOrder({
        ...orderData,
        shopId: orderData.shopId || activeShopId,
      });
      setOrders((prev) => [created, ...prev]);
      return created;
    } catch {
      // Local fallback
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
      const randomSeq = Math.floor(100 + Math.random() * 900);
      const orderNumber = `VB-${currentYear}${month}-${randomSeq}`;
      const token = `vb-pick-${Math.random().toString(36).substring(2, 9)}`;

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber,
        shopId: orderData.shopId || activeShopId,
        customerName: orderData.customerName || 'Customer',
        customerPhone: orderData.customerPhone || '',
        cakeId: orderData.cakeId,
        cakeName: orderData.cakeName || 'Custom Cake Design',
        categorySlug: orderData.categorySlug || 'custom',
        size: orderData.size || '1.0 kg',
        flavour: orderData.flavour || 'Standard Flavour',
        quantity: orderData.quantity || 1,
        unitPrice: orderData.unitPrice || 0,
        totalAmount: orderData.totalAmount || 0,
        advancePaid: orderData.advancePaid || 0,
        balanceAmount: (orderData.totalAmount || 0) - (orderData.advancePaid || 0),
        requiredDate: orderData.requiredDate || new Date().toISOString().split('T')[0],
        requiredTime: orderData.requiredTime || '5:00 PM',
        fulfillmentType: orderData.fulfillmentType || 'pickup',
        deliveryAddress: orderData.deliveryAddress,
        customMessage: orderData.customMessage,
        specialInstructions: orderData.specialInstructions,
        referencePhotoUrl: orderData.referencePhotoUrl,
        audioNoteUrl: orderData.audioNoteUrl,
        status: orderData.isCustomDesign ? 'under_review' : 'pending',
        isCustomDesign: !!orderData.isCustomDesign,
        quotedPrice: orderData.quotedPrice,
        quotationStatus: orderData.isCustomDesign ? 'pending' : undefined,
        pickupQrToken: token,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        statusHistory: [
          {
            status: orderData.isCustomDesign ? 'under_review' : 'pending',
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            notes: orderData.isCustomDesign
              ? 'Custom design request uploaded'
              : 'Order placed by customer',
            updatedBy: 'Customer',
          },
        ],
      };

      setOrders((prev) => [newOrder, ...prev]);
      return newOrder;
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, notes?: string) => {
    try {
      const updated = await api.updateOrderStatus(orderId, status, notes, currentUser?.name);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            status,
            statusHistory: [
              ...o.statusHistory,
              {
                status,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                notes: notes || `Order status updated to ${status.replace('_', ' ')}`,
                updatedBy: currentUser?.name || 'Staff',
              },
            ],
          };
        })
      );
    }
  };

  const submitQuotation = async (
    orderId: string,
    quotedPrice: number,
    notes?: string,
    advanceRequired?: number,
    expiryDate?: string
  ) => {
    try {
      const updated = await api.submitQuotation(
        orderId,
        quotedPrice,
        notes,
        currentUser?.name,
        advanceRequired,
        expiryDate
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const total = quotedPrice * (o.quantity || 1);
          const reqAdv = advanceRequired !== undefined ? advanceRequired : Math.round(total * 0.5);
          return {
            ...o,
            status: 'price_quoted',
            quotedPrice,
            unitPrice: quotedPrice,
            totalAmount: total,
            advanceRequired: reqAdv,
            balanceAmount: total - o.advancePaid,
            quoteExpiryDate: expiryDate,
            quotationStatus: 'quoted',
            statusHistory: [
              ...o.statusHistory,
              {
                status: 'price_quoted' as OrderStatus,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                notes: notes || `Quotation submitted: ₹${quotedPrice.toLocaleString()}`,
                updatedBy: currentUser?.name || 'Owner',
              },
            ],
          };
        })
      );
    }
  };

  const respondToQuotation = async (orderId: string, accept: boolean) => {
    try {
      const updated = await api.respondToQuotation(orderId, accept);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const newStatus: OrderStatus = accept ? 'confirmed' : 'cancelled';
          return {
            ...o,
            status: newStatus,
            quotationStatus: accept ? 'accepted' : 'rejected',
            statusHistory: [
              ...o.statusHistory,
              {
                status: newStatus,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                notes: accept ? 'Customer accepted quote.' : 'Customer declined quote.',
                updatedBy: 'Customer',
              },
            ],
          };
        })
      );
    }
  };

  const recordPayment = async (
    orderId: string,
    amount: number,
    paymentMethod?: string,
    transactionRef?: string
  ) => {
    try {
      const updated = await api.recordPayment(
        orderId,
        amount,
        currentUser?.name || currentCustomer?.name,
        paymentMethod,
        transactionRef
      );
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch {
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            paymentStatus: 'advance_pending_verification',
            statusHistory: [
              ...o.statusHistory,
              {
                status: o.status,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                notes: `Payment of ₹${amount} recorded (${transactionRef || 'Ref Pending'}). Pending verification.`,
                updatedBy: currentCustomer?.name || 'Customer',
              },
            ],
          };
        })
      );
    }
  };

  const verifyOrderPayment = async (orderId: string, paymentId?: string, isVerified: boolean = true) => {
    try {
      const updated = await api.verifyPayment(orderId, paymentId, isVerified);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      console.error('Failed to verify payment', err);
    }
  };

  // Customer Authentication & Actions
  const customerLogin = async (
    name: string,
    phone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.customerLogin(name, phone);
      if (res.success && res.customer) {
        setCurrentCustomer(res.customer);
        saveStorage(STORAGE_KEYS.CUSTOMER, res.customer);

        const [cOrders, cNotifs] = await Promise.all([
          api.getCustomerOrders().catch(() => null),
          api.getCustomerNotifications().catch(() => null),
        ]);

        if (cNotifs) {
          setCustomerNotifications(cNotifs);
          saveStorage(STORAGE_KEYS.CUSTOMER_NOTIFS, cNotifs);
        }

        if (cOrders && cOrders.length > 0) {
          setOrders((prev) => {
            const others = prev.filter(
              (o) => !cOrders.some((co) => co.id === o.id || co.orderNumber === o.orderNumber)
            );
            return [...cOrders, ...others];
          });
        }
        return { success: true };
      }
      return { success: false, error: res.error };
    } catch (e: any) {
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const customerLogout = () => {
    api.customerLogout();
    setCurrentCustomer(null);
    setCustomerNotifications([]);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_NOTIFS);
  };

  const respondToCustomerQuote = async (orderId: string, accept: boolean) => {
    try {
      const updated = await api.respondCustomerQuote(orderId, accept);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setCustomerNotifications((prev) =>
        prev.map((n) => (n.orderId === orderId ? { ...n, status: accept ? 'accepted' : 'rejected' } : n))
      );
    } catch (e) {
      console.error('Failed to respond to quote', e);
    }
  };

  const markCustomerNotificationRead = async (id: string) => {
    try {
      await api.markCustomerNotificationRead(id);
      setCustomerNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n))
      );
    } catch {}
  };

  const updateShopSettings = async (settings: Partial<Shop>) => {
    try {
      const updated = await api.updateShopSettings(settings);
      setShops((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (e) {
      console.error('Failed to update shop settings', e);
    }
  };

  const getOrderByIdOrToken = (identifier: string): Order | undefined => {
    const clean = identifier.trim().toLowerCase();
    return orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === clean ||
        o.id.toLowerCase() === clean ||
        o.pickupQrToken.toLowerCase() === clean
    );
  };

  // Expenses
  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    try {
      const saved = await api.createExpense(expenseData);
      setExpenses((prev) => [saved, ...prev]);
    } catch {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      const updated = await api.updateExpense(id, updates);
      setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch {
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await api.deleteExpense(id);
    } catch {}
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Suppliers & Purchases
  const addSupplier = async (supplierData: Omit<Supplier, 'id'>) => {
    try {
      const saved = await api.createSupplier(supplierData);
      setSuppliers((prev) => [...prev, saved]);
    } catch {
      const newSupplier: Supplier = { ...supplierData, id: `sup-${Date.now()}` };
      setSuppliers((prev) => [...prev, newSupplier]);
    }
  };

  const addPurchaseRecord = async (purchaseData: Omit<PurchaseRecord, 'id' | 'createdAt'>) => {
    try {
      const saved = await api.createPurchase(purchaseData);
      setPurchaseRecords((prev) => [saved, ...prev]);
      const freshInv = await api.getInventory();
      if (freshInv) setInventory(freshInv);
    } catch {
      const newRecord: PurchaseRecord = {
        ...purchaseData,
        id: `pur-${Date.now()}`,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
      setPurchaseRecords((prev) => [newRecord, ...prev]);
    }
  };

  // Inventory adjustment
  const adjustStock = async (itemId: string, newQty: number, reason: string) => {
    try {
      const updated = await api.adjustStock(itemId, newQty, reason);
      setInventory((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
    } catch {
      setInventory((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, currentQuantity: newQty } : item))
      );
    }
  };
  
  // Create a stock requirement
  const createStockRequirement = async (
    reqData: Omit<
      StockRequirement,
      'id' | 'createdAt' | 'updatedAt' | 'quantityToPurchase'
    >
  ): Promise<StockRequirement> => {
    try {
      const saved = await api.createStockRequirement(reqData);
      setStockRequirements((prev) => [saved, ...prev]);
      return saved;
    } catch (error) {
      console.warn('Could not save stock requirement:', error);

      const now = new Date().toISOString();
      const newRequirement: StockRequirement = {
        ...reqData,
        id: `req-${Date.now()}`,
        shopId: reqData.shopId || activeShopId,
        quantityToPurchase: Math.max(
          0,
          Number(reqData.quantityRequired) - Number(reqData.availableStock)
        ),
        createdAt: now,
        updatedAt: now,
      };

      setStockRequirements((prev) => [newRequirement, ...prev]);
      return newRequirement;
    }
  };

  // Update a stock requirement's status
  const updateStockRequirementStatus = async (
    id: string,
    status: 'Requested' | 'Approved' | 'Purchased' | 'Cancelled',
    purchasePrice?: number
  ): Promise<void> => {
    try {
      const updated = await api.updateStockRequirementStatus(
        id,
        status,
        purchasePrice
      );

      setStockRequirements((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (error) {
      console.warn('Could not update stock requirement:', error);

      setStockRequirements((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, status, updatedAt: new Date().toISOString() }
            : item
        )
      );
    }
  };

  const markNotificationRead = async (id: string) => {
    
    try {
      await api.markNotificationRead(id);
    } catch {}
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  return (
    <BakeryContext.Provider
      value={{
        shops,
        activeShopId,
        setActiveShopId,
        activeShop,
        isBackendConnected,
        updateShopSettings,
        currentCustomer,
        customerNotifications,
        customerLogin,
        customerLogout,
        respondToCustomerQuote,
        markCustomerNotificationRead,
        currentUser,
        login,
        logout,
        switchDemoRole,
        staffUsers,
        addStaffUser,
        cakes,
        categories: INITIAL_CATEGORIES,
        addCake,
        updateCake,
        deleteCake,
        orders,
        createOrder,
        updateOrderStatus,
        submitQuotation,
        respondToQuotation,
        recordPayment,
        verifyOrderPayment,
        getOrderByIdOrToken,
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
        stockRequirements,
        createStockRequirement,
        updateStockRequirementStatus,
        notifications,
        markNotificationRead,
        auditLogs,
      }}
    >
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = (): BakeryContextType => {
  const context = useContext(BakeryContext);
  if (!context) {
    throw new Error('useBakery must be used within a BakeryProvider');
  }
  return context;
};
