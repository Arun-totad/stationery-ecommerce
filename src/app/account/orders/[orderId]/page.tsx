"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
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
        const orderRef = doc(db, "orders", orderId);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const data = orderSnap.data();
          if (data.userId !== user.uid) {
            setError("You are not authorized to view this order.");
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
            const ticketsQuery = query(collection(db, 'supportTickets'), where('orderId', '==', orderSnap.id));
            const ticketsSnap = await getDocs(ticketsQuery);
            const tickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSupportTickets(tickets);
            setError(null);
          }
        } else {
          setError("Order not found.");
          setOrder(null);
          setVendorName(null);
        }
      } catch (err) {
        setError("Failed to load order details.");
        setOrder(null);
        setVendorName(null);
      } finally {
        setLoading(false);
      }
    };
    if (orderId && user && !authLoading) fetchOrder();
  }, [orderId, user, authLoading]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }
  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }
  if (!order) return null;

  // Status badge icons
  const statusIcon = {
    pending: (
      <svg className="w-4 h-4 mr-1 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
    processing: (
      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ),
    shipped: (
      <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 17V7a2 2 0 012-2h14a2 2 0 012 2v10" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="16.5" cy="17.5" r="2.5" /></svg>
    ),
    delivered: (
      <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
    ),
    cancelled: (
      <svg className="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" /><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" /></svg>
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
  const paymentMethodDisplay = order.paymentMethod.toLowerCase() === 'cod' ? 'Cash on Delivery' : order.paymentMethod;

  // Helper: Estimated delivery (3 days from placed date)
  const estimatedDeliveryDate = order.createdAt instanceof Date
    ? new Date(order.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)
    : undefined;

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-0 mt-8">
      <Link href="/account/orders" className="inline-block mb-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 text-base font-semibold border border-blue-200 shadow-sm transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Orders
        </button>
      </Link>
      <div className="relative bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border-2 border-transparent bg-clip-padding mb-10" style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}>
        {/* Support Ticket Links */}
        {supportTickets.length > 0 && (
          <div className="mb-4">
            <h2 className="text-base font-bold text-blue-700 mb-2">Related Support Ticket{supportTickets.length > 1 ? 's' : ''}:</h2>
            <ul className="list-disc list-inside">
              {supportTickets.map(ticket => (
                <li key={ticket.id}>
                  <Link href={`/account/support/${ticket.id}`} className="text-blue-600 font-mono font-bold hover:underline">
                    {ticket.id}
                  </Link>
                  {ticket.status && (
                    <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{ticket.status}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Floating status badge */}
        <div className="absolute top-6 right-6">
          <span className={`flex items-center px-3 py-1 text-sm font-bold rounded-full shadow-sm ${statusColor[order.status] || statusColor.default}`}> 
            {statusIcon[order.status] || statusIcon.default}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8 bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">Order Details</h1>
        {/* Order Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            </span>
            <div>
              <div className="text-xs text-gray-500 font-medium">Placed On</div>
              <div className="text-gray-900 font-semibold text-base">{formatDateDDMMYYYY(order.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
            </span>
            <div>
              <div className="text-xs text-gray-500 font-medium">Order Number</div>
              <Link href="#" className="text-blue-600 font-mono font-bold text-lg hover:underline">{order.orderNumber || order.id}</Link>
              {vendorName && (
                <div className="text-xs text-gray-500 font-medium mt-1">Vendor: <span className="text-gray-900 font-semibold">{vendorName}</span></div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 bg-blue-50 rounded-xl p-4 border border-blue-100 mt-2 mb-2">
            <div className="flex items-center justify-between text-gray-700 text-sm mb-4">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-gray-700 text-sm mb-4">
              <span className="flex flex-col md:flex-row md:items-center gap-2">
                Delivery Fee
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <span className="hidden md:flex items-center px-3 py-1 rounded-full shadow bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 border border-blue-100 animate-fade-in overflow-hidden whitespace-nowrap ml-2">
                    <span className="font-extrabold text-green-600 text-base leading-tight mr-1 animate-bounce">
                      ₹{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)}
                    </span>
                    <span className="font-medium text-sm text-gray-500 align-middle ml-1" style={{ fontWeight: 500 }}>
                      away from <span className="text-green-600 font-bold">FREE delivery!</span>
                    </span>
                  </span>
                )}
              </span>
              <span className={subtotal >= FREE_SHIPPING_THRESHOLD ? "flex flex-col items-end" : "text-blue-600 font-bold text-base"}>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                  <>
                    <span className="text-green-600 font-extrabold text-base">₹0.00</span>
                    <span className="flex items-center justify-center mt-1">
                      <span className="flex flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-100 via-blue-50 to-pink-50 border border-green-200 shadow-sm whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white font-bold text-xs shadow border border-green-300 select-none" style={{letterSpacing: '2px'}}>FREE</span>
                        <span className="text-red-600 font-bold text-xs">-</span>
                        <span className="text-red-600 font-bold text-xs">₹{DELIVERY_FEE.toFixed(2)}</span>
                      </span>
                    </span>
                  </>
                ) : (
                  <>₹{deliveryFee.toFixed(2)}</>
                )}
              </span>
            </div>
            {subtotal < FREE_SHIPPING_THRESHOLD && (
              <span className="flex md:hidden items-center w-full px-3 py-1 rounded-full shadow bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 border border-blue-100 animate-fade-in overflow-hidden whitespace-nowrap mt-2 mb-2">
                <span className="font-extrabold text-green-600 text-base leading-tight mr-1 animate-bounce">
                  ₹{(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(0)}
                </span>
                <span className="font-medium text-sm text-gray-500 align-middle ml-1" style={{ fontWeight: 500 }}>
                  away from <span className="text-green-600 font-bold">FREE delivery!</span>
                </span>
              </span>
            )}
            <div className="flex items-center justify-between text-gray-700 text-sm mb-4">
              <span>Service Fee <span className="ml-2 text-xs text-gray-500">(2% of subtotal)</span></span>
              <span>₹{serviceFee.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-lg border-t pt-2 mt-2">
              <span className="text-gray-900">Total</span>
              <span className="text-blue-600">₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2z" /></svg>
            </span>
            <div>
              <div className="text-xs text-gray-500 font-medium">Payment</div>
              <div className="text-gray-900 font-semibold text-base">{paymentMethodDisplay} <span className="text-gray-500">({order.paymentStatus})</span></div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
            </span>
            <div>
              <div className="text-xs text-gray-500 font-medium">Estimated Delivery</div>
              <div className="text-gray-900 font-semibold text-base">{formatDateDDMMYYYY(estimatedDeliveryDate)}</div>
            </div>
          </div>
        </div>
        <div className="mb-8">
          <Link href={`/account/support/new?orderId=${order.id}`}>
            <button className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition text-base">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
              Create Support Ticket
            </button>
          </Link>
        </div>
        <hr className="my-8 border-0 h-1 bg-gradient-to-r from-blue-400 via-pink-300 to-blue-400 rounded-full animate-fade-in-up" />
        <h2 className="text-xl font-bold text-gray-900 mb-4 animate-fade-in-up">Items</h2>
        <div className="flex flex-col gap-4 mb-10 animate-fade-in-up">
          {order.items.map((item: any) => (
            <Link key={item.id} href={`/products/${item.id}`} className="flex items-center bg-gray-50 border-l-8 border-gradient-to-b from-blue-400 to-pink-400 border-blue-400 rounded-2xl p-4 shadow-md hover:shadow-xl hover:scale-[1.025] transition-all duration-300 ease-out group" prefetch={false} title={item.name}>
              {item.images && item.images.length > 0 ? (
                <img src={item.images[0]} alt={item.name} className="h-16 w-16 rounded-md object-cover border border-gray-200 flex-shrink-0 mr-4 group-hover:opacity-90" />
              ) : (
                <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 text-sm flex-shrink-0 mr-4">No Image</div>
              )}
              <div className="flex-grow">
                <div className="font-semibold text-gray-900 text-base flex items-center gap-2">{item.name} <span className="inline-block bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">x{item.quantity}</span></div>
                <div className="text-gray-700 text-sm">₹{item.price.toFixed(2)} each</div>
                {item.category && <div className="text-gray-500 text-xs">Category: {item.category}</div>}
                {item.brand && <div className="text-gray-500 text-xs">Brand: {item.brand}</div>}
                <div className="text-gray-800 text-xs font-semibold">Subtotal: ₹{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            </Link>
          ))}
        </div>
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2 animate-fade-in-up">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0l-4.243 4.243M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">Shipping Address</span>
        </h2>
        <div className="relative bg-gradient-to-br from-blue-50 via-pink-50 to-white border-2 border-transparent rounded-2xl p-6 text-gray-900 shadow-lg animate-fade-in-up flex flex-col gap-2" style={{ borderImage: 'linear-gradient(90deg, #3B82F6 0%, #F472B6 100%) 1' }}>
          <div className="absolute -top-5 left-5 bg-gradient-to-br from-blue-400 to-pink-400 p-2 rounded-full shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>
          </div>
          <div className="pl-10">
            {order.shippingAddress?.street && <div className="text-lg font-semibold mb-1">{order.shippingAddress.street}</div>}
            <div className="text-base mb-1">{order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zipCode}</div>
            <div className="text-base mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>
              <span className="font-medium text-blue-700">{order.shippingAddress?.country}</span>
            </div>
            <div className="text-base mt-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92V19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2.08a2 2 0 0 1 .84-1.63l8-5.33a2 2 0 0 1 2.32 0l8 5.33a2 2 0 0 1 .84 1.63z" /></svg>
              <span className="font-semibold text-green-700">{order.shippingAddress?.phoneNumber || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 