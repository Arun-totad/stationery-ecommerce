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
        const productsQuery = query(
          collection(db, 'products'),
          where('vendorId', '==', user.uid)
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];

        // Fetch vendor's orders
        const ordersQuery = query(
          collection(db, 'orders'),
          where('vendorId', '==', user.uid)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => {
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
          <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-pink-500 to-yellow-400 bg-clip-text text-transparent drop-shadow">Vendor Dashboard</h1>
              <div className="w-full sm:w-auto">
                <Link
                  href="/vendor/products/new"
                  className="flex w-full sm:w-auto items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition font-semibold text-base focus:ring-2 focus:ring-blue-400"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add New Product
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center mt-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="mt-8 space-y-10 w-full">
                {/* Quick Stats */}
                <section className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3">
                  {[{
                    label: 'Total Products',
                    value: products.length,
                  }, {
                    label: 'Total Orders',
                    value: orders.length,
                  }, {
                    label: 'Total Revenue',
                    value: `₹${orders.reduce((sum, order) => sum + order.total, 0)}`,
                  }].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white rounded-2xl shadow-xl p-8 text-center border border-white/60"
                    >
                      <div className="text-4xl font-extrabold text-gray-900 drop-shadow-sm">{stat.value}</div>
                      <div className="text-gray-500 mt-2 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </section>
                {/* Products Section */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">
                    Your Products <span className="ml-2 text-base font-bold text-blue-600 align-middle">({products.length})</span>
                  </h2>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {products.length > 0 ? products.map((product) => (
                      <div
                        key={product.id}
                        className="flex flex-col justify-between bg-white border border-gray-100 rounded-2xl shadow-md p-4 transition-all group h-full"
                      >
                        {/* Product image or icon */}
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                            {product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-12 w-12 object-cover rounded-full"
                              />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-base text-gray-900 mb-0.5 truncate max-w-[8rem]">{product.name}</div>
                            <div className="text-blue-600 font-semibold text-sm mb-0.5">₹{product.price}</div>
                            <div className="text-gray-400 text-xs">Stock: {product.stock}</div>
                          </div>
                        </div>
                        <div className="mt-auto flex justify-end">
                          <Link
                            href={`/vendor/products/${product.id}/edit`}
                            className="bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white text-blue-700 px-3 py-1.5 rounded-lg transition text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          >
                            Edit
                          </Link>
                        </div>
                      </div>
                    )) : (
                      <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-400 flex flex-col items-center col-span-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        No products found.
                      </div>
                    )}
                  </div>
                </section>
                {/* Orders Section */}
                <section>
                  <h2 className="text-xl font-semibold mb-4">
                    Pending Orders <span className="ml-2 text-base font-bold text-pink-600 align-middle">({orders.filter(order => order.status !== 'delivered' && order.status !== 'cancelled').length})</span>
                  </h2>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {orders.length > 0 ? (
                      orders
                        .filter(order => order.status !== 'delivered' && order.status !== 'cancelled')
                        .map((order) => {
                          const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                          let deliverBy = null;
                          if (order.estimatedDeliveryDate) {
                            deliverBy = order.estimatedDeliveryDate instanceof Date
                              ? order.estimatedDeliveryDate
                              : new Date(order.estimatedDeliveryDate);
                          } else if (order.createdAt) {
                            const d = new Date(order.createdAt);
                            d.setDate(d.getDate() + 3);
                            deliverBy = d;
                          }
                          let paymentMethod = order.paymentMethod;
                          if (paymentMethod.toLowerCase() === 'cod') paymentMethod = 'Cash on Delivery';
                          else if (paymentMethod.toLowerCase() === 'razorpay') paymentMethod = 'Razorpay (Card/UPI/Netbanking)';
                          else paymentMethod = paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
                          const deliverByDisplay = deliverBy ? `Deliver by: ${formatDateDDMMYYYY(deliverBy)}` : '—';
                          return (
                            <div
                              key={order.id}
                              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col justify-between h-full"
                            >
                              <div className="flex items-center gap-3 flex-wrap mb-2">
                                <Link href={`/vendor/orders/${order.id}`} className="text-lg font-extrabold text-blue-600 hover:underline tracking-wide">
                                  {order.orderNumber || order.id.slice(-6)}
                                </Link>
                                <span
                                  className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full shadow-sm
                                    ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800'
                                    : order.status === 'processing' ? 'bg-blue-100 text-blue-800'
                                    : order.status === 'shipped' ? 'bg-purple-100 text-purple-800'
                                    : order.status === 'delivered' ? 'bg-green-100 text-green-800'
                                    : order.status === 'cancelled' ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'}
                                  `}
                                >
                                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="font-semibold text-gray-900 flex items-center gap-1">
                                  <span className="text-blue-500 text-lg">+</span> Customer:
                                </span>
                                <span className="font-bold ml-1">{order.customerName || order.shippingAddress?.street || 'N/A'}</span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="font-semibold text-gray-900 flex items-center gap-1">
                                  <span className="text-green-500 text-lg">+</span> Deliver by:
                                </span>
                                <span className="ml-1">
                                  {order.createdAt ? formatDateDDMMYYYY(new Date(new Date(order.createdAt).setDate(new Date(order.createdAt).getDate() + 3))) : '—'}
                                </span>
                              </div>
                              <div className="mb-1 flex items-center text-base text-gray-700">
                                <span className="font-semibold text-gray-900 flex items-center gap-1">
                                  <span className="text-pink-500 text-lg">+</span> Payment:
                                </span>
                                <span className="ml-1">{paymentMethod}</span>
                              </div>
                              <div className="mt-2 text-2xl font-extrabold text-blue-600 flex items-center gap-2">
                                ₹{subtotal.toFixed(2)}
                                <span className="text-sm font-medium text-gray-500">Order Total</span>
                              </div>
                              <div className="flex justify-end mt-4">
                                <Link href={`/vendor/orders/${order.id}`}>
                                  <button className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-pink-400 text-white font-semibold shadow hover:from-blue-600 hover:to-pink-500 transition-all text-base">View Details</button>
                                </Link>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center text-gray-400 flex flex-col items-center py-8 col-span-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mb-2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18M9 3v18m6-18v18" />
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