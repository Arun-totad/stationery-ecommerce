'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, User, Product, UserRole, Address, OrderActivity } from '@/types';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import OrderActivityLog from '@/components/OrderActivityLog';
import PaymentBreakdownDisplay from '@/components/PaymentBreakdownDisplay';
import { addOrderActivity } from '@/lib/orderActivity';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const router = useRouter();
  const { userRole, user: currentUser } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<User | null>(null);
  const [vendor, setVendor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<Order['status']>(order?.status || 'pending');
  const [newPaymentStatus, setNewPaymentStatus] = useState<Order['paymentStatus']>(order?.paymentStatus || 'pending');
  const [newEstimatedDeliveryDate, setNewEstimatedDeliveryDate] = useState<string>('');
  const [supportTickets, setSupportTickets] = useState<
    { id: string; ticketNumber?: string; subject?: string }[]
  >([]);

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
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (!orderSnap.exists()) {
          toast.error('Order not found.');
          router.push('/admin?view=orders');
          return;
        }

        const orderData = orderSnap.data() as Order;
        // Convert Firebase Timestamps to Date objects if necessary
        orderData.createdAt =
          orderData.createdAt instanceof Timestamp
            ? orderData.createdAt.toDate()
            : new Date(orderData.createdAt);
        orderData.updatedAt =
          orderData.updatedAt instanceof Timestamp
            ? orderData.updatedAt.toDate()
            : new Date(orderData.updatedAt);
        orderData.estimatedDeliveryDate =
          orderData.estimatedDeliveryDate instanceof Timestamp
            ? orderData.estimatedDeliveryDate.toDate()
            : orderData.estimatedDeliveryDate
              ? new Date(orderData.estimatedDeliveryDate)
              : undefined;
        orderData.items = orderData.items.map((item) => ({
          ...item,
          createdAt:
            item.createdAt instanceof Timestamp
              ? item.createdAt.toDate()
              : new Date(item.createdAt),
          updatedAt:
            item.updatedAt instanceof Timestamp
              ? item.updatedAt.toDate()
              : new Date(item.updatedAt),
        }));

        // Convert activity log timestamps
        if (orderData.activityLog) {
          orderData.activityLog = orderData.activityLog.map((activity: OrderActivity) => ({
            ...activity,
            timestamp: activity.timestamp instanceof Timestamp
              ? activity.timestamp.toDate()
              : new Date(activity.timestamp),
          }));
        } else {
          orderData.activityLog = [];
        }

        // Parse shipping address string back to object if it's a string
        if (typeof orderData.shippingAddress === 'string') {
          try {
            orderData.shippingAddress = JSON.parse(orderData.shippingAddress) as Address;
          } catch (e) {
            console.error('Failed to parse shipping address string:', e);
            // Fallback to an empty address if parsing fails or data is malformed
            orderData.shippingAddress = {
              street: '',
              city: '',
              state: '',
              zipCode: '',
              country: '',
            };
          }
        }

        setOrder(orderData);
        setNewStatus(orderData.status);
        setNewPaymentStatus(orderData.paymentStatus);

        // Initialize newEstimatedDeliveryDate
        if (orderData.estimatedDeliveryDate) {
          const date = orderData.estimatedDeliveryDate;
          setNewEstimatedDeliveryDate(date.toISOString().split('T')[0]); // Format to YYYY-MM-DD
        }

        // Add initial order creation activity if no activity log exists
        if (!orderData.activityLog || orderData.activityLog.length === 0) {
          try {
            await addOrderActivity(
              orderId,
              'order_created',
              'Order was created',
              orderData.userId,
              'customer',
              null,
              orderData.status
            );

            // Add coupon application activity if coupon was used
            if (orderData.couponCode && orderData.discountAmount && orderData.discountAmount > 0) {
              await addOrderActivity(
                orderId,
                'coupon_applied',
                `Coupon ${orderData.couponCode} applied`,
                orderData.userId,
                'customer',
                null,
                `Discount: $${orderData.discountAmount.toFixed(2)}`
              );
            }

            // Add payment status activity
            if (orderData.paymentStatus === 'completed') {
              await addOrderActivity(
                orderId,
                'payment_completed',
                'Payment completed',
                orderData.userId,
                'customer',
                null,
                orderData.paymentMethod
              );
            } else if (orderData.paymentStatus === 'failed') {
              await addOrderActivity(
                orderId,
                'payment_failed',
                'Payment failed',
                orderData.userId,
                'customer',
                null,
                orderData.paymentMethod
              );
            }

            // Refresh order data to include the newly added activities
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
              
              // Update the order state with refreshed data
              setOrder(refreshedOrderData);
            }
          } catch (error) {
            console.error('Failed to add initial order activities:', error);
          }
        }

        // Fetch customer details
        const customerRef = doc(db, 'users', orderData.userId);
        const customerSnap = await getDoc(customerRef);
        if (customerSnap.exists()) {
          setCustomer(customerSnap.data() as User);
        }

        // Fetch vendor details
        const vendorRef = doc(db, 'users', orderData.vendorId);
        const vendorSnap = await getDoc(vendorRef);
        if (vendorSnap.exists()) {
          setVendor(vendorSnap.data() as User);
        }

        // Fetch support tickets for this order
        const ticketsQuery = query(
          collection(db, 'supportTickets'),
          where('orderId', '==', orderId)
        );
        const ticketsSnap = await getDocs(ticketsQuery);
        const tickets = ticketsSnap.docs.map((doc) => ({
          id: doc.id,
          ticketNumber: doc.data().ticketNumber,
          subject: doc.data().subject,
        }));
        setSupportTickets(tickets);

        // Add support ticket creation activities if tickets exist and no activity log
        if (tickets.length > 0 && (!orderData.activityLog || orderData.activityLog.length === 0)) {
          try {
            for (const ticket of tickets) {
              await addOrderActivity(
                orderId,
                'support_ticket_created',
                `Support ticket created: ${ticket.subject || ticket.ticketNumber || ticket.id}`,
                orderData.userId,
                'customer',
                null,
                ticket.ticketNumber || ticket.id
              );
            }
            
            // Refresh order data to include the newly added support ticket activities
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
              
              // Update the order state with refreshed data
              setOrder(refreshedOrderData);
            }
          } catch (error) {
            console.error('Failed to add support ticket activities:', error);
          }
        }


      } catch (error) {
        console.error('Error fetching order details:', error);
        toast.error('Failed to load order details.');
        router.push('/admin?view=orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, router]);

  const handleStatusChange = async () => {
    if (!order || !newStatus || !currentUser) return;

    setIsUpdatingStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);

      // Restock products if order status changes to 'cancelled'
      if (newStatus === 'cancelled' && order.status !== 'cancelled') {
        const batch = writeBatch(db);
        for (const item of order.items) {
          const productRef = doc(db, 'products', item.id);
          batch.update(productRef, { stock: item.stock + item.quantity });
        }
        await batch.commit();
        toast.success('Products restocked due to order cancellation.');
      } else if (order.status === 'cancelled' && newStatus !== 'cancelled') {
        // Prevent changing status from cancelled to other unless explicitly handled (e.g., re-order)
        toast.error('Cannot change status from cancelled. Please create a new order.');
        setIsUpdatingStatus(false);
        return;
      }

      // Log the status change activity
      await addOrderActivity(
        orderId,
        'status_changed',
        'Order status updated',
        currentUser.uid,
        userRole || 'admin',
        order.status,
        newStatus
      );

      await updateDoc(orderRef, { status: newStatus, updatedAt: new Date() });
      
      // Refresh order data to include the newly added activity
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
      // Notify user about status update
      try {
        const notificationData = {
          type: 'order_status_update',
          message: `Status of your order ${order.orderNumber || orderId} changed to '${newStatus}'.`,
          createdAt: new Date(),
          read: false,
          data: { orderId, newStatus },
          link: `/account/orders/${orderId}`,
          linkLabel: order.orderNumber || orderId,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', order.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create status update notification:', notifErr);
      }
      toast.success('Order status updated successfully!');
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePaymentStatusChange = async () => {
    if (!order || !newPaymentStatus || !currentUser) return;

    setIsUpdatingPaymentStatus(true);
    try {
      const orderRef = doc(db, 'orders', orderId);

      // Log the payment status change activity
      await addOrderActivity(
        orderId,
        newPaymentStatus === 'completed' ? 'payment_completed' : newPaymentStatus === 'failed' ? 'payment_failed' : 'payment_status_changed',
        'Payment status updated',
        currentUser.uid,
        userRole || 'admin',
        order.paymentStatus,
        newPaymentStatus
      );

      await updateDoc(orderRef, { paymentStatus: newPaymentStatus, updatedAt: new Date() });
      
      // Refresh order data to include the newly added activity
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

      // Notify user about payment status update
      try {
        const notificationData = {
          type: 'payment_status_update',
          message: `Payment status of your order ${order.orderNumber || orderId} changed to '${newPaymentStatus}'.`,
          createdAt: new Date(),
          read: false,
          data: { orderId, newPaymentStatus },
          link: `/account/orders/${orderId}`,
          linkLabel: order.orderNumber || orderId,
        };
        
        // Create notification in user's subcollection
        const userNotificationsRef = collection(db, 'users', order.userId, 'notifications');
        await addDoc(userNotificationsRef, notificationData);
      } catch (notifErr) {
        console.error('Failed to create payment status update notification:', notifErr);
      }
      toast.success('Payment status updated successfully!');
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status.');
    } finally {
      setIsUpdatingPaymentStatus(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!order) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
        <div className="flex min-h-screen items-center justify-center text-gray-900">
          Order details not available.
        </div>
      </ProtectedRoute>
    );
  }

  const isVendorOwner = userRole === 'vendor' && currentUser?.uid === order.vendorId;
  const isAdminOrManager = userRole === 'admin' || userRole === 'admin-manager';
  const canViewOrder = isVendorOwner || isAdminOrManager;

  if (!canViewOrder) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
        <div className="flex min-h-screen items-center justify-center text-red-500">
          You do not have permission to view this order.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 py-10">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 px-4 text-gray-900 shadow-2xl sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center justify-between">
            <h1 className="text-3xl font-extrabold text-gray-900">Order Details</h1>
            <button
              onClick={() => router.push('/admin?view=orders')}
              className="rounded-xl border border-gray-200 bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 px-6 py-2 font-semibold text-gray-900 shadow hover:bg-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            >
              Back to Orders
            </button>
          </div>
          <div className="space-y-10">
            {/* Order Summary */}
            <section className="mb-6 rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 shadow">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-yellow-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-200 text-2xl font-bold text-yellow-700 shadow">
                  #
                </span>
                Order Summary
              </h2>
              <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Number</p>
                  <span className="mt-1 block text-2xl font-extrabold tracking-wider text-yellow-900">
                    {order.orderNumber ||
                      (order.id ? `ORD-2024-${order.id.slice(-4).toUpperCase()}` : 'ORD-2024-XXXX')}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-base leading-5 font-bold capitalize shadow ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <span className="mt-1 text-xl font-semibold text-gray-900">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-base font-semibold capitalize shadow ${
                      order.paymentStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.paymentStatus === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Payout Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-base font-semibold capitalize shadow ${
                      order.vendorPayoutStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.vendorPayoutStatus === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : order.vendorPayoutStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.vendorPayoutStatus || 'pending'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Method</p>
                  <span className="mt-1 block text-lg text-gray-900">{order.paymentMethod}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Placed On</p>
                  <span className="mt-1 block text-lg text-gray-900">
                    {order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString()}
                  </span>
                </div>
                {order.estimatedDeliveryDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estimated Delivery</p>
                    <span className="mt-1 block text-lg font-semibold text-blue-900">
                      {order.estimatedDeliveryDate.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              {/* Support Tickets Reference */}
              {supportTickets.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-pink-800">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pink-200 text-lg font-bold text-pink-700 shadow">
                      ?
                    </span>
                    Support Tickets for this Order
                  </h3>
                  <ul className="flex flex-wrap gap-3 pl-0">
                    {supportTickets.map((ticket) => (
                      <li key={ticket.id} className="mb-1">
                        <Link
                          href={`/admin/support/${ticket.id}`}
                          className="inline-block rounded-full bg-pink-100 px-3 py-1 font-semibold text-pink-800 shadow transition hover:bg-pink-200"
                        >
                          {ticket.ticketNumber || ticket.id}
                        </Link>
                        {ticket.subject && (
                          <span className="ml-2 text-gray-700">- {ticket.subject}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            {/* Payment Details & Service Fee Breakdown */}
            {order && (
              <>
                {/* Quick Payment Summary */}
                <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-yellow-50 to-pink-50 p-8 shadow">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-blue-900">Payment Summary</h2>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Platform Revenue</div>
                      <div className="text-2xl font-bold text-green-600">
                        ${order.paymentBreakdown?.platformRevenue?.toFixed(2) || 
                          (() => {
                            const customerServiceFee = order.serviceFee || 0;
                            const subtotal = order.total - (order.deliveryFee || 0) - customerServiceFee;
                            const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                            const vendorProcessingFee = vendorPayoutBeforeFee * 0.1;
                            return (customerServiceFee + vendorProcessingFee).toFixed(2);
                          })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Customer Pays</div>
                      <div className="text-xl font-bold text-blue-600">
                        ${order.paymentBreakdown?.totalChargedToCustomer?.toFixed(2) || order.total.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Including all fees and charges
                      </div>
                    </div>
                    
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Vendor Receives</div>
                      <div className="text-xl font-bold text-purple-600">
                        ${order.paymentBreakdown?.vendorPayoutAmount?.toFixed(2) || 
                          (() => {
                            const subtotal = order.total - (order.deliveryFee || 0) - (order.serviceFee || 0);
                            const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                            const vendorProcessingFee = vendorPayoutBeforeFee * 0.1;
                            return (vendorPayoutBeforeFee - vendorProcessingFee).toFixed(2);
                          })()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        After platform fees
                      </div>
                    </div>
                    
                    <div className="rounded-xl bg-white p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Platform Revenue</div>
                      <div className="text-xl font-bold text-green-600">
                        ${order.paymentBreakdown?.platformRevenue?.toFixed(2) || 
                          ((order.serviceFee || 0) + (order.vendorProcessingFee || 0)).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Service + Processing fees
                      </div>
                    </div>
                  </div>
                </section>

                {/* Service Fee Breakdown */}
                <section className="mb-6 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 p-8 shadow">
                  <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-green-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-200 text-2xl font-bold text-green-700 shadow">
                      💰
                    </span>
                    Service Fee Breakdown
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Customer Service Fee */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-blue-900 border-b border-blue-200 pb-2">
                        💳 Customer Service Fee (10%)
                      </h3>
                      <div className="space-y-3 rounded-xl bg-blue-50 p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Order Subtotal:</span>
                          <span className="font-semibold">${order.paymentBreakdown?.subtotal?.toFixed(2) || 
                            (order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Service Fee (10%):</span>
                          <span className="font-semibold text-blue-600">+${order.paymentBreakdown?.customerServiceFee?.toFixed(2) || 
                            (order.serviceFee || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Delivery Fee:</span>
                          <span className="font-semibold">+${order.deliveryFee?.toFixed(2) || '0.00'}</span>
                        </div>
                        {order.discountAmount && order.discountAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Discount:</span>
                            <span className="font-semibold text-green-600">-${order.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center border-t border-blue-200 pt-3">
                          <span className="text-lg font-bold text-blue-900">Customer Pays:</span>
                          <span className="text-xl font-bold text-blue-900">${order.paymentBreakdown?.totalChargedToCustomer?.toFixed(2) || 
                            order.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Processing Fee */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-purple-900 border-b border-purple-200 pb-2">
                        🏪 Vendor Processing Fee (10%)
                      </h3>
                      <div className="space-y-3 rounded-xl bg-purple-50 p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Order Subtotal:</span>
                          <span className="font-semibold">${order.paymentBreakdown?.subtotal?.toFixed(2) || 
                            (order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Processing Fee (10% of payout):</span>
                          <span className="font-semibold text-red-600">-${order.paymentBreakdown?.vendorProcessingFee?.toFixed(2) || 
                            (() => {
                              // Calculate vendor processing fee as 10% of payout amount (after discounts)
                              const subtotal = order.total - (order.deliveryFee || 0) - (order.serviceFee || 0);
                              const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                              return (vendorPayoutBeforeFee * 0.1).toFixed(2);
                            })()}</span>
                        </div>
                        {order.discountAmount && order.discountAmount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-700">Discount Impact:</span>
                            <span className="font-semibold text-red-600">-${order.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center border-t border-purple-200 pt-3">
                          <span className="text-lg font-bold text-purple-900">Vendor Receives:</span>
                          <span className="text-xl font-bold text-purple-900">${order.paymentBreakdown?.vendorPayoutAmount?.toFixed(2) || 
                            (() => {
                              // Calculate vendor payout amount correctly
                              const subtotal = order.total - (order.deliveryFee || 0) - (order.serviceFee || 0);
                              const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                              const vendorProcessingFee = vendorPayoutBeforeFee * 0.1;
                              return (vendorPayoutBeforeFee - vendorProcessingFee).toFixed(2);
                            })()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Platform Revenue Summary */}
                  <div className="mt-6 rounded-xl bg-gradient-to-r from-yellow-100 to-orange-100 p-4 border border-yellow-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-semibold text-yellow-900">Total Platform Revenue</h4>
                        <p className="text-sm text-yellow-700">
                          Customer Service Fee + Vendor Processing Fee
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-yellow-900">
                          ${order.paymentBreakdown?.platformRevenue?.toFixed(2) || 
                            (() => {
                              // Calculate total platform revenue correctly
                              const customerServiceFee = order.serviceFee || 0;
                              const subtotal = order.total - (order.deliveryFee || 0) - customerServiceFee;
                              const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                              const vendorProcessingFee = vendorPayoutBeforeFee * 0.1;
                              return (customerServiceFee + vendorProcessingFee).toFixed(2);
                            })()}
                        </div>
                        <div className="text-sm text-yellow-700">
                          ${order.paymentBreakdown?.customerServiceFee?.toFixed(2) || (order.serviceFee || 0).toFixed(2)} + ${order.paymentBreakdown?.vendorProcessingFee?.toFixed(2) || (() => {
                            const subtotal = order.total - (order.deliveryFee || 0) - (order.serviceFee || 0);
                            const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                            return (vendorPayoutBeforeFee * 0.1).toFixed(2);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Detailed Payment Breakdown */}
                {order.paymentBreakdown && (
                  <PaymentBreakdownDisplay paymentBreakdown={order.paymentBreakdown} className="mb-6" />
                )}

                {/* Revenue Analytics */}
                <section className="mb-6 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 to-yellow-50 p-8 shadow">
                  <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-orange-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-200 text-2xl font-bold text-orange-700 shadow">
                      📊
                    </span>
                    Revenue Analytics
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Order Value</div>
                      <div className="text-xl font-bold text-blue-600">
                        ${order.paymentBreakdown?.subtotal?.toFixed(2) || 
                          (order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Before fees</div>
                    </div>
                    
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Customer Fee</div>
                      <div className="text-xl font-bold text-green-600">
                        ${order.paymentBreakdown?.customerServiceFee?.toFixed(2) || 
                          (order.serviceFee || 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">10% of subtotal</div>
                    </div>
                    
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Vendor Fee</div>
                      <div className="text-xl font-bold text-purple-600">
                        ${order.paymentBreakdown?.vendorProcessingFee?.toFixed(2) || 
                          (() => {
                            const subtotal = order.total - (order.deliveryFee || 0) - (order.serviceFee || 0);
                            const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                            return (vendorPayoutBeforeFee * 0.1).toFixed(2);
                          })()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">10% of payout amount</div>
                    </div>
                    
                    <div className="rounded-xl bg-white p-4 text-center shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                      <div className="text-xl font-bold text-orange-600">
                        ${order.paymentBreakdown?.platformRevenue?.toFixed(2) || 
                          (() => {
                            const customerServiceFee = order.serviceFee || 0;
                            const subtotal = order.total - (order.deliveryFee || 0) - customerServiceFee;
                            const vendorPayoutBeforeFee = subtotal - (order.discountAmount || 0);
                            const vendorProcessingFee = vendorPayoutBeforeFee * 0.1;
                            return (customerServiceFee + vendorProcessingFee).toFixed(2);
                          })()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Variable (10% + 10%)</div>
                    </div>
                  </div>

                  {/* Revenue Breakdown Chart */}
                  <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-800 mb-3">Revenue Distribution</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Vendor Payout</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ 
                                width: `${((order.paymentBreakdown?.vendorPayoutAmount || 0) / (order.paymentBreakdown?.subtotal || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-purple-600">
                            {((order.paymentBreakdown?.vendorPayoutAmount || 0) / (order.paymentBreakdown?.subtotal || 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Platform Revenue</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-orange-600 h-2 rounded-full" 
                              style={{ 
                                width: `${((order.paymentBreakdown?.platformRevenue || 0) / (order.paymentBreakdown?.subtotal || 1)) * 100}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-orange-600">
                            {((order.paymentBreakdown?.platformRevenue || 0) / (order.paymentBreakdown?.subtotal || 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
            {/* Update Status Section (Admin/Vendor) */}
            {(isAdminOrManager || isVendorOwner) && (
              <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow md:flex-row md:items-center">
                <label htmlFor="orderStatus" className="text-sm font-medium text-gray-700">
                  Update Status:
                </label>
                <select
                  id="orderStatus"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Order['status'])}
                  className="block w-48 rounded-xl border-gray-300 shadow focus:border-yellow-400 focus:ring-yellow-400"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="inline-flex justify-center rounded-xl border border-gray-200 bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 px-4 py-2 font-semibold text-gray-900 shadow hover:bg-yellow-200 focus:ring-2 focus:ring-yellow-400 focus:outline-none disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </section>
            )}

            {/* Payment Management Section (Admin Only) */}
            {isAdminOrManager && (
              <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow">
                <h3 className="text-lg font-semibold text-gray-900">Payment Management</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Payment Status */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-blue-900">Customer Payment Status</h4>
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <label htmlFor="paymentStatus" className="text-sm font-medium text-gray-700">
                        Update Payment Status:
                      </label>
                      <select
                        id="paymentStatus"
                        value={newPaymentStatus}
                        onChange={(e) => setNewPaymentStatus(e.target.value as Order['paymentStatus'])}
                        className="block w-48 rounded-xl border-gray-300 shadow focus:border-yellow-400 focus:ring-yellow-400"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                      </select>
                      <button
                        onClick={handlePaymentStatusChange}
                        disabled={isUpdatingPaymentStatus}
                        className="inline-flex justify-center rounded-xl border border-gray-200 bg-gradient-to-r from-green-100 via-blue-100 to-purple-100 px-4 py-2 font-semibold text-gray-900 shadow hover:bg-green-200 focus:ring-2 focus:ring-green-400 focus:outline-none disabled:opacity-50"
                      >
                        {isUpdatingPaymentStatus ? 'Updating...' : 'Save Payment Status'}
                      </button>
                    </div>
                  </div>

                  {/* Vendor Payout Status */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-purple-900">Vendor Payout Status</h4>
                    <div className="rounded-xl bg-purple-50 p-4">
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
                      <div className="text-sm text-gray-600 mb-3">
                        {order.vendorPayoutStatus === 'completed' ? 'Payment has been processed and sent to vendor.' :
                         order.vendorPayoutStatus === 'processing' ? 'Payment is being processed and will be sent soon.' :
                         order.vendorPayoutStatus === 'failed' ? 'Payment processing failed. Please contact vendor.' :
                         'Payment will be processed after order delivery or cancellation.'}
                      </div>
                      {order.vendorPayoutDate && (
                        <div className="text-xs text-gray-500">
                          Payout Date: {order.vendorPayoutDate.toLocaleDateString()} {order.vendorPayoutDate.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payout Action Buttons */}
                {order.status === 'delivered' && order.vendorPayoutStatus !== 'completed' && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-md font-semibold text-green-900 mb-3">Payout Actions</h4>
                    <div className="flex gap-3">
                      <button
                        className="inline-flex justify-center rounded-xl border border-green-200 bg-green-100 px-4 py-2 font-semibold text-green-800 shadow hover:bg-green-200 focus:ring-2 focus:ring-green-400 focus:outline-none"
                        onClick={() => {
                          // TODO: Implement vendor payout processing
                          toast.success('Vendor payout processing feature coming soon!');
                        }}
                      >
                        Process Vendor Payout
                      </button>
                      <button
                        className="inline-flex justify-center rounded-xl border border-blue-200 bg-blue-100 px-4 py-2 font-semibold text-blue-800 shadow hover:bg-blue-200 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        onClick={() => {
                          // TODO: Implement payout details view
                          toast.success('Payout details view coming soon!');
                        }}
                      >
                        View Payout Details
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
            {/* Vendor Info */}
            <section className="mb-6 rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 shadow">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-yellow-900">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-200 text-2xl font-bold text-blue-700 shadow">
                  🏪
                </span>
                Vendor Information
              </h2>
              <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Name</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {vendor?.displayName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Email</p>
                  <span className="mt-1 block text-lg text-gray-900">{vendor?.email || 'N/A'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <span className="mt-1 block text-lg text-gray-900">
                    {formatPhoneForDisplay(vendor?.phoneNumber || '')}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Shop Address</p>
                  <span className="mt-1 block text-lg text-gray-900">
                    {(vendor as any)?.shopAddress || 'N/A'}
                  </span>
                </div>
                {'description' in (vendor || {}) && (vendor as any).description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <span className="mt-1 block text-gray-900">{(vendor as any).description}</span>
                  </div>
                )}
                {'isVerified' in (vendor || {}) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verified</p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-3 py-1 text-base font-semibold shadow ${(vendor as any).isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {(vendor as any).isVerified ? 'Yes' : 'No'}
                    </span>
                  </div>
                )}
              </div>
            </section>
            {/* Shipping Address */}
            <section className="mb-6 flex flex-col rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 shadow">
              <div className="mb-6 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600 shadow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 0c-3.866 0-7 2.239-7 5v2a1 1 0 001 1h12a1 1 0 001-1v-2c0-2.761-3.134-5-7-5z"
                    />
                  </svg>
                </span>
                <h2 className="text-xl font-bold text-yellow-900">Shipping Address</h2>
              </div>
              <div className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
                <div className="mb-4">
                  {customer && (
                    <>
                      <p className="mb-1 text-lg font-bold text-gray-900">{customer.displayName}</p>
                      <p className="mb-1 text-sm font-medium text-blue-700">{customer.email}</p>
                      {customer.phoneNumber && (
                        <span className="mb-2 inline-block rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                          {formatPhoneForDisplay(customer.phoneNumber)}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div className="text-base text-gray-700">
                  {order.shippingAddress.street && <div>{order.shippingAddress.street}</div>}
                  <div>
                    {order.shippingAddress.city && <span>{order.shippingAddress.city}, </span>}
                    {order.shippingAddress.state && <span>{order.shippingAddress.state} - </span>}
                    {order.shippingAddress.zipCode && <span>{order.shippingAddress.zipCode}</span>}
                  </div>
                  {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                  {order.shippingAddress.phoneNumber && (
                    <div className="mt-2 text-sm text-gray-600">
                      Phone:{' '}
                      <span className="font-semibold">{formatPhoneForDisplay(order.shippingAddress.phoneNumber)}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
            
            {/* Pickup Address Section */}
            {order.deliveryOption === 'pickup' && order.pickupAddress && (
              <section className="mb-6 flex flex-col rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 p-8 shadow">
                <div className="mb-6 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-2xl font-bold text-yellow-600 shadow">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-7 w-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0l-4.243 4.243M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </span>
                  <h2 className="text-xl font-bold text-yellow-900">Pickup Address</h2>
                </div>
                <div className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
                  <div className="mb-4">
                    <p className="mb-1 text-lg font-bold text-gray-900">Vendor Pickup Location</p>
                    <p className="mb-1 text-sm font-medium text-yellow-700">Customer will pick up from this address</p>
                  </div>
                  <div className="text-base text-gray-700">
                    {order.pickupAddress.street && <div>{order.pickupAddress.street}</div>}
                    <div>
                      {order.pickupAddress.city && <span>{order.pickupAddress.city}, </span>}
                      {order.pickupAddress.state && <span>{order.pickupAddress.state} - </span>}
                      {order.pickupAddress.zipCode && <span>{order.pickupAddress.zipCode}</span>}
                    </div>
                    {order.pickupAddress.country && <div>{order.pickupAddress.country}</div>}
                    {order.pickupAddress.phoneNumber && (
                      <div className="mt-2 text-sm text-gray-600">
                        Phone:{' '}
                        <span className="font-semibold">{formatPhoneForDisplay(order.pickupAddress.phoneNumber)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
            
            {/* Ordered Items */}
            <section className="mb-6 rounded-2xl border border-yellow-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 shadow">
              <h2 className="mb-6 text-xl font-bold text-yellow-900">Ordered Items</h2>
              <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center px-4 py-3">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="h-16 w-16 flex-shrink-0 rounded-md border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-400">
                        No Image
                      </div>
                    )}
                    <div className="ml-4 flex-grow">
                      <p className="text-md font-medium text-gray-900">
                        {item.name} x {item.quantity}
                      </p>
                      <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                      <p className="text-sm text-gray-600">Category: {item.category}</p>
                      <p className="text-sm text-gray-600">Brand: {item.brand}</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        Subtotal: ${item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Activity Log */}
            <OrderActivityLog activities={order.activityLog || []} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
