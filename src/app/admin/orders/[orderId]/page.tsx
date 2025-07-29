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
import { Order, User, Product, UserRole, Address } from '@/types';
import { toast } from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

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
  const [newStatus, setNewStatus] = useState<Order['status']>(order?.status || 'pending');
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

        // Initialize newEstimatedDeliveryDate
        if (orderData.estimatedDeliveryDate) {
          const date = orderData.estimatedDeliveryDate;
          setNewEstimatedDeliveryDate(date.toISOString().split('T')[0]); // Format to YYYY-MM-DD
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

      await updateDoc(orderRef, { status: newStatus, updatedAt: new Date() });
      setOrder((prevOrder) =>
        prevOrder ? { ...prevOrder, status: newStatus, updatedAt: new Date() } : null
      );
      // Notify user about status update
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: order.userId,
          type: 'order_status_update',
          message: `Status of your order ${order.orderNumber || orderId} changed to '${newStatus}'.`,
          createdAt: new Date(),
          read: false,
          data: { orderId, newStatus },
          link: `/account/orders/${orderId}`,
          linkLabel: order.orderNumber || orderId,
        });
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
            {/* Payment Details */}
            {order && (
              <section className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-yellow-50 to-pink-50 p-8 shadow">
                <h2 className="mb-6 text-xl font-bold text-blue-900">Payment Details</h2>
                <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Subtotal</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      $
                      {(order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)).toFixed(
                        2
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Delivery Fee</p>
                    <p className="mt-1 text-lg text-gray-900">
                      ${order.deliveryFee ? order.deliveryFee.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Service Fee</p>
                    <p className="mt-1 text-lg text-gray-900">
                      ${order.serviceFee ? order.serviceFee.toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Grand Total</p>
                    <p className="mt-1 text-2xl font-extrabold text-blue-700">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </section>
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
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
