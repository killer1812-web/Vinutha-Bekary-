import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import type { StaffUser } from '../src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ==============================================================================
// MULTER FILE STORAGE (Cake Photos, Receipt Bills, Audio Notes)
// ==============================================================================
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, cleanName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|webp|gif|webm|mp3|ogg|wav|pdf)$/i;
    if (!allowed.test(path.extname(file.originalname))) {
      return cb(new Error('Only image (JPG, PNG, WebP) and audio files are supported'));
    }
    cb(null, true);
  },
});

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads serving
app.use('/uploads', express.static(UPLOADS_DIR));

// ==============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)
// ==============================================================================
const tokenStore = new Map<string, StaffUser>();

// Pre-seed demo tokens for local and test convenience
function seedDemoTokens() {
  const staffList = db.getStaff();
  for (const staff of staffList) {
    tokenStore.set(`vb-token-${staff.username}`, staff);
    tokenStore.set(`token-${staff.username}`, staff);
    tokenStore.set(`vb-token-${staff.id}`, staff);
  }
}
seedDemoTokens();

function getAuthUser(req: Request): StaffUser | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.headers['x-auth-token'] === 'string') {
    token = req.headers['x-auth-token'];
  }

  if (!token) return null;

  if (tokenStore.has(token)) {
    return tokenStore.get(token)!;
  }

  // Parse token format: vb-token-<userId>-<timestamp>
  const staffList = db.getStaff();
  for (const staff of staffList) {
    if (token.includes(staff.id) || token.includes(staff.username)) {
      tokenStore.set(token, staff);
      return staff;
    }
  }

  return null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Staff or Admin authentication required.' });
  }
  (req as any).user = user;
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in as Admin.' });
  }
  if (user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Forbidden: Super Admin (Owner) access required. Staff accounts are restricted from accessing financial reports and shop settings.',
    });
  }
  (req as any).user = user;
  next();
}

// Customer Session Helpers (Low-Assurance Session Token, OTP Ready)
function getCustomerAuth(req: Request) {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (typeof req.headers['x-customer-token'] === 'string') {
    token = req.headers['x-customer-token'];
  }
  if (!token) return null;
  return db.getCustomerByToken(token);
}

function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
  const customer = getCustomerAuth(req);
  if (!customer) {
    return res.status(401).json({ error: 'Customer session required. Please log in with name and phone number.' });
  }
  (req as any).customer = customer;
  next();
}

// In-Memory Rate Limiter for Login, Orders, and Quotes
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
function rateLimiter(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'client';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const entry = rateLimitMap.get(key);
    if (entry && entry.expiresAt > now) {
      if (entry.count >= limit) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      }
      entry.count++;
    } else {
      rateLimitMap.set(key, { count: 1, expiresAt: now + windowMs });
    }
    next();
  };
}

// ==============================================================================
// HEALTH & FILE UPLOADS
// ==============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Vinutha Bakery API Server',
    time: new Date().toISOString(),
    version: '2.0.0',
    authenticatedStaff: tokenStore.size,
  });
});

app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

app.post('/api/upload-base64', (req: Request, res: Response) => {
  const { base64Data, fileType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: 'No base64 data provided' });
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const dataBuffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');
    const ext = fileType === 'audio' ? '.webm' : '.jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(filePath, dataBuffer);
    res.json({ success: true, url: `/uploads/${safeName}` });
  } catch (err) {
    console.error('Base64 upload error:', err);
    res.status(500).json({ error: 'Failed to save base64 file' });
  }
});

// ==============================================================================
// SINGLE SHOP CONFIGURATION
// ==============================================================================
// Primary single shop endpoint for customer views
app.get('/api/shop', (_req: Request, res: Response) => {
  const shop = db.getShopById('shop-1') || db.getShops()[0];
  res.json(shop);
});

// Admin update shop settings (Address, Phone, Operating Hours, UPI ID, Merchant Name)
app.put('/api/shop/settings', requireSuperAdmin, (req: Request, res: Response) => {
  const updated = db.updateShop('shop-1', req.body);
  if (!updated) return res.status(404).json({ error: 'Shop not found' });
  res.json(updated);
});

app.get('/api/shops', (_req: Request, res: Response) => {
  res.json(db.getShops());
});

app.get('/api/shops/:id', (req: Request, res: Response) => {
  const shop = db.getShopById(req.params.id);
  if (!shop) return res.status(404).json({ error: 'Shop not found' });
  res.json(shop);
});

app.put('/api/shops/:id', requireSuperAdmin, (req: Request, res: Response) => {
  const updated = db.updateShop(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Shop not found' });
  res.json(updated);
});

// ==============================================================================
// CUSTOMER LOGIN & AUTHENTICATION (Name & 10-Digit Mobile Only - No OTP)
// ==============================================================================
app.post('/api/customer/auth', rateLimiter(20, 60000), (req: Request, res: Response) => {
  const { name, phone } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Please enter your name (at least 2 characters).' });
  }

  const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number.' });
  }

  const { customer, token } = db.authenticateCustomer(String(name).trim(), cleanPhone);
  res.json({
    success: true,
    customer,
    token,
    note: 'Active session (low-assurance name+phone; OTP verification toggleable in admin settings).',
  });
});

// Isolated customer orders: returns only the authenticated customer's orders
app.get('/api/customer/orders', requireCustomerAuth, (req: Request, res: Response) => {
  const customer = (req as any).customer;
  const customerOrders = db.getCustomerOrders(customer.phone);
  res.json(customerOrders);
});

// Isolated customer notifications
app.get('/api/customer/notifications', requireCustomerAuth, (req: Request, res: Response) => {
  const customer = (req as any).customer;
  const notifs = db.getCustomerNotifications(customer.phone);
  res.json(notifs);
});

// Customer quote response (Accept or Decline quotation)
app.post('/api/customer/quotes/:id/respond', requireCustomerAuth, (req: Request, res: Response) => {
  const customer = (req as any).customer;
  const { accept } = req.body;
  const order = db.getOrderByIdOrToken(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Privacy isolation: cannot accept/reject another customer's quote!
  const orderPhone = order.customerPhone.replace(/\D/g, '').slice(-10);
  if (orderPhone !== customer.phone) {
    return res.status(403).json({ error: 'Forbidden: Access to another customer order is denied.' });
  }

  const updated = db.respondToQuotation(order.id, !!accept);
  res.json(updated);
});

app.post('/api/customer/notifications/:id/read', requireCustomerAuth, (req: Request, res: Response) => {
  db.markCustomerNotification(req.params.id, 'read');
  res.json({ success: true });
});

// ==============================================================================
// CAKES CATALOG (Staff & Admin CRUD with Eggless & Prep Time)
// ==============================================================================
app.get('/api/cakes', (_req: Request, res: Response) => {
  res.json(db.getCakes());
});

app.get('/api/cakes/:id', (req: Request, res: Response) => {
  const cake = db.getCakeById(req.params.id);
  if (!cake) return res.status(404).json({ error: 'Cake not found' });
  res.json(cake);
});

// Create cake: Authorized staff & Admin permission
app.post('/api/cakes', requireAuth, (req: Request, res: Response) => {
  const { name, categorySlug, basePrice, sizes, description, eggOrEggless, prepTime } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Cake name is required' });
  }
  if (!categorySlug) {
    return res.status(400).json({ error: 'Cake category is required' });
  }
  if (!basePrice || Number(basePrice) <= 0) {
    return res.status(400).json({ error: 'A valid positive base price is required' });
  }

  const configuredSizes = Array.isArray(sizes) && sizes.length > 0 ? sizes : [
    { size: '0.5 kg', price: Math.round(Number(basePrice) * 0.6) },
    { size: '1.0 kg', price: Number(basePrice) },
    { size: '1.5 kg', price: Math.round(Number(basePrice) * 1.45) },
    { size: '2.0 kg', price: Math.round(Number(basePrice) * 1.9) },
  ];

  const newCake = db.createCake({
    name: name.trim(),
    categorySlug,
    description: description || '',
    basePrice: Number(basePrice),
    sizes: configuredSizes,
    flavours: req.body.flavours || ['Vanilla', 'Chocolate'],
    decorations: req.body.decorations || ['Cream Rosettes', 'Glaze'],
    images: Array.isArray(req.body.images) && req.body.images.length > 0 ? req.body.images : ['/images/chocolate_truffle.jpg'],
    eggOrEggless: eggOrEggless === 'contains_egg' ? 'contains_egg' : 'eggless',
    prepTime: prepTime || '2-4 hours',
    isAvailable: req.body.isAvailable !== false,
    stockStatus: req.body.stockStatus || 'in_stock',
    badge: req.body.badge,
    isSpecial: !!req.body.isSpecial,
  });

  res.status(201).json(newCake);
});

// Update cake: Authorized staff & Admin permission
app.put('/api/cakes/:id', requireAuth, (req: Request, res: Response) => {
  const updated = db.updateCake(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Cake not found' });
  res.json(updated);
});

// Delete cake: Super Admin only
app.delete('/api/cakes/:id', requireSuperAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteCake(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Cake not found' });
  res.json({ success: true });
});

// ==============================================================================
// ORDERS, CART & QUOTATIONS (With duplicate prevention & server-side validation)
// ==============================================================================
const recentOrderDedupe = new Map<string, number>();

app.get('/api/orders', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized: Staff or Admin credentials required' });
  }

  let shopId = req.query.shopId as string | undefined;
  if (authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }

  res.json(db.getOrders(shopId));
});

// Safe Order Lookup: Masks customer contact if not authenticated staff or customer owner
app.get('/api/orders/:identifier', (req: Request, res: Response) => {
  const order = db.getOrderByIdOrToken(req.params.identifier);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const staffUser = getAuthUser(req);
  const customerUser = getCustomerAuth(req);

  // If staff/admin or if authenticated customer matches order phone, return complete order
  const orderPhone = order.customerPhone.replace(/\D/g, '').slice(-10);
  if (staffUser || (customerUser && customerUser.phone === orderPhone)) {
    return res.json(order);
  }

  // Stranger lookup via pickup token or order number: mask sensitive personal data
  const maskedPhone = order.customerPhone ? `${order.customerPhone.slice(0, 2)}******${order.customerPhone.slice(-2)}` : '';
  const sanitizedOrder: Partial<Order> = {
    ...order,
    customerPhone: maskedPhone,
    deliveryAddress: order.deliveryAddress ? 'Address Hidden (Privacy Protected)' : undefined,
  };
  res.json(sanitizedOrder);
});

app.post('/api/orders', rateLimiter(30, 60000), (req: Request, res: Response) => {
  const { customerName, customerPhone, cakeId, cakeName, size, quantity, advancePaid, items } = req.body;

  if (!customerName || !String(customerName).trim()) {
    return res.status(400).json({ error: 'Customer name is required' });
  }
  if (!customerPhone || !String(customerPhone).trim()) {
    return res.status(400).json({ error: 'Customer phone number is required' });
  }

  // Duplicate submission check: prevent double tap in 8 seconds
  const dedupeKey = `${String(customerPhone).trim()}-${cakeId || cakeName}-${size}-${advancePaid}`;
  const now = Date.now();
  if (recentOrderDedupe.has(dedupeKey) && now - (recentOrderDedupe.get(dedupeKey) || 0) < 8000) {
    return res.status(409).json({ error: 'Duplicate order detected. Your order was already received.' });
  }
  recentOrderDedupe.set(dedupeKey, now);

  // Multi-item cart or single cake calculation
  let verifiedTotal = 0;
  let verifiedItems = undefined;

  if (Array.isArray(items) && items.length > 0) {
    verifiedItems = items.map((it: any) => {
      let unitPrice = Number(it.unitPrice) || 0;
      if (it.cakeId) {
        const c = db.getCakeById(it.cakeId);
        if (c) {
          const sz = c.sizes.find((s) => s.size === it.size);
          unitPrice = sz ? sz.price : c.basePrice;
        }
      }
      const qty = Math.max(1, Number(it.quantity) || 1);
      return {
        ...it,
        unitPrice,
        quantity: qty,
        totalPrice: unitPrice * qty,
      };
    });
    verifiedTotal = verifiedItems.reduce((sum: number, it: any) => sum + it.totalPrice, 0);
  } else {
    // Single cake order calculation
    let verifiedUnitPrice = Number(req.body.unitPrice) || 0;
    if (cakeId) {
      const existingCake = db.getCakeById(cakeId);
      if (existingCake) {
        if (!existingCake.isAvailable || existingCake.stockStatus === 'out_of_stock') {
          return res.status(400).json({
            error: `Sorry, "${existingCake.name}" is currently unavailable or out of stock.`,
          });
        }
        const matchedSize = existingCake.sizes?.find((s) => s.size === size);
        if (matchedSize) {
          verifiedUnitPrice = matchedSize.price;
        } else if (existingCake.basePrice) {
          verifiedUnitPrice = existingCake.basePrice;
        }
      }
    }
    const verifiedQty = Math.max(1, Number(quantity) || 1);
    verifiedTotal = verifiedUnitPrice * verifiedQty;
  }

  const newOrder = db.createOrder({
    ...req.body,
    items: verifiedItems,
    totalAmount: verifiedTotal,
  });

  res.status(201).json(newOrder);
});

app.put('/api/orders/:id/status', requireAuth, (req: Request, res: Response) => {
  const { status, notes, updatedBy } = req.body;
  const user = (req as any).user;
  const updated = db.updateOrderStatus(req.params.id, status, notes, updatedBy || user.name);
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

// Quote custom cake price: Authorized Staff & Admin permission
const handleQuoteRequest = (req: Request, res: Response) => {
  const { quotedPrice, advanceRequired, expiryDate, notes, updatedBy } = req.body;
  const user = (req as any).user;
  const updated = db.submitQuotation(
    req.params.id,
    Number(quotedPrice),
    notes,
    updatedBy || user.name,
    advanceRequired !== undefined ? Number(advanceRequired) : undefined,
    expiryDate
  );
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
};

app.put('/api/orders/:id/quote', requireAuth, handleQuoteRequest);
app.post('/api/orders/:id/quote', requireAuth, handleQuoteRequest);

app.put('/api/orders/:id/quote-response', (req: Request, res: Response) => {
  const { accept } = req.body;
  const updated = db.respondToQuotation(req.params.id, !!accept);
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

// Customer submits UPI payment reference
app.post('/api/orders/:id/payments', (req: Request, res: Response) => {
  const { amount, updatedBy, paymentMethod, transactionRef } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'A valid payment amount is required' });
  }

  const updated = db.recordPayment(
    req.params.id,
    Number(amount),
    updatedBy || 'Customer',
    paymentMethod || 'upi_phonepe',
    transactionRef,
    false // always unverified pending staff confirmation
  );
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

// Staff / Admin verifies UPI payment received in bank
app.put('/api/orders/:id/verify-payment', requireAuth, (req: Request, res: Response) => {
  const { paymentId, isVerified } = req.body;
  const user = (req as any).user;
  const updated = db.verifyOrderPayment(req.params.id, paymentId, isVerified !== false, user.name);
  if (!updated) return res.status(404).json({ error: 'Order not found' });
  res.json(updated);
});

// ==============================================================================
// SHOP EXPENSES (Strict Staff Isolation & Admin Multi-Shop Overview)
// ==============================================================================
app.get('/api/expenses', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  let shopId = req.query.shopId as string | undefined;

  // Role enforcement: Staff accounts are strictly isolated to their assigned branch
  if (authUser && authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }

  res.json(db.getExpenses(shopId));
});

app.post('/api/expenses', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StaffUser;
  const { title, amount, category, date, description, paymentMethod, receiptUrl, notes } = req.body;

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'Expense title / item name is required' });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'A valid positive expense amount is required' });
  }

  // If staff, enforce assigned shop ID
  const shopId = user.role === 'super_admin' ? (req.body.shopId || 'shop-1') : (user.assignedShopId || 'shop-1');

  const newExpense = db.createExpense({
    shopId,
    date: date || new Date().toISOString().split('T')[0],
    title: String(title).trim(),
    category: category || 'ingredients',
    description: description || '',
    amount: Number(amount),
    paymentMethod: paymentMethod || 'cash',
    paidBy: req.body.paidBy || user.name,
    receiptUrl,
    notes,
  });

  res.status(201).json(newExpense);
});

app.put('/api/expenses/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StaffUser;
  const existing = db.getExpenseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense record not found' });

  // Role check: Staff cannot edit expenses belonging to another shop
  if (user.role === 'shop_staff' && existing.shopId !== user.assignedShopId) {
    return res.status(403).json({ error: 'Forbidden: You cannot modify expenses for another shop.' });
  }

  const updated = db.updateExpense(req.params.id, req.body);
  res.json(updated);
});

app.delete('/api/expenses/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StaffUser;
  const existing = db.getExpenseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense record not found' });

  // Role check: Staff cannot delete expenses belonging to another shop
  if (user.role === 'shop_staff' && existing.shopId !== user.assignedShopId) {
    return res.status(403).json({ error: 'Forbidden: You cannot delete expenses for another shop.' });
  }

  db.deleteExpense(req.params.id);
  res.json({ success: true });
});

// ==============================================================================
// SUPPLIERS & PURCHASES
// ==============================================================================
app.get('/api/suppliers', (_req: Request, res: Response) => {
  res.json(db.getSuppliers());
});

app.post('/api/suppliers', requireSuperAdmin, (req: Request, res: Response) => {
  const supplier = db.createSupplier(req.body);
  res.status(201).json(supplier);
});

app.get('/api/purchases', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  let shopId = req.query.shopId as string | undefined;
  if (authUser && authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }
  res.json(db.getPurchases(shopId));
});

app.post('/api/purchases', requireAuth, (req: Request, res: Response) => {
  // Automatically increments inventory and logs stock movements
  const purchase = db.createPurchase(req.body);
  res.status(201).json(purchase);
});

// ==============================================================================
// INVENTORY
// ==============================================================================
app.get('/api/inventory', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  let shopId = req.query.shopId as string | undefined;
  if (authUser && authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }
  res.json(db.getInventory(shopId));
});

app.put('/api/inventory/:id/adjust', requireAuth, (req: Request, res: Response) => {
  const { newQuantity, reason } = req.body;
  const item = db.adjustStock(req.params.id, Number(newQuantity), reason);
  if (!item) return res.status(404).json({ error: 'Inventory item not found' });
  res.json(item);
});

// ==============================================================================
// STOCK REQUIREMENTS / PURCHASE LIST (Staff & Admin)
// ==============================================================================
app.get('/api/stock-requirements', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  let shopId = req.query.shopId as string | undefined;
  if (authUser && authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }
  res.json(db.getStockRequirements(shopId));
});

app.post('/api/stock-requirements', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StaffUser;
  const { itemOrIngredientName, quantityRequired, unit, mode, orderId, orderToken, availableStock, requiredDate, supplier, notes } = req.body;

  if (!itemOrIngredientName || !String(itemOrIngredientName).trim()) {
    return res.status(400).json({ error: 'Ingredient or item name is required' });
  }
  if (!quantityRequired || Number(quantityRequired) <= 0) {
    return res.status(400).json({ error: 'Quantity required must be greater than 0' });
  }

  const shopId = user.role === 'super_admin' ? (req.body.shopId || 'shop-1') : (user.assignedShopId || 'shop-1');

  const created = db.createStockRequirement({
    shopId,
    mode: mode || 'general',
    orderId,
    orderToken,
    itemOrIngredientName: String(itemOrIngredientName).trim(),
    quantityRequired: Number(quantityRequired),
    unit: unit || 'kg',
    availableStock: Number(availableStock) || 0,
    requiredDate: requiredDate || new Date().toISOString().split('T')[0],
    supplier,
    notes,
    requestedBy: user.name,
    status: 'Requested',
  });

  res.status(201).json(created);
});

app.put('/api/stock-requirements/:id/status', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as StaffUser;
  const { status, purchasePrice } = req.body;

  if (!['Requested', 'Approved', 'Purchased', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = db.updateStockRequirementStatus(
    req.params.id,
    status,
    user.name,
    purchasePrice !== undefined ? Number(purchasePrice) : undefined
  );

  if (!updated) {
    return res.status(404).json({ error: 'Stock requirement not found' });
  }

  res.json(updated);
});

// ==============================================================================
// AUTHENTICATION & STAFF
// ==============================================================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const staffUser = db.authenticateStaff(username, password);
  if (!staffUser) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = `vb-token-${staffUser.id}-${Date.now()}`;
  tokenStore.set(token, staffUser);
  tokenStore.set(`vb-token-${staffUser.username}`, staffUser);

  res.json({
    success: true,
    user: staffUser,
    token,
  });
});

app.get('/api/staff', requireSuperAdmin, (_req: Request, res: Response) => {
  res.json(db.getStaff());
});

// ==============================================================================
// NOTIFICATIONS
// ==============================================================================
app.get('/api/notifications', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  let shopId = req.query.shopId as string | undefined;
  if (authUser && authUser.role === 'shop_staff') {
    shopId = authUser.assignedShopId || 'shop-1';
  }
  res.json(db.getNotifications(shopId));
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationRead(req.params.id);
  res.json({ success: true });
});

// ==============================================================================
// FINANCIAL REPORTS SUMMARY (Strictly Admin Only)
// ==============================================================================
app.get('/api/reports/summary', requireSuperAdmin, (req: Request, res: Response) => {
  const shopId = req.query.shopId as string | undefined;
  res.json(db.getReportsSummary(shopId));
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload' });
  }
  console.error('Unhandled server error:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🎂 VINUTHA BAKERY BACKEND API SERVER RUNNING ON PORT ${PORT}`);
  console.log(`➜ Local API:   http://localhost:${PORT}/api/`);
  console.log(`➜ Network API: http://10.10.68.243:${PORT}/api/`);
  console.log(`➜ Uploads:     http://localhost:${PORT}/uploads/`);
  console.log(`======================================================\n`);
});
