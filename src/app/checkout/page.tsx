'use client';

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useCart } from '@/context/CartContext';
import {
  doc,
  updateDoc,
  collection,
  addDoc,
  writeBatch,
  runTransaction,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Address, Order, CartItem } from '@/types';
import {
  calculateDeliveryFee,
  FREE_SHIPPING_THRESHOLD,
  calculateServiceFee,
  DELIVERY_FEE,
} from '@/lib/fees';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SERVICE_FEE_PERCENT = 2;

export default function CheckoutPage() {
  const { user, loading, refreshUserData } = useAuth();
  const { cartItems, loading: cartLoading, clearCart: clearCartContext } = useCart();
  const router = useRouter();

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(0);
  const [allAddresses, setAllAddresses] = useState<Address[]>(user?.addresses || []);
  const [shippingAddress, setShippingAddress] = useState<Address>(
    user?.addresses && user.addresses.length > 0
      ? { ...user.addresses[0], phoneNumber: user?.phoneNumber || '' }
      : {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          phoneNumber: user?.phoneNumber || '',
        }
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState('');
  const [addressErrors, setAddressErrors] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  useEffect(() => {
    if (user && Array.isArray(user.addresses)) {
      setAllAddresses(user.addresses);
      if (user.addresses.length > 0) {
        setShippingAddress({
          ...(user.addresses[selectedAddressIdx] || user.addresses[0]),
          phoneNumber: user.phoneNumber || '',
        });
      } else {
        setShippingAddress({
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          phoneNumber: user.phoneNumber || '',
        });
      }
    } else {
      setAllAddresses([]);
      setShippingAddress({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phoneNumber: user?.phoneNumber || '',
      });
    }
    if (selectedPaymentMethod === 'razorpay' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
    setShippingAddress((prev) => ({ ...prev, phoneNumber: phone }));
  }, [user, user?.addresses, selectedAddressIdx, user?.phoneNumber, selectedPaymentMethod, phone]);

  useEffect(() => {
    if (!loading && (!user || !user.email)) {
      router.replace('/cart');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setPhone(user.phoneNumber || '');
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      refreshUserData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUserData]);

  useEffect(() => {
    refreshUserData();
  }, []);

  const handleSelectAddress = (idx: number) => {
    setSelectedAddressIdx(idx);
    setShippingAddress({ ...allAddresses[idx], phoneNumber: user?.phoneNumber || '' });
    setIsEditingAddress(false);
    setIsAddingNewAddress(false);
  };

  const handleAddNewAddress = () => {
    setIsAddingNewAddress(true);
    setIsEditingAddress(true);
    setShippingAddress({
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      phoneNumber: user?.phoneNumber || '',
    });
  };

  const validateAddress = (address: Address) => {
    const errors = { street: '', city: '', state: '', zipCode: '', country: '' };
    if (!address.street || address.street.trim() === '')
      errors.street = 'Street address is required.';
    if (!address.city || address.city.trim() === '') errors.city = 'City is required.';
    if (!address.state || address.state.trim() === '') errors.state = 'State is required.';
    if (!address.zipCode || address.zipCode.trim() === '') {
      errors.zipCode = 'Zip code is required.';
    } else if (!/^[0-9]{3,}$/.test(address.zipCode.trim())) {
      errors.zipCode = 'Zip code must be numeric.';
    }
    if (!address.country || address.country.trim() === '') errors.country = 'Country is required.';
    return errors;
  };

  const handleSaveAddress = async () => {
    const errors = validateAddress(shippingAddress);
    setAddressErrors(errors);
    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) return;
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      let updatedAddresses = [...allAddresses];
      if (isAddingNewAddress) {
        updatedAddresses.push({ ...shippingAddress, phoneNumber: phone });
        await updateDoc(userRef, {
          addresses: updatedAddresses,
        });
        setAllAddresses(updatedAddresses);
        setSelectedAddressIdx(updatedAddresses.length - 1);
        setIsAddingNewAddress(false);
      } else {
        updatedAddresses[selectedAddressIdx] = { ...shippingAddress, phoneNumber: phone };
        await updateDoc(userRef, {
          addresses: updatedAddresses,
        });
        setAllAddresses(updatedAddresses);
      }
      await refreshUserData();
      toast.success('Shipping address updated!');
      setIsEditingAddress(false);
      setAddressErrors({ street: '', city: '', state: '', zipCode: '', country: '' });
    } catch (error) {
      toast.error('Failed to update address.');
    }
  };

  const handleEditAddress = (idx: number) => {
    setSelectedAddressIdx(idx);
    setShippingAddress({ ...allAddresses[idx], phoneNumber: user?.phoneNumber || '' });
    setIsEditingAddress(true);
    setIsAddingNewAddress(false);
  };

  const handleDeleteAddress = async (idx: number) => {
    if (!user) return;
    if (allAddresses.length === 1) {
      toast.error('At least one address is required.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const updatedAddresses = allAddresses.filter((_, i) => i !== idx);
      await updateDoc(userRef, {
        addresses: updatedAddresses,
        updatedAt: new Date(),
      });
      setAllAddresses(updatedAddresses);
      setSelectedAddressIdx(0);
      setShippingAddress({ ...updatedAddresses[0], phoneNumber: user?.phoneNumber || '' });
      await refreshUserData();
      toast.success('Address deleted.');
    } catch (error) {
      toast.error('Failed to delete address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      console.log('User not logged in, redirecting to login.');
      toast.error('Please log in to place an order.');
      router.push('/login');
      return;
    }
    // Debug: Log user info before placing order
    console.log('Placing order as user:', user);
    console.log('User UID:', user.uid);
    console.log('User role:', user.role);
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      console.log('Incomplete shipping address.');
      toast.error('Please provide a complete shipping address.');
      setIsEditingAddress(true);
      return;
    }
    if (!phone || !email) {
      toast.error('Phone and email are required.');
      return;
    }
    if (cartItems.length === 0) {
      console.log('Cart is empty.');
      toast.error('Your cart is empty. Add items to proceed.');
      return;
    }

    try {
      const orderData = {
        userId: user.uid,
        cartItems: cartItems,
        shippingAddress: { ...shippingAddress, phoneNumber: phone },
        paymentMethod: selectedPaymentMethod,
        phoneNumber: phone,
        email: email,
      };

      if (selectedPaymentMethod === 'cod') {
        const batch = writeBatch(db);
        const ordersCollectionRef = collection(db, 'orders');

        // Group cart items by vendor
        const ordersByVendor: { [vendorId: string]: CartItem[] } = {};
        cartItems.forEach((item) => {
          if (!ordersByVendor[item.vendorId]) {
            ordersByVendor[item.vendorId] = [];
          }
          ordersByVendor[item.vendorId].push(item);
        });

        const orderNumbers: string[] = [];
        for (const vendorId in ordersByVendor) {
          const vendorItems = ordersByVendor[vendorId];
          const vendorOrderSubtotal = vendorItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          const deliveryFee = calculateDeliveryFee(vendorOrderSubtotal);
          const serviceFee = calculateServiceFee(vendorOrderSubtotal);
          const total = vendorOrderSubtotal + deliveryFee + serviceFee;

          // Generate persistent order number
          let orderNumber = '';
          console.log('About to run Firestore transaction for order number for vendor:', vendorId);
          await runTransaction(db, async (transaction) => {
            const metaRef = doc(db, 'orderMeta', 'numbering');
            const metaSnap = await transaction.get(metaRef);
            let lastNumber = 0;
            if (metaSnap.exists()) {
              lastNumber = metaSnap.data().lastNumber || 0;
            }
            const newNumber = lastNumber + 1;
            orderNumber = `ORD-2024-${String(newNumber).padStart(4, '0')}`;
            transaction.set(metaRef, { lastNumber: newNumber }, { merge: true });
          });
          console.log(
            'Successfully ran Firestore transaction for order number. Got orderNumber:',
            orderNumber
          );
          orderNumbers.push(orderNumber);

          const newOrderRef = doc(ordersCollectionRef);
          const newOrder: Order = {
            id: newOrderRef.id,
            userId: user.uid,
            vendorId: vendorId, // Add vendorId to order
            items: vendorItems,
            total,
            deliveryFee,
            serviceFee,
            status: 'pending',
            shippingAddress: shippingAddress,
            paymentStatus: String(selectedPaymentMethod) === 'cod' ? 'pending' : 'completed',
            paymentMethod: selectedPaymentMethod,
            phoneNumber: phone,
            createdAt: new Date(),
            updatedAt: new Date(),
            estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            customerName: user.displayName || '', // Store customer name
            customerEmail: email, // Optionally store email
            orderNumber, // Store persistent order number
          };
          // Debug: Log before setting order
          console.log(
            'Attempting to create order for vendor:',
            vendorId,
            'OrderRef:',
            newOrderRef.path,
            'Order:',
            newOrder
          );
          batch.set(newOrderRef, newOrder);
          // Debug: Log after setting order
          console.log('Order set in batch for vendor:', vendorId);

          // Decrement product stock
          for (const item of vendorItems) {
            const productRef = doc(db, 'products', item.id);
            // Debug: Log before updating product stock
            console.log(
              'Attempting to update product stock:',
              productRef.path,
              'Old stock:',
              item.stock,
              'Quantity:',
              item.quantity
            );
            batch.update(productRef, { stock: item.stock - item.quantity });
            // Debug: Log after updating product stock
            console.log('Product stock update set in batch for:', productRef.path);
          }
          // Add notification for this order
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: user.uid,
              type: 'order_placed',
              message: 'Your order has been placed successfully!',
              createdAt: new Date(),
              read: false,
              data: { orderNumber },
              link: `/account/orders/${newOrderRef.id}`,
              linkLabel: 'View Order',
            });
          } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
          }
        }

        // Debug: Log before committing batch
        console.log('Committing Firestore batch for order placement...');
        await batch.commit();
        // Debug: Log after committing batch
        console.log('Batch committed successfully. Clearing cart...');
        // Debug: Log before clearing cart
        console.log('Clearing cart for user UID:', user.uid);
        clearCartContext();
        // Debug: Log after clearing cart
        console.log('Cart cleared for user UID:', user.uid);
        toast.success('Order(s) placed successfully (Cash on Delivery)!');
        router.push('/order-confirmation');
      } else if (selectedPaymentMethod === 'razorpay') {
        // Initiate Razorpay payment
        const razorpayOrderDetails = {
          amount: subtotal * 100, // Razorpay amount in smallest currency unit (paise)
          currency: 'USD',
          receipt: `receipt_${Date.now()}`,
          payment_capture: 1, // Auto capture payment
        };

        const razorpayOrderRes = await fetch('/api/razorpay/order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(razorpayOrderDetails),
        });

        const razorpayOrder = await razorpayOrderRes.json();

        if (razorpayOrder.error) {
          toast.error(razorpayOrder.error);
          return;
        }

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Your Razorpay Key ID
          amount: razorpayOrder.amount, // Amount in paisa. Default currency is INR.
          currency: razorpayOrder.currency,
          name: 'Swift Stationery',
          description: 'Order Payment',
          order_id: razorpayOrder.id, // This is the order ID created on Razorpay's server
          handler: async function (response: any) {
            // After successful Razorpay payment, call our backend API to finalize the order
            const finalizeOrderRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verificationResult = await finalizeOrderRes.json();

            if (verificationResult.success) {
              const batch = writeBatch(db);
              const ordersCollectionRef = collection(db, 'orders');

              // Group cart items by vendor
              const ordersByVendor: { [vendorId: string]: CartItem[] } = {};
              cartItems.forEach((item) => {
                if (!ordersByVendor[item.vendorId]) {
                  ordersByVendor[item.vendorId] = [];
                }
                ordersByVendor[item.vendorId].push(item);
              });

              for (const vendorId in ordersByVendor) {
                const vendorItems = ordersByVendor[vendorId];
                const vendorOrderSubtotal = vendorItems.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0
                );
                const deliveryFee = calculateDeliveryFee(vendorOrderSubtotal);
                const serviceFee = calculateServiceFee(vendorOrderSubtotal);
                const total = vendorOrderSubtotal + deliveryFee + serviceFee;

                // Generate persistent order number
                let orderNumber = '';
                await runTransaction(db, async (transaction) => {
                  const metaRef = doc(db, 'orderMeta', 'numbering');
                  const metaSnap = await transaction.get(metaRef);
                  let lastNumber = 0;
                  if (metaSnap.exists()) {
                    lastNumber = metaSnap.data().lastNumber || 0;
                  }
                  const newNumber = lastNumber + 1;
                  orderNumber = `ORD-2024-${String(newNumber).padStart(4, '0')}`;
                  transaction.set(metaRef, { lastNumber: newNumber }, { merge: true });
                });

                const newOrderRef = doc(ordersCollectionRef);
                const newOrder: Order = {
                  id: newOrderRef.id,
                  userId: user.uid,
                  vendorId: vendorId, // Add vendorId to order
                  items: vendorItems,
                  total,
                  deliveryFee,
                  serviceFee,
                  status: 'pending',
                  shippingAddress: shippingAddress,
                  paymentStatus: String(selectedPaymentMethod) === 'cod' ? 'pending' : 'completed',
                  paymentMethod: selectedPaymentMethod,
                  phoneNumber: phone,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
                  customerName: user.displayName || '', // Store customer name
                  customerEmail: email, // Optionally store email
                  orderNumber, // Store persistent order number
                };
                batch.set(newOrderRef, newOrder);

                // Decrement product stock
                for (const item of vendorItems) {
                  const productRef = doc(db, 'products', item.id);
                  batch.update(productRef, { stock: item.stock - item.quantity });
                }
              }

              await batch.commit();
              clearCartContext();
              toast.success('Payment successful and order placed!');
              router.push('/order-confirmation');
            } else {
              toast.error(
                verificationResult.error || 'Payment verification failed and order not placed.'
              );
            }
          },
          prefill: {
            name: user.displayName || '',
            email: email,
            contact: phone,
          },
          notes: {
            address: shippingAddress.street,
          },
          theme: {
            color: '#3399CC',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = calculateDeliveryFee(subtotal);
  const serviceFee = calculateServiceFee(subtotal);
  const orderTotal = subtotal + shipping + serviceFee;

  // Address validation helper
  const isAddressComplete = (address: Address | undefined) => {
    if (!address) return false;
    return (
      address.street?.trim() &&
      address.city?.trim() &&
      address.state?.trim() &&
      address.zipCode?.trim() &&
      address.country?.trim()
    );
  };

  function isAddressEmpty(address: Address) {
    if (!address) return true;
    return [address.street, address.city, address.state, address.zipCode, address.country].every(
      (field) => !field || field.trim() === ''
    );
  }

  const addressErrorMessages = Object.values(addressErrors).filter(Boolean);

  if (loading || cartLoading || !user || !user.email) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['customer', 'vendor', 'admin', 'admin-manager']}>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-pink-50 px-4 py-12">
        <div className="animate-fade-in flex w-full max-w-3xl flex-col gap-10 rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-2xl md:p-12">
          {/* Decorative Gradient Icon */}
          <span className="absolute -top-10 left-1/2 inline-flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6" />
              <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24" />
              <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6" />
            </svg>
          </span>
          {/* Gradient Accent Bar */}
          <div className="mx-auto mt-8 mb-6 h-2 w-24 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
          <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm md:text-5xl">
            Checkout
          </h1>

          {/* Shipping Information */}
          <div className="mb-4 rounded-2xl border border-blue-50 bg-white/80 p-6 shadow-lg">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <span className="mr-2 inline-block h-6 w-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
              Shipping Information
            </h2>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-gray-900 shadow-sm"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white/90 px-4 py-3 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <hr className="my-4 border-blue-200" />

            {/* Address Section */}
            {(allAddresses.length === 0 ||
              (allAddresses.length === 1 && isAddressEmpty(allAddresses[0]))) &&
            !isEditingAddress ? (
              <div>
                <h3 className="mb-2 text-lg font-semibold">Add Shipping Address</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.street ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.street}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, street: e.target.value });
                      setAddressErrors({ ...addressErrors, street: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.state ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.state}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, state: e.target.value });
                      setAddressErrors({ ...addressErrors, state: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.city ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.city}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, city: e.target.value });
                      setAddressErrors({ ...addressErrors, city: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.zipCode ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.zipCode}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, zipCode: e.target.value });
                      setAddressErrors({ ...addressErrors, zipCode: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.country ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.country}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, country: e.target.value });
                      setAddressErrors({ ...addressErrors, country: '' });
                    }}
                  />
                </div>
                {addressErrorMessages.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700">
                    <ul className="list-disc pl-5">
                      {addressErrorMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 py-3 text-base font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSaveAddress}
                  type="button"
                  disabled={addressErrorMessages.length > 0}
                >
                  Save Address
                </button>
              </div>
            ) : allAddresses.length > 0 && !isEditingAddress ? (
              <div>
                <h3 className="mb-2 text-lg font-semibold">Select Shipping Address</h3>
                <div className="mb-2 space-y-2">
                  {allAddresses.map((addr, idx) => (
                    <div
                      key={idx}
                      className="mb-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-white/70 px-3 py-2"
                    >
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={selectedAddressIdx === idx}
                        onChange={() => handleSelectAddress(idx)}
                        className="h-4 w-4 accent-blue-500"
                      />
                      <span className="flex-1 text-sm text-gray-700">
                        {addr.street}, {addr.city}, {addr.state}, {addr.zipCode}, {addr.country}
                      </span>
                      <button
                        className="text-xs font-bold text-blue-600 hover:underline"
                        onClick={() => handleEditAddress(idx)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs font-bold text-red-500 hover:underline"
                        onClick={() => handleDeleteAddress(idx)}
                        type="button"
                        disabled={allAddresses.length === 1}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-2 rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 px-4 py-2 text-base font-bold text-white shadow transition-all hover:from-blue-600 hover:to-pink-500"
                  onClick={handleAddNewAddress}
                  type="button"
                >
                  + Add New Address
                </button>
              </div>
            ) : (
              // Editing or adding new address
              <div>
                <h3 className="mb-2 text-lg font-semibold">
                  {isAddingNewAddress ? 'Add Shipping Address' : 'Edit Shipping Address'}
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.street ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.street}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, street: e.target.value });
                      setAddressErrors({ ...addressErrors, street: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.state ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.state}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, state: e.target.value });
                      setAddressErrors({ ...addressErrors, state: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.city ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.city}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, city: e.target.value });
                      setAddressErrors({ ...addressErrors, city: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Zip Code"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.zipCode ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.zipCode}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, zipCode: e.target.value });
                      setAddressErrors({ ...addressErrors, zipCode: '' });
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    className={`rounded-xl border px-4 py-3 ${addressErrors.country ? 'border-red-500' : 'border-gray-300'} bg-white/90 text-gray-900 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-300`}
                    value={shippingAddress.country}
                    onChange={(e) => {
                      setShippingAddress({ ...shippingAddress, country: e.target.value });
                      setAddressErrors({ ...addressErrors, country: '' });
                    }}
                  />
                </div>
                {addressErrorMessages.length > 0 && (
                  <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-sm text-red-700">
                    <ul className="list-disc pl-5">
                      {addressErrorMessages.map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-500 to-pink-400 py-3 text-base font-bold text-white shadow-lg transition-all hover:from-blue-600 hover:to-pink-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleSaveAddress}
                  type="button"
                  disabled={addressErrorMessages.length > 0}
                >
                  Save Address
                </button>
                <button
                  className="mt-2 w-full rounded-xl border border-blue-400 bg-white py-2 text-base font-bold text-blue-700 shadow transition-all hover:bg-blue-50"
                  onClick={() => {
                    setIsEditingAddress(false);
                    setIsAddingNewAddress(false);
                    setShippingAddress(allAddresses[selectedAddressIdx]);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="mb-4 rounded-2xl border border-blue-50 bg-white/80 p-6 shadow-lg">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <span className="mr-2 inline-block h-6 w-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
              Payment Method
            </h2>
            <div className="flex flex-col gap-4 md:flex-row">
              <button
                className={`flex-1 rounded-xl border-2 p-4 ${selectedPaymentMethod === 'cod' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'} shadow transition-all hover:shadow-lg focus:ring-2 focus:ring-pink-400 focus:outline-none`}
                onClick={() => setSelectedPaymentMethod('cod')}
                type="button"
                aria-pressed={selectedPaymentMethod === 'cod'}
              >
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <span role="img" aria-label="Cash" className="text-2xl text-pink-500">
                    💵
                  </span>
                  Cash on Delivery (COD)
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  Pay with cash upon delivery of your order.
                </span>
              </button>
              <button
                className={`flex-1 rounded-xl border-2 p-4 ${selectedPaymentMethod === 'razorpay' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} shadow transition-all hover:shadow-lg focus:ring-2 focus:ring-blue-400 focus:outline-none`}
                onClick={() => setSelectedPaymentMethod('razorpay')}
                type="button"
                aria-pressed={selectedPaymentMethod === 'razorpay'}
              >
                <span className="text-center text-base leading-tight font-bold break-words whitespace-normal">
                  Razorpay (Card/UPI/Netbanking)
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  Pay securely online using Razorpay.
                </span>
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="rounded-2xl border border-blue-50 bg-white/80 p-6 shadow-lg">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <span className="mr-2 inline-block h-6 w-2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
              Order Summary
            </h2>
            {cartItems.length === 0 ? (
              <div className="text-center text-gray-500">Your cart is empty.</div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-gray-200 pb-2"
                  >
                    <div className="flex items-center gap-3">
                      {item.images && item.images[0] && (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="h-12 w-12 rounded-md border border-gray-200 object-cover"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">x {item.quantity}</div>
                      </div>
                    </div>
                    <div className="font-bold text-blue-700">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-4">
                  <span className="font-medium text-gray-700">Subtotal</span>
                  <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between font-semibold text-gray-700">
                  <span className="flex w-full flex-col gap-2 md:flex-row md:items-center">
                    <span className="flex items-center gap-2">Delivery Fee</span>
                    {subtotal < FREE_SHIPPING_THRESHOLD && (
                      <span className="animate-fade-in ml-2 hidden items-center overflow-hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 px-4 py-2 whitespace-nowrap shadow md:flex">
                        <span className="mr-1 animate-bounce text-lg leading-tight font-extrabold text-green-600 md:text-xl">
                          ${subtotal}
                        </span>
                        <span
                          className="ml-1 align-middle text-base font-medium text-gray-500 md:text-lg"
                          style={{ fontWeight: 500 }}
                        >
                          away from <span className="font-bold text-green-600">FREE delivery!</span>
                        </span>
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      subtotal >= FREE_SHIPPING_THRESHOLD
                        ? 'flex flex-col items-end'
                        : 'text-lg font-bold text-blue-600'
                    }
                  >
                    {subtotal >= FREE_SHIPPING_THRESHOLD ? (
                      <>
                        <span className="text-xl font-extrabold text-green-600">$0.00</span>
                        <span className="mt-1 flex items-center justify-center">
                          <span className="flex flex-row items-center gap-1 rounded-full border border-green-200 bg-gradient-to-r from-green-100 via-blue-50 to-pink-50 px-3 py-1 whitespace-nowrap shadow-sm">
                            <span
                              className="rounded-full border border-green-300 bg-gradient-to-r from-green-400 to-blue-400 px-3 py-1 text-xs font-bold text-white shadow select-none"
                              style={{ letterSpacing: '2px' }}
                            >
                              FREE
                            </span>
                            <span className="text-base font-bold text-red-600">-</span>
                            <span className="text-base font-bold text-red-600">
                              ${DELIVERY_FEE.toFixed(2)}
                            </span>
                          </span>
                        </span>
                      </>
                    ) : (
                      <>${shipping.toFixed(2)}</>
                    )}
                  </span>
                </div>
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <span className="animate-fade-in mt-2 mb-2 flex w-full items-center overflow-hidden rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 via-green-50 to-pink-50 px-4 py-2 whitespace-nowrap shadow md:hidden">
                    <span className="mr-1 animate-bounce text-lg leading-tight font-extrabold text-green-600 md:text-xl">
                      ${subtotal}
                    </span>
                    <span
                      className="ml-1 align-middle text-base font-medium text-gray-500 md:text-lg"
                      style={{ fontWeight: 500 }}
                    >
                      away from <span className="font-bold text-green-600">FREE delivery!</span>
                    </span>
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    Service Fee{' '}
                    <span className="ml-2 text-xs text-gray-500">
                      ({SERVICE_FEE_PERCENT}% of subtotal)
                    </span>
                  </span>
                  <span className="font-semibold text-gray-900">${serviceFee.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-4">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-extrabold text-pink-500">
                    ${orderTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Place Order Button */}
          {!isAddressComplete(shippingAddress) && (
            <div className="mb-2 w-full text-center font-semibold text-red-600">
              Please enter and save a complete shipping address to place your order.
            </div>
          )}
          <div className="mt-6 flex w-full flex-col items-center justify-between gap-4 md:flex-row">
            <button
              className="flex-1 rounded-2xl border-2 border-blue-400 bg-white px-8 py-4 text-xl font-extrabold text-blue-500 shadow-xl transition-all hover:bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
              onClick={() => router.push('/cart')}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-pink-400 px-8 py-4 text-xl font-extrabold text-white shadow-xl transition-all hover:from-blue-600 hover:to-pink-500 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:outline-none"
              onClick={handlePlaceOrder}
              disabled={
                cartItems.length === 0 || !isAddressComplete(shippingAddress) || isEditingAddress
              }
              type="button"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
