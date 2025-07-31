'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/types';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaInfoCircle, FaTrash, FaUndo } from 'react-icons/fa';

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  addToCart: (product: Product, quantity: number) => Promise<boolean>;
  removeFromCart: (productId: string) => Promise<void>;
  updateCartItemQuantity: (productId: string, newQuantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const prevCartRef = useRef<CartItem[]>([]);

  useEffect(() => {
    const fetchCart = async () => {
      if (user) {
        setLoading(true);
        try {
          // Use user's cart subcollection
          const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
          const cartDocSnap = await getDoc(cartDocRef);
          if (cartDocSnap.exists()) {
            const data = cartDocSnap.data();
            setCartItems(data.items || []);
          } else {
            setCartItems([]);
          }
        } catch (error) {
          console.error('Error fetching cart:', error);
          toast.error('Failed to load cart.');
        } finally {
          setLoading(false);
        }
      } else {
        setCartItems([]);
        setLoading(false);
      }
    };

    fetchCart();
  }, [user]);

  const addToCart = async (product: Product, quantity: number): Promise<boolean> => {
    if (!user) {
      // Do not show any top error toast. Only show the bottom creative toast from the product page.
      return false;
    }

    if (cartItems.length > 0) {
      const firstItemVendorId = cartItems[0].vendorId;
      if (firstItemVendorId !== product.vendorId) {
        toast.custom(
          (t) => (
            <div
              className={`flex max-w-[400px] items-center gap-4 rounded-2xl border-2 border-red-400 bg-white/90 px-6 py-4 shadow-2xl backdrop-blur ${t.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ zIndex: 9999 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-400 shadow-lg">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="mb-1 text-base font-bold text-red-700">Vendor Restriction</div>
                <div className="text-sm text-gray-700">
                  You can only add items from one vendor at a time.
                  <br />
                  Please clear your cart or place a new order.
                </div>
              </div>
              <button
                className="ml-4 rounded-full bg-gradient-to-r from-red-400 to-pink-400 px-3 py-1 text-sm font-semibold text-white shadow transition-all hover:scale-105"
                onClick={() => toast.dismiss(t.id)}
              >
                Dismiss
              </button>
            </div>
          ),
          { position: 'bottom-center', duration: 6000 }
        );
        return false;
      }
    }

    // Use user's cart subcollection
    const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
    const newCartItems = [...cartItems];

    const existingItemIndex = newCartItems.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      // Update quantity if item already exists
      newCartItems[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      newCartItems.push({ ...product, quantity });
    }

    try {
      await setDoc(cartDocRef, { items: newCartItems }, { merge: true });
      setCartItems(newCartItems);
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add to cart.');
      return false;
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    // Use user's cart subcollection
    const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
    const removedItem = cartItems.find((item) => item.id === productId);
    const updatedCartItems = cartItems.filter((item) => item.id !== productId);
    prevCartRef.current = cartItems;
    try {
      await updateDoc(cartDocRef, { items: updatedCartItems });
      setCartItems(updatedCartItems);
      toast.custom(
        (t) => (
          <div
            className={`flex max-w-[340px] items-center gap-4 rounded-2xl border border-red-200 bg-white/80 px-6 py-4 shadow-2xl backdrop-blur ${t.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-pink-400 shadow-lg">
              <FaTrash className="text-xl text-white" />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-base font-bold text-red-700">Item removed from cart!</div>
            </div>
            <button
              className="rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-3 py-1 text-sm font-semibold text-white shadow transition-all hover:scale-105"
              onClick={async () => {
                toast.dismiss(t.id);
                if (removedItem) {
                  const restoredCart = [...updatedCartItems, removedItem];
                  await updateDoc(cartDocRef, { items: restoredCart });
                  setCartItems(restoredCart);
                  toast.success('Undo: Item restored!');
                }
              }}
            >
              <FaUndo className="mr-1 inline" /> Undo
            </button>
          </div>
        ),
        { position: 'bottom-center', duration: 4000 }
      );
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item from cart.');
    }
  };

  const updateCartItemQuantity = async (productId: string, newQuantity: number) => {
    if (!user) return;
    // Use user's cart subcollection
    const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
    const prevCart = [...cartItems];
    const updatedCartItems = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    prevCartRef.current = cartItems;
    try {
      await updateDoc(cartDocRef, { items: updatedCartItems });
      setCartItems(updatedCartItems);
    } catch (error) {
      console.error('Error updating item quantity:', error);
      toast.error('Failed to update quantity.');
    }
  };

  const clearCart = async () => {
    if (!user) return;
    // Use user's cart subcollection
    const cartDocRef = doc(db, 'users', user.uid, 'cart', 'current');
    const prevCart = [...cartItems];
    prevCartRef.current = cartItems;
    try {
      await setDoc(cartDocRef, { items: [] });
      setCartItems([]);
      toast.custom(
        (t) => (
          <div
            className={`flex max-w-[340px] items-center gap-4 rounded-2xl border border-yellow-200 bg-white/80 px-6 py-4 shadow-2xl backdrop-blur ${t.visible ? 'animate-fade-in-up' : 'opacity-0'}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-pink-400 shadow-lg">
              <FaInfoCircle className="text-xl text-white" />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-base font-bold text-yellow-700">Cart cleared!</div>
            </div>
            <button
              className="rounded-full bg-gradient-to-r from-blue-400 to-pink-400 px-3 py-1 text-sm font-semibold text-white shadow transition-all hover:scale-105"
              onClick={async () => {
                toast.dismiss(t.id);
                await setDoc(cartDocRef, { items: prevCart });
                setCartItems(prevCart);
                toast.success('Undo: Cart restored!');
              }}
            >
              <FaUndo className="mr-1 inline" /> Undo
            </button>
          </div>
        ),
        { position: 'bottom-center', duration: 4000 }
      );
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart.');
    }
  };

  const value = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
