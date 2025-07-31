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
        const fetchedOrders = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          let shippingAddress: Address;
          if (typeof data.shippingAddress === 'string') {
            try {
              shippingAddress = JSON.parse(data.shippingAddress) as Address;
            } catch (e) {
              console.error('Failed to parse shipping address string in user orders:', e);
              shippingAddress = {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
              } as Address;
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
            estimatedDeliveryDate: data.estimatedDeliveryDate?.toDate
              ? data.estimatedDeliveryDate.toDate()
              : data.estimatedDeliveryDate
                ? new Date(data.estimatedDeliveryDate)
                : undefined,
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-900">
        Please log in to view your orders.
      </div>
    );
  }

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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">Your Orders</h1>

          {orders.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center text-gray-600 shadow">
              <p className="mb-4 text-lg">You haven't placed any orders yet.</p>
              <Link href="/products">
                <button className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700">
                  Start Shopping
                </button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col rounded-2xl border border-gray-100 bg-white p-8 shadow-lg transition-transform hover:scale-[1.01] hover:shadow-xl md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="truncate text-lg font-semibold text-blue-700 hover:underline"
                      >
                        {order.orderNumber || order.id}
                      </Link>
                      <span
                        className={`flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusColor[order.status] || statusColor.default}`}
                      >
                        {statusIcon[order.status] || statusIcon.default}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    {/* Product Overview */}
                    <div className="mb-4 flex flex-col gap-1">
                      <div className="mb-1 text-xs font-semibold text-gray-500">Products:</div>
                      <div className="flex flex-wrap items-center gap-3">
                        {order.items && order.items.length > 0 ? (
                          order.items.slice(0, 4).map((item, idx) => (
                            <Link
                              key={item.id + idx}
                              href={`/products/${item.id}`}
                              className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 shadow-sm transition-colors hover:bg-blue-50"
                              title={item.name}
                              prefetch={false}
                            >
                              {item.images && item.images.length > 0 ? (
                                <img
                                  src={item.images[0]}
                                  alt={item.name}
                                  className="h-12 w-12 rounded border border-gray-200 object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded bg-gray-200 text-xs text-gray-400">
                                  No Img
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="max-w-[100px] truncate text-sm font-medium text-gray-800">
                                  {item.name}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                  x{item.quantity}
                                </span>
                              </div>
                            </Link>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No products</span>
                        )}
                        {order.items && order.items.length > 4 && (
                          <span className="ml-2 text-xs text-gray-500">
                            +{order.items.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                    {/* End Product Overview */}
                  </div>
                  <div className="mt-6 flex min-w-[180px] flex-col items-start gap-2 md:mt-0 md:items-end">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 font-medium">Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                    {order.discountAmount && order.discountAmount > 0 && (
                      <div className="flex items-center text-green-600">
                        <span className="mr-2 text-xs font-medium">Coupon:</span>
                        <span className="text-sm font-semibold">
                          {order.couponCode} (-${order.discountAmount.toFixed(2)})
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2 font-medium">Placed on:</span>
                      <span>{formatDateDDMMYYYY(order.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Link href={`/account/orders/${order.id}`}>
                        <button className="flex items-center gap-1 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path d="M15 12H9m12 0A9 9 0 11 3 12a9 9 0 0118 0z" />
                          </svg>
                          View Details
                        </button>
                      </Link>
                      <Link href={`/account/support/new?orderId=${order.id}`}>
                        <button className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          <svg
                            className="h-4 w-4"
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
