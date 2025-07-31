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
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, SupportTicket } from '@/types';
import { toast } from 'react-hot-toast';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import PaymentBreakdownDisplay from '@/components/PaymentBreakdownDisplay';
import dayjs from 'dayjs';
import { FaUser, FaCalendarAlt, FaEdit, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { addOrderActivity } from '@/lib/orderActivity';

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
  const [showPickupAddressModal, setShowPickupAddressModal] = useState(false);
  const [pickupAddress, setPickupAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phoneNumber: ''
  });
  const [isUpdatingPickupAddress, setIsUpdatingPickupAddress] = useState(false);

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
      const newStatus = e.target.value;

      
      await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
      
      // Add activity log for status change
      try {
        console.log('Adding status change activity for order:', order.id, 'from', order.status, 'to', newStatus);
        await addOrderActivity(
          order.id,
          'status_changed',
          'Order status updated',
          user.uid,
          'vendor',
          order.status,
          newStatus
        );
        console.log('Status change activity added successfully');
        
        // Refresh order data to include the newly added activity
        const orderRef = doc(db, 'orders', order.id);
        const refreshedOrderSnap = await getDoc(orderRef);
        if (refreshedOrderSnap.exists()) {
          const refreshedOrderData = refreshedOrderSnap.data() as Order;
          // Convert timestamps
          refreshedOrderData.createdAt = refreshedOrderData.createdAt instanceof Timestamp
            ? refreshedOrderData.createdAt.toDate()
            : new Date(refreshedOrderData.createdAt);
          refreshedOrderData.updatedAt = refreshedOrderData.updatedAt instanceof Timestamp
            ? refreshedOrderData.updatedAt.toDate()
            : new Date(refreshedOrderData.updatedAt);
          refreshedOrderData.estimatedDeliveryDate = refreshedOrderData.estimatedDeliveryDate instanceof Timestamp
            ? refreshedOrderData.estimatedDeliveryDate.toDate()
            : refreshedOrderData.estimatedDeliveryDate
              ? new Date(refreshedOrderData.estimatedDeliveryDate)
              : undefined;
          
          // Convert activity log timestamps
          if (refreshedOrderData.activityLog) {
            refreshedOrderData.activityLog = refreshedOrderData.activityLog.map((activity: OrderActivity) => ({
              ...activity,
              timestamp: activity.timestamp instanceof Timestamp
                ? activity.timestamp.toDate()
                : new Date(activity.timestamp),
            }));
          }
          
          setOrder(refreshedOrderData);
        }
      } catch (activityErr) {
        console.error('Failed to add status change activity:', activityErr);
      }
      
      // Create notification for customer about status update
      try {

        
        const statusMessages = {
          pending: 'Your order has been placed and is pending confirmation.',
          processing: 'Your order is now being processed by the vendor.',
          shipped: 'Your order has been shipped and is on its way!',
          delivered: 'Your order has been delivered successfully!',
          cancelled: 'Your order has been cancelled.'
        };
        
        const notificationData = {
          type: 'order_status_update',
          message: statusMessages[newStatus as keyof typeof statusMessages] || `Your order status has been updated to ${newStatus}.`,
          createdAt: new Date(),
          read: false,
          data: { orderId: order.id, newStatus: newStatus },
          link: `/account/orders/${order.id}`,
          linkLabel: order.orderNumber || order.id,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', order.userId, 'notifications');
        const notificationRef = await addDoc(userNotificationsRef, notificationData);
        
        toast.success(`Order status updated to ${newStatus} and notification sent to customer.`);
      } catch (notifErr) {
        console.error('Failed to create status update notification:', notifErr);
        toast.error('Failed to create notification for customer.');
      }
      
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
      
      // Add activity log for ETA change
      try {
        console.log('Adding ETA change activity for order:', order.id);
        await addOrderActivity(
          order.id,
          'estimated_delivery_updated',
          'Estimated delivery date updated',
          user.uid,
          'vendor',
          order.estimatedDeliveryDate?.toISOString().split('T')[0] || 'Not set',
          newEta.toISOString().split('T')[0]
        );
        console.log('ETA change activity added successfully');
        
        // Refresh order data to include the newly added activity
        const orderRef = doc(db, 'orders', order.id);
        const refreshedOrderSnap = await getDoc(orderRef);
        if (refreshedOrderSnap.exists()) {
          const refreshedOrderData = refreshedOrderSnap.data() as Order;
          // Convert timestamps
          refreshedOrderData.createdAt = refreshedOrderData.createdAt instanceof Timestamp
            ? refreshedOrderData.createdAt.toDate()
            : new Date(refreshedOrderData.createdAt);
          refreshedOrderData.updatedAt = refreshedOrderData.updatedAt instanceof Timestamp
            ? refreshedOrderData.updatedAt.toDate()
            : new Date(refreshedOrderData.updatedAt);
          refreshedOrderData.estimatedDeliveryDate = refreshedOrderData.estimatedDeliveryDate instanceof Timestamp
            ? refreshedOrderData.estimatedDeliveryDate.toDate()
            : refreshedOrderData.estimatedDeliveryDate
              ? new Date(refreshedOrderData.estimatedDeliveryDate)
              : undefined;
          
          // Convert activity log timestamps
          if (refreshedOrderData.activityLog) {
            refreshedOrderData.activityLog = refreshedOrderData.activityLog.map((activity: OrderActivity) => ({
              ...activity,
              timestamp: activity.timestamp instanceof Timestamp
                ? activity.timestamp.toDate()
                : new Date(activity.timestamp),
            }));
          }
          
          setOrder(refreshedOrderData);
        }
      } catch (activityErr) {
        console.error('Failed to add ETA change activity:', activityErr);
      }
      
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
      setShowAcceptPrompt(false);
      
      // Add activity log for order acceptance
      try {
        console.log('Adding order acceptance activity for order:', order.id);
        await addOrderActivity(
          order.id,
          'status_changed',
          'Order accepted and status updated',
          user.uid,
          'vendor',
          order.status,
          'processing'
        );
        console.log('Order acceptance activity added successfully');
        
        // Refresh order data to include the newly added activity
        const orderRef = doc(db, 'orders', order.id);
        const refreshedOrderSnap = await getDoc(orderRef);
        if (refreshedOrderSnap.exists()) {
          const refreshedOrderData = refreshedOrderSnap.data() as Order;
          // Convert timestamps
          refreshedOrderData.createdAt = refreshedOrderData.createdAt instanceof Timestamp
            ? refreshedOrderData.createdAt.toDate()
            : new Date(refreshedOrderData.createdAt);
          refreshedOrderData.updatedAt = refreshedOrderData.updatedAt instanceof Timestamp
            ? refreshedOrderData.updatedAt.toDate()
            : new Date(refreshedOrderData.updatedAt);
          refreshedOrderData.estimatedDeliveryDate = refreshedOrderData.estimatedDeliveryDate instanceof Timestamp
            ? refreshedOrderData.estimatedDeliveryDate.toDate()
            : refreshedOrderData.estimatedDeliveryDate
              ? new Date(refreshedOrderData.estimatedDeliveryDate)
              : undefined;
          
          // Convert activity log timestamps
          if (refreshedOrderData.activityLog) {
            refreshedOrderData.activityLog = refreshedOrderData.activityLog.map((activity: OrderActivity) => ({
              ...activity,
              timestamp: activity.timestamp instanceof Timestamp
                ? activity.timestamp.toDate()
                : new Date(activity.timestamp),
            }));
          }
          
          setOrder(refreshedOrderData);
        }
      } catch (activityErr) {
        console.error('Failed to add order acceptance activity:', activityErr);
      }
      
      // Create notification for customer about order acceptance
      try {

        
        const notificationData = {
          type: 'order_status_update',
          message: 'Your order has been accepted and is now being processed by the vendor.',
          createdAt: new Date(),
          read: false,
          data: { orderId: order.id, newStatus: 'processing' },
          link: `/account/orders/${order.id}`,
          linkLabel: order.orderNumber || order.id,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', order.userId, 'notifications');
        const notificationRef = await addDoc(userNotificationsRef, notificationData);
        
        toast.success('Order accepted and notification sent to customer.');
      } catch (notifErr) {
        console.error('Failed to create order acceptance notification:', notifErr);
        toast.error('Failed to create acceptance notification for customer.');
      }
      
      await fetchOrderAndTickets();
    } catch {
      // handle error
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleUpdatePickupAddress = async () => {
    if (!order || !user) return;
    
    setIsUpdatingPickupAddress(true);
    try {
      // Update order with pickup address
      await updateDoc(doc(db, 'orders', order.id), { 
        pickupAddress: pickupAddress,
        updatedAt: new Date()
      });

      // Add activity log for pickup address update
      try {
        await addOrderActivity(
          order.id,
          'pickup_address_updated',
          'Pickup address updated by vendor',
          user.uid,
          'vendor',
          order.pickupAddress ? 'Previous address' : 'No address',
          `${pickupAddress.street}, ${pickupAddress.city}`
        );
      } catch (activityErr) {
        console.error('Failed to add pickup address activity:', activityErr);
      }

      // Create notification for customer
      try {
        const notificationData = {
          type: 'pickup_address_updated',
          message: `Pickup address has been ${order.pickupAddress ? 'updated' : 'added'} for your order ${order.orderNumber || order.id}.`,
          createdAt: new Date(),
          read: false,
          data: { orderId: order.id, pickupAddress },
          link: `/account/orders/${order.id}`,
          linkLabel: order.orderNumber || order.id,
        };
        
        const userNotificationsRef = collection(db, 'users', order.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create pickup address notification:', notifErr);
      }

      // Refresh order data
      await fetchOrderAndTickets();
      
      setShowPickupAddressModal(false);
      toast.success('Pickup address updated successfully!');
    } catch (error) {
      console.error('Error updating pickup address:', error);
      toast.error('Failed to update pickup address.');
    } finally {
      setIsUpdatingPickupAddress(false);
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

          {/* Payment Summary Section */}
          <div className="mb-6 space-y-4">
            {/* Quick Payment Summary */}
            <div className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-xl transition hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                    <span className="text-xl font-bold">💰</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Payment Summary</h3>
                    <p className="text-sm text-gray-600">Complete financial breakdown for this order</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Your Payout</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${order.paymentBreakdown?.vendorPayoutAmount?.toFixed(2) || 
                      (order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.9).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                  <div className="text-sm text-gray-600">Order Value</div>
                  <div className="text-lg font-bold text-blue-600">
                    ${order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                  <div className="text-sm text-gray-600">Platform Fee</div>
                  <div className="text-lg font-bold text-red-600">
                    -${order.paymentBreakdown?.vendorProcessingFee?.toFixed(2) || 
                      (order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">10% of payout amount</div>
                </div>
              </div>
              
              {/* Delivery Fee Information */}
              {order.deliveryFee && order.deliveryFee > 0 && (
                <div className="mt-4 rounded-xl bg-white p-4 text-center shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Delivery Fee</div>
                  <div className="text-lg font-bold text-green-600">
                    +${order.deliveryFee.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Added to customer's total</div>
                </div>
              )}
              
              {/* Pickup Address Section */}
              {order.deliveryOption === 'pickup' && (
                <div className="mt-4 rounded-xl bg-yellow-50 p-4 border border-yellow-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📍</span>
                      <h4 className="text-lg font-semibold text-yellow-900">Pickup Address</h4>
                    </div>
                    <button
                      onClick={() => setShowPickupAddressModal(true)}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-semibold hover:bg-yellow-700 transition-colors"
                    >
                      {order.pickupAddress ? 'Update Address' : 'Add Address'}
                    </button>
                  </div>
                  
                  {order.pickupAddress ? (
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <div className="font-semibold">{order.pickupAddress.street}</div>
                        <div>{order.pickupAddress.city}, {order.pickupAddress.state} {order.pickupAddress.zipCode}</div>
                        <div>{order.pickupAddress.country}</div>
                        {order.pickupAddress.phoneNumber && (
                          <div className="mt-1 text-blue-600">📞 {order.pickupAddress.phoneNumber}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-700">
                      No pickup address set. Please add an address for customer pickup.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Payment Breakdown */}
            {order.paymentBreakdown && (
              <PaymentBreakdownDisplay 
                paymentBreakdown={order.paymentBreakdown} 
                showVendorFocus={true}
              />
            )}

            {/* Vendor Payout Status */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <span className="text-lg">🏦</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payout Status</h3>
                  <p className="text-sm text-gray-600">When you'll receive your payment</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Current Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      order.vendorPayoutStatus === 'completed' ? 'bg-green-100 text-green-800' :
                      order.vendorPayoutStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.vendorPayoutStatus === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.vendorPayoutStatus || 'pending'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {order.vendorPayoutStatus === 'completed' ? 'Payment has been processed and sent to your account.' :
                     order.vendorPayoutStatus === 'processing' ? 'Payment is being processed and will be sent soon.' :
                     order.vendorPayoutStatus === 'failed' ? 'Payment processing failed. Please contact support.' :
                     'Payment will be processed after order delivery or cancellation.'}
                  </div>
                </div>
                
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Payout Timeline</div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Order placed - Payment held</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' || order.status === 'cancelled' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>Order delivered/cancelled - Payment processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${order.vendorPayoutStatus === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span>Payment sent to your account</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {order.vendorPayoutDate && (
                <div className="mt-4 rounded-lg bg-green-50 p-3 border border-green-200">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">✅</span>
                    <span className="font-semibold text-green-800">Payout Date:</span>
                    <span className="text-green-700">
                      {dayjs(order.vendorPayoutDate).format('DD MMM YYYY, h:mm A')}
                    </span>
                  </div>
                </div>
              )}
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
                                              <Link 
                          href={`/vendor/products/${item.id}/edit`}
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

      {/* Pickup Address Modal */}
      {showPickupAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pickup Address</h3>
              <button
                onClick={() => setShowPickupAddressModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={pickupAddress.street}
                  onChange={(e) => setPickupAddress(prev => ({ ...prev, street: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Enter street address"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    value={pickupAddress.city}
                    onChange={(e) => setPickupAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    value={pickupAddress.state}
                    onChange={(e) => setPickupAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="State"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={pickupAddress.zipCode}
                    onChange={(e) => setPickupAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="ZIP Code"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={pickupAddress.country}
                    onChange={(e) => setPickupAddress(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Country"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={pickupAddress.phoneNumber}
                  onChange={(e) => setPickupAddress(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="Contact phone number"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPickupAddressModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePickupAddress}
                disabled={isUpdatingPickupAddress || !pickupAddress.street || !pickupAddress.city || !pickupAddress.state || !pickupAddress.zipCode || !pickupAddress.country}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPickupAddress ? 'Updating...' : 'Update Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
