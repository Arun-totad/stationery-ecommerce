"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order, SupportTicket } from "@/types";
import { toast } from "react-hot-toast";
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import dayjs from 'dayjs';
import { FaUser, FaCalendarAlt, FaEdit, FaArrowLeft } from 'react-icons/fa';
import Link from "next/link";

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
  const [customerName, setCustomerName] = useState<string>("");
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
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      let orderData: any = null;
      if (orderSnap.exists()) {
        orderData = orderSnap.data();
        setOrder({
          id: orderSnap.id,
          ...orderData,
          createdAt: orderData.createdAt?.toDate ? orderData.createdAt.toDate() : new Date(orderData.createdAt),
          updatedAt: orderData.updatedAt?.toDate ? orderData.updatedAt.toDate() : new Date(orderData.updatedAt),
          estimatedDeliveryDate: orderData.estimatedDeliveryDate?.toDate
            ? orderData.estimatedDeliveryDate.toDate()
            : (orderData.estimatedDeliveryDate
                ? new Date(orderData.estimatedDeliveryDate)
                : undefined),
        } as Order);
        // Debug log: order vendorId and current user
        console.log('Current user UID:', user?.uid);
        console.log('Order vendorId:', orderData.vendorId);
        // Fetch customer name
        if (orderData.userId) {
          const userRef = doc(db, "users", orderData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setCustomerName(userSnap.data().displayName || "");
          } else {
            setCustomerName("");
          }
        }
      }
      // Debug log: orderId being queried
      console.log('Vendor OrderId (query):', orderId);
      // Fetch support tickets for this order
      const ticketsQuery = query(collection(db, "supportTickets"), where("orderId", "==", String(orderId)));
      const ticketsSnap = await getDocs(ticketsQuery);
      const fetchedTickets: SupportTicket[] = [];
      ticketsSnap.forEach((docSnap) => {
        const ticketData = docSnap.data();
        console.log('Ticket doc:', docSnap.id, ticketData); // Debug log
        fetchedTickets.push({
          id: docSnap.id,
          ...ticketData,
          createdAt: ticketData.createdAt?.toDate ? ticketData.createdAt.toDate() : ticketData.createdAt,
          updatedAt: ticketData.updatedAt?.toDate ? ticketData.updatedAt.toDate() : ticketData.updatedAt,
          messages: (ticketData.messages || []).map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp,
          })),
        } as SupportTicket);
      });
      // Debug log: fetched tickets
      console.log('Fetched Tickets:', fetchedTickets);
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
      await updateDoc(doc(db, "orders", order.id), { status: e.target.value });
      setOrder((prev) => prev ? { ...prev, status: e.target.value as Order["status"] } : prev);
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
      await updateDoc(doc(db, "supportTickets", ticketId), {
        messages: arrayUnion({
          senderId: user.uid,
          senderRole: "vendor",
          messageText: message,
          timestamp: Timestamp.now(),
        }),
        updatedAt: Timestamp.now(),
      });
      await fetchOrderAndTickets(); // Refresh tickets and customer name
      setChatMessages((prev) => ({ ...prev, [ticketId]: "" }));
    } catch (err) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setChatLoading((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  const handleDebugListAllTickets = async () => {
    try {
      const allTicketsSnap = await getDocs(collection(db, "supportTickets"));
      const allTickets: any[] = [];
      allTicketsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allTickets.push({ id: docSnap.id, orderId: data.orderId, ...data });
      });
      setDebugTickets(allTickets);
      console.log("All support tickets visible to this vendor:", allTickets.map(t => ({ id: t.id, orderId: t.orderId })));
    } catch (err) {
      console.error("Error fetching all tickets for debug:", err);
    }
  };

  const handleEtaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!order) return;
    setEtaUpdating(true);
    try {
      const newEta = new Date(e.target.value);
      await updateDoc(doc(db, "orders", order.id), { estimatedDeliveryDate: newEta });
      setOrder((prev) => prev ? { ...prev, estimatedDeliveryDate: newEta } : prev);
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
      await updateDoc(doc(db, "orders", order.id), { status: 'processing' });
      setOrder((prev) => prev ? { ...prev, status: 'processing' } : prev);
      setShowAcceptPrompt(false);
      await fetchOrderAndTickets();
    } catch {
      // handle error
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!order) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Order not found.</div>;
  }

  console.log('Tickets state at render:', tickets);

  return (
    <>
      <VendorDashboardNav />
      <div className="min-h-screen w-full bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] py-10 px-2 sm:px-4">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Accept Order Prompt */}
          {order?.status === 'pending' && showAcceptPrompt && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow">
              <div className="flex-1 text-yellow-900 font-semibold flex items-center gap-2">
                <span>New order received! Please accept the order to start processing.</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptOrder}
                  disabled={statusUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-full font-bold shadow hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  Accept Order
                </button>
                <button
                  onClick={() => setShowAcceptPrompt(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-full font-bold border border-gray-200 hover:bg-gray-200 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            onClick={() => router.push('/vendor/orders')}
            className="mb-4 flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-full font-bold shadow border border-blue-100 hover:bg-blue-50 transition w-fit"
          >
            <FaArrowLeft />
            Back
          </button>

          {/* Order Summary Card - Redesigned */}
          <div className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-x-8 border border-gray-100 transition hover:shadow-2xl mb-4">
            {/* Left: Order Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <span>Order Number:</span>
                <span className="select-all">{order.orderNumber || order.id}</span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaUser className="text-blue-500" />
                <span className="text-gray-700">Customer:</span>
                <span className="text-blue-700 font-bold">{order.customerName || customerName || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <span className="text-gray-700">Status:</span>
                <div className="relative">
                  <select
                    value={order.status}
                    onChange={handleStatusChange}
                    disabled={statusUpdating}
                    className={`appearance-none text-xs px-4 py-1 rounded-full font-bold shadow border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition pr-6
                      ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : ''}
                      ${order.status === 'processing' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                      ${order.status === 'shipped' ? 'bg-purple-100 text-purple-800 border-purple-200' : ''}
                      ${order.status === 'delivered' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                      ${order.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' : ''}`}
                  >
                    <option value="pending" className="bg-yellow-100 text-yellow-800">Pending</option>
                    <option value="processing" className="bg-blue-100 text-blue-800">Processing</option>
                    <option value="shipped" className="bg-purple-100 text-purple-800">Shipped</option>
                    <option value="delivered" className="bg-green-100 text-green-800">Delivered</option>
                    <option value="cancelled" className="bg-red-100 text-red-800">Cancelled</option>
                  </select>
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><svg width="12" height="12" fill="none" viewBox="0 0 20 20"><path d="M7 8l3 3 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                </div>
              </div>
            </div>
            {/* Right: Dates */}
            <div className="flex flex-col gap-3 mt-4 sm:mt-0">
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaCalendarAlt className="text-purple-500" />
                <span className="text-gray-700">Ordered on:</span>
                <span className="font-bold">{order.createdAt ? dayjs(order.createdAt).format('DD MMM YYYY') : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <FaCalendarAlt className="text-green-500" />
                <span className="text-gray-700">Delivery Date:</span>
                <span className="font-bold bg-gray-50 px-3 py-1 rounded border border-gray-200">
                  {order.estimatedDeliveryDate && !isNaN(new Date(order.estimatedDeliveryDate).getTime())
                    ? dayjs(order.estimatedDeliveryDate).format('DD MMM YYYY')
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Total Amount Card - Only show vendor receivable */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-xl p-4 sm:p-6 border border-blue-100 transition hover:shadow-2xl mb-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">Total Amount</span>
              <span className="text-xl sm:text-2xl font-extrabold text-green-600">₹{order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Product Card(s) */}
          <div className="space-y-6 mb-4">
            {order.items?.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border border-gray-100 transition hover:shadow-2xl relative">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                  {/* Product Image */}
                  <div className="flex-shrink-0 flex justify-center items-center w-full sm:w-auto">
                    <img
                      src={item.images && item.images.length > 0 ? item.images[0] : '/public/images/categories/placeholder.png'}
                      alt={item.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shadow border border-gray-100 bg-gray-50"
                      onError={e => { e.currentTarget.src = '/public/images/categories/placeholder.png'; }}
                    />
                  </div>
                  {/* Product Details */}
                  <div className="flex-1 flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 w-full justify-center sm:justify-start">
                      <Link href={`/vendor/products/${item.id}/edit`} legacyBehavior>
                        <a
                          className="text-lg sm:text-xl font-extrabold text-blue-700 hover:underline cursor-pointer relative"
                          onMouseEnter={() => setPopoverIdx(idx)}
                          onMouseLeave={() => setPopoverIdx(null)}
                        >
                          {item.name}
                          {/* Popover */}
                          {popoverIdx === idx && (
                            <div className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 text-left animate-fade-in-up">
                              <div className="font-bold text-lg mb-1">{item.name}</div>
                              <div className="text-gray-700 mb-1">{item.description}</div>
                              <div className="text-xs text-purple-600 font-semibold mb-1">Category: {item.category}</div>
                              <div className="text-xs text-pink-600 font-semibold mb-1">Brand: {item.brand}</div>
                              <div className="text-xs text-gray-500 mb-1">Stock: {item.stock}</div>
                              <div className="text-xs text-gray-500 mb-1">Unit Price: ₹{item.price?.toFixed(2)}</div>
                            </div>
                          )}
                        </a>
                      </Link>
                      <span className="text-lg font-extrabold text-white bg-blue-600 px-4 py-1 rounded-full shadow-sm">x{item.quantity}</span>
                    </div>
                    <div className="text-base text-gray-700 font-medium mt-1 w-full">{item.description}</div>
                    {item.category && <div className="text-xs text-purple-600 font-semibold mt-1 w-full">Category: {item.category}</div>}
                    {item.brand && <div className="text-xs text-pink-600 font-semibold w-full">Brand: {item.brand}</div>}
                  </div>
                  <div className="flex flex-col items-center sm:items-end gap-2 min-w-[100px] mt-4 sm:mt-0">
                    <span className="text-xl sm:text-2xl font-extrabold text-blue-700">₹{(item.price * item.quantity).toFixed(2)}</span>
                    <span className="text-xs text-gray-500">Unit Price: ₹{item.price.toFixed(2)}</span>
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