"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import Link from "next/link";
import { toast } from "react-hot-toast";
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { FaSearch, FaFilter, FaEye } from "react-icons/fa";
import { calculateServiceFee } from "@/lib/fees";

export default function VendorOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, "orders"), where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetched: Order[] = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        setOrders(fetched);
      } catch (error) {
        toast.error("Failed to load orders");
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
      <div className="min-h-screen bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] py-10 px-2 sm:px-4">
        <div className="max-w-5xl mx-auto bg-white/90 p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1 flex items-center gap-2">
                <span>My Orders</span>
              </h1>
              <p className="text-gray-500 text-sm">View and manage all your recent orders here.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FaSearch /></span>
                <input
                  type="text"
                  placeholder="Search by Order ID or Customer..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm"
                />
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><FaFilter /></span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="pl-12 pr-8 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm min-w-[120px] appearance-none"
                  style={{ backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat' }}
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
            <div className="text-center py-10 text-gray-500 animate-fade-in-up">Loading...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-10 text-gray-500 animate-fade-in-up">No orders found.</div>
          ) : (
            <div className="overflow-x-auto animate-fade-in-up">
              <table className="min-w-full divide-y divide-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
                <thead className="bg-gradient-to-r from-blue-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredOrders.map((order, idx) => {
                    const orderNumber = order.orderNumber || `ORD-2024-${String(orders.length - idx).padStart(4, '0')}`;
                    const statusColors: Record<string, string> = {
                      pending: 'bg-yellow-100 text-yellow-800',
                      processing: 'bg-blue-100 text-blue-800',
                      shipped: 'bg-purple-100 text-purple-800',
                      delivered: 'bg-green-100 text-green-800',
                      cancelled: 'bg-red-100 text-red-800',
                    };
                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-blue-50/40 group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-blue-700 group-hover:underline">
                          <Link href={`/vendor/orders/${order.id}`}>{orderNumber}</Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">{order.customerName || order.userId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-bold">
                          {(() => {
                            const deliveryFee = typeof order.deliveryFee === 'number' ? order.deliveryFee : 0;
                            const serviceFee = typeof order.serviceFee === 'number' ? order.serviceFee : 0;
                            const receivable = order.total - deliveryFee - serviceFee;
                            return `₹${receivable.toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-gray-200 inline-flex items-center gap-1 ${statusColors[order.status] || 'bg-gray-100 text-gray-700'}`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/vendor/orders/${order.id}`}>
                            <button className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-pink-400 text-white font-semibold shadow hover:scale-105 transition-all flex items-center gap-2"><FaEye className="text-sm" /> View</button>
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