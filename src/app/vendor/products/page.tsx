'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types';
import { toast } from 'react-hot-toast';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { FaSearch, FaPlus } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function VendorProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('vendorId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const fetched: Product[] = [];
        querySnapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as Product);
        });
        setProducts(fetched);
      } catch (error) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error('Failed to delete product: ' + (err?.message || ''));
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
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <>
      <VendorDashboardNav />
      <div className="min-h-screen bg-gradient-to-br from-[#f3f6fd] via-[#fdf2fa] to-[#f7f7fa] px-2 py-10 sm:px-4">
        <div className="animate-fade-in-up mx-auto max-w-5xl rounded-3xl border border-gray-100 bg-white/90 p-6 shadow-2xl sm:p-10">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-gray-900">
                <span>My Products</span>
              </h1>
              <p className="text-sm text-gray-500">View, search, and manage your products here.</p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or price..."
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pr-4 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
                />
              </div>
              <Link href="/vendor/products/new">
                <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-5 py-2 font-semibold text-white shadow transition-all hover:scale-105">
                  <FaPlus className="text-sm" /> Add Product
                </button>
              </Link>
            </div>
          </div>
          {/* Filters Row */}
          <div className="mb-6 flex flex-wrap gap-2">
            <input
              type="number"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Min Stock"
              className="w-28 rounded-full border border-gray-200 bg-gray-50 py-2 pr-2 pl-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              placeholder="Max Stock"
              className="w-28 rounded-full border border-gray-200 bg-gray-50 py-2 pr-2 pl-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min Price"
              className="w-28 rounded-full border border-gray-200 bg-gray-50 py-2 pr-2 pl-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max Price"
              className="w-28 rounded-full border border-gray-200 bg-gray-50 py-2 pr-2 pl-4 text-sm shadow-sm focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
          </div>
          {loading ? (
            <div className="animate-fade-in-up py-10 text-center text-gray-500">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="animate-fade-in-up py-10 text-center text-gray-500">
              No products found.
            </div>
          ) : (
            <div className="animate-fade-in-up overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-2xl bg-white shadow-lg">
                <thead className="bg-gradient-to-r from-blue-50 to-pink-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold tracking-wider text-gray-500 uppercase">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer transition-all hover:bg-blue-50/40"
                      onClick={() => router.push(`/vendor/products/${product.id}/edit`)}
                    >
                      <td className="px-6 py-4 align-middle font-semibold whitespace-nowrap text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 align-middle font-bold whitespace-nowrap text-gray-900">
                        ${product.price?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap text-gray-900">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap text-gray-900">
                        {formatDate(product.createdAt)}
                      </td>
                      <td className="px-6 py-4 align-middle whitespace-nowrap text-gray-900">
                        {formatDate(product.updatedAt)}
                      </td>
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
