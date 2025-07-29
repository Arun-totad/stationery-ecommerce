'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Category } from '@/types';
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

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch products
        const productsCollectionRef = collection(db, 'products');
        const q = query(productsCollectionRef, orderBy('createdAt', 'desc'), limit(8));
        const querySnapshot = await getDocs(q);
        const productsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(productsList);

        // Fetch categories
        const categoriesQuery = query(collection(db, 'categories'), where('isGlobal', '==', true));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesList = categoriesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(categoriesList);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'tag': <FaBoxOpen className="mx-auto mb-2 text-3xl text-gray-400" />,
      'laptop': <FaBoxOpen className="mx-auto mb-2 text-3xl text-blue-400" />,
      'couch': <FaBoxOpen className="mx-auto mb-2 text-3xl text-purple-400" />,
      'tshirt': <FaBoxOpen className="mx-auto mb-2 text-3xl text-pink-400" />,
      'book': <FaSchool className="mx-auto mb-2 text-3xl text-green-400" />,
      'basketball-ball': <FaBoxOpen className="mx-auto mb-2 text-3xl text-orange-400" />,
      'home': <FaBoxOpen className="mx-auto mb-2 text-3xl text-red-400" />,
      'gamepad': <FaBoxOpen className="mx-auto mb-2 text-3xl text-cyan-400" />,
      'car': <FaBoxOpen className="mx-auto mb-2 text-3xl text-lime-400" />,
    };
    return iconMap[iconName] || <FaBoxOpen className="mx-auto mb-2 text-3xl text-gray-400" />;
  };

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
                Your One-Stop Global Marketplace
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Connect with local and international shops and find everything you need in one place.
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
              {loading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="group relative rounded-2xl border border-transparent bg-white/80 text-center shadow-lg animate-pulse"
                  >
                    <div className="flex h-40 flex-col items-center justify-center">
                      <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-gray-200"></div>
                      <div className="mb-1 h-6 w-24 rounded bg-gray-200"></div>
                      <div className="mt-1 h-4 w-32 rounded bg-gray-200"></div>
                    </div>
                  </div>
                ))
              ) : categories.length > 0 ? (
                categories.slice(0, 6).map((category) => (
                  <Link
                    key={category.id}
                    href={`/products?category=${encodeURIComponent(category.name)}`}
                    className="group relative rounded-2xl border border-transparent bg-white/80 text-center shadow-lg transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:shadow-2xl"
                  >
                    <div className="flex h-40 flex-col items-center justify-center">
                      <div
                        className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg text-3xl"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {getIconComponent(category.icon)}
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-800 group-hover:text-blue-600">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-700">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                // Fallback categories if no categories are found
                [
                  {
                    name: 'Electronics',
                    description: 'Electronic devices and accessories',
                    icon: 'laptop',
                    color: '#3B82F6',
                  },
                  {
                    name: 'Furniture',
                    description: 'Home and office furniture',
                    icon: 'couch',
                    color: '#8B5CF6',
                  },
                  {
                    name: 'Clothing',
                    description: 'Apparel and fashion items',
                    icon: 'tshirt',
                    color: '#EC4899',
                  },
                ].map((category, index) => (
                  <Link
                    key={index}
                    href={`/products?category=${encodeURIComponent(category.name)}`}
                    className="group relative rounded-2xl border border-transparent bg-white/80 text-center shadow-lg transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:shadow-2xl"
                  >
                    <div className="flex h-40 flex-col items-center justify-center">
                      <div
                        className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg text-3xl"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {getIconComponent(category.icon)}
                      </div>
                      <h3 className="mb-1 text-lg font-bold text-gray-800 group-hover:text-blue-600">
                        {category.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 group-hover:text-gray-700">
                        {category.description}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Featured products section */}
        <div className="bg-white/50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
            <div className="sm:flex sm:items-baseline sm:justify-between">
              <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
                Featured Products
              </h2>
              <Link
                href="/products"
                className="hidden text-sm font-semibold text-blue-600 hover:text-blue-500 sm:block"
              >
                View all products
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200"></div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200 group-hover:opacity-75">
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={300}
                          height={300}
                          className="h-full w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-100">
                          <FaBoxOpen className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
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
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No products available yet.</p>
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
