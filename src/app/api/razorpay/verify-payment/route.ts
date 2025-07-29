import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { doc, collection, addDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, CartItem } from '@/types';
import { calculateServiceFee, DELIVERY_FEE } from '@/lib/fees';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function POST(request: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      cartItems,
      shippingAddress,
      deliveryOption,
      paymentMethod,
      phoneNumber,
      email,
    } = await request.json();

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    // Using crypto for actual verification
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string);
    hmac.update(body);
    const digest = hmac.digest('hex');

    if (digest === razorpay_signature) {
      // Signature is valid, proceed with order creation
      const batch = writeBatch(db);
      const orders: Order[] = [];
      const orderNumbers: string[] = [];
      const orderRefs: any[] = [];

      // Group cart items by vendor
      const itemsByVendor = cartItems.reduce((acc: Record<string, CartItem[]>, item: CartItem) => {
        if (!acc[item.vendorId]) {
          acc[item.vendorId] = [];
        }
        acc[item.vendorId].push(item);
        return acc;
      }, {});

      for (const vendorId in itemsByVendor) {
        const vendorItems = itemsByVendor[vendorId];
        const vendorOrderSubtotal = vendorItems.reduce(
          (sum: number, item: CartItem) => sum + item.price * item.quantity,
          0
        );
        const deliveryFee = deliveryOption === 'delivery' ? DELIVERY_FEE : 0;
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

        orderNumbers.push(orderNumber);

        const newOrderRef = doc(collection(db, 'orders'));
        orderRefs.push(newOrderRef);

        const newOrder: Order = {
          id: newOrderRef.id,
          userId: userId,
          vendorId: vendorId,
          items: vendorItems,
          total,
          deliveryFee,
          serviceFee,
          status: 'pending',
          shippingAddress: shippingAddress,
          paymentStatus: 'completed', // Payment is completed via Razorpay
          paymentMethod: paymentMethod || 'razorpay',
          deliveryOption: deliveryOption || 'delivery',
          phoneNumber: phoneNumber || shippingAddress.phoneNumber || '',
          createdAt: new Date(),
          updatedAt: new Date(),
          estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          customerEmail: email,
          orderNumber,
        };

        batch.set(newOrderRef, newOrder);
        orders.push({ id: newOrderRef.id, ...newOrder } as Order);

        // Decrement product stock
        for (const item of vendorItems) {
          const productRef = doc(db, 'products', item.id);
          batch.update(productRef, { stock: item.stock - item.quantity });
        }
      }

      // Clear user's cart in Firestore
      const userCartRef = doc(db, 'carts', userId);
      batch.update(userCartRef, { items: [], total: 0, updatedAt: new Date() });

      // Commit the batch first
      await batch.commit();

      // Only create notifications after successful batch commit
      for (let i = 0; i < orderNumbers.length; i++) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            type: 'order_placed',
            message: 'Your order has been placed successfully!',
            createdAt: new Date(),
            read: false,
            data: { orderNumber: orderNumbers[i] },
            link: `/account/orders/${orderRefs[i].id}`,
            linkLabel: orderNumbers[i],
          });
        } catch (notifErr) {
          console.error('Failed to create notification for order:', orderNumbers[i], notifErr);
          // Don't fail the entire order process if notification creation fails
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Payment verified and order placed!',
        orderNumbers 
      });
    } else {
      // Signature is invalid
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    
    // Provide more specific error messages
    if (error.code === 'permission-denied') {
      return NextResponse.json({ 
        success: false, 
        error: 'Permission denied. Please check your account status.' 
      }, { status: 403 });
    } else if (error.code === 'unavailable') {
      return NextResponse.json({ 
        success: false, 
        error: 'Service temporarily unavailable. Please try again.' 
      }, { status: 503 });
    } else if (error.code === 'resource-exhausted') {
      return NextResponse.json({ 
        success: false, 
        error: 'Service overloaded. Please try again in a moment.' 
      }, { status: 429 });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'An unexpected error occurred.' 
      }, { status: 500 });
    }
  }
}
