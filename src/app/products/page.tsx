'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Vendor } from '@/types';
import Link from 'next/link';
import Image from 'next/image'; // For optimized image handling
import {
  FaSearch,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaShoppingCart,
} from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';

function getInitials(name: string = ''): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch vendors
        const vendorSnapshot = await getDocs(collection(db, 'users'));
        const vendorList: Vendor[] = [];
        vendorSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.role === 'vendor') {
            vendorList.push({ uid: docSnap.id, ...data } as Vendor);
          }
        });
        setVendors(vendorList);
        // Fetch products
        const productsCollectionRef = collection(db, 'products');
        const q = query(productsCollectionRef);
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Product, 'id'>),
        }));
        setProducts(productsList);
      } catch (err: any) {
        console.error('Error fetching products/vendors:', err);
        setError('Failed to load products or vendors. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-select vendor from query param if present
    if (searchParams) {
      const vendorId = searchParams.get('vendor');
      if (vendorId) {
        setSelectedVendor(vendorId);
      }
    }
  }, []);

  // Filter vendors by search (shop name, vendor name, location)
  const filteredVendors = vendors.filter((vendor) => {
    const shopName = (vendor.shopName || '').toLowerCase();
    const vendorName = (vendor.displayName || '').toLowerCase();
    const location = (vendor.shopAddress || '').toLowerCase();
    const search = vendorSearch.toLowerCase();
    return shopName.includes(search) || vendorName.includes(search) || location.includes(search);
  });
  // Filter products by selected vendor and search
  const vendorProducts = selectedVendor
    ? products.filter((p) => p.vendorId === selectedVendor)
    : [];

  // Extract unique categories for the selected vendor
  const vendorCategories = Array.from(
    new Set(vendorProducts.map((p) => p.category).filter(Boolean))
  );

  const filteredProducts = selectedVendor
    ? vendorProducts.filter(
        (p) =>
          (!selectedCategory || p.category === selectedCategory) &&
          (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            (p.description || '').toLowerCase().includes(productSearch.toLowerCase()))
      )
    : [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        {/* Vendor Search Bar */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search vendors by shop, name, or location..."
              value={vendorSearch}
              onChange={(e) => setVendorSearch(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white/80 py-2 pr-4 pl-10 text-gray-900 shadow-sm backdrop-blur focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          {vendorSearch && (
            <button
              className="ml-2 rounded-full bg-gray-200 px-3 py-2 text-gray-700 shadow hover:bg-gray-300"
              onClick={() => setVendorSearch('')}
            >
              Clear
            </button>
          )}
        </div>
        {/* Sticky Horizontal Vendor Card List */}
        <div className="sticky top-0 z-20 mb-8 rounded-xl bg-gradient-to-r from-white/80 to-blue-50/80 pt-2 pb-2 shadow-lg backdrop-blur">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {/* Vendor Cards */}
            {filteredVendors.length === 0 ? (
              <div className="px-4 py-8 text-gray-500">No vendors found.</div>
            ) : (
              filteredVendors.map((vendor) => {
                const location = (vendor.shopAddress || '').toLowerCase();
                return (
                  <button
                    key={vendor.uid}
                    className={`flex min-w-[240px] flex-shrink-0 flex-col items-center rounded-2xl border-2 bg-white/70 p-5 shadow-lg backdrop-blur transition-all duration-200 ${selectedVendor === vendor.uid ? 'scale-105 border-pink-500 ring-2 ring-pink-200' : 'border-transparent hover:scale-105 hover:border-blue-400'} group relative`}
                    onClick={() => setSelectedVendor(vendor.uid)}
                  >
                    {/* Selected badge */}
                    {selectedVendor === vendor.uid && (
                      <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-xs text-white shadow">
                        <FaCheckCircle className="inline" /> Selected
                      </span>
                    )}
                    {vendor.image ? (
                      <img
                        src={vendor.image}
                        alt={vendor.shopName || vendor.displayName}
                        className="mb-2 h-14 w-14 rounded-full object-cover shadow"
                      />
                    ) : (
                      <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 shadow">
                        <span className="text-2xl font-bold text-white drop-shadow">
                          {getInitials(vendor.shopName || vendor.displayName)}
                        </span>
                      </div>
                    )}
                    <span className="mb-1 w-full truncate text-center text-lg font-semibold text-gray-900">
                      {vendor.shopName || vendor.displayName}
                    </span>
                    <span className="mb-1 flex w-full items-center justify-center gap-1 truncate text-center text-xs text-gray-700">
                      <FaInfoCircle className="inline" /> {vendor.displayName}
                    </span>
                    {vendor.description && (
                      <span className="mb-1 flex w-full items-center justify-center gap-1 truncate text-center text-xs text-gray-600">
                        <FaBoxOpen className="inline" /> {vendor.description}
                      </span>
                    )}
                    {vendor.shopAddress && (
                      <span className="mb-1 flex w-full items-center justify-center gap-1 truncate text-center text-xs text-gray-500">
                        <FaMapMarkerAlt className="inline" /> {vendor.shopAddress}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <FaBoxOpen className="inline" /> {vendor.products?.length || 0} products
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        {/* Category Filter (show only if vendor is selected and has categories) */}
        {selectedVendor && vendorCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-start gap-3">
            <span className="mr-2 font-semibold text-gray-700">Filter by Category:</span>
            <button
              className={`rounded-full border px-4 py-1 text-sm font-medium shadow transition-all duration-150 ${!selectedCategory ? 'border-transparent bg-gradient-to-r from-blue-400 to-pink-400 text-white' : 'border-gray-200 bg-white/80 text-gray-800 hover:bg-blue-50'}`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {vendorCategories.map((cat) => (
              <button
                key={cat}
                className={`rounded-full border px-4 py-1 text-sm font-medium shadow transition-all duration-150 ${selectedCategory === cat ? 'border-transparent bg-gradient-to-r from-blue-400 to-pink-400 text-white' : 'border-gray-200 bg-white/80 text-gray-800 hover:bg-blue-50'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {/* Product Search Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full rounded-full border border-gray-200 bg-white/80 py-2 pr-4 pl-10 text-gray-900 shadow-sm backdrop-blur focus:ring-2 focus:ring-blue-400 focus:outline-none"
              disabled={!selectedVendor}
            />
          </div>
          {productSearch && (
            <button
              className="ml-2 rounded-full bg-gray-200 px-3 py-2 text-gray-700 shadow hover:bg-gray-300"
              onClick={() => setProductSearch('')}
              disabled={!selectedVendor}
            >
              Clear
            </button>
          )}
        </div>
        {/* Main Products Grid */}
        <div className="mb-8 text-center">
          <h1 className="relative mb-2 inline-block text-4xl font-extrabold text-gray-900">
            Our Products
            <span className="mx-auto mt-2 block h-1 w-1/2 rounded-full bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400"></span>
          </h1>
        </div>
        {!selectedVendor ? (
          <div className="text-center text-gray-600">
            <p>Please select a vendor to view their products.</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No products available for this vendor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id} className="group">
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white/80 shadow-xl backdrop-blur transition-shadow duration-200 group-hover:scale-[1.03] group-hover:border-blue-300 group-hover:ring-2 group-hover:ring-blue-100 hover:shadow-2xl">
                  <div className="relative flex h-48 w-full items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-b-none transition-transform duration-200 hover:scale-105"
                      />
                    ) : (
                      <span className="flex flex-col items-center text-gray-400">
                        <FaBoxOpen className="mb-2 text-4xl" />
                        No Image
                      </span>
                    )}
                    {/* Stock badge */}
                    <span
                      className={`absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold shadow ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                    >
                      {product.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />}{' '}
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    {/* Price badge */}
                    <span className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-3 py-1 text-sm font-bold text-white shadow">
                      ${product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-grow flex-col justify-between p-5">
                    <h2 className="mb-1 truncate text-lg font-bold text-gray-800">
                      {product.name}
                    </h2>
                    <p className="mb-3 line-clamp-2 flex items-center gap-1 text-sm text-gray-600">
                      <FaInfoCircle className="inline" /> {product.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <FaBoxOpen className="inline" /> Stock: {product.stock}
                      </span>
                      {/* Add to Cart button on hover */}
                      <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-3 py-1 text-white opacity-0 shadow transition-opacity duration-200 group-hover:opacity-100 hover:scale-105">
                        <FaShoppingCart /> Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
