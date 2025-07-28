'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { FaSearch, FaFilter, FaEye } from 'react-icons/fa';
import { calculateServiceFee } from '@/lib/fees';

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'orders'), where('vendorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetched: Order[] = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        setOrders(fetched);
      } catch (error) {
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  // Filtered orders based on search and status
  const filteredOrders = orders.filter((order) => {
    const orderNumber = order.orderNumber || order.id;
    const customer = order.customerName || order.userId;
    const matchesSearch =
      orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (customer && customer.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter ? order.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <VendorDashboardNav />
      <div className="min-h-screen bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] px-2 py-10 sm:px-4">
        <div className="animate-fade-in-up mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-2xl sm:p-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-gray-900">
                <span>My Orders</span>
              </h1>
              <p className="text-sm text-gray-500">View and manage all your recent orders here.</p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search by Order ID or Customer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400">
                  <FaFilter />
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-w-[120px] appearance-none rounded-full border border-gray-200 bg-gray-50 py-2 pr-8 pl-12 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  style={{
                    backgroundPosition: 'right 0.75rem center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="animate-fade-in-up py-10 text-center text-gray-500">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="animate-fade-in-up py-10 text-center text-gray-500">
              No orders found.
            </div>
          ) : (
            <div className="animate-fade-in-up overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-2xl bg-white shadow-lg">
                <thead className="bg-gradient-to-r from-blue-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredOrders.map((order, idx) => {
                    const orderNumber =
                      order.orderNumber ||
                      `ORD-2024-${String(orders.length - idx).padStart(4, '0')}`;
                    const statusColors: Record<string, string> = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      processing: 'bg-blue-100 text-blue-800',
                      shipped: 'bg-purple-100 text-purple-800',
                      delivered: 'bg-green-100 text-green-800',
                      cancelled: 'bg-red-100 text-red-800',
                    };
                    return (
                      <tr key={order.id} className="group transition hover:bg-blue-50/40">
                        <td className="px-6 py-4 font-semibold whitespace-nowrap text-blue-700 group-hover:underline">
                          <Link href={`/vendor/orders/${order.id}`}>{orderNumber}</Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {order.customerName || order.userId}
                        </td>
                        <td className="px-6 py-4 font-bold whitespace-nowrap text-gray-900">
                          {(() => {
                            const deliveryFee =
                              typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
                            const serviceFee =
                              typeof order.serviceFee === 'number' ? order.serviceFee : 0;
                            const receivable = order.total - deliveryFee - serviceFee;
                            return `₹${receivable.toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs font-bold shadow-sm ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}
                          >
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/vendor/orders/${order.id}`}>
                            <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-4 py-1 font-semibold text-white shadow transition-all hover:scale-105">
                              <FaEye className="text-sm" /> View
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
