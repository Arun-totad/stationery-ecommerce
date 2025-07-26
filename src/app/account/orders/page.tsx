'use client';

import React, { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Address } from '@/types';
import Link from 'next/link';

function formatDateDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function UserOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoadingOrders(false);
        return;
      }

      try {
        setLoadingOrders(true);
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(ordersQuery);
        const fetchedOrders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let shippingAddress: Address;
          if (typeof data.shippingAddress === 'string') {
            try {
              shippingAddress = JSON.parse(data.shippingAddress) as Address;
            } catch (e) {
              console.error("Failed to parse shipping address string in user orders:", e);
              shippingAddress = { street: '', city: '', state: '', zipCode: '', country: '' } as Address;
            }
          } else {
            shippingAddress = data.shippingAddress as Address;
          }

          return {
            id: doc.id,
            ...data,
            shippingAddress: shippingAddress,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
            estimatedDeliveryDate: data.estimatedDeliveryDate?.toDate ? data.estimatedDeliveryDate.toDate() : (data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : undefined),
          };
        }) as Order[];

        setOrders(fetchedOrders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (authLoading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-900">
        Please log in to view your orders.
      </div>
    );
  }

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

  // Status badge color
  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    default: 'bg-gray-100 text-gray-800',
  };

  return (
    <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Your Orders</h1>

          {orders.length === 0 ? (
            <div className="text-center text-gray-600 p-8 bg-white rounded-lg shadow">
              <p className="text-lg mb-4">You haven't placed any orders yet.</p>
              <Link href="/products">
                <button className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col md:flex-row md:items-center md:justify-between border border-gray-100 transition-transform hover:scale-[1.01] hover:shadow-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                      <Link href={`/account/orders/${order.id}`} className="text-blue-700 hover:underline text-lg font-semibold truncate">
                        {order.orderNumber || order.id}
                      </Link>
                      <span className={`flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusColor[order.status] || statusColor.default}`}> 
                        {statusIcon[order.status] || statusIcon.default}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    {/* Product Overview */}
                    <div className="flex flex-col gap-1 mb-4">
                      <div className="text-xs font-semibold text-gray-500 mb-1">Products:</div>
                      <div className="flex flex-wrap gap-3 items-center">
                        {order.items && order.items.length > 0 ? (
                          order.items.slice(0, 4).map((item, idx) => (
                            <Link key={item.id + idx} href={`/products/${item.id}`} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 shadow-sm hover:bg-blue-50 transition-colors" title={item.name} prefetch={false}>
                              {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.name} className="h-12 w-12 rounded object-cover border border-gray-200" />
                              ) : (
                                <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No Img</div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-800 font-medium truncate max-w-[100px]">{item.name}</span>
                                <span className="text-xs text-gray-500 font-bold">x{item.quantity}</span>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No products</span>
                        )}
                        {order.items && order.items.length > 4 && (
                          <span className="text-xs text-gray-500 ml-2">+{order.items.length - 4} more</span>
                        )}
                      </div>
                    </div>
                    {/* End Product Overview */}
                  </div>
                  <div className="flex flex-col gap-2 items-start md:items-end min-w-[180px] mt-6 md:mt-0">
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium mr-2">Total:</span>
                      <span className="text-xl font-bold text-gray-900">₹{order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="font-medium mr-2">Placed on:</span>
                      <span>{formatDateDDMMYYYY(order.createdAt)}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Link href={`/account/orders/${order.id}`}>
                        <button className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                          View Details
                        </button>
                      </Link>
                      <Link href={`/account/support/new?orderId=${order.id}`}>
                        <button className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>
                          Create Support Ticket
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 