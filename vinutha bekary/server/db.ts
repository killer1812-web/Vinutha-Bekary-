import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
} from '../src/data/initialData.js';
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
  PaymentRecord,
  StockRequirement,
} from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'bakery_database.json');

export interface DatabaseState {
  shops: Shop[];
  staff: StaffUser[];
  categories: CakeCategory[];
  cakes: CakeItem[];
  orders: Order[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  customers: CustomerUser[];
  customerNotifications: CustomerNotification[];
  stockRequirements: StockRequirement[];
}

class BackendDatabase {
  private state: DatabaseState;

  constructor() {
    this.ensureDataDir();
    this.state = this.loadDatabase();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const loaded: DatabaseState = JSON.parse(raw);

        // Ensure array safety and data integrity migrations
        if (!Array.isArray(loaded.customers)) loaded.customers = [];
        if (!Array.isArray(loaded.customerNotifications)) loaded.customerNotifications = [];
        if (!Array.isArray(loaded.auditLogs)) loaded.auditLogs = [];
        if (!Array.isArray(loaded.stockRequirements)) loaded.stockRequirements = [];

        // Ensure all orders have a clean sequential tokenNumber and pickup fulfillment
        if (Array.isArray(loaded.orders)) {
          loaded.orders.forEach((o, idx) => {
            if (!o.tokenNumber) {
              o.tokenNumber = String(idx + 1).padStart(3, '0');
            }
            if (!o.fulfillmentType) {
              o.fulfillmentType = 'pickup';
            }
          });
        }

        // Ensure all cakes have eggless classification and prep time
        if (Array.isArray(loaded.cakes)) {
          loaded.cakes = loaded.cakes.map((c) => ({
            ...c,
            eggOrEggless: c.eggOrEggless || (c.categorySlug === 'birthday' ? 'contains_egg' : 'eggless'),
            prepTime: c.prepTime || '2-3 hours',
          }));
        }

        // Ensure single shop #1 has live UPI and branch configuration
        const primaryShop = loaded.shops?.find((s) => s.id === 'shop-1');
        if (primaryShop) {
          primaryShop.name = primaryShop.name || 'Vinutha Bakery';
          primaryShop.upiId = primaryShop.upiId || 'vinuthabakery@okaxis';
          primaryShop.upiMerchantName = primaryShop.upiMerchantName || 'Vinutha Bakery';
          primaryShop.advancePercentage = primaryShop.advancePercentage || 50;
          primaryShop.qrOrderUrl = primaryShop.qrOrderUrl || 'http://10.10.68.243:5173/?table=counter';
        }

        return loaded;
      }
    } catch (err) {
      console.error('Error reading database file, initializing default:', err);
    }

    const defaultState: DatabaseState = {
      shops: INITIAL_SHOPS,
      staff: INITIAL_STAFF,
      categories: INITIAL_CATEGORIES,
      cakes: INITIAL_CAKES,
      orders: INITIAL_ORDERS,
      expenses: INITIAL_EXPENSES,
      suppliers: INITIAL_SUPPLIERS,
      purchases: INITIAL_PURCHASES,
      inventory: INITIAL_INVENTORY,
      stockMovements: [],
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: [],
      customers: [],
      customerNotifications: [],
      stockRequirements: [],
    };

    this.saveDatabase(defaultState);
    return defaultState;
  }

  private saveDatabase(stateToSave?: DatabaseState): void {
    try {
      const data = stateToSave || this.state;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  // --- SHOPS ---
  public getShops(): Shop[] {
    return this.state.shops;
  }

  public getShopById(id: string): Shop | undefined {
    return this.state.shops.find((s) => s.id === id);
  }

  public updateShop(id: string, updates: Partial<Shop>): Shop | null {
    const shop = this.state.shops.find((s) => s.id === id);
    if (!shop) return null;
    Object.assign(shop, updates);
    this.saveDatabase();
    return shop;
  }

  // --- CAKES ---
  public getCakes(): CakeItem[] {
    return this.state.cakes;
  }

  public getCakeById(id: string): CakeItem | undefined {
    return this.state.cakes.find((c) => c.id === id);
  }

  public createCake(cakeData: Omit<CakeItem, 'id'>): CakeItem {
    const newCake: CakeItem = {
      ...cakeData,
      id: `cake-${Date.now()}`,
    };
    this.state.cakes.unshift(newCake);
    this.saveDatabase();
    return newCake;
  }

  public updateCake(id: string, updates: Partial<CakeItem>): CakeItem | null {
    const idx = this.state.cakes.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.state.cakes[idx] = { ...this.state.cakes[idx], ...updates };
    this.saveDatabase();
    return this.state.cakes[idx];
  }

  public deleteCake(id: string): boolean {
    const initialLen = this.state.cakes.length;
    this.state.cakes = this.state.cakes.filter((c) => c.id !== id);
    if (this.state.cakes.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- ORDERS & CONCURRENCY-SAFE TOKEN SEQUENCE ---
  public generateDailyToken(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Filter orders created today
    const todaysOrders = this.state.orders.filter(
      (o) => o.createdAt && o.createdAt.startsWith(today)
    );

    let maxNum = 0;
    for (const o of todaysOrders) {
      if (o.tokenNumber) {
        const parsed = parseInt(o.tokenNumber, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
        }
      }
    }
    const nextSeq = maxNum + 1;
    return String(nextSeq).padStart(3, '0');
  }

  public getOrders(shopId?: string): Order[] {
    if (shopId && shopId !== 'all') {
      return this.state.orders.filter((o) => o.shopId === shopId);
    }
    return this.state.orders;
  }

  public getOrderByIdOrToken(identifier: string): Order | undefined {
    const raw = identifier.trim().toLowerCase();
    const cleanToken = raw.replace(/^(token\s*no\.?\s*|token\s*#?\s*|token\s*|#)/i, '').trim();

    return this.state.orders.find(
      (o) =>
        (o.tokenNumber && o.tokenNumber.toLowerCase() === cleanToken) ||
        (o.tokenNumber && `token no. ${o.tokenNumber}`.toLowerCase() === raw) ||
        (o.tokenNumber && `token no: ${o.tokenNumber}`.toLowerCase() === raw) ||
        o.orderNumber.toLowerCase() === raw ||
        o.id.toLowerCase() === raw ||
        o.pickupQrToken.toLowerCase() === raw
    );
  }

  public createOrder(orderInput: Partial<Order>): Order {
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const tokenNumber = this.generateDailyToken(); // e.g. "001", "002", "025"
    const orderNumber = `VB-${currentYear}${month}-${tokenNumber}`;
    const token = `vb-pick-${Math.random().toString(36).substring(2, 9)}`;

    const totalAmount = Number(orderInput.totalAmount) || 0;
    const advancePaid = Number(orderInput.advancePaid) || 0;
    const advanceRequired = Number(orderInput.advanceRequired) || Math.round(totalAmount * 0.5);
    const balanceAmount = Math.max(0, totalAmount - advancePaid);

    // Initial payment ledger entries if any advance was provided with reference
    const initialLedger: PaymentRecord[] = [];
    if (orderInput.upiTransactionRef || advancePaid > 0) {
      initialLedger.push({
        id: `pay-${Date.now()}`,
        orderId: '', // populated below
        amount: advancePaid,
        paymentType: 'advance',
        paymentMethod: (orderInput as any).paymentMethod || 'upi_phonepe',
        transactionRef: orderInput.upiTransactionRef,
        isVerified: false, // strictly pending staff verification
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
    }

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      tokenNumber, // Sequential clean customer token e.g. "001", "025"
      shopId: 'shop-1',
      customerName: orderInput.customerName ? orderInput.customerName.trim() : 'Customer',
      customerPhone: orderInput.customerPhone ? orderInput.customerPhone.trim() : '',
      cakeId: orderInput.cakeId,
      cakeName: orderInput.cakeName || 'Custom Cake Design',
      categorySlug: orderInput.categorySlug || 'custom',
      size: orderInput.size || '1.0 kg',
      flavour: orderInput.flavour || 'Standard Flavour',
      eggOrEggless: orderInput.eggOrEggless || 'eggless',
      quantity: orderInput.quantity || 1,
      unitPrice: orderInput.unitPrice || 0,
      items: orderInput.items,
      totalAmount,
      advancePaid: 0, // only verified payments increase advancePaid
      advanceRequired,
      balanceAmount: totalAmount,
      requiredDate: orderInput.requiredDate || new Date().toISOString().split('T')[0],
      requiredTime: orderInput.requiredTime || '5:00 PM',
      fulfillmentType: orderInput.fulfillmentType || 'pickup',
      deliveryAddress: orderInput.deliveryAddress,
      occasion: orderInput.occasion || 'Birthday',
      birthdayPersonName: orderInput.birthdayPersonName,
      nameOnCake: orderInput.nameOnCake,
      messageOnCake: orderInput.messageOnCake,
      customMessage: orderInput.customMessage,
      specialInstructions: orderInput.specialInstructions,
      referencePhotoUrl: orderInput.referencePhotoUrl,
      audioNoteUrl: orderInput.audioNoteUrl,
      status: orderInput.isCustomDesign ? 'under_review' : 'pending',
      paymentStatus: initialLedger.length > 0 ? 'advance_pending_verification' : 'pending_advance',
      upiTransactionRef: orderInput.upiTransactionRef,
      isPaymentVerified: false,
      paymentLedger: initialLedger,
      isCustomDesign: !!orderInput.isCustomDesign,
      quotedPrice: orderInput.quotedPrice,
      quotationStatus: orderInput.isCustomDesign ? 'pending' : undefined,
      pickupQrToken: token,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      statusHistory: [
        {
          status: orderInput.isCustomDesign ? 'under_review' : 'pending',
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          notes: orderInput.isCustomDesign
            ? 'Custom design request with reference photo & notes uploaded'
            : `Order placed by customer via shop counter portal${orderInput.upiTransactionRef ? ` (UPI UTR: ${orderInput.upiTransactionRef})` : ''}`,
          updatedBy: 'Customer',
        },
      ],
    };

    if (newOrder.paymentLedger && newOrder.paymentLedger.length > 0) {
      newOrder.paymentLedger[0].orderId = newOrder.id;
    }

    this.state.orders.unshift(newOrder);

    // Create Staff Dashboard Notification
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      shopId: newOrder.shopId,
      title: orderInput.isCustomDesign ? 'New Custom Design Request' : 'New Cake Order Received',
      message: `Order #${newOrder.orderNumber} placed by ${newOrder.customerName} (${newOrder.customerPhone}) for ${newOrder.cakeName}`,
      type: orderInput.isCustomDesign ? 'quote' : 'order',
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      link: 'orders',
    };
    this.state.notifications.unshift(notif);

    this.saveDatabase();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: OrderStatus, notes?: string, updatedBy?: string): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: notes || `Order status updated to ${status.replace('_', ' ')}`,
      updatedBy: updatedBy || 'Bakery Staff',
    });

    this.saveDatabase();
    return order;
  }

  public submitQuotation(
    orderId: string,
    quotedPrice: number,
    notes?: string,
    updatedBy?: string,
    advanceRequired?: number,
    expiryDate?: string
  ): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const total = quotedPrice * (order.quantity || 1);
    const requiredAdvance = advanceRequired !== undefined ? advanceRequired : Math.round(total * 0.5);

    order.status = 'price_quoted';
    order.quotedPrice = quotedPrice;
    order.unitPrice = quotedPrice;
    order.totalAmount = total;
    order.advanceRequired = requiredAdvance;
    order.balanceAmount = Math.max(0, total - order.advancePaid);
    order.quoteExpiryDate = expiryDate;
    order.quotationStatus = 'quoted';
    order.statusHistory.push({
      status: 'price_quoted',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: notes || `Quotation submitted: ₹${quotedPrice.toLocaleString()} (Advance required: ₹${requiredAdvance})`,
      updatedBy: updatedBy || 'Owner',
    });

    // Send In-App Price Notification to Customer!
    this.createCustomerNotification({
      customerPhone: order.customerPhone,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: 'Quotation Ready for Custom Cake',
      message: `Your custom cake quotation is ready: ₹${total.toLocaleString()}. Advance: ₹${requiredAdvance.toLocaleString()}.`,
      type: 'quote_ready',
      quotedPrice: total,
      advanceRequired: requiredAdvance,
      balanceAmount: total - requiredAdvance,
      expiryDate,
      status: 'pending',
    });

    this.saveDatabase();
    return order;
  }

  public respondToQuotation(orderId: string, accept: boolean): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const newStatus: OrderStatus = accept ? 'confirmed' : 'cancelled';
    order.status = newStatus;
    order.quotationStatus = accept ? 'accepted' : 'rejected';
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: accept ? 'Customer accepted price quotation. Awaiting advance payment.' : 'Customer declined price quotation.',
      updatedBy: 'Customer',
    });

    // Update customer notification status
    const notif = this.state.customerNotifications.find((n) => n.orderId === orderId);
    if (notif) {
      notif.status = accept ? 'accepted' : 'rejected';
    }

    this.saveDatabase();
    return order;
  }

  public recordPayment(
    orderId: string,
    amount: number,
    updatedBy?: string,
    paymentMethod: any = 'upi_phonepe',
    transactionRef?: string,
    isVerified: boolean = false
  ): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    if (!Array.isArray(order.paymentLedger)) {
      order.paymentLedger = [];
    }

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: order.id,
      amount,
      paymentType: order.advancePaid === 0 ? 'advance' : 'balance',
      paymentMethod,
      transactionRef: transactionRef || undefined,
      isVerified,
      verifiedBy: isVerified ? updatedBy : undefined,
      verifiedAt: isVerified ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    order.paymentLedger.push(newPaymentRecord);

    if (isVerified) {
      // Recalculate verified amounts
      const verifiedTotal = order.paymentLedger
        .filter((p) => p.isVerified)
        .reduce((sum, p) => sum + p.amount, 0);

      order.advancePaid = verifiedTotal;
      order.balanceAmount = Math.max(0, order.totalAmount - order.advancePaid);
      order.isPaymentVerified = true;
      order.paymentStatus = order.balanceAmount === 0 ? 'fully_paid' : 'advance_paid';
    } else {
      order.paymentStatus = 'advance_pending_verification';
    }

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: isVerified
        ? `Verified payment of ₹${amount} received. Remaining balance: ₹${order.balanceAmount}`
        : `Payment submission of ₹${amount} received via ${paymentMethod} (Ref: ${transactionRef || 'Pending'}). Pending staff verification.`,
      updatedBy: updatedBy || 'Customer',
    });

    // Alert staff for pending payment verification
    if (!isVerified) {
      this.state.notifications.unshift({
        id: `notif-${Date.now()}`,
        shopId: order.shopId,
        title: 'UPI Payment Pending Verification',
        message: `Order #${order.orderNumber}: Customer submitted payment of ₹${amount} (UTR: ${transactionRef || 'N/A'}). Please verify bank credit.`,
        type: 'order',
        read: false,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        link: 'orders',
      });
    }

    this.saveDatabase();
    return order;
  }

  public verifyOrderPayment(
    orderId: string,
    paymentId: string | undefined,
    isVerified: boolean,
    verifiedBy: string
  ): Order | null {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    if (!Array.isArray(order.paymentLedger)) {
      order.paymentLedger = [];
    }

    if (paymentId) {
      const match = order.paymentLedger.find((p) => p.id === paymentId);
      if (match) {
        match.isVerified = isVerified;
        match.verifiedBy = verifiedBy;
        match.verifiedAt = new Date().toISOString();
      }
    } else {
      // Verify all unverified entries
      order.paymentLedger.forEach((p) => {
        if (!p.isVerified) {
          p.isVerified = isVerified;
          p.verifiedBy = verifiedBy;
          p.verifiedAt = new Date().toISOString();
        }
      });
    }

    // Recalculate ledger verified sum
    const verifiedTotal = order.paymentLedger
      .filter((p) => p.isVerified)
      .reduce((sum, p) => sum + p.amount, 0);

    order.advancePaid = verifiedTotal;
    order.balanceAmount = Math.max(0, order.totalAmount - order.advancePaid);
    order.isPaymentVerified = verifiedTotal > 0;
    order.paymentStatus = order.balanceAmount === 0 ? 'fully_paid' : (verifiedTotal > 0 ? 'advance_paid' : 'pending_advance');

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: `Staff verified payment. Total verified paid: ₹${order.advancePaid}. Outstanding balance: ₹${order.balanceAmount}`,
      updatedBy: verifiedBy || 'Staff',
    });

    // Notify customer
    this.createCustomerNotification({
      customerPhone: order.customerPhone,
      orderId: order.id,
      orderNumber: order.orderNumber,
      title: 'Payment Confirmed by Shop',
      message: `Your payment for Order #${order.orderNumber} has been verified. Remaining balance: ₹${order.balanceAmount}.`,
      type: 'payment_verified',
      balanceAmount: order.balanceAmount,
      status: 'read',
    });

    this.saveDatabase();
    return order;
  }

  // --- CUSTOMER SESSIONS & ISOLATION ---
  public authenticateCustomer(name: string, phone: string): { customer: CustomerUser; token: string } {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const cleanName = name.trim();

    let customer = this.state.customers.find((c) => c.phone === cleanPhone);
    const token = `cust_sess_${Date.now()}_${cleanPhone}_${Math.random().toString(36).substring(2, 9)}`;

    if (!customer) {
      customer = {
        id: `cust-${Date.now()}`,
        name: cleanName,
        phone: cleanPhone,
        token,
        createdAt: new Date().toISOString(),
      };
      this.state.customers.push(customer);
    } else {
      customer.name = cleanName;
      customer.token = token;
    }

    this.saveDatabase();
    return { customer, token };
  }

  public getCustomerByToken(token: string): CustomerUser | null {
    if (!token) return null;
    return this.state.customers.find((c) => c.token === token) || null;
  }

  public getCustomerOrders(phone: string): Order[] {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return this.state.orders.filter((o) => {
      const oPhone = (o.customerPhone || '').replace(/\D/g, '').slice(-10);
      return oPhone === cleanPhone;
    });
  }

  public createCustomerNotification(
    notifData: Omit<CustomerNotification, 'id' | 'createdAt'>
  ): CustomerNotification {
    const newNotif: CustomerNotification = {
      ...notifData,
      id: `cnotif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.customerNotifications.unshift(newNotif);
    this.saveDatabase();
    return newNotif;
  }

  public getCustomerNotifications(phone: string): CustomerNotification[] {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    return this.state.customerNotifications.filter((n) => {
      const nPhone = (n.customerPhone || '').replace(/\D/g, '').slice(-10);
      return nPhone === cleanPhone;
    });
  }

  public markCustomerNotification(id: string, status: 'accepted' | 'rejected' | 'read'): boolean {
    const notif = this.state.customerNotifications.find((n) => n.id === id);
    if (!notif) return false;
    notif.status = status;
    this.saveDatabase();
    return true;
  }

  // --- EXPENSES ---
  public getExpenses(shopId?: string): Expense[] {
    if (shopId && shopId !== 'all') {
      return this.state.expenses.filter((e) => e.shopId === shopId);
    }
    return this.state.expenses;
  }

  public createExpense(expenseData: Omit<Expense, 'id' | 'createdAt'>): Expense {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    this.state.expenses.unshift(newExpense);
    this.saveDatabase();
    return newExpense;
  }

  public getExpenseById(id: string): Expense | undefined {
    return this.state.expenses.find((e) => e.id === id);
  }

  public updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const idx = this.state.expenses.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.state.expenses[idx] = { ...this.state.expenses[idx], ...updates };
    this.saveDatabase();
    return this.state.expenses[idx];
  }

  public deleteExpense(id: string): boolean {
    const prevLen = this.state.expenses.length;
    this.state.expenses = this.state.expenses.filter((e) => e.id !== id);
    if (this.state.expenses.length !== prevLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- SUPPLIERS & PURCHASES ---
  public getSuppliers(): Supplier[] {
    return this.state.suppliers;
  }

  public createSupplier(supplierData: Omit<Supplier, 'id'>): Supplier {
    const newSup: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
    };
    this.state.suppliers.push(newSup);
    this.saveDatabase();
    return newSup;
  }

  public getPurchases(shopId?: string): PurchaseRecord[] {
    if (shopId && shopId !== 'all') {
      return this.state.purchases.filter((p) => p.shopId === shopId);
    }
    return this.state.purchases;
  }

  public createPurchase(purchaseData: Omit<PurchaseRecord, 'id' | 'createdAt'>): PurchaseRecord {
    const newRecord: PurchaseRecord = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    this.state.purchases.unshift(newRecord);

    // ATOMIC INVENTORY INCREMENT:
    newRecord.items.forEach((item) => {
      const match = this.state.inventory.find(
        (inv) =>
          (item.inventoryItemId && inv.id === item.inventoryItemId) ||
          (inv.shopId === newRecord.shopId && inv.name.toLowerCase() === item.name.toLowerCase())
      );

      if (match) {
        match.currentQuantity += item.quantity;
        match.lastRestocked = newRecord.date;
        match.purchasePrice = item.unitPrice;
      } else {
        this.state.inventory.push({
          id: `inv-${newRecord.shopId}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          shopId: newRecord.shopId,
          name: item.name,
          category: 'baking_supplies',
          currentQuantity: item.quantity,
          unit: item.unit,
          minStockLevel: 5,
          purchasePrice: item.unitPrice,
          supplierId: newRecord.supplierId,
          lastRestocked: newRecord.date,
        });
      }

      // Record stock movement
      this.state.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        shopId: newRecord.shopId,
        inventoryItemId: item.inventoryItemId || 'new-item',
        itemName: item.name,
        movementType: 'purchase_in',
        quantity: item.quantity,
        unit: item.unit,
        referenceId: newRecord.id,
        reason: `Supplier Invoice #${newRecord.invoiceNumber} arrival from ${newRecord.supplierName}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });
    });

    // Update supplier liability
    if (newRecord.outstandingBalance > 0) {
      const sup = this.state.suppliers.find((s) => s.id === newRecord.supplierId);
      if (sup) {
        sup.balance += newRecord.outstandingBalance;
      }
    }

    this.saveDatabase();
    return newRecord;
  }

  // --- INVENTORY ---
  public getInventory(shopId?: string): InventoryItem[] {
    if (shopId && shopId !== 'all') {
      return this.state.inventory.filter((i) => i.shopId === shopId);
    }
    return this.state.inventory;
  }

  public adjustStock(itemId: string, newQty: number, reason: string): InventoryItem | null {
    const item = this.state.inventory.find((i) => i.id === itemId);
    if (!item) return null;

    const diff = newQty - item.currentQuantity;
    item.currentQuantity = Math.max(0, newQty);

    this.state.stockMovements.unshift({
      id: `mov-${Date.now()}`,
      shopId: item.shopId,
      inventoryItemId: item.id,
      itemName: item.name,
      movementType: 'adjustment',
      quantity: diff,
      unit: item.unit,
      reason: reason || 'Manual stock audit',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    });

    this.saveDatabase();
    return item;
  }

  // --- AUTHENTICATION ---
  public authenticateStaff(username: string, pass: string): StaffUser | null {
    const clean = username.trim().toLowerCase();
    const user = this.state.staff.find(
      (u) => u.username.toLowerCase() === clean || (clean.includes('owner') && u.role === 'super_admin')
    );
    if (!user) return null;
    if (pass.length < 4) return null;
    return user;
  }

  public getStaff(): StaffUser[] {
    return this.state.staff;
  }

  // --- NOTIFICATIONS ---
  public getNotifications(shopId?: string): AppNotification[] {
    if (shopId && shopId !== 'all') {
      return this.state.notifications.filter((n) => !n.shopId || n.shopId === shopId);
    }
    return this.state.notifications;
  }

  public markNotificationRead(id: string): void {
    const n = this.state.notifications.find((notif) => notif.id === id);
    if (n) {
      n.read = true;
      this.saveDatabase();
    }
  }

  // --- STOCK REQUIREMENTS & PURCHASE LIST (Staff & Admin) ---
  public getStockRequirements(shopId?: string): StockRequirement[] {
    if (shopId && shopId !== 'all') {
      return this.state.stockRequirements.filter((sr) => sr.shopId === shopId);
    }
    return this.state.stockRequirements;
  }

  public createStockRequirement(
    input: Omit<StockRequirement, 'id' | 'createdAt' | 'updatedAt' | 'quantityToPurchase'>
  ): StockRequirement {
    const reqQty = Number(input.quantityRequired) || 0;
    const availQty = Number(input.availableStock) || 0;
    const toPurchase = Math.max(0, reqQty - availQty);

    const newReq: StockRequirement = {
      ...input,
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      shopId: input.shopId || 'shop-1',
      quantityRequired: reqQty,
      availableStock: availQty,
      quantityToPurchase: toPurchase,
      status: input.status || 'Requested',
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    this.state.stockRequirements.unshift(newReq);

    // Promptly notify Admin Dashboard
    this.state.notifications.unshift({
      id: `notif-${Date.now()}`,
      shopId: newReq.shopId,
      title: 'New Stock Requirement Logged',
      message: `${newReq.requestedBy} requested ${newReq.quantityRequired} ${newReq.unit} of ${newReq.itemOrIngredientName} (To Purchase: ${newReq.quantityToPurchase} ${newReq.unit})`,
      type: 'stock',
      read: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      link: 'inventory',
    });

    this.saveDatabase();
    return newReq;
  }

  public updateStockRequirementStatus(
    id: string,
    status: 'Requested' | 'Approved' | 'Purchased' | 'Cancelled',
    updatedBy: string = 'Admin',
    purchasePrice?: number
  ): StockRequirement | null {
    const req = this.state.stockRequirements.find((r) => r.id === id);
    if (!req) return null;

    const previousStatus = req.status;
    req.status = status;
    req.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);

    // CRITICAL REQUIREMENT 7: When stock is marked Purchased, update inventory safely through a recorded stock transaction!
    if (status === 'Purchased' && previousStatus !== 'Purchased') {
      const purchaseQty = req.quantityToPurchase > 0 ? req.quantityToPurchase : req.quantityRequired;
      const cleanName = req.itemOrIngredientName.trim();

      // Find or create inventory item
      let invItem = this.state.inventory.find(
        (i) => i.shopId === req.shopId && i.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (invItem) {
        invItem.currentQuantity += purchaseQty;
        invItem.lastRestocked = new Date().toISOString().split('T')[0];
        if (purchasePrice && purchasePrice > 0) {
          invItem.purchasePrice = purchasePrice;
        }
      } else {
        invItem = {
          id: `inv-${req.shopId}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          shopId: req.shopId,
          name: cleanName,
          category: 'baking_supplies',
          currentQuantity: purchaseQty,
          unit: req.unit,
          minStockLevel: 5,
          purchasePrice: purchasePrice || 50,
          supplierId: req.supplier,
          lastRestocked: new Date().toISOString().split('T')[0],
        };
        this.state.inventory.push(invItem);
      }

      // Record Stock Movement Transaction
      this.state.stockMovements.unshift({
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        shopId: req.shopId,
        inventoryItemId: invItem.id,
        itemName: cleanName,
        movementType: 'purchase_in',
        quantity: purchaseQty,
        unit: req.unit,
        referenceId: req.id,
        reason: `Staff Requirement Request #${req.id} fulfilled (Order Token: ${req.orderToken || 'General Shop Stock'}). Verified by ${updatedBy}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      });

      // Update the available stock in requirement record
      req.availableStock = invItem.currentQuantity;
    }

    this.saveDatabase();
    return req;
  }

  // --- REPORTS SUMMARY ---
  public getReportsSummary(shopId?: string) {
    const orders = this.getOrders(shopId).filter((o) => o.status !== 'cancelled');
    const expenses = this.getExpenses(shopId);
    const purchases = this.getPurchases(shopId);

    const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const advancePaid = orders.reduce((sum, o) => sum + o.advancePaid, 0);
    const customerBalanceDue = orders.reduce((sum, o) => sum + o.balanceAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const supplierLiabilities = purchases.reduce((sum, p) => sum + p.outstandingBalance, 0);
    const estimatedGrossProfit = totalSales - totalExpenses;

    return {
      totalSales,
      advancePaid,
      customerBalanceDue,
      totalExpenses,
      totalPurchases,
      supplierLiabilities,
      estimatedGrossProfit,
      orderCount: orders.length,
      expenseCount: expenses.length,
    };
  }
}

export const db = new BackendDatabase();
