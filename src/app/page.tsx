'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types';
import Image from 'next/image';
import { FaBoxOpen, FaCheckCircle, FaTimesCircle, FaShoppingCart, FaPaintBrush, FaSchool, FaBriefcase } from 'react-icons/fa';

const categories = [
  {
    name: 'School Supplies',
    description: 'Everything your student needs for academic success.',
    href: '/products?category=school-supplies',
    icon: <FaSchool className="text-blue-400 text-3xl mx-auto mb-2" />,
  },
  {
    name: 'Art & Craft',
    description: 'Unleash your creativity with our diverse art supplies.',
    href: '/products?category=art-craft',
    icon: <FaPaintBrush className="text-pink-400 text-3xl mx-auto mb-2" />,
  },
  {
    name: 'Office Supplies',
    description: 'Boost productivity with essential office stationery.',
    href: '/products?category=office-supplies',
    icon: <FaBriefcase className="text-yellow-500 text-3xl mx-auto mb-2" />,
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsCollectionRef = collection(db, 'products');
        const q = query(productsCollectionRef, orderBy('createdAt', 'desc'), limit(8));
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsList);
      } catch (err) {
        // Optionally handle error
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 min-h-screen">
      <main>
        {/* Hero section */}
        <div className="relative isolate overflow-hidden bg-gray-900 pb-16 pt-14 sm:pb-20 rounded-b-3xl shadow-xl">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2830&h=1550&q=80&blend=111827&sat=-100&exp=15&blend-mode=multiply"
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
          />
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl drop-shadow-xl">
                Your One-Stop Stationery Shop
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Connect with local stationery shops and find all your school supplies in one
                place. Quality products, competitive prices, and convenient delivery.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/products"
                  className="rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-3 text-lg font-semibold text-white shadow-lg hover:from-blue-600 hover:to-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all hover:scale-105"
                >
                  Browse Products
                </Link>
                <a href="#categories-section" className="text-lg font-semibold leading-6 text-white hover:underline">
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Category section */}
        <div className="bg-transparent" id="categories-section">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Popular Categories</h2>
              <Link href="/products" className="hidden text-sm font-semibold text-blue-600 hover:text-blue-500 sm:block">
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
              {categories.map((category) => (
                <Link key={category.name} href={category.href} className="group relative text-center rounded-2xl bg-white/80 shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-105 border border-transparent hover:border-blue-300">
                  <div className="flex flex-col items-center justify-center h-40">
                    {category.icon}
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 mb-1">{category.name}</h3>
                    <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-700">{category.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Featured products section */}
        <div className="bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <Link href="/products" className="hidden text-sm font-semibold text-blue-600 hover:text-blue-500 sm:block">
                View All Products
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <span className="text-gray-500 text-lg">Loading products...</span>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-y-10 gap-x-6 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {products.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500">No products found.</div>
                ) : (
                  products.map((product) => (
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
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2 flex items-center gap-1">{product.description}</p>
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
                  ))
                )}
              </div>
            )}
            <div className="flex justify-center mt-10">
              <Link href="/products" className="rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-8 py-3 text-lg font-semibold text-white shadow-lg hover:from-blue-600 hover:to-pink-500 transition-all hover:scale-105">
                View All Products
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
