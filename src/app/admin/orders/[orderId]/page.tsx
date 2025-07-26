'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
  const [supportTickets, setSupportTickets] = useState<{ id: string, ticketNumber?: string, subject?: string }[]>([]);

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
        orderData.createdAt = orderData.createdAt instanceof Timestamp ? orderData.createdAt.toDate() : new Date(orderData.createdAt);
        orderData.updatedAt = orderData.updatedAt instanceof Timestamp ? orderData.updatedAt.toDate() : new Date(orderData.updatedAt);
        orderData.estimatedDeliveryDate = orderData.estimatedDeliveryDate instanceof Timestamp ? orderData.estimatedDeliveryDate.toDate() : (orderData.estimatedDeliveryDate ? new Date(orderData.estimatedDeliveryDate) : undefined);
        orderData.items = orderData.items.map(item => ({ 
            ...item, 
            createdAt: item.createdAt instanceof Timestamp ? item.createdAt.toDate() : new Date(item.createdAt),
            updatedAt: item.updatedAt instanceof Timestamp ? item.updatedAt.toDate() : new Date(item.updatedAt)
        }));

        // Parse shipping address string back to object if it's a string
        if (typeof orderData.shippingAddress === 'string') {
          try {
            orderData.shippingAddress = JSON.parse(orderData.shippingAddress) as Address;
          } catch (e) {
            console.error("Failed to parse shipping address string:", e);
            // Fallback to an empty address if parsing fails or data is malformed
            orderData.shippingAddress = { street: '', city: '', state: '', zipCode: '', country: '' };
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
        const ticketsQuery = query(collection(db, 'supportTickets'), where('orderId', '==', orderId));
        const ticketsSnap = await getDocs(ticketsQuery);
        const tickets = ticketsSnap.docs.map(doc => ({
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
      setOrder(prevOrder => prevOrder ? { ...prevOrder, status: newStatus, updatedAt: new Date() } : null);
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
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!order) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
        <div className="min-h-screen flex items-center justify-center text-gray-900">
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
        <div className="min-h-screen flex items-center justify-center text-red-500">
          You do not have permission to view this order.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager', 'vendor']}>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 bg-white p-10 rounded-3xl shadow-2xl text-gray-900">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900">Order Details</h1>
            <button
              onClick={() => router.push('/admin?view=orders')}
              className="px-6 py-2 rounded-xl font-semibold shadow bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 text-gray-900 border border-gray-200 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              Back to Orders
            </button>
          </div>
          <div className="space-y-10">
            {/* Order Summary */}
            <section className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 rounded-2xl border border-yellow-100 shadow mb-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-6 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-200 text-yellow-700 text-2xl font-bold shadow">#</span>
                Order Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Number</p>
                  <span className="mt-1 text-2xl font-extrabold text-yellow-900 tracking-wider block">{order.orderNumber || (order.id ? `ORD-2024-${order.id.slice(-4).toUpperCase()}` : 'ORD-2024-XXXX')}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Order Status</p>
                  <span className={`mt-1 px-3 py-1 inline-flex text-base leading-5 font-bold rounded-full capitalize shadow ${
                    order.status === 'delivered'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <span className="mt-1 text-xl font-semibold text-gray-900">₹{order.total.toFixed(2)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <span className={`mt-1 px-3 py-1 inline-flex text-base font-semibold rounded-full capitalize shadow ${
                    order.paymentStatus === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : order.paymentStatus === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Method</p>
                  <span className="mt-1 text-lg text-gray-900 block">{order.paymentMethod}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Placed On</p>
                  <span className="mt-1 text-lg text-gray-900 block">{order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString()}</span>
                </div>
                {order.estimatedDeliveryDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estimated Delivery</p>
                    <span className="mt-1 text-lg font-semibold text-blue-900 block">{order.estimatedDeliveryDate.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {/* Support Tickets Reference */}
              {supportTickets.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-pink-800 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-200 text-pink-700 text-lg font-bold shadow">?</span>
                    Support Tickets for this Order
                  </h3>
                  <ul className="flex flex-wrap gap-3 pl-0">
                    {supportTickets.map(ticket => (
                      <li key={ticket.id} className="mb-1">
                        <Link href={`/admin/support/${ticket.id}`} className="inline-block px-3 py-1 rounded-full bg-pink-100 text-pink-800 font-semibold hover:bg-pink-200 transition shadow">
                          {ticket.ticketNumber || ticket.id}
                        </Link>
                        {ticket.subject && <span className="ml-2 text-gray-700">- {ticket.subject}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            {/* Payment Details */}
            {order && (
              <section className="bg-gradient-to-r from-blue-50 via-yellow-50 to-pink-50 p-8 rounded-2xl border border-blue-100 shadow mb-6">
                <h2 className="text-xl font-bold text-blue-900 mb-6">Payment Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Subtotal</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900">₹{(order.total - (order.deliveryFee || 0) - (order.serviceFee || 0)).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Delivery Fee</p>
                    <p className="mt-1 text-lg text-gray-900">₹{order.deliveryFee ? order.deliveryFee.toFixed(2) : '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Service Fee</p>
                    <p className="mt-1 text-lg text-gray-900">₹{order.serviceFee ? order.serviceFee.toFixed(2) : '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Grand Total</p>
                    <p className="mt-1 text-2xl font-extrabold text-blue-700">₹{order.total.toFixed(2)}</p>
                  </div>
                </div>
              </section>
            )}
            {/* Update Status Section (Admin/Vendor) */}
            {(isAdminOrManager || isVendorOwner) && (
              <section className="bg-white p-6 rounded-2xl border border-gray-200 shadow flex flex-col md:flex-row md:items-center gap-4">
                <label htmlFor="orderStatus" className="text-sm font-medium text-gray-700">Update Status:</label>
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
                  className="inline-flex justify-center py-2 px-4 rounded-xl font-semibold shadow bg-gradient-to-r from-yellow-100 via-pink-100 to-blue-100 text-gray-900 border border-gray-200 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
                >
                  {isUpdatingStatus ? 'Updating...' : 'Save Status'}
                </button>
              </section>
            )}
            {/* Vendor Info */}
            <section className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 rounded-2xl border border-yellow-100 shadow mb-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-6 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-700 text-2xl font-bold shadow">🏪</span>
                Vendor Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-10">
                <div>
                  <p className="text-sm font-medium text-gray-500">Shop Name</p>
                  <span className="mt-1 text-lg text-gray-900 block font-semibold">{(vendor as any)?.shopName || vendor?.displayName || 'N/A'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Email</p>
                  <span className="mt-1 text-lg text-gray-900 block">{vendor?.email || 'N/A'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vendor Name</p>
                  <span className="mt-1 text-lg text-gray-900 block">{vendor?.displayName || 'N/A'}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <span className="mt-1 text-lg text-gray-900 block">{vendor?.phoneNumber || 'N/A'}</span>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Shop Address</p>
                  <span className="mt-1 text-lg text-gray-900 block">{(vendor as any)?.shopAddress || 'N/A'}</span>
                </div>
                {('description' in (vendor || {})) && (vendor as any).description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <span className="mt-1 text-gray-900 block">{(vendor as any).description}</span>
                  </div>
                )}
                {('isVerified' in (vendor || {})) && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verified</p>
                    <span className={`mt-1 px-3 py-1 inline-flex text-base font-semibold rounded-full shadow ${((vendor as any).isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500')}`}>{(vendor as any).isVerified ? 'Yes' : 'No'}</span>
                  </div>
                )}
              </div>
            </section>
            {/* Shipping Address */}
            <section className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 rounded-2xl border border-yellow-100 shadow mb-6 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 text-2xl font-bold shadow">
                  <svg xmlns='http://www.w3.org/2000/svg' className='h-7 w-7' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 0c-3.866 0-7 2.239-7 5v2a1 1 0 001 1h12a1 1 0 001-1v-2c0-2.761-3.134-5-7-5z' /></svg>
                </span>
                <h2 className="text-xl font-bold text-yellow-900">Shipping Address</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2">
                <div className="mb-4">
                  {customer && (
                    <>
                      <p className="text-lg font-bold text-gray-900 mb-1">{customer.displayName}</p>
                      <p className="text-sm text-blue-700 font-medium mb-1">{customer.email}</p>
                      {customer.phoneNumber && <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-800 text-xs font-semibold mb-2">{customer.phoneNumber}</span>}
                    </>
                  )}
                </div>
                <div className="text-gray-700 text-base">
                  {order.shippingAddress.street && <div>{order.shippingAddress.street}</div>}
                  <div>
                    {order.shippingAddress.city && <span>{order.shippingAddress.city}, </span>}
                    {order.shippingAddress.state && <span>{order.shippingAddress.state} - </span>}
                    {order.shippingAddress.zipCode && <span>{order.shippingAddress.zipCode}</span>}
                  </div>
                  {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
                  {order.shippingAddress.phoneNumber && <div className="mt-2 text-sm text-gray-600">Phone: <span className="font-semibold">{order.shippingAddress.phoneNumber}</span></div>}
                </div>
              </div>
            </section>
            {/* Ordered Items */}
            <section className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-8 rounded-2xl border border-yellow-100 shadow mb-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-6">Ordered Items</h2>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center py-3 px-4">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.name}
                        className="h-16 w-16 rounded-md object-cover border border-gray-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
                        No Image
                      </div>
                    )}
                    <div className="ml-4 flex-grow">
                      <p className="text-md font-medium text-gray-900">{item.name} x {item.quantity}</p>
                      <p className="text-sm text-gray-600">₹{item.price.toFixed(2)} each</p>
                      <p className="text-sm text-gray-600">Category: {item.category}</p>
                      <p className="text-sm text-gray-600">Brand: {item.brand}</p>
                      <p className="text-sm text-gray-900 font-semibold mt-1">Subtotal: ₹{(item.price * item.quantity).toFixed(2)}</p>
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