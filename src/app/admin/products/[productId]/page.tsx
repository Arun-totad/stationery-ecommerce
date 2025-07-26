"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, Order, SupportTicket, Vendor } from "@/types";
import { toast } from "react-hot-toast";

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
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          toast.error("Product not found.");
          router.push("/admin?view=products");
          return;
        }
        const prod = { id: productSnap.id, ...productSnap.data() } as Product;
        setProduct(prod);
        // Fetch vendor
        if (prod.vendorId) {
          const vendorRef = doc(db, "users", prod.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            setVendor({ uid: vendorSnap.id, ...vendorSnap.data() } as Vendor);
          }
        }
        // Fetch orders for this product
        const ordersQuery = query(collection(db, "orders"), where("vendorId", "==", prod.vendorId));
        const ordersSnapshot = await getDocs(ordersQuery);
        const allOrders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
        // Filter orders where any item has this productId
        const productOrders = allOrders.filter(order => order.items.some(item => item.id === prod.id));
        setOrders(productOrders);
        // Fetch support tickets for these orders
        if (productOrders.length > 0) {
          const orderIds = productOrders.map(o => o.id);
          const ticketsQuery = query(collection(db, "supportTickets"), where("orderId", "in", orderIds.slice(0,10)));
          // Firestore 'in' supports max 10 elements
          const ticketsSnapshot = await getDocs(ticketsQuery);
          setTickets(ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupportTicket[]);
        } else {
          setTickets([]);
        }
      } catch (error) {
        toast.error("Failed to load product details.");
        router.push("/admin?view=products");
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [productId, router]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "admin-manager"]}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute allowedRoles={["admin", "admin-manager"]}>
        <div className="min-h-screen flex items-center justify-center text-gray-900">
          Product details not available.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "admin-manager"]}>
      <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-100 py-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center animate-fade-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-200 to-pink-200 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-2">
              {product.name ? product.name[0].toUpperCase() : "P"}
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">{product.name}</h1>
            <span className="px-4 py-1 rounded-full text-base font-semibold bg-yellow-100 text-yellow-700">Product</span>
          </div>
          <div className="w-full space-y-5">
            <div className="bg-white/70 backdrop-blur-md rounded-3xl shadow-xl p-7 mb-6 border border-yellow-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <div className="text-gray-500 text-sm">Price</div>
                  <div className="font-semibold text-gray-900">₹{product.price?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Stock</div>
                  <div className="font-semibold text-gray-900">{product.stock}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Category</div>
                  <div className="font-semibold text-gray-900">{product.category}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Brand</div>
                  <div className="font-semibold text-gray-900">{product.brand}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Vendor Name</div>
                  <div className="font-semibold text-gray-900">{vendor?.displayName || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Vendor Shop Address</div>
                  <div className="font-semibold text-gray-900">{vendor?.shopAddress || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Created At</div>
                  <div className="font-semibold text-gray-900">{
                    product.createdAt && typeof product.createdAt === 'object' && 'toDate' in product.createdAt
                      ? product.createdAt.toDate().toLocaleDateString()
                      : product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString()
                        : "N/A"
                  }</div>
                </div>
              </div>
            </div>
            {/* Orders Section */}
            {orders.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 rounded-2xl shadow p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Orders for this Product</h2>
                <div className="flex flex-col gap-2">
                  {orders.map(order => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-yellow-100 text-yellow-900 font-semibold shadow transition text-left cursor-pointer hover:bg-yellow-200" onClick={() => router.push(`/admin/orders/${order.id}`)}>
                      <span>Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                      <span className={`ml-4 text-xs px-2 py-1 rounded-full capitalize font-semibold ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : order.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-pink-100 text-pink-800'}`}>{order.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Support Tickets Section */}
            {tickets.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 rounded-2xl shadow p-5">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Support Tickets for this Product</h2>
                <div className="flex flex-col gap-2">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-pink-100 text-pink-900 font-semibold shadow transition text-left cursor-pointer hover:bg-pink-200" onClick={() => router.push(`/admin/support/${ticket.id}`)}>
                      <span>Ticket #{ticket.id.slice(-6).toUpperCase()} - {ticket.subject || 'No Subject'}</span>
                      <span className={`ml-4 text-xs px-2 py-1 rounded-full capitalize font-semibold ${ticket.status === 'resolved' ? 'bg-green-100 text-green-800' : ticket.status === 'open' ? 'bg-yellow-200 text-yellow-800' : 'bg-pink-100 text-pink-800'}`}>{ticket.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 font-semibold shadow transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-400 mt-4"
          >
            Back
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
} 