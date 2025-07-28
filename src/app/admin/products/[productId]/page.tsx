'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Order, SupportTicket, Vendor } from '@/types';
import { toast } from 'react-hot-toast';

export default function AdminProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch product
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          toast.error('Product not found.');
          router.push('/admin?view=products');
          return;
        }
        const prod = { id: productSnap.id, ...productSnap.data() } as Product;
        setProduct(prod);
        // Fetch vendor
        if (prod.vendorId) {
          const vendorRef = doc(db, 'users', prod.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            setVendor({ uid: vendorSnap.id, ...vendorSnap.data() } as Vendor);
          }
        }
        // Fetch orders for this product
        const ordersQuery = query(collection(db, 'orders'), where('vendorId', '==', prod.vendorId));
        const ordersSnapshot = await getDocs(ordersQuery);
        const allOrders = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        // Filter orders where any item has this productId
        const productOrders = allOrders.filter((order) =>
          order.items.some((item) => item.id === prod.id)
        );
        setOrders(productOrders);
        // Fetch support tickets for these orders
        if (productOrders.length > 0) {
          const orderIds = productOrders.map((o) => o.id);
          const ticketsQuery = query(
            collection(db, 'supportTickets'),
            where('orderId', 'in', orderIds.slice(0, 10))
          );
          // Firestore 'in' supports max 10 elements
          const ticketsSnapshot = await getDocs(ticketsQuery);
          setTickets(
            ticketsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SupportTicket[]
          );
        } else {
          setTickets([]);
        }
      } catch (error) {
        toast.error('Failed to load product details.');
        router.push('/admin?view=products');
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [productId, router]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center text-gray-900">
          Product details not available.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="flex min-h-[80vh] flex-col items-center justify-center bg-gray-100 py-10">
        <div className="animate-fade-in flex w-full max-w-2xl flex-col items-center rounded-3xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 text-3xl font-bold text-white shadow-lg">
              {product.name ? product.name[0].toUpperCase() : 'P'}
            </div>
            <h1 className="mb-1 text-3xl font-extrabold text-gray-900">{product.name}</h1>
            <span className="rounded-full bg-yellow-100 px-4 py-1 text-base font-semibold text-yellow-700">
              Product
            </span>
          </div>
          <div className="w-full space-y-5">
            <div className="mb-6 rounded-3xl border border-yellow-100 bg-white/70 p-7 shadow-xl backdrop-blur-md">
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500">Price</div>
                  <div className="font-semibold text-gray-900">${product.price?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Stock</div>
                  <div className="font-semibold text-gray-900">{product.stock}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Category</div>
                  <div className="font-semibold text-gray-900">{product.category}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Brand</div>
                  <div className="font-semibold text-gray-900">{product.brand}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Vendor Name</div>
                  <div className="font-semibold text-gray-900">{vendor?.displayName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Vendor Shop Address</div>
                  <div className="font-semibold text-gray-900">{vendor?.shopAddress || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Created At</div>
                  <div className="font-semibold text-gray-900">
                    {product.createdAt &&
                    typeof product.createdAt === 'object' &&
                    'toDate' in product.createdAt
                      ? product.createdAt.toDate().toLocaleDateString()
                      : product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString()
                        : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
            {/* Orders Section */}
            {orders.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 p-5 shadow">
                <h2 className="mb-2 text-xl font-bold text-gray-800">Orders for this Product</h2>
                <div className="flex flex-col gap-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-yellow-100 px-4 py-2 text-left font-semibold text-yellow-900 shadow transition hover:bg-yellow-200"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <span>Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                      <span
                        className={`ml-4 rounded-full px-2 py-1 text-xs font-semibold capitalize ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-pink-100 text-pink-800'}`}
                      >
                        {order.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Support Tickets Section */}
            {tickets.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 p-5 shadow">
                <h2 className="mb-2 text-xl font-bold text-gray-800">
                  Support Tickets for this Product
                </h2>
                <div className="flex flex-col gap-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg bg-pink-100 px-4 py-2 text-left font-semibold text-pink-900 shadow transition hover:bg-pink-200"
                      onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    >
                      <span>
                        Ticket #{ticket.id.slice(-6).toUpperCase()} -{' '}
                        {ticket.subject || 'No Subject'}
                      </span>
                      <span
                        className={`ml-4 rounded-full px-2 py-1 text-xs font-semibold capitalize ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ticket.status === 'open' ? 'bg-yellow-200 text-yellow-800' : 'bg-pink-100 text-pink-800'}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg border border-gray-300 bg-white px-6 py-2 font-semibold text-gray-700 shadow transition duration-200 ease-in-out hover:bg-gray-100 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
          >
            Back
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
