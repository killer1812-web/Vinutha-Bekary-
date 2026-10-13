export type UserRole = 'super_admin' | 'shop_admin' | 'shop_staff' | 'staff';

export interface Shop {
  id: string; // 'shop-1' | 'shop-2'
  name: string;
  code: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  counterPosterTitle: string;
  operatingHours: string;
  isActive: boolean;
  upiId?: string;
  upiMerchantName?: string;
  advancePercentage?: number; // e.g. 50
  advancePaymentPercentage?: number;
  qrOrderUrl?: string;
  counterQrUrl?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  token: string;
  createdAt: string;
}

export interface StaffUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  assignedShopId: string | null; // null for super_admin
  phone: string;
  isActive: boolean;
}

export interface StockRequirement {
  id: string;
  shopId: string;
  mode: 'order' | 'general';
  orderId?: string;
  orderToken?: string; // e.g. "025"
  itemOrIngredientName: string;
  quantityRequired: number;
  unit: string; // kg, g, L, ml, pcs, boxes, packets
  availableStock: number;
  quantityToPurchase: number; // max(0, quantityRequired - availableStock)
  requiredDate: string;
  supplier?: string;
  notes?: string;
  requestedBy: string; // Staff member name
  status: 'Requested' | 'Approved' | 'Purchased' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'order_received'
  | 'pending'
  | 'under_review'
  | 'price_quoted'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export interface CakeSizeOption {
  size: string;
  price: number;
}

export interface CakeCategory {
  id: string;
  name: string;
  slug: 'normal-cakes' | 'ice-cakes' | 'birthday' | 'anniversary' | 'custom' | 'bakery-items' | 'puffs' | string;
  description: string;
  badge?: string;
}

export interface CakeItem {
  id: string;
  name: string;
  categorySlug: 'normal-cakes' | 'ice-cakes' | 'birthday' | 'anniversary' | 'custom';
  description: string;
  basePrice: number;
  sizes: CakeSizeOption[];
  flavours: string[];
  decorations: string[];
  images: string[];
  eggOrEggless: 'eggless' | 'contains_egg';
  prepTime?: string; // e.g. '2-3 hours', 'Same Day', '24 hours'
  isAvailable: boolean;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
  badge?: string;
  isSpecial?: boolean;
}

export interface OrderItem {
  id: string;
  cakeId?: string;
  cakeName: string;
  size: string;
  flavour?: string;
  eggOrEggless?: 'eggless' | 'contains_egg';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specialInstructions?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  paymentType: 'advance' | 'balance' | 'full';
  paymentMethod: 'upi_phonepe' | 'upi_gpay' | 'upi_paytm' | 'upi_qr' | 'cash';
  transactionRef?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface CustomerNotification {
  id: string;
  customerPhone: string;
  orderId: string;
  orderNumber: string;
  title: string;
  message: string;
  type: 'quote_ready' | 'order_update' | 'payment_verified';
  quotedPrice?: number;
  advanceRequired?: number;
  balanceAmount?: number;
  expiryDate?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'read';
  isRead?: boolean;
  createdAt: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  notes: string;
  updatedBy: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. VB-2026-101
  tokenNumber?: string; // Simple sequential token e.g. "001", "002", "025"
  shopId: string; // shop-1
  customerName: string;
  customerPhone: string;
  cakeId?: string;
  cakeName: string;
  categorySlug: string;
  size: string;
  flavour: string;
  eggOrEggless?: 'eggless' | 'contains_egg';
  quantity: number;
  unitPrice: number;
  items?: OrderItem[]; // multi-item order cart support
  totalAmount: number;
  advancePaid: number;
  advanceRequired?: number;
  balanceAmount: number;
  requiredDate: string;
  requiredTime: string;
  fulfillmentType: 'pickup' | 'delivery';
  deliveryAddress?: string;
  occasion?: string;
  birthdayPersonName?: string;
  nameOnCake?: string;
  messageOnCake?: string;
  customMessage?: string;
  specialInstructions?: string;
  referencePhotoUrl?: string;
  audioNoteUrl?: string; // audio data url or playback source
  status: OrderStatus;
  paymentStatus?: 'pending_advance' | 'advance_pending_verification' | 'advance_paid' | 'fully_paid' | 'cancelled';
  upiTransactionRef?: string;
  isPaymentVerified?: boolean;
  paymentLedger?: PaymentRecord[];
  isCustomDesign: boolean;
  quotedPrice?: number;
  quoteExpiryDate?: string;
  quotationStatus?: 'pending' | 'quoted' | 'accepted' | 'rejected';
  statusHistory: StatusHistoryEntry[];
  pickupQrToken: string; // secure token for scanning order at shop counter
  createdAt: string;
}

export type ExpenseCategory =
  | 'ingredients'
  | 'milk_and_cream'
  | 'flour'
  | 'sugar'
  | 'decorations'
  | 'packaging'
  | 'electricity'
  | 'delivery'
  | 'rent'
  | 'cleaning'
  | 'repairs'
  | 'raw_materials'
  | 'utilities'
  | 'transport'
  | 'other';

export interface Expense {
  id: string;
  shopId: string;
  date: string;
  title: string;
  category: ExpenseCategory;
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
  paidBy: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address: string;
  gstNumber?: string;
  balance: number;
}

export interface PurchaseItem {
  id: string;
  inventoryItemId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseRecord {
  id: string;
  shopId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'credit';
  invoiceFileUrl?: string;
  notes?: string;
  createdAt: string;
}

export type InventoryCategory =
  | 'flour'
  | 'dairy'
  | 'sweeteners'
  | 'chocolates'
  | 'fruits'
  | 'decorations'
  | 'packaging'
  | 'baking_supplies';

export interface InventoryItem {
  id: string;
  shopId: string;
  name: string;
  category: InventoryCategory;
  currentQuantity: number;
  unit: string; // kg, liters, pcs, boxes
  minStockLevel: number;
  purchasePrice: number;
  supplierId?: string;
  lastRestocked: string;
}

export interface StockMovement {
  id: string;
  shopId: string;
  inventoryItemId: string;
  itemName: string;
  movementType: 'purchase_in' | 'usage_out' | 'adjustment';
  quantity: number;
  unit: string;
  referenceId?: string;
  reason: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  details: string;
  shopId?: string;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  shopId?: string; // null if broadcast to owner
  title: string;
  message: string;
  type: 'order' | 'quote' | 'stock' | 'bill' | 'system';
  read: boolean;
  createdAt: string;
  link?: string;
}
