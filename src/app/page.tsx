'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types';
import Image from 'next/image';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaShoppingCart,
  FaPaintBrush,
  FaSchool,
  FaBriefcase,
} from 'react-icons/fa';

const categories = [
  {
    name: 'School Supplies',
    description: 'Everything your student needs for academic success.',
    href: '/products?category=school-supplies',
    icon: <FaSchool className="mx-auto mb-2 text-3xl text-blue-400" />,
  },
  {
    name: 'Art & Craft',
    description: 'Unleash your creativity with our diverse art supplies.',
    href: '/products?category=art-craft',
    icon: <FaPaintBrush className="mx-auto mb-2 text-3xl text-pink-400" />,
  },
  {
    name: 'Office Supplies',
    description: 'Boost productivity with essential office stationery.',
    href: '/products?category=office-supplies',
    icon: <FaBriefcase className="mx-auto mb-2 text-3xl text-yellow-500" />,
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
        const productsList = querySnapshot.docs.map((doc) => ({
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
      <main>
        {/* Hero section */}
        <div className="relative isolate overflow-hidden rounded-b-3xl bg-gray-900 pt-14 pb-16 shadow-xl sm:pb-20">
          <img
            src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2830&h=1550&q=80&blend=111827&sat=-100&exp=15&blend-mode=multiply"
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-70"
          />
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white drop-shadow-xl sm:text-6xl">
                Your One-Stop Stationery Shop
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Connect with local stationery shops and find all your school supplies in one place.
                Quality products, competitive prices, and convenient delivery.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/products"
                  className="rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-6 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-blue-600 hover:to-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Browse Products
                </Link>
                <a
                  href="#categories-section"
                  className="text-lg leading-6 font-semibold text-white hover:underline"
                >
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
              <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
                Popular Categories
              </h2>
              <Link
                href="/products"
                className="hidden text-sm font-semibold text-blue-600 hover:text-blue-500 sm:block"
              >
                Browse all categories
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className="group relative rounded-2xl border border-transparent bg-white/80 text-center shadow-lg transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:shadow-2xl"
                >
                  <div className="flex h-40 flex-col items-center justify-center">
                    {category.icon}
                    <h3 className="mb-1 text-lg font-bold text-gray-800 group-hover:text-blue-600">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-700">
                      {category.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Featured products section */}
        <div className="bg-transparent">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="mb-6 sm:flex sm:items-baseline sm:justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <Link
                href="/products"
                className="hidden text-sm font-semibold text-blue-600 hover:text-blue-500 sm:block"
              >
                View All Products
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <span className="text-lg text-gray-500">Loading products...</span>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {products.length === 0 ? (
                  <div className="col-span-full text-center text-gray-500">No products found.</div>
                ) : (
                  products.map((product) => (
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
                            ₹{product.price.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-grow flex-col justify-between p-5">
                          <h2 className="mb-1 truncate text-lg font-bold text-gray-800">
                            {product.name}
                          </h2>
                          <p className="mb-3 line-clamp-2 flex items-center gap-1 text-sm text-gray-600">
                            {product.description}
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
                  ))
                )}
              </div>
            )}
            <div className="mt-10 flex justify-center">
              <Link
                href="/products"
                className="rounded-full bg-gradient-to-r from-blue-500 to-pink-400 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:scale-105 hover:from-blue-600 hover:to-pink-500"
              >
                View All Products
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
