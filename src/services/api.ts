import type {
  Shop,
  StaffUser,
  CakeItem,
  Order,
  OrderStatus,
  Expense,
  Supplier,
  PurchaseRecord,
  InventoryItem,
  AppNotification,
  CustomerUser,
  CustomerNotification,
  StockRequirement,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'vb_auth_token_v1';
const CUST_TOKEN_KEY = 'vb_cust_token_v1';

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {}
}

function getCustomerToken(): string | null {
  try {
    return localStorage.getItem(CUST_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setCustomerToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(CUST_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(CUST_TOKEN_KEY);
    }
  } catch {}
}

function getHeaders(isJson: boolean = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  const custToken = getCustomerToken();
  if (custToken) {
    headers['x-customer-token'] = custToken;
    if (!token) {
      headers['Authorization'] = `Bearer ${custToken}`;
    }
  }
  return headers;
}

export const api = {
  // --- AUTH MANAGEMENT ---
  getAuthToken: getToken,
  setAuthToken: setToken,
  getCustomerToken,
  setCustomerToken,

  // --- HEALTH ---
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- SHOPS & SINGLE SHOP SETTINGS ---
  async getShop(): Promise<Shop> {
    const res = await fetch(`${API_BASE}/shop`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch shop settings');
    return res.json();
  },

  async updateShopSettings(settings: Partial<Shop>): Promise<Shop> {
    const res = await fetch(`${API_BASE}/shop/settings`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update shop settings');
    }
    return res.json();
  },

  async getShops(): Promise<Shop[]> {
    const res = await fetch(`${API_BASE}/shops`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch shops');
    return res.json();
  },

  // --- CUSTOMER LOGIN & PORTAL ---
  async customerLogin(
    name: string,
    phone: string
  ): Promise<{ success: boolean; customer: CustomerUser; token: string; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/customer/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Customer authentication failed', customer: {} as any, token: '' };
      }
      if (data.token) {
        setCustomerToken(data.token);
      }
      return { success: true, customer: data.customer, token: data.token };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error', customer: {} as any, token: '' };
    }
  },

  customerLogout(): void {
    setCustomerToken(null);
  },

  async getCustomerOrders(): Promise<Order[]> {
    const res = await fetch(`${API_BASE}/customer/orders`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch customer orders');
    return res.json();
  },

  async getCustomerNotifications(): Promise<CustomerNotification[]> {
    const res = await fetch(`${API_BASE}/customer/notifications`, { headers: getHeaders(false) });
    if (!res.ok) return [];
    return res.json();
  },

  async respondCustomerQuote(orderId: string, accept: boolean): Promise<Order> {
    const res = await fetch(`${API_BASE}/customer/quotes/${orderId}/respond`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ accept }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to respond to quotation');
    }
    return res.json();
  },

  async markCustomerNotificationRead(notifId: string): Promise<void> {
    await fetch(`${API_BASE}/customer/notifications/${notifId}/read`, {
      method: 'POST',
      headers: getHeaders(false),
    }).catch(() => {});
  },

  // --- CAKES ---
  async getCakes(): Promise<CakeItem[]> {
    const res = await fetch(`${API_BASE}/cakes`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch cakes');
    return res.json();
  },

  async createCake(cake: Omit<CakeItem, 'id'>): Promise<CakeItem> {
    const res = await fetch(`${API_BASE}/cakes`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(cake),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create cake');
    }
    return res.json();
  },

  async updateCake(id: string, updates: Partial<CakeItem>): Promise<CakeItem> {
    const res = await fetch(`${API_BASE}/cakes/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update cake');
    }
    return res.json();
  },

  async deleteCake(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/cakes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    return res.ok;
  },

  // --- ORDERS ---
  async getOrders(shopId?: string): Promise<Order[]> {
    const url = shopId && shopId !== 'all' ? `${API_BASE}/orders?shopId=${shopId}` : `${API_BASE}/orders`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  async getOrder(identifier: string): Promise<Order | null> {
    const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(identifier)}`, { headers: getHeaders(false) });
    if (!res.ok) return null;
    return res.json();
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(orderData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create order');
    }
    return res.json();
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    notes?: string,
    updatedBy?: string
  ): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ status, notes, updatedBy }),
    });
    if (!res.ok) throw new Error('Failed to update order status');
    return res.json();
  },

  async submitQuotation(
    orderId: string,
    quotedPrice: number,
    notes?: string,
    updatedBy?: string,
    advanceRequired?: number,
    expiryDate?: string
  ): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/quote`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ quotedPrice, notes, updatedBy, advanceRequired, expiryDate }),
    });
    if (!res.ok) throw new Error('Failed to submit quote');
    return res.json();
  },

  async respondToQuotation(orderId: string, accept: boolean): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/quote-response`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ accept }),
    });
    if (!res.ok) throw new Error('Failed to respond to quote');
    return res.json();
  },

  async recordPayment(
    orderId: string,
    amount: number,
    updatedBy?: string,
    paymentMethod?: string,
    transactionRef?: string
  ): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/payments`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ amount, updatedBy, paymentMethod, transactionRef }),
    });
    if (!res.ok) throw new Error('Failed to record payment');
    return res.json();
  },

  async verifyPayment(orderId: string, paymentId?: string, isVerified?: boolean): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${orderId}/verify-payment`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ paymentId, isVerified }),
    });
    if (!res.ok) throw new Error('Failed to verify payment');
    return res.json();
  },

  // --- EXPENSES ---
  async getExpenses(shopId?: string): Promise<Expense[]> {
    const url = shopId && shopId !== 'all' ? `${API_BASE}/expenses?shopId=${shopId}` : `${API_BASE}/expenses`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch expenses');
    return res.json();
  },

  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to record expense');
    }
    return res.json();
  },

  async updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update expense');
    }
    return res.json();
  },

  async deleteExpense(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    return res.ok;
  },

  // --- SUPPLIERS & PURCHASES ---
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch(`${API_BASE}/suppliers`, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  },

  async createSupplier(supplier: Omit<Supplier, 'id'>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(supplier),
    });
    if (!res.ok) throw new Error('Failed to create supplier');
    return res.json();
  },

  async getPurchases(shopId?: string): Promise<PurchaseRecord[]> {
    const url =
      shopId && shopId !== 'all' ? `${API_BASE}/purchases?shopId=${shopId}` : `${API_BASE}/purchases`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch purchases');
    return res.json();
  },

  async createPurchase(purchase: Omit<PurchaseRecord, 'id' | 'createdAt'>): Promise<PurchaseRecord> {
    const res = await fetch(`${API_BASE}/purchases`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(purchase),
    });
    if (!res.ok) throw new Error('Failed to create purchase record');
    return res.json();
  },

  // --- INVENTORY ---
  async getInventory(shopId?: string): Promise<InventoryItem[]> {
    const url =
      shopId && shopId !== 'all' ? `${API_BASE}/inventory?shopId=${shopId}` : `${API_BASE}/inventory`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    return res.json();
  },

  async adjustStock(itemId: string, newQuantity: number, reason: string): Promise<InventoryItem> {
    const res = await fetch(`${API_BASE}/inventory/${itemId}/adjust`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ newQuantity, reason }),
    });
    if (!res.ok) throw new Error('Failed to adjust stock');
    return res.json();
  },

  // --- AUTHENTICATION ---
  async login(username: string, password: string): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.token) {
        setToken(data.token);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to backend' };
    }
  },

  logout(): void {
    setToken(null);
  },

  // --- FINANCIAL REPORTS (Super Admin only) ---
  async getReportsSummary(shopId?: string): Promise<any> {
    const url = shopId && shopId !== 'all' ? `${API_BASE}/reports/summary?shopId=${shopId}` : `${API_BASE}/reports/summary`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch financial report summary');
    }
    return res.json();
  },

  // --- FILE UPLOADS ---
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    const data = await res.json();
    return data.url;
  },

  async uploadBase64(base64Data: string, fileType: 'audio' | 'image'): Promise<string> {
    const res = await fetch(`${API_BASE}/upload-base64`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ base64Data, fileType }),
    });
    const data = await res.json();
    return data.url;
  },

  // --- NOTIFICATIONS ---
  async getNotifications(shopId?: string): Promise<AppNotification[]> {
    const url =
      shopId && shopId !== 'all' ? `${API_BASE}/notifications?shopId=${shopId}` : `${API_BASE}/notifications`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) return [];
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(false),
    });
  },

  // --- STOCK REQUIREMENTS & PURCHASE LIST ---
  async getStockRequirements(shopId?: string): Promise<StockRequirement[]> {
    const url =
      shopId && shopId !== 'all'
        ? `${API_BASE}/stock-requirements?shopId=${shopId}`
        : `${API_BASE}/stock-requirements`;
    const res = await fetch(url, { headers: getHeaders(false) });
    if (!res.ok) return [];
    return res.json();
  },

  async createStockRequirement(
    reqData: Omit<StockRequirement, 'id' | 'createdAt' | 'updatedAt' | 'quantityToPurchase'>
  ): Promise<StockRequirement> {
    const res = await fetch(`${API_BASE}/stock-requirements`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(reqData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit stock requirement');
    }
    return res.json();
  },

  async updateStockRequirementStatus(
    id: string,
    status: 'Requested' | 'Approved' | 'Purchased' | 'Cancelled',
    purchasePrice?: number
  ): Promise<StockRequirement> {
    const res = await fetch(`${API_BASE}/stock-requirements/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify({ status, purchasePrice }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update stock requirement status');
    }
    return res.json();
  },
};
