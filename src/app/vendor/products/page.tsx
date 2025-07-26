"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/types";
import { toast } from "react-hot-toast";
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { FaSearch, FaPlus } from "react-icons/fa";
import { useRouter } from 'next/navigation';

export default function VendorProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, "products"), where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetched: Product[] = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        setProducts(fetched);
      } catch (error) {
        toast.error("Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success("Product deleted");
    } catch (err: any) {
      toast.error("Failed to delete product: " + (err?.message || ""));
    }
  };

  // Filter products by name, price, and new filters
  const filteredProducts = products.filter((product) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(searchLower) ||
      (product.price && product.price.toString().includes(searchLower));
    const matchesMinStock = minStock ? product.stock >= Number(minStock) : true;
    const matchesMaxStock = maxStock ? product.stock <= Number(maxStock) : true;
    const matchesMinPrice = minPrice ? product.price >= Number(minPrice) : true;
    const matchesMaxPrice = maxPrice ? product.price <= Number(maxPrice) : true;
    return (
      matchesSearch && matchesMinStock && matchesMaxStock && matchesMinPrice && matchesMaxPrice
    );
  });

  // Helper to format date
  function formatDate(date: any) {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date.seconds ? date.seconds * 1000 : date);
    return d.toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <VendorDashboardNav />
      <div className="min-h-screen bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] py-10 px-2 sm:px-4">
        <div className="max-w-5xl mx-auto bg-white/90 p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 animate-fade-in-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1 flex items-center gap-2">
                <span>My Products</span>
              </h1>
              <p className="text-gray-500 text-sm">View, search, and manage your products here.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FaSearch /></span>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or price..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm"
                />
              </div>
              <Link href="/vendor/products/new">
                <button className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-400 text-white font-semibold shadow hover:scale-105 transition-all">
                  <FaPlus className="text-sm" /> Add Product
                </button>
              </Link>
            </div>
          </div>
          {/* Filters Row */}
          <div className="flex flex-wrap gap-2 mb-6">
            <input
              type="number"
              min="0"
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              placeholder="Min Stock"
              className="pl-4 pr-2 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm w-28"
            />
            <input
              type="number"
              min="0"
              value={maxStock}
              onChange={e => setMaxStock(e.target.value)}
              placeholder="Max Stock"
              className="pl-4 pr-2 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm w-28"
            />
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              placeholder="Min Price"
              className="pl-4 pr-2 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm w-28"
            />
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              placeholder="Max Price"
              className="pl-4 pr-2 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm shadow-sm w-28"
            />
          </div>
          {loading ? (
            <div className="text-center py-10 text-gray-500 animate-fade-in-up">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 text-gray-500 animate-fade-in-up">No products found.</div>
          ) : (
            <div className="overflow-x-auto animate-fade-in-up">
              <table className="min-w-full divide-y divide-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
                <thead className="bg-gradient-to-r from-blue-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-blue-50/40 transition-all cursor-pointer"
                      onClick={() => router.push(`/vendor/products/${product.id}/edit`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 align-middle">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 align-middle font-bold">₹{product.price?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 align-middle">{product.stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 align-middle">{formatDate(product.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 align-middle">{formatDate(product.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 