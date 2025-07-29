'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  FaBoxOpen,
  FaCheckCircle,
  FaTimesCircle,
  FaTag,
  FaLayerGroup,
  FaIndustry,
  FaShoppingCart,
  FaShoppingBag,
  FaArrowRight,
  FaArrowLeft,
} from 'react-icons/fa';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart, cartItems } = useCart();
  const { user, userRole } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const fetchedProduct = { id: productSnap.id, ...productSnap.data() } as Product;
          setProduct(fetchedProduct);

          // console.log('Product ID:', productId);
          // console.log('Current Cart Items:', cartItems);

          const existingCartItem = cartItems.find((item) => item.id === productId);
          // console.log('Existing Cart Item for this product:', existingCartItem);

          if (existingCartItem) {
            setQuantity(existingCartItem.quantity);
          } else {
            setQuantity(1); // Default to 1 if not in cart
          }
        } else {
          toast.error('Product not found.');
          router.push('/products'); // Redirect to products list if not found
        }
      } catch (err: any) {
        console.error('Error fetching product details:', err);
        setError('Failed to load product details.');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router, cartItems]);

  // Fetch related products after product is loaded
  useEffect(() => {
    const fetchRelatedProducts = async () => {
      if (!product) return;
      try {
        // Fetch products from the same vendor (excluding current)
        const vendorQuery = query(
          collection(db, 'products'),
          where('vendorId', '==', product.vendorId)
        );
        const vendorSnap = await getDocs(vendorQuery);
        const related = vendorSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Product)
          .filter((p) => p.id !== product.id);
        setRelatedProducts(related.slice(0, 8));
      } catch (err) {
        // Fail silently for related products
      }
    };
    fetchRelatedProducts();
  }, [product]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-700">Loading product details...</p>
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

  if (!product) {
    return null; // Or a custom 404 component
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        <div className="relative rounded-2xl bg-white/70 p-10 shadow-2xl backdrop-blur">
          {/* Back Button */}
          <button
            className="absolute -top-6 left-4 z-10 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-4 py-2 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            onClick={() => {
              if (product?.vendorId) {
                window.location.href = `/products?vendor=${product.vendorId}`;
              } else {
                window.location.href = '/products';
              }
            }}
          >
            <FaArrowLeft className="text-lg" /> Back to Products
          </button>
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            {/* Product Image Gallery */}
            <div>
              {product.images && product.images.length > 0 ? (
                <div className="relative flex h-96 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-blue-100 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 shadow-lg">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="object-center"
                  />
                </div>
              ) : (
                <div className="flex h-96 w-full flex-col items-center justify-center rounded-xl border-2 border-blue-100 bg-gradient-to-br from-gray-200 via-blue-100 to-purple-100 shadow-lg">
                  <FaBoxOpen className="mb-4 text-6xl text-gray-400" />
                  <span className="text-lg font-medium text-gray-500">No Image Available</span>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex h-full flex-col justify-between">
              <div>
                <h1 className="relative mb-2 inline-block text-4xl font-extrabold text-gray-900">
                  {product.name}
                  <span className="mt-2 block h-1 w-1/2 rounded-full bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400"></span>
                </h1>
                <p className="mb-6 flex items-center gap-2 text-lg leading-relaxed text-gray-700">
                  <FaTag className="text-blue-400" /> {product.description}
                </p>
                <div className="mb-4 flex items-center gap-4">
                  {/* Price badge */}
                  <span className="flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-5 py-2 text-2xl font-bold text-white shadow">
                    ${product.price.toFixed(2)}
                  </span>
                  {/* Stock badge */}
                  <span
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold shadow ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}
                  >
                    {product.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />}{' '}
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
                <div className="mb-6 flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaLayerGroup className="text-blue-400" />
                    <span className="font-medium">Category:</span> {product.category}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaIndustry className="text-purple-400" />
                    <span className="font-medium">Brand:</span> {product.brand}
                  </div>
                </div>
              </div>

              {/* Quantity Selector and Add to Cart Button */}
              <div className="mt-8">
                {userRole !== 'vendor' && (
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center overflow-hidden rounded-full border border-blue-200 bg-white/80 shadow">
                        <button
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="bg-blue-100 px-4 py-2 text-xl font-bold text-blue-700 hover:bg-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1 && val <= product.stock) {
                              setQuantity(val);
                            } else if (e.target.value === '') {
                              setQuantity(0); // Allow empty input temporarily
                            }
                          }}
                          onBlur={() => {
                            // When input loses focus, set to 1 if empty or invalid
                            if (isNaN(quantity) || quantity < 1) {
                              setQuantity(1);
                            } else if (quantity > product.stock) {
                              setQuantity(product.stock); // Cap at max stock
                            }
                          }}
                          className="hide-number-arrows w-16 border-r border-l border-blue-200 bg-transparent py-2 text-center text-2xl font-extrabold text-blue-700 focus:border-blue-400 focus:ring-blue-400 focus:outline-none"
                          style={{ MozAppearance: 'textfield' }}
                        />
                        <button
                          onClick={() => setQuantity((prev) => Math.min(product.stock, prev + 1))}
                          className="bg-blue-100 px-4 py-2 text-xl font-bold text-blue-700 hover:bg-blue-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={quantity >= product.stock}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          const success = await addToCart(product, quantity);
                          if (success) {
                            toast.custom(
                              (t) => (
                                <div
                                  className={`flex max-w-[340px] items-center gap-4 rounded-2xl border border-green-200 bg-white/80 px-6 py-4 shadow-2xl backdrop-blur ${t.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
                                >
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-400 shadow-lg">
                                    <FaCheckCircle className="text-xl text-white" />
                                  </div>
                                  <div className="flex-1 text-center md:text-left">
                                    <div className="mb-1 flex items-center justify-center gap-2 text-lg font-bold text-green-700 md:justify-start">
                                      {user ? 'Product added to cart!' : 'To add product to cart!'}
                                    </div>
                                    {user ? (
                                      <div className="mb-2 text-sm text-gray-700">
                                        You can continue shopping or proceed to checkout.
                                      </div>
                                    ) : null}
                                    <div className="mx-auto mt-4 flex w-full max-w-xs flex-row items-center justify-center gap-4">
                                      {user ? (
                                        <>
                                          <button
                                            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 px-0 py-3 text-base font-semibold text-white shadow-md transition-all hover:scale-105 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                                            style={{ minWidth: 0 }}
                                            onClick={() => {
                                              toast.dismiss(t.id);
                                              router.push('/cart');
                                            }}
                                          >
                                            <FaShoppingBag className="text-lg" />
                                            <span>View Cart</span>
                                          </button>
                                          <button
                                            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-0 py-3 text-base font-semibold text-white shadow-md transition-all hover:scale-105 focus:ring-2 focus:ring-pink-300 focus:outline-none"
                                            style={{ minWidth: 0 }}
                                            onClick={() => {
                                              toast.dismiss(t.id);
                                              router.push('/checkout');
                                            }}
                                          >
                                            <FaArrowRight className="text-lg" />
                                            <span>Checkout</span>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-400 to-pink-400 px-4 py-2 font-semibold text-white shadow transition-all duration-150 hover:scale-105"
                                          onClick={() => {
                                            toast.dismiss(t.id);
                                            router.push('/login');
                                          }}
                                        >
                                          <FaArrowRight /> Login to Checkout
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ),
                              { position: 'bottom-center', duration: 4000 }
                            );
                          }
                        }}
                        disabled={product.stock === 0 || quantity === 0}
                        className="flex flex-grow items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-6 py-3 text-lg font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <FaShoppingCart /> {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">You may also like</h2>
          <div className="flex gap-6 overflow-x-auto pb-2">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                className="flex min-w-[260px] flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white/80 shadow-xl backdrop-blur transition-all duration-200 hover:scale-[1.03] hover:border-blue-300 hover:ring-2 hover:ring-blue-100"
              >
                <div className="relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200">
                  {rel.images && rel.images.length > 0 ? (
                    <Image
                      src={rel.images[0]}
                      alt={rel.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="rounded-b-none transition-transform duration-200 hover:scale-105"
                    />
                  ) : (
                    <span className="flex flex-col items-center text-gray-400">
                      <FaBoxOpen className="mb-2 text-3xl" />
                      No Image
                    </span>
                  )}
                  {/* Price badge */}
                  <span className="absolute top-2 right-2 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-3 py-1 text-sm font-bold text-white shadow">
                    ${rel.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-grow flex-col p-4">
                  <h3 className="mb-1 truncate text-lg font-bold text-gray-800">{rel.name}</h3>
                  <p className="mb-2 line-clamp-2 text-xs text-gray-600">{rel.description}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span
                      className={`flex items-center gap-1 text-xs font-semibold ${rel.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {rel.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />}{' '}
                      {rel.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <button
                      onClick={() => addToCart(rel, 1)}
                      disabled={rel.stock === 0}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-3 py-1 text-white shadow transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaShoppingCart /> Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
