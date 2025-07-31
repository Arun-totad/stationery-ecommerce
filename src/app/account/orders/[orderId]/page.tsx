'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import type { Vendor } from '@/types';
import { DELIVERY_FEE, FREE_SHIPPING_THRESHOLD } from '@/lib/fees';
import ConfirmModal from '@/components/ConfirmModal';
import { toast } from 'react-hot-toast';

function formatDateDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function UserOrderDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Phone number formatting function
  const formatPhoneForDisplay = (value: string) => {
    if (!value) return 'N/A';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return value; // Return original if not 10 digits
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) return;
      setLoading(true);
      try {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const data = orderSnap.data();
          if (data.userId !== user.uid) {
            setError('You are not authorized to view this order.');
            setOrder(null);
          } else {
            setOrder({
              id: orderSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            } as Order);
            if (data.vendorId) {
              const vendorRef = doc(db, 'users', data.vendorId);
              const vendorSnap = await getDoc(vendorRef);
              if (vendorSnap.exists()) {
                const vendorData = vendorSnap.data() as Vendor;
                setVendorName(vendorData.displayName || null);
              } else {
                setVendorName(null);
              }
            } else {
              setVendorName(null);
            }
            // Fetch support tickets for this order
            const ticketsQuery = query(
              collection(db, 'supportTickets'),
              where('orderId', '==', orderSnap.id)
            );
            const ticketsSnap = await getDocs(ticketsQuery);
            const tickets = ticketsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setSupportTickets(tickets);
            setError(null);
          }
        } else {
          setError('Order not found.');
          setOrder(null);
          setVendorName(null);
        }
      } catch (err) {
        setError('Failed to load order details.');
        setOrder(null);
        setVendorName(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderId && user && !authLoading) fetchOrder();
  }, [orderId, user, authLoading]);

  const handleCancelOrder = async () => {
    if (!order || !user) return;
    
    setCancelling(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'cancelled',
        updatedAt: new Date(),
      });
      
      // Update local state
      setOrder({
        ...order,
        status: 'cancelled',
        updatedAt: new Date(),
      });
      
      // Add notification for order cancellation
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          type: 'order_status_update',
          message: `Your order ${order.orderNumber || order.id} has been cancelled successfully.`,
          createdAt: new Date(),
          read: false,
          data: { orderId: order.id, newStatus: 'cancelled' },
          link: `/account/orders/${order.id}`,
          linkLabel: order.orderNumber || order.id,
        });
      } catch (notifErr) {
        console.error('Failed to create cancellation notification:', notifErr);
      }
      
      toast.success('Order cancelled successfully!');
      setShowCancelModal(false);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      const errorAny = err as any;
      if (errorAny && typeof errorAny === 'object') {
        // Firestore errors have a 'code' and 'message' property
        // eslint-disable-next-line no-console
        // console.log('Firestore error code:', errorAny.code);
        // console.log('Firestore error message:', errorAny.message);
      }
      setError('Failed to cancel order. Please try again.');
      toast.error('Failed to cancel order. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const canCancelOrder = order && (order.status === 'pending' || order.status === 'processing');

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-500">{error}</div>
    );
  }
  if (!order) return null;

  // Status badge icons
  const statusIcon = {
    pending: (
      <svg
        className="mr-1 h-4 w-4 text-yellow-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M12 6v6l4 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    processing: (
      <svg
        className="mr-1 h-4 w-4 text-blue-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M12 8v4l3 3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    shipped: (
      <svg
        className="mr-1 h-4 w-4 text-purple-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="16.5" cy="17.5" r="2.5" />
      </svg>
    ),
    delivered: (
      <svg
        className="mr-1 h-4 w-4 text-green-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
    cancelled: (
      <svg
        className="mr-1 h-4 w-4 text-red-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    default: null,
  };
  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
  };

  // Helper: Price breakdown
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = order.deliveryFee ?? 0;
  const serviceFee = order.serviceFee ?? 0;
  const discountAmount = order.discountAmount ?? 0;
  const total = subtotal + deliveryFee + serviceFee - discountAmount;

  // Helper: Payment method full form
  const paymentMethodDisplay =
    order.paymentMethod.toLowerCase() === 'cod' ? 'Cash on Delivery' : order.paymentMethod;

  // Helper: Estimated delivery (3 days from placed date)
  const estimatedDeliveryDate =
    order.createdAt instanceof Date
      ? new Date(order.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
      : undefined;

  return (
    <div className="mx-auto mt-8 max-w-2xl px-2 sm:px-0">
      <Link href="/account/orders" className="mb-6 inline-block">
        <button className="group flex items-center gap-3 rounded-xl border border-blue-200 bg-white px-6 py-3 text-base font-semibold text-blue-700 shadow-lg transition-all duration-200 hover:bg-blue-50 hover:shadow-xl active:scale-95">
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Orders
        </button>
      </Link>
      <div
        className="relative mb-10 rounded-3xl border-2 border-transparent bg-gradient-to-br from-white via-blue-50/30 to-pink-50/30 bg-clip-padding p-6 shadow-2xl sm:p-10"
        style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}
      >
        {/* Support Ticket Links */}
        {supportTickets.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-2 text-base font-bold text-blue-700">
              Related Support Ticket{supportTickets.length > 1 ? 's' : ''}:
            </h2>
            <ul className="list-inside list-disc">
              {supportTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/account/support/${ticket.id}`}
                    className="font-mono font-bold text-blue-600 hover:underline"
                  >
                    {ticket.id}
                  </Link>
                  {ticket.status && (
                    <span className="ml-2 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {ticket.status}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Floating status badge */}
        <div className="absolute top-6 right-6">
          <span
            className={`flex items-center rounded-full px-3 py-1 text-sm font-bold shadow-sm ${statusColor[order.status] || statusColor.default}`}
          >
            {statusIcon[order.status] || statusIcon.default}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        {/* Cancelled order message */}
        {order.status === 'cancelled' && (
          <div className="mb-6 rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-pink-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold text-red-800">
                  Order Cancelled
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-red-700">
                  This order has been cancelled. If you have any questions or need assistance, 
                  please create a support ticket.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <h1 className="mb-8 bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-3xl font-extrabold tracking-tight text-gray-900 text-transparent">
          Order Details
        </h1>
        {/* Order Info Grid */}
        <div className="mb-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-xl bg-white/50 p-4 shadow-sm">
            <span className="flex-shrink-0 text-blue-500">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </span>
            <div>
              <div className="text-xs font-medium text-gray-500">Placed On</div>
              <div className="text-base font-semibold text-gray-900">
                {formatDateDDMMYYYY(order.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-white/50 p-4 shadow-sm">
            <span className="flex-shrink-0 text-blue-500">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </span>
            <div>
              <div className="text-xs font-medium text-gray-500">Order Number</div>
              <Link href="#" className="font-mono text-lg font-bold text-blue-600 hover:underline">
                {order.orderNumber || order.id}
              </Link>
              {vendorName && (
                <div className="mt-1 text-xs font-medium text-gray-500">
                  Vendor: <span className="font-semibold text-gray-900">{vendorName}</span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 mb-2 flex flex-col gap-1 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm sm:col-span-2">
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span>Delivery Fee</span>
              <span className="font-semibold">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span>
                Service Fee <span className="ml-2 text-xs text-gray-500">(2% of subtotal)</span>
              </span>
              <span className="font-semibold">${serviceFee.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="mb-4 flex items-center justify-between text-sm text-green-600">
                <span>
                  Discount {order.couponCode && (
                    <span className="ml-2 text-xs text-gray-500">({order.couponCode})</span>
                  )}
                </span>
                <span className="font-semibold">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-blue-200 pt-4 text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 rounded-xl bg-white/50 p-4 shadow-sm">
            <span className="flex-shrink-0 text-blue-500">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2z" />
              </svg>
            </span>
            <div>
              <div className="text-xs font-medium text-gray-500">Payment</div>
              <div className="text-base font-semibold text-gray-900">
                {paymentMethodDisplay}{' '}
                <span className="text-gray-500">({order.paymentStatus})</span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 rounded-xl bg-white/50 p-4 shadow-sm">
            <span className="flex-shrink-0 text-blue-500">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </span>
            <div>
              <div className="text-xs font-medium text-gray-500">Estimated Delivery</div>
              <div className="text-base font-semibold text-gray-900">
                {formatDateDDMMYYYY(estimatedDeliveryDate)}
              </div>
            </div>
          </div>
        </div>
        <div className="mb-8">
          {canCancelOrder ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => setShowCancelModal(true)}
                className="group flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-red-600 hover:to-red-700 hover:shadow-xl active:scale-95"
              >
                <svg
                  className="h-5 w-5 transition-transform group-hover:scale-110"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Order
              </button>
              <Link href={`/account/support/new?orderId=${order.id}`}>
                <button className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl active:scale-95">
                  <svg
                    className="h-5 w-5 transition-transform group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Create Support Ticket
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Link href={`/account/support/new?orderId=${order.id}`}>
                <button className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl active:scale-95">
                  <svg
                    className="h-5 w-5 transition-transform group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Create Support Ticket
                </button>
              </Link>
              {order.status !== 'cancelled' && (
                <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                        <svg
                          className="h-5 w-5 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-yellow-800">
                        Order Cannot Be Cancelled
                      </h4>
                      <p className="mt-2 text-sm leading-relaxed text-yellow-700">
                        This order cannot be cancelled as it has progressed beyond the processing stage. 
                        If you need assistance, please create a support ticket and our team will help you.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <hr className="animate-fade-in-up my-8 h-1 rounded-full border-0 bg-gradient-to-r from-blue-400 via-pink-300 to-blue-400" />
        <h2 className="animate-fade-in-up mb-4 text-xl font-bold text-gray-900">Items</h2>
        <div className="animate-fade-in-up mb-10 flex flex-col gap-4">
          {order.items.map((item: any) => (
            <Link
              key={item.id}
              href={`/products/${item.id}`}
              className="border-gradient-to-b group flex items-center rounded-2xl border-l-8 border-blue-400 bg-gray-50 from-blue-400 to-pink-400 p-4 shadow-md transition-all duration-300 ease-out hover:scale-[1.025] hover:shadow-xl"
              prefetch={false}
              title={item.name}
            >
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0]}
                  alt={item.name}
                  className="mr-4 h-16 w-16 flex-shrink-0 rounded-md border border-gray-200 object-cover group-hover:opacity-90"
                />
              ) : (
                <div className="mr-4 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-200 text-sm text-gray-400">
                  No Image
                </div>
              )}
              <div className="flex-grow">
                <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  {item.name}{' '}
                  <span className="inline-block rounded bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">
                    x{item.quantity}
                  </span>
                </div>
                <div className="text-sm text-gray-700">${item.price.toFixed(2)} each</div>
                {item.category && (
                  <div className="text-xs text-gray-500">Category: {item.category}</div>
                )}
                {item.brand && <div className="text-xs text-gray-500">Brand: {item.brand}</div>}
                <div className="text-xs font-semibold text-gray-800">
                  Subtotal: ${item.price * item.quantity}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <h2 className="animate-fade-in-up mb-3 flex items-center gap-2 text-xl font-bold">
          <svg
            className="h-5 w-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0l-4.243 4.243M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
            Shipping Address
          </span>
        </h2>
        <div
          className="animate-fade-in-up relative flex flex-col gap-2 rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-50 via-pink-50 to-white p-6 text-gray-900 shadow-lg"
          style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}
        >
          <div className="absolute -top-5 left-5 rounded-full bg-gradient-to-br from-blue-400 to-pink-400 p-2 shadow-md">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
            </svg>
          </div>
          <div className="pl-10">
            {order.shippingAddress?.street && (
              <div className="mb-1 text-lg font-semibold">{order.shippingAddress.street}</div>
            )}
            <div className="mb-1 text-base">
              {order.shippingAddress?.city}, {order.shippingAddress?.state} -{' '}
              {order.shippingAddress?.zipCode}
            </div>
            <div className="mb-1 flex items-center gap-2 text-base">
              <svg
                className="h-4 w-4 text-blue-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
              </svg>
              <span className="font-medium text-blue-700">{order.shippingAddress?.country}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-base">
              <svg
                className="h-4 w-4 text-green-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M22 16.92V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.08a2 2 0 0 1 .84-1.63l8-5.33a2 2 0 0 1 2.32 0l8 5.33a2 2 0 0 1 .84 1.63z" />
              </svg>
              <span className="font-semibold text-green-700">
                {formatPhoneForDisplay(order.shippingAddress?.phoneNumber || '')}
              </span>
            </div>
          </div>
        </div>
        {/* Cancel Order Modal */}
        <ConfirmModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelOrder}
          title="Cancel Order"
          message="Are you sure you want to cancel this order? This action cannot be undone and may affect your account."
          confirmText="Cancel Order"
          cancelText="Keep Order"
          confirmButtonColor="bg-red-600 hover:bg-red-700"
          isLoading={cancelling}
        />
      </div>
    </div>
  );
}
