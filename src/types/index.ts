export type UserRole = 'customer' | 'vendor' | 'admin' | 'admin-manager';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string; // Profile photo URL
  addresses: Address[];
  role: UserRole;
  userNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor extends User {
  shopAddress: string;
  isVerified: boolean;
  products: string[]; // Array of product IDs
  description?: string; // Short description or tagline
  image?: string; // Logo or avatar URL
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string; // Icon name or SVG path
  color: string; // Hex color for category styling
  createdBy: string; // Vendor ID who created it
  isGlobal: boolean; // Whether it's a global category or vendor-specific
  createdAt: Date;
  updatedAt: Date;
  productCount: number; // Number of products in this category
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  images: string[];
  vendorId: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor'; // For second-hand items
  isSecondHand?: boolean; // Whether this is a second-hand item
  originalPrice?: number; // Original price for second-hand items
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderActivity {
  id: string;
  action: string;
  description: string;
  performedBy: string; // User ID who performed the action
  performedByRole: UserRole; // Role of the user who performed the action
  timestamp: Date;
  previousValue?: string | null; // Previous status/value before change
  newValue?: string | null; // New status/value after change
}

export interface PaymentBreakdown {
  subtotal: number; // Original order subtotal
  deliveryFee: number; // Delivery fee charged to customer
  customerServiceFee: number; // 10% service fee charged to customer
  vendorProcessingFee: number; // 10% processing fee deducted from vendor payout
  discountAmount: number; // Discount applied (if any)
  totalChargedToCustomer: number; // Total amount customer pays
  vendorPayoutAmount: number; // Amount vendor receives after fees
  platformRevenue: number; // Total platform revenue (customer fee + vendor fee)
}

export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentMethod: string;
  deliveryOption?: 'delivery' | 'pickup';
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDeliveryDate?: Date;
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string; // Persistent order number
  deliveryFee?: number; // Delivery fee for the order
  serviceFee?: number; // Service fee for the order (customer fee)
  vendorProcessingFee?: number; // Vendor processing fee
  paymentBreakdown?: PaymentBreakdown; // Detailed payment breakdown
  estimatedTimeArrival?: Date; // Add this field for ETA
  couponCode?: string; // Coupon code used for this order
  discountAmount?: number; // Discount amount applied to this order
  activityLog?: OrderActivity[]; // Activity log for tracking order changes
  vendorPayoutStatus?: 'pending' | 'processing' | 'completed' | 'failed'; // Vendor payout status
  vendorPayoutDate?: Date; // When vendor payout was processed
  pickupAddress?: Address; // Pickup address for pickup orders
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  orderId?: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  messages: Message[]; // New field for chat messages
}

export interface Message {
  senderId: string;
  senderRole: UserRole; // 'customer', 'vendor', 'admin', 'admin-manager'
  messageText: string;
  timestamp: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  orderId?: string; // Optional, as some transactions might not be tied to an order (e.g., refunds)
  amount: number;
  type: 'purchase' | 'refund' | 'payout'; // e.g., purchase, refund, vendor payout
  paymentMethod: string; // e.g., 'credit_card', 'paypal', 'COD'
  status: 'pending' | 'completed' | 'failed';
  transactionDate: Date;
  details?: string; // Optional field for additional details
}

export interface Notification {
  id: string;
  type: 'login' | 'order_placed' | 'order_status_update' | 'account_created' | 'support_ticket_created' | 'support_message' | 'support_admin_response' | 'support_status_update' | 'support_ticket_reopened' | 'support_ticket_closed' | string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: any; // Optional: for extra info (orderId, ticketId, etc.)
  link?: string; // Optional: link to navigate
  linkLabel?: string; // Optional: label for the link
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // Percentage (0-100) or fixed amount in dollars
  minimumOrderAmount?: number; // Minimum order amount required to use coupon
  maximumDiscount?: number; // Maximum discount amount for percentage coupons
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number; // Total number of times this coupon can be used
  usedCount: number; // Number of times this coupon has been used
  isActive: boolean;
  restrictedToUser?: string; // User ID if coupon is restricted to specific user
  createdBy: string; // Admin/Admin-manager who created the coupon
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsage {
  id: string;
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}
