'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Vendor } from '@/types';
import Link from 'next/link';
import Image from 'next/image'; // For optimized image handling
import { FaSearch, FaMapMarkerAlt, FaInfoCircle, FaBoxOpen, FaCheckCircle, FaTimesCircle, FaShoppingCart } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';

function getInitials(name: string = ''): string {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

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
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as Omit<Product, 'id'>
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
  const filteredVendors = vendors.filter(vendor => {
    const shopName = (vendor.shopName || '').toLowerCase();
    const vendorName = (vendor.displayName || '').toLowerCase();
    const location = (vendor.shopAddress || '').toLowerCase();
    const search = vendorSearch.toLowerCase();
    return (
      shopName.includes(search) ||
      vendorName.includes(search) ||
      location.includes(search)
    );
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
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-700">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        {/* Vendor Search Bar */}
        <div className="mb-4 flex justify-between items-center gap-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search vendors by shop, name, or location..."
              value={vendorSearch}
              onChange={e => setVendorSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white/80 backdrop-blur"
            />
          </div>
          {vendorSearch && (
            <button
              className="ml-2 px-3 py-2 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 shadow"
              onClick={() => setVendorSearch('')}
            >
              Clear
            </button>
          )}
        </div>
        {/* Sticky Horizontal Vendor Card List */}
        <div className="mb-8 sticky top-0 z-20 bg-gradient-to-r from-white/80 to-blue-50/80 pt-2 pb-2 rounded-xl shadow-lg backdrop-blur">
          <div className="flex gap-4 pb-2 overflow-x-auto">
            {/* Vendor Cards */}
            {filteredVendors.length === 0 ? (
              <div className="text-gray-500 px-4 py-8">No vendors found.</div>
            ) : (
              filteredVendors.map((vendor) => {
                const location = (vendor.shopAddress || '').toLowerCase();
                return (
                  <button
                    key={vendor.uid}
                    className={`min-w-[240px] flex-shrink-0 bg-white/70 backdrop-blur rounded-2xl shadow-lg p-5 flex flex-col items-center border-2 transition-all duration-200 ${selectedVendor === vendor.uid ? 'border-pink-500 scale-105 ring-2 ring-pink-200' : 'border-transparent hover:border-blue-400 hover:scale-105'} relative group`}
                    onClick={() => setSelectedVendor(vendor.uid)}
                  >
                    {/* Selected badge */}
                    {selectedVendor === vendor.uid && (
                      <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow flex items-center gap-1"><FaCheckCircle className="inline" /> Selected</span>
                    )}
                    {vendor.image ? (
                      <img src={vendor.image} alt={vendor.shopName || vendor.displayName} className="w-14 h-14 rounded-full object-cover mb-2 shadow" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300 flex items-center justify-center mb-2 shadow">
                        <span className="text-2xl font-bold text-white drop-shadow">{getInitials(vendor.shopName || vendor.displayName)}</span>
                      </div>
                    )}
                    <span className="font-semibold text-gray-900 mb-1 truncate w-full text-center text-lg">{vendor.shopName || vendor.displayName}</span>
                    <span className="text-xs text-gray-700 mb-1 text-center w-full truncate flex items-center justify-center gap-1"><FaInfoCircle className="inline" /> {vendor.displayName}</span>
                    {vendor.description && (
                      <span className="text-xs text-gray-600 mb-1 text-center w-full truncate flex items-center justify-center gap-1"><FaBoxOpen className="inline" /> {vendor.description}</span>
                    )}
                    {vendor.shopAddress && (
                      <span className="text-xs text-gray-500 mb-1 text-center w-full truncate flex items-center justify-center gap-1"><FaMapMarkerAlt className="inline" /> {vendor.shopAddress}</span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1"><FaBoxOpen className="inline" /> {vendor.products?.length || 0} products</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
        {/* Category Filter (show only if vendor is selected and has categories) */}
        {selectedVendor && vendorCategories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3 items-center justify-start">
            <span className="font-semibold text-gray-700 mr-2">Filter by Category:</span>
            <button
              className={`px-4 py-1 rounded-full border text-sm font-medium shadow transition-all duration-150 ${!selectedCategory ? 'bg-gradient-to-r from-blue-400 to-pink-400 text-white border-transparent' : 'bg-white/80 text-gray-800 border-gray-200 hover:bg-blue-50'}`}
              onClick={() => setSelectedCategory(null)}
            >
              All
            </button>
            {vendorCategories.map((cat) => (
              <button
                key={cat}
                className={`px-4 py-1 rounded-full border text-sm font-medium shadow transition-all duration-150 ${selectedCategory === cat ? 'bg-gradient-to-r from-blue-400 to-pink-400 text-white border-transparent' : 'bg-white/80 text-gray-800 border-gray-200 hover:bg-blue-50'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        {/* Product Search Bar */}
        <div className="mb-6 flex justify-between items-center gap-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <FaSearch />
            </span>
            <input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white/80 backdrop-blur"
              disabled={!selectedVendor}
            />
          </div>
          {productSearch && (
            <button
              className="ml-2 px-3 py-2 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 shadow"
              onClick={() => setProductSearch('')}
              disabled={!selectedVendor}
            >
              Clear
            </button>
          )}
        </div>
        {/* Main Products Grid */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 inline-block relative">
            Our Products
            <span className="block h-1 w-1/2 mx-auto bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400 rounded-full mt-2"></span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <Link href={`/products/${product.id}`} key={product.id} className="group">
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-200 h-full flex flex-col relative border border-gray-100 group-hover:border-blue-300 group-hover:scale-[1.03] group-hover:ring-2 group-hover:ring-blue-100">
                  <div className="relative w-full h-48 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 flex items-center justify-center">
                    {product.images && product.images.length > 0 ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="hover:scale-105 transition-transform duration-200 rounded-b-none"
                      />
                    ) : (
                      <span className="flex flex-col items-center text-gray-400">
                        <FaBoxOpen className="text-4xl mb-2" />
                        No Image
                      </span>
                    )}
                    {/* Stock badge */}
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold shadow flex items-center gap-1 ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{product.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />} {product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                    {/* Price badge */}
                    <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-400 to-blue-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow">₹{product.price.toFixed(2)}</span>
                  </div>
                  <div className="p-5 flex flex-col justify-between flex-grow">
                    <h2 className="text-lg font-bold text-gray-800 mb-1 truncate">{product.name}</h2>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex items-center gap-1"><FaInfoCircle className="inline" /> {product.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-xs text-gray-500 flex items-center gap-1"><FaBoxOpen className="inline" /> Stock: {product.stock}</span>
                      {/* Add to Cart button on hover */}
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-blue-400 to-pink-400 text-white px-3 py-1 rounded-full flex items-center gap-2 shadow hover:scale-105">
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