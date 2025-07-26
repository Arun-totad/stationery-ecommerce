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
import { FaBoxOpen, FaCheckCircle, FaTimesCircle, FaTag, FaLayerGroup, FaIndustry, FaShoppingCart, FaShoppingBag, FaArrowRight, FaArrowLeft } from 'react-icons/fa';

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

          console.log('Product ID:', productId);
          console.log('Current Cart Items:', cartItems);

          const existingCartItem = cartItems.find(item => item.id === productId);
          console.log('Existing Cart Item for this product:', existingCartItem);

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
          .map(doc => ({ id: doc.id, ...doc.data() } as Product))
          .filter(p => p.id !== product.id);
        setRelatedProducts(related.slice(0, 8));
      } catch (err) {
        // Fail silently for related products
      }
    };
    fetchRelatedProducts();
  }, [product]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-700">Loading product details...</p>
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

  if (!product) {
    return null; // Or a custom 404 component
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-10">
      <div className="container mx-auto px-4">
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-2xl p-10 relative">
          {/* Back Button */}
          <button
            className="absolute -top-6 left-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-pink-400 text-white rounded-full shadow-lg font-semibold hover:scale-105 hover:shadow-xl transition-all z-10"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            {/* Product Image Gallery */}
            <div>
              {product.images && product.images.length > 0 ? (
                <div className="relative w-full h-96 rounded-xl overflow-hidden border-2 border-blue-100 shadow-lg bg-gradient-to-br from-gray-100 via-blue-50 to-purple-50 flex items-center justify-center">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    style={{ objectFit: 'contain' }}
                    className="object-center"
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gradient-to-br from-gray-200 via-blue-100 to-purple-100 flex flex-col items-center justify-center rounded-xl shadow-lg border-2 border-blue-100">
                  <FaBoxOpen className="text-6xl text-gray-400 mb-4" />
                  <span className="text-gray-500 text-lg font-medium">No Image Available</span>
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col justify-between h-full">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2 inline-block relative">
                  {product.name}
                  <span className="block h-1 w-1/2 bg-gradient-to-r from-pink-400 via-blue-400 to-purple-400 rounded-full mt-2"></span>
                </h1>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed flex items-center gap-2"><FaTag className="text-blue-400" /> {product.description}</p>
                <div className="flex items-center mb-4 gap-4">
                  {/* Price badge */}
                  <span className="bg-gradient-to-r from-pink-400 to-blue-400 text-white px-5 py-2 rounded-full text-2xl font-bold shadow flex items-center gap-2">
                    ₹{product.price.toFixed(2)}
                  </span>
                  {/* Stock badge */}
                  <span className={`px-4 py-2 rounded-full text-lg font-semibold shadow flex items-center gap-2 ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{product.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />} {product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                </div>
                <div className="flex items-center gap-6 mb-6">
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
                      <div className="flex items-center border border-blue-200 rounded-full overflow-hidden shadow bg-white/80">
                        <button
                          onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
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
                          className="w-16 text-center text-2xl font-extrabold border-l border-r border-blue-200 py-2 focus:outline-none focus:border-blue-400 focus:ring-blue-400 text-blue-700 bg-transparent"
                        />
                        <button
                          onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold"
                          disabled={quantity >= product.stock}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          const success = await addToCart(product, quantity);
                          if (success) {
                            toast.custom((t) => (
                              <div className={`bg-white/80 backdrop-blur border border-green-200 shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 max-w-[340px] ${t.visible ? 'animate-fade-in-up' : 'opacity-0'}`}>
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-400 shadow-lg">
                                  <FaCheckCircle className="text-white text-xl" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                  <div className="text-lg font-bold text-green-700 mb-1 flex items-center justify-center md:justify-start gap-2">
                                    {user ? 'Product added to cart!' : 'To add product to cart!'}
                                  </div>
                                  {user ? (
                                    <div className="text-gray-700 text-sm mb-2">You can continue shopping or proceed to checkout.</div>
                                  ) : null}
                                  <div className="flex flex-row gap-4 justify-center items-center mt-4 w-full max-w-xs mx-auto">
                                    {user ? (
                                      <>
                                        <button
                                          className="flex-1 flex items-center justify-center gap-2 px-0 py-3 rounded-full font-semibold text-base bg-gradient-to-r from-blue-400 to-purple-400 text-white shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300"
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
                                          className="flex-1 flex items-center justify-center gap-2 px-0 py-3 rounded-full font-semibold text-base bg-gradient-to-r from-pink-400 to-blue-400 text-white shadow-md transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-300"
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
                                        className="px-4 py-2 bg-gradient-to-r from-red-400 to-pink-400 text-white rounded-full font-semibold flex items-center gap-2 shadow hover:scale-105 transition-all duration-150"
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
                            ), { position: 'bottom-center', duration: 4000 });
                          }
                        }}
                        disabled={product.stock === 0 || quantity === 0}
                        className="flex-grow bg-gradient-to-r from-blue-400 to-pink-400 text-white py-3 px-6 rounded-full text-lg font-semibold hover:scale-105 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">You may also like</h2>
          <div className="flex gap-6 overflow-x-auto pb-2">
            {relatedProducts.map((rel) => (
              <div key={rel.id} className="min-w-[260px] bg-white/80 backdrop-blur rounded-2xl shadow-xl overflow-hidden flex flex-col border border-gray-100 hover:border-blue-300 hover:scale-[1.03] hover:ring-2 hover:ring-blue-100 transition-all duration-200">
                <div className="relative w-full h-40 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 flex items-center justify-center">
                  {rel.images && rel.images.length > 0 ? (
                    <Image
                      src={rel.images[0]}
                      alt={rel.name}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="hover:scale-105 transition-transform duration-200 rounded-b-none"
                    />
                  ) : (
                    <span className="flex flex-col items-center text-gray-400">
                      <FaBoxOpen className="text-3xl mb-2" />
                      No Image
                    </span>
                  )}
                  {/* Price badge */}
                  <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-400 to-blue-400 text-white px-3 py-1 rounded-full text-sm font-bold shadow">₹{rel.price.toFixed(2)}</span>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{rel.name}</h3>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">{rel.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className={`text-xs font-semibold flex items-center gap-1 ${rel.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>{rel.stock > 0 ? <FaCheckCircle /> : <FaTimesCircle />} {rel.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
                    <button
                      onClick={() => addToCart(rel, 1)}
                      disabled={rel.stock === 0}
                      className="bg-gradient-to-r from-blue-400 to-pink-400 text-white px-3 py-1 rounded-full flex items-center gap-2 shadow hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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