'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import type { Vendor } from '@/types';
import { DELIVERY_FEE, FREE_SHIPPING_THRESHOLD } from '@/lib/fees';

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
                setVendorName(vendorData.shopName || vendorData.displayName || null);
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
  const total = subtotal + deliveryFee + serviceFee;

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
        <button className="flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-base font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50">
          <svg
            className="h-4 w-4"
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
        className="relative mb-10 rounded-3xl border-2 border-transparent bg-white bg-clip-padding p-6 shadow-2xl sm:p-10"
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
        <h1 className="mb-8 bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-3xl font-extrabold tracking-tight text-gray-900 text-transparent">
          Order Details
        </h1>
        {/* Order Info Grid */}
        <div className="mb-8 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <span className="text-blue-500">
              <svg
                className="h-5 w-5"
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
          <div className="flex items-center gap-3">
            <span className="text-blue-500">
              <svg
                className="h-5 w-5"
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
          <div className="mt-2 mb-2 flex flex-col gap-1 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2">
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span className="flex flex-col gap-2 md:flex-row md:items-center">
                Delivery Fee
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <span className="animate-fade-in ml-2 hidden items-center overflow-hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 px-3 py-1 whitespace-nowrap shadow md:flex">
                    <span className="mr-1 animate-bounce text-base leading-tight font-extrabold text-green-600">
                      ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)}
                    </span>
                    <span
                      className="ml-1 align-middle text-sm font-medium text-gray-500"
                      style={{ fontWeight: 500 }}
                    >
                      away from <span className="font-bold text-green-600">FREE delivery!</span>
                    </span>
                  </span>
                )}
              </span>
              <span
                className={
                  subtotal >= FREE_SHIPPING_THRESHOLD
                    ? 'flex flex-col items-end'
                    : 'text-base font-bold text-blue-600'
                }
              >
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <>
                    <span className="text-base font-extrabold text-green-600">$0.00</span>
                    <span className="mt-1 flex items-center justify-center">
                      <span className="flex flex-row items-center gap-1 rounded-full border border-green-200 bg-gradient-to-r from-green-100 via-blue-50 to-pink-50 px-2 py-0.5 whitespace-nowrap shadow-sm">
                        <span
                          className="rounded-full border border-green-300 bg-gradient-to-r from-green-400 to-blue-400 px-2 py-0.5 text-xs font-bold text-white shadow select-none"
                          style={{ letterSpacing: '2px' }}
                        >
                          FREE
                        </span>
                        <span className="text-xs font-bold text-red-600">
                          -${DELIVERY_FEE.toFixed(2)}
                        </span>
                        <span className="text-xs font-bold text-red-600">
                          ${DELIVERY_FEE.toFixed(2)}
                        </span>
                      </span>
                    </span>
                  </>
                ) : (
                  <>${deliveryFee.toFixed(2)}</>
                )}
              </span>
            </div>
            {subtotal < FREE_SHIPPING_THRESHOLD && (
              <span className="animate-fade-in mt-2 mb-2 flex w-full items-center overflow-hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 px-3 py-1 whitespace-nowrap shadow md:hidden">
                <span className="mr-1 animate-bounce text-base leading-tight font-extrabold text-green-600">
                  ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)}
                </span>
                <span
                  className="ml-1 align-middle text-sm font-medium text-gray-500"
                  style={{ fontWeight: 500 }}
                >
                  away from <span className="font-bold text-green-600">FREE delivery!</span>
                </span>
              </span>
            )}
            <div className="mb-4 flex items-center justify-between text-sm text-gray-700">
              <span>
                Service Fee <span className="ml-2 text-xs text-gray-500">(2% of subtotal)</span>
              </span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-600">${total.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-blue-500">
              <svg
                className="h-5 w-5"
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
          <div className="mt-2 flex items-center gap-3">
            <span className="text-blue-500">
              <svg
                className="h-5 w-5"
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
          <Link href={`/account/support/new?orderId=${order.id}`}>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow transition hover:bg-blue-700">
              <svg
                className="h-5 w-5"
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
                {order.shippingAddress?.phoneNumber || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
