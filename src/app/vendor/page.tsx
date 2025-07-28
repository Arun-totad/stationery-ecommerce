'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Order } from '@/types';
import Link from 'next/link';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { PlusIcon } from '@heroicons/react/24/solid';

function formatDateDDMMYYYY(date: Date | string | number | undefined | null): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function VendorPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch vendor's products
        const productsQuery = query(collection(db, 'products'), where('vendorId', '==', user.uid));
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        // Fetch vendor's orders
        const ordersQuery = query(collection(db, 'orders'), where('vendorId', '==', user.uid));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          };
        }) as Order[];

        setProducts(productsData);
        setOrders(ordersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <>
      <VendorDashboardNav />
      <ProtectedRoute allowedRoles={['vendor']}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-6 sm:py-10">
          <div className="mx-auto max-w-5xl px-2 sm:px-4 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="bg-gradient-to-r from-blue-600 via-pink-500 to-yellow-400 bg-clip-text text-3xl font-extrabold text-transparent drop-shadow">
                Vendor Dashboard
              </h1>
              <div className="w-full sm:w-auto">
                <Link
                  href="/vendor/products/new"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 sm:w-auto"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add New Product
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="mt-8 flex justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="mt-8 w-full space-y-10">
                {/* Quick Stats */}
                <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    {
                      label: 'Total Products',
                      value: products.length,
                    },
                    {
                      label: 'Total Orders',
                      value: orders.length,
                    },
                    {
                      label: 'Total Revenue',
                      value: `₹${orders.reduce((sum, order) => sum + order.total, 0)}`,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/60 bg-white p-8 text-center shadow-xl"
                    >
                      <div className="text-4xl font-extrabold text-gray-900 drop-shadow-sm">
                        {stat.value}
                      </div>
                      <div className="mt-2 font-medium text-gray-500">{stat.label}</div>
                    </div>
                  ))}
                </section>
                {/* Products Section */}
                <section>
                  <h2 className="mb-4 text-xl font-semibold">
                    Your Products{' '}
                    <span className="ml-2 align-middle text-base font-bold text-blue-600">
                      ({products.length})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {products.length > 0 ? (
                      products.map((product) => (
                        <div
                          key={product.id}
                          className="group flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-md transition-all"
                        >
                          {/* Product image or icon */}
                          <div className="mb-2 flex items-center gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50 shadow-sm transition-all group-hover:shadow-md">
                              {product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-6 w-6 text-gray-300"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 4.5v15m7.5-7.5h-15"
                                  />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="mb-0.5 max-w-[8rem] truncate text-base font-bold text-gray-900">
                                {product.name}
                              </div>
                              <div className="mb-0.5 text-sm font-semibold text-blue-600">
                                ₹{product.price}
                              </div>
                              <div className="text-xs text-gray-400">Stock: {product.stock}</div>
                            </div>
                          </div>
                          <div className="mt-auto flex justify-end">
                            <Link
                              href={`/vendor/products/${product.id}/edit`}
                              className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-300 focus:outline-none"
                            >
                              Edit
                            </Link>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center rounded-2xl bg-white p-8 text-center text-gray-400 shadow">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="mb-2 h-10 w-10"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                        No products found.
                      </div>
                    )}
                  </div>
                </section>
                {/* Orders Section */}
                <section>
                  <h2 className="mb-4 text-xl font-semibold">
                    Pending Orders{' '}
                    <span className="ml-2 align-middle text-base font-bold text-pink-600">
                      (
                      {
                        orders.filter(
                          (order) => order.status !== 'delivered' && order.status !== 'cancelled'
                        ).length
                      }
                      )
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {orders.length > 0 ? (
                      orders
                        .filter(
                          (order) => order.status !== 'delivered' && order.status !== 'cancelled'
                        )
                        .map((order) => {
                          const subtotal = order.items.reduce(
                            (sum, item) => sum + item.price * item.quantity,
                            0
                          );
                          let deliverBy = null;
                          if (order.estimatedDeliveryDate) {
                            deliverBy =
                              order.estimatedDeliveryDate instanceof Date
                                ? order.estimatedDeliveryDate
                                : new Date(order.estimatedDeliveryDate);
                          } else if (order.createdAt) {
                            const d = new Date(order.createdAt);
                            d.setDate(d.getDate() + 3);
                            deliverBy = d;
                          }
                          let paymentMethod = order.paymentMethod;
                          if (paymentMethod.toLowerCase() === 'cod')
                            paymentMethod = 'Cash on Delivery';
                          else if (paymentMethod.toLowerCase() === 'razorpay')
                            paymentMethod = 'Razorpay (Card/UPI/Netbanking)';
                          else
                            paymentMethod =
                              paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
                          const deliverByDisplay = deliverBy
                            ? `Deliver by: ${formatDateDDMMYYYY(deliverBy)}`
                            : '—';
                          return (
                            <div
                              key={order.id}
                              className="flex h-full flex-col justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-lg"
                            >
                              <div className="mb-2 flex flex-wrap items-center gap-3">
                                <Link
                                  href={`/vendor/orders/${order.id}`}
                                  className="text-lg font-extrabold tracking-wide text-blue-600 hover:underline"
                                >
                                  {order.orderNumber || order.id.slice(-6)}
                                </Link>
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${
                                    order.status === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : order.status === 'processing'
                                        ? 'bg-blue-100 text-blue-800'
                                        : order.status === 'shipped'
                                          ? 'bg-purple-100 text-purple-800'
                                          : order.status === 'delivered'
                                            ? 'bg-green-100 text-green-800'
                                            : order.status === 'cancelled'
                                              ? 'bg-red-100 text-red-800'
                                              : 'bg-gray-100 text-gray-800'
                                  } `}
                                >
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="flex items-center gap-1 font-semibold text-gray-900">
                                  <span className="text-lg text-blue-500">+</span> Customer:
                                </span>
                                <span className="ml-1 font-bold">
                                  {order.customerName || order.shippingAddress?.street || 'N/A'}
                                </span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="flex items-center gap-1 font-semibold text-gray-900">
                                  <span className="text-lg text-green-500">+</span> Deliver by:
                                </span>
                                <span className="ml-1">
                                  {order.createdAt
                                    ? formatDateDDMMYYYY(
                                        new Date(
                                          new Date(order.createdAt).setDate(
                                            new Date(order.createdAt).getDate() + 3
                                          )
                                        )
                                      )
                                    : '—'}
                                </span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="flex items-center gap-1 font-semibold text-gray-900">
                                  <span className="text-lg text-pink-500">+</span> Payment:
                                </span>
                                <span className="ml-1">{paymentMethod}</span>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-2xl font-extrabold text-blue-600">
                                ${subtotal.toFixed(2)}
                                <span className="text-sm font-medium text-gray-500">
                                  Order Total
                                </span>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Link href={`/vendor/orders/${order.id}`}>
                                  <button className="rounded-lg bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-2 text-base font-semibold text-white shadow transition-all hover:from-blue-600 hover:to-pink-500">
                                    View Details
                                  </button>
                                </Link>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="col-span-full flex flex-col items-center py-8 text-center text-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="mb-2 h-10 w-10"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3h18M9 3v18m6-18v18"
                          />
                        </svg>
                        No recent orders found.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    </>
  );
}
