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
  role: UserRole;
  displayName: string;
  phoneNumber?: string | null;
  addresses?: Address[];
  createdAt: Date;
  updatedAt: Date;
  photoURL?: string | null; // Optional avatar for user
}

export interface Vendor extends User {
  shopName: string;
  shopAddress: string;
  isVerified: boolean;
  products: string[]; // Array of product IDs
  description?: string; // Short description or tagline
  image?: string; // Logo or avatar URL
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
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDeliveryDate?: Date;
  customerName?: string;
  customerEmail?: string;
  orderNumber?: string; // Persistent order number
  deliveryFee?: number; // Delivery fee for the order
  serviceFee?: number; // Service fee for the order
  estimatedTimeArrival?: Date; // Add this field for ETA
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