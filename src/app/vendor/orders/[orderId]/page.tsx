'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, SupportTicket } from '@/types';
import { toast } from 'react-hot-toast';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import dayjs from 'dayjs';
import { FaUser, FaCalendarAlt, FaEdit, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function VendorOrderDetailPage() {
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ [ticketId: string]: string }>({});
  const [chatLoading, setChatLoading] = useState<{ [ticketId: string]: boolean }>({});
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();
  const [customerName, setCustomerName] = useState<string>('');
  const [debugTickets, setDebugTickets] = useState<any[]>([]);
  const [etaUpdating, setEtaUpdating] = useState(false);
  const [editingEta, setEditingEta] = useState(false);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(true);
  const [popoverIdx, setPopoverIdx] = useState<number | null>(null);

  const fetchOrderAndTickets = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch order
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      let orderData: any = null;
      if (orderSnap.exists()) {
        orderData = orderSnap.data();
        setOrder({
          id: orderSnap.id,
          ...orderData,
          createdAt: orderData.createdAt?.toDate
            ? orderData.createdAt.toDate()
            : new Date(orderData.createdAt),
          updatedAt: orderData.updatedAt?.toDate
            ? orderData.updatedAt.toDate()
            : new Date(orderData.updatedAt),
          estimatedDeliveryDate: orderData.estimatedDeliveryDate?.toDate
            ? orderData.estimatedDeliveryDate.toDate()
            : orderData.estimatedDeliveryDate
              ? new Date(orderData.estimatedDeliveryDate)
              : undefined,
        } as Order);
        // Debug log: order vendorId and current user
        // console.log('Current user UID:', user?.uid);
        // console.log('Order vendorId:', orderData.vendorId);
        // Fetch customer name
        if (orderData.userId) {
          const userRef = doc(db, 'users', orderData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setCustomerName(userSnap.data().displayName || '');
          } else {
            setCustomerName('');
          }
        }
      }
      // Debug log: orderId being queried
      // console.log('Vendor OrderId (query):', orderId);
      // Fetch support tickets for this order
      const ticketsQuery = query(
        collection(db, 'supportTickets'),
        where('orderId', '==', String(orderId))
      );
      const ticketsSnap = await getDocs(ticketsQuery);
      const fetchedTickets: SupportTicket[] = [];
      ticketsSnap.forEach((docSnap) => {
        const ticketData = docSnap.data();
        // Debug log: ticket doc
        // console.log('Ticket doc:', docSnap.id, ticketData);
        fetchedTickets.push({
          id: docSnap.id,
          ...ticketData,
          createdAt: ticketData.createdAt?.toDate
            ? ticketData.createdAt.toDate()
            : ticketData.createdAt,
          updatedAt: ticketData.updatedAt?.toDate
            ? ticketData.updatedAt.toDate()
            : ticketData.updatedAt,
          messages: (ticketData.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp,
          })),
        } as SupportTicket);
      });
      // Debug log: fetched tickets
      // console.log('Fetched Tickets:', fetchedTickets);
      setTickets(fetchedTickets);
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndTickets();
    // eslint-disable-next-line
  }, [user, orderId]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!order) return;
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: e.target.value });
      setOrder((prev) => (prev ? { ...prev, status: e.target.value as Order['status'] } : prev));
      await fetchOrderAndTickets(); // Refresh order, tickets, and customer name
    } catch {
      // handle error
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendMessage = async (ticketId: string) => {
    const message = chatMessages[ticketId]?.trim();
    if (!message || !user) return;
    setChatLoading((prev) => ({ ...prev, [ticketId]: true }));
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        messages: arrayUnion({
          senderId: user.uid,
          senderRole: 'vendor',
          messageText: message,
          timestamp: Timestamp.now(),
        }),
        updatedAt: Timestamp.now(),
      });
      await fetchOrderAndTickets(); // Refresh tickets and customer name
      setChatMessages((prev) => ({ ...prev, [ticketId]: '' }));
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setChatLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleDebugListAllTickets = async () => {
    try {
      const allTicketsSnap = await getDocs(collection(db, 'supportTickets'));
      const allTickets: any[] = [];
      allTicketsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allTickets.push({ id: docSnap.id, orderId: data.orderId, ...data });
      });
      setDebugTickets(allTickets);
      // console.log(
      //   'All support tickets visible to this vendor:',
      //   allTickets.map((t) => ({ id: t.id, orderId: t.orderId }))
      // );
    } catch (err) {
      // console.error('Error fetching all tickets for debug:', err);
    }
  };

  const handleEtaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order) return;
    setEtaUpdating(true);
    try {
      const newEta = new Date(e.target.value);
      await updateDoc(doc(db, 'orders', order.id), { estimatedDeliveryDate: newEta });
      setOrder((prev) => (prev ? { ...prev, estimatedDeliveryDate: newEta } : prev));
      await fetchOrderAndTickets();
    } catch {
      // handle error
    } finally {
      setEtaUpdating(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!order) return;
    setStatusUpdating(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'processing' });
      setOrder((prev) => (prev ? { ...prev, status: 'processing' } : prev));
      setShowAcceptPrompt(false);
      await fetchOrderAndTickets();
    } catch {
      // handle error
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
    );
  }
  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Order not found.
      </div>
    );
  }

  // console.log('Tickets state at render:', tickets);

  return (
    <>
      <VendorDashboardNav />
      <div className="min-h-screen w-full bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] px-2 py-10 sm:px-4">
        <div className="mx-auto max-w-3xl space-y-10">
          {/* Accept Order Prompt */}
          {order?.status === 'pending' && showAcceptPrompt && (
            <div className="mb-4 flex flex-col gap-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2 font-semibold text-yellow-900">
                <span>New order received! Please accept the order to start processing.</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptOrder}
                  disabled={statusUpdating}
                  className="rounded-full bg-blue-600 px-4 py-2 font-bold text-white shadow transition-all hover:bg-blue-700 disabled:opacity-50"
                >
                  Accept Order
                </button>
                <button
                  onClick={() => setShowAcceptPrompt(false)}
                  className="rounded-full border border-gray-200 bg-gray-100 px-3 py-2 font-bold text-gray-600 transition-all hover:bg-gray-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={() => router.push('/vendor/orders')}
            className="mb-4 flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 font-bold text-blue-600 shadow transition hover:bg-blue-50"
          >
            <FaArrowLeft />
            Back
          </button>

          {/* Order Summary Card - Redesigned */}
          <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition hover:shadow-2xl sm:grid sm:grid-cols-2 sm:gap-x-8">
            {/* Left: Order Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span>Order Number:</span>
                <span className="select-all">{order.orderNumber || order.id}</span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaUser className="text-blue-500" />
                <span className="text-gray-700">Customer:</span>
                <span className="font-bold text-blue-700">
                  {order.customerName || customerName || 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <span className="text-gray-700">Status:</span>
                <div className="relative">
                  <select
                    value={order.status}
                    onChange={handleStatusChange}
                    disabled={statusUpdating}
                    className={`appearance-none rounded-full border border-gray-200 px-4 py-1 pr-6 text-xs font-bold shadow transition focus:ring-2 focus:ring-blue-400 focus:outline-none ${order.status === 'pending' ? 'border-yellow-200 bg-yellow-100 text-yellow-800' : ''} ${order.status === 'processing' ? 'border-blue-200 bg-blue-100 text-blue-800' : ''} ${order.status === 'shipped' ? 'border-purple-200 bg-purple-100 text-purple-800' : ''} ${order.status === 'delivered' ? 'border-green-200 bg-green-100 text-green-800' : ''} ${order.status === 'cancelled' ? 'border-red-200 bg-red-100 text-red-800' : ''}`}
                  >
                    <option value="pending" className="bg-yellow-100 text-yellow-800">
                      Pending
                    </option>
                    <option value="processing" className="bg-blue-100 text-blue-800">
                      Processing
                    </option>
                    <option value="shipped" className="bg-purple-100 text-purple-800">
                      Shipped
                    </option>
                    <option value="delivered" className="bg-green-100 text-green-800">
                      Delivered
                    </option>
                    <option value="cancelled" className="bg-red-100 text-red-800">
                      Cancelled
                    </option>
                  </select>
                  <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-gray-400">
                    <svg width="12" height="12" fill="none" viewBox="0 0 20 20">
                      <path
                        d="M7 8l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
            {/* Right: Dates */}
            <div className="mt-4 flex flex-col gap-3 sm:mt-0">
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaCalendarAlt className="text-purple-500" />
                <span className="text-gray-700">Ordered on:</span>
                <span className="font-bold">
                  {order.createdAt ? dayjs(order.createdAt).format('DD MMM YYYY') : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaCalendarAlt className="text-green-500" />
                <span className="text-gray-700">Delivery Date:</span>
                <span className="rounded border border-gray-200 bg-gray-50 px-3 py-1 font-bold">
                  {order.estimatedDeliveryDate &&
                  !isNaN(new Date(order.estimatedDeliveryDate).getTime())
                    ? dayjs(order.estimatedDeliveryDate).format('DD MMM YYYY')
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Total Amount Card - Only show vendor receivable */}
          <div className="mb-4 flex flex-col justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-4 shadow-xl transition hover:shadow-2xl sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-xl font-extrabold text-transparent sm:text-2xl">
                Total Amount
              </span>
              <span className="text-xl font-extrabold text-green-600 sm:text-2xl">
                $
                {order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Product Card(s) */}
          <div className="mb-4 space-y-6">
            {order.items?.map((item, idx) => (
              <div
                key={idx}
                className="relative flex flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-xl transition hover:shadow-2xl sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex w-full flex-col items-center gap-4 sm:flex-row">
                  {/* Product Image */}
                  <div className="flex w-full flex-shrink-0 items-center justify-center sm:w-auto">
                    <img
                      src={
                        item.images && item.images.length > 0
                          ? item.images[0]
                          : '/public/images/categories/placeholder.png'
                      }
                      alt={item.name}
                      className="h-20 w-20 rounded-xl border border-gray-100 bg-gray-50 object-cover shadow sm:h-24 sm:w-24"
                      onError={(e) => {
                        e.currentTarget.src = '/public/images/categories/placeholder.png';
                      }}
                    />
                  </div>
                  {/* Product Details */}
                  <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                    <div className="mb-1 flex w-full flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-start">
                      <Link href={`/vendor/products/${item.id}/edit`} legacyBehavior>
                        <a
                          className="relative cursor-pointer text-lg font-extrabold text-blue-700 hover:underline sm:text-xl"
                          onMouseEnter={() => setPopoverIdx(idx)}
                          onMouseLeave={() => setPopoverIdx(null)}
                        >
                          {item.name}
                          {/* Popover */}
                          {popoverIdx === idx && (
                            <div className="animate-fade-in-up absolute top-full left-1/2 z-50 mt-2 w-72 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xl">
                              <div className="mb-1 text-lg font-bold">{item.name}</div>
                              <div className="mb-1 text-gray-700">{item.description}</div>
                              <div className="mb-1 text-xs font-semibold text-purple-600">
                                Category: {item.category}
                              </div>
                              <div className="mb-1 text-xs font-semibold text-pink-600">
                                Brand: {item.brand}
                              </div>
                              <div className="mb-1 text-xs text-gray-500">Stock: {item.stock}</div>
                              <div className="mb-1 text-xs text-gray-500">
                                Unit Price: ${item.price?.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </a>
                      </Link>
                      <span className="rounded-full bg-blue-600 px-4 py-1 text-lg font-extrabold text-white shadow-sm">
                        x{item.quantity}
                      </span>
                    </div>
                    <div className="mt-1 w-full text-base font-medium text-gray-700">
                      {item.description}
                    </div>
                    {item.category && (
                      <div className="mt-1 w-full text-xs font-semibold text-purple-600">
                        Category: {item.category}
                      </div>
                    )}
                    {item.brand && (
                      <div className="w-full text-xs font-semibold text-pink-600">
                        Brand: {item.brand}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex min-w-[100px] flex-col items-center gap-2 sm:mt-0 sm:items-end">
                    <span className="text-xl font-extrabold text-blue-700 sm:text-2xl">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Unit Price: ${item.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
