'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Vendor, Product, Order, Transaction } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import Link from 'next/link';

export default function AdminPage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportTickets, setSupportTickets] = useState<Record<string, { id: string, ticketNumber?: string } | null>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [productVendorSort, setProductVendorSort] = useState<'asc' | 'desc' | null>(null);
  const [vendorProductSort, setVendorProductSort] = useState<Record<string, {field: 'name' | 'price' | 'stock', direction: 'asc' | 'desc'}>>({});
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch all users, products, orders, and transactions for dashboard
        const [usersSnapshot, productsSnapshot, ordersSnapshot, transactionsSnapshot, ticketsSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'users'))),
          getDocs(query(collection(db, 'products'))),
          getDocs(query(collection(db, 'orders'))),
          getDocs(query(collection(db, 'transactions'))),
          getDocs(query(collection(db, 'supportTickets'))),
        ]);

        const fetchedUsers: User[] = usersSnapshot.docs.map(doc => ({
          ...(doc.data() as User),
          uid: doc.id,
        }));
        const fetchedProducts: Product[] = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAt: Date;
          let updatedAt: Date;
          if (data.createdAt && typeof data.createdAt === 'object' && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else {
            createdAt = new Date(data.createdAt);
          }
          if (data.updatedAt && typeof data.updatedAt === 'object' && typeof data.updatedAt.toDate === 'function') {
            updatedAt = data.updatedAt.toDate();
          } else {
            updatedAt = new Date(data.updatedAt);
          }
          return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            stock: data.stock || 0,
            category: data.category || '',
            brand: data.brand || '',
            images: data.images || [],
            vendorId: data.vendorId || '',
            createdAt,
            updatedAt,
          } as Product;
        });
        const fetchedOrders: Order[] = ordersSnapshot.docs.map(doc => {
          const data = doc.data() as Omit<Order, 'id'>;
          return {
            id: doc.id,
            ...data,
            createdAt: (data.createdAt && typeof data.createdAt === 'object' && 'toDate' in data.createdAt) ? (data.createdAt as any).toDate() : new Date(data.createdAt),
            updatedAt: (data.updatedAt && typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt) ? (data.updatedAt as any).toDate() : new Date(data.updatedAt),
            estimatedDeliveryDate: (data.estimatedDeliveryDate && typeof data.estimatedDeliveryDate === 'object' && 'toDate' in data.estimatedDeliveryDate) ? (data.estimatedDeliveryDate as any).toDate() : (data.estimatedDeliveryDate ? new Date(data.estimatedDeliveryDate) : null),
          };
        });
        const fetchedTransactions: Transaction[] = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<Transaction, 'id'>,
          transactionDate: doc.data().transactionDate?.toDate ? doc.data().transactionDate.toDate() : new Date(doc.data().transactionDate),
        }));
        // Map orderId to support ticket (first ticket found for each order)
        const ticketMap: Record<string, { id: string, ticketNumber?: string } | null> = {};
        ticketsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.orderId) {
            if (!ticketMap[data.orderId]) {
              ticketMap[data.orderId] = { id: doc.id, ticketNumber: data.ticketNumber };
            }
          }
        });
        setSupportTickets(ticketMap);

        setUsers(fetchedUsers);
        setProducts(fetchedProducts);
        setOrders(fetchedOrders);
        setTransactions(fetchedTransactions);
      } catch (error) {
        toast.error('Failed to load admin data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentView]);

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  // Add a helper function at the top of the component
  function formatDateSafe(date: any): string {
    if (!date) return 'N/A';
    let d: Date;
    if (date instanceof Date) d = date;
    else if (date && typeof date === 'object' && 'toDate' in date) d = (date as any).toDate();
    else d = new Date(date);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  }

  // Helper functions for chart data and colors
  function getUserGrowthData(users: User[]) {
    // Group users by join date (day)
    const dateMap: Record<string, number> = {};
    users.forEach(u => {
      let d: Date;
      if (u.createdAt instanceof Date) d = u.createdAt;
      else if (u.createdAt && typeof u.createdAt === 'object' && typeof (u.createdAt as any).toDate === 'function') d = (u.createdAt as any).toDate();
      else d = new Date(u.createdAt);
      const dateStr = d.toLocaleDateString();
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });
    // Cumulative sum
    const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    let cumulative = 0;
    return sortedDates.map(date => {
      cumulative += dateMap[date];
      return { date, count: cumulative };
    });
  }
  const orderStatusColors = ['#3B82F6', '#F472B6', '#FBBF24', '#10B981', '#6366F1', '#F59E42'];
  function getOrderStatusData(orders: Order[]) {
    const statusMap: Record<string, number> = {};
    orders.forEach(o => {
      statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-100 py-10">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 bg-white p-8 rounded-lg shadow-md text-gray-900">
          {/* Dashboard Overview Cards */}
          {!currentView && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-2xl shadow p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-blue-700">{users.length}</span>
                  <span className="mt-2 text-lg font-medium text-blue-900">Total Users</span>
                </div>
                <div className="bg-gradient-to-br from-pink-100 to-pink-300 rounded-2xl shadow p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-pink-700">{users.filter(u => u.role === 'vendor').length}</span>
                  <span className="mt-2 text-lg font-medium text-pink-900">Vendors</span>
                </div>
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-2xl shadow p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-yellow-700">{orders.length}</span>
                  <span className="mt-2 text-lg font-medium text-yellow-900">Orders</span>
                </div>
                <div className="bg-gradient-to-br from-green-100 to-green-300 rounded-2xl shadow p-6 flex flex-col items-center">
                  <span className="text-3xl font-bold text-green-700">₹{orders.reduce((sum, o) => sum + (o.serviceFee || 0), 0).toLocaleString()}</span>
                  <span className="mt-2 text-lg font-medium text-green-900">Revenue</span>
                </div>
              </div>
              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                {/* User Growth Line Chart */}
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-blue-900">User Growth</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={getUserGrowthData(users)}>
                      <XAxis dataKey="date"/>
                      <YAxis allowDecimals={false}/>
                      <Tooltip/>
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {/* Order Status Pie Chart */}
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4 text-pink-900">Order Status Breakdown</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={getOrderStatusData(orders)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        {getOrderStatusData(orders).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={orderStatusColors[idx % orderStatusColors.length]} />
                        ))}
                      </Pie>
                      <Legend/>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Recent Orders Table */}
              <div className="bg-white rounded-2xl shadow p-6 mb-10">
                <h3 className="text-lg font-semibold mb-4 text-yellow-900">Recent Orders</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Order Number</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Support Ticket</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-100">
                          <td className="px-6 py-3 whitespace-nowrap text-base font-medium text-blue-700">
                            {order.orderNumber || (order.id ? `ORD-2024-${order.id.slice(-4).toUpperCase()}` : 'ORD-2024-XXXX')}
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{order.customerName || order.userId}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">₹{order.total?.toFixed(2)}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700 capitalize">{order.status}</td>
                          <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{formatDateSafe(order.createdAt)}</td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            {supportTickets[order.id] ? (
                              <Link
                                href={`/admin/support/${supportTickets[order.id]!.id}`}
                                className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-pink-100 text-pink-800 hover:bg-pink-200 transition cursor-pointer"
                              >
                                {supportTickets[order.id]!.ticketNumber || supportTickets[order.id]!.id.slice(-6).toUpperCase()}
                              </Link>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">No support ticket</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-8 w-full">
              {currentView === 'products' && products.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-lg">📦</span>
                    Products by Vendor
                    <span className="ml-2 inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-base font-semibold">{products.length}</span>
                  </h2>
                  {/* Search input for products */}
                  <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                      <input
                        type="text"
                        className="pl-10 pr-4 py-2 w-full rounded-xl bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 border border-gray-200 shadow focus:ring-2 focus:ring-yellow-400 focus:bg-white transition"
                        placeholder="Search products by name, category, brand, or vendor..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-8">
                    {users.filter(u => u.role === 'vendor').map(vendor => {
                      const vendorProducts = products.filter(product => product.vendorId === vendor.uid && (
                        product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        vendor.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      ));
                      if (vendorProducts.length === 0) return null;
                      // Sorting logic for this vendor
                      const sortConfig = vendorProductSort[vendor.uid] || {field: 'name', direction: 'asc'};
                      const sortedProducts = [...vendorProducts].sort((a, b) => {
                        if (!sortConfig.field) return 0;
                        let valA = a[sortConfig.field as 'name' | 'price' | 'stock'];
                        let valB = b[sortConfig.field as 'name' | 'price' | 'stock'];
                        if (typeof valA === 'string' && typeof valB === 'string') {
                          if (sortConfig.direction === 'asc') return valA.localeCompare(valB);
                          return valB.localeCompare(valA);
                        }
                        if (typeof valA === 'number' && typeof valB === 'number') {
                          if (sortConfig.direction === 'asc') return valA - valB;
                          return valB - valA;
                        }
                        return 0;
                      });
                      const handleSort = (field: 'name' | 'price' | 'stock') => {
                        setVendorProductSort(prev => ({
                          ...prev,
                          [vendor.uid]: {
                            field,
                            direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc',
                          },
                        }));
                      };
                      return (
                        <div key={vendor.uid} className="bg-white rounded-3xl shadow-xl p-6 border border-yellow-100">
                          <div className="flex items-center gap-4 mb-4">
                            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-2xl font-bold shadow">{vendor.displayName ? vendor.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'V'}</span>
                            <div>
                              <div className="text-xl font-bold text-gray-900">{vendor.displayName || 'N/A'}</div>
                              <div className="text-sm text-gray-600">{vendor.email || 'N/A'} &bull; {('shopAddress' in vendor ? (vendor as any).shopAddress : 'N/A')}</div>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead>
                                <tr className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50">
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest rounded-tl-2xl cursor-pointer select-none" onClick={() => handleSort('name')}>Name{sortConfig.field === 'name' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}</th>
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest cursor-pointer select-none" onClick={() => handleSort('price')}>Price{sortConfig.field === 'price' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}</th>
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest cursor-pointer select-none" onClick={() => handleSort('stock')}>Stock{sortConfig.field === 'stock' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}</th>
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Category</th>
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Brand</th>
                                  <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest rounded-tr-2xl">Created At</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {sortedProducts.map(product => (
                                  <tr
                                    key={product.id}
                                    className="cursor-pointer hover:bg-yellow-50 transition-all duration-200 group"
                                    onClick={() => router.push(`/admin/products/${product.id}`)}
                                  >
                                    <td className="px-6 py-3 whitespace-nowrap flex items-center gap-3 font-medium text-gray-900">
                                      <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-lg font-bold shadow group-hover:scale-105 transition-transform">
                                        {product.name ? product.name[0].toUpperCase() : 'P'}
                                      </span>
                                      <span>{product.name}</span>
                                    </td>
                                    <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">₹{product.price.toFixed(2)}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{product.stock}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{product.category}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{product.brand}</td>
                                    <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{
                                      product.createdAt && typeof product.createdAt === 'object' && 'toDate' in product.createdAt
                                        ? (product.createdAt as any).toDate().toLocaleDateString()
                                        : product.createdAt
                                          ? new Date(product.createdAt).toLocaleDateString()
                                          : "N/A"
                                    }</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {currentView === 'orders' && orders.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-lg">📦</span>
                    Orders
                    <span className="ml-2 inline-block bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-base font-semibold">{orders.length}</span>
                  </h2>
                  {/* Search bar for orders */}
                  <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                      <input
                        type="text"
                        className="pl-10 pr-4 py-2 w-full rounded-xl bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 border border-gray-200 shadow focus:ring-2 focus:ring-yellow-400 focus:bg-white transition"
                        placeholder="Search orders by number, customer, or vendor..."
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-yellow-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50">
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest rounded-tl-2xl">Order Number</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Customer</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Vendor</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Total</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest">Support Ticket</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-yellow-900 uppercase tracking-widest rounded-tr-2xl">Created</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {orders
                            .filter(order => {
                              const q = orderSearch.toLowerCase();
                              return (
                                (order.orderNumber || '').toLowerCase().includes(q) ||
                                (order.customerName || '').toLowerCase().includes(q) ||
                                (order.userId || '').toLowerCase().includes(q) ||
                                (order.vendorId || '').toLowerCase().includes(q)
                              );
                            })
                            .map((order) => (
                              <tr
                                key={order.id}
                                className="cursor-pointer hover:bg-yellow-50 transition-all duration-200 group"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                              >
                                <td className="px-6 py-3 whitespace-nowrap font-bold text-yellow-900">
                                  {order.orderNumber || (order.id ? `ORD-2024-${order.id.slice(-4).toUpperCase()}` : 'ORD-2024-XXXX')}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{order.customerName || order.userId}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{
                                  users.find(u => u.uid === order.vendorId)?.displayName || order.vendorId || 'N/A'
                                }</td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">₹{order.total?.toFixed(2)}</td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                                    order.status === 'delivered'
                                      ? 'bg-green-100 text-green-800'
                                      : order.status === 'cancelled'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {order.status}
                                  </span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  {supportTickets[order.id] ? (
                                    <Link
                                      href={`/admin/support/${supportTickets[order.id]!.id}`}
                                      className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-pink-100 text-pink-800 hover:bg-pink-200 transition cursor-pointer"
                                    >
                                      {supportTickets[order.id]!.ticketNumber || supportTickets[order.id]!.id.slice(-6).toUpperCase()}
                                    </Link>
                                  ) : (
                                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">No support ticket</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{formatDateSafe(order.createdAt)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {currentView === 'transactions' && transactions.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Transactions</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-2xl shadow-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">Transaction ID</th>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">User ID</th>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">Amount</th>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">Type</th>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">Status</th>
                          <th className="px-6 py-4 text-left text-lg font-bold text-gray-700 uppercase tracking-wide">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 even:bg-gray-50">
                        {transactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-100">
                            <td className="px-6 py-3 whitespace-nowrap text-base font-medium text-gray-900">{transaction.id}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700 truncate max-w-xs">{transaction.userId}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">₹{transaction.amount.toFixed(2)}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700 capitalize">{transaction.type}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700 capitalize">{transaction.status}</td>
                            <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">
                              {formatDateSafe(transaction.transactionDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {currentView === 'users' && users.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-lg">👥</span>
                    Users
                    <span className="ml-2 inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-base font-semibold">{users.length}</span>
                  </h2>
                  {/* Search input and Role filter */}
                  <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="relative w-full max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                      <input
                        type="text"
                        className="pl-10 pr-4 py-2 w-full rounded-xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 border border-gray-200 shadow focus:ring-2 focus:ring-blue-400 focus:bg-white transition"
                        placeholder="Search users by name, email, or phone..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="w-full max-w-xs md:ml-2">
                      <select
                        className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 border border-gray-200 shadow focus:ring-2 focus:ring-blue-400 transition"
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                      >
                        <option value="all">All Roles</option>
                        <option value="customer">Customer</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                        <option value="admin-manager">Admin Manager</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 transition-all duration-300 hover:shadow-blue-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50">
                            <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest rounded-tl-2xl">Name</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Email</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Phone</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest">Role</th>
                            <th className="px-6 py-4 text-left text-base font-extrabold text-blue-900 uppercase tracking-widest rounded-tr-2xl">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {users
                            .filter(user => {
                              const q = searchQuery.toLowerCase();
                              const matchesSearch =
                                user.displayName?.toLowerCase().includes(q) ||
                                user.email?.toLowerCase().includes(q) ||
                                user.phoneNumber?.toLowerCase().includes(q);
                              const matchesRole =
                                roleFilter === 'all' ? true : user.role === roleFilter;
                              return matchesSearch && matchesRole;
                            })
                            .map((user) => (
                              <tr
                                key={user.uid}
                                className="cursor-pointer hover:bg-blue-50 transition-all duration-200 group"
                                onClick={() => handleRowClick(user.uid)}
                              >
                                <td className="px-6 py-3 whitespace-nowrap flex items-center gap-3 font-medium text-gray-900">
                                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-pink-200 text-lg font-bold shadow group-hover:scale-105 transition-transform">
                                    {user.displayName ? user.displayName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
                                  </span>
                                  <span>{user.displayName || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{user.email || 'N/A'}</td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{user.phoneNumber || 'N/A'}</td>
                                <td className="px-6 py-3 whitespace-nowrap">
                                  <span className={`px-3 py-1 rounded-full text-sm font-semibold
                                    ${user.role === 'admin-manager'
                                      ? 'bg-purple-100 text-purple-700'
                                      : user.role === 'admin'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : user.role === 'vendor'
                                          ? 'bg-pink-100 text-pink-700'
                                          : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {user.role.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  </span>
                                </td>
                                <td className="px-6 py-3 whitespace-nowrap text-base text-gray-700">{formatDateSafe(user.createdAt)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {((currentView === 'users' && users.length === 0) || 
                (currentView === 'products' && products.length === 0) ||
                (currentView === 'orders' && orders.length === 0) ||
                (currentView === 'transactions' && transactions.length === 0))
                && currentView !== null && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <span className="text-4xl mb-2">🗒️</span>
                  <span>No {currentView} found.</span>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 