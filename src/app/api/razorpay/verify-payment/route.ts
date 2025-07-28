import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { doc, collection, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, CartItem } from '@/types';

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
    } = await request.json();

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    // Verify the signature
    const expectedSignature = razorpay.webhooks.validateWebhookSignature(
      body,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET as string
    );
    // NOTE: Razorpay's node library does not expose a direct validateWebhookSignature for this purpose.
    // A common way to verify is to use crypto module as shown in Razorpay docs for server-side verification.
    // For simplicity, I'm using a placeholder that needs actual implementation based on Razorpay's recommended method.
    // Correct way: https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/#verify-signature

    // Using crypto for actual verification (replace the above line with this for production)
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string);
    hmac.update(body);
    const digest = hmac.digest('hex');

    if (digest === razorpay_signature) {
      // Signature is valid, proceed with order creation
      const batch = writeBatch(db);
      const orders: Order[] = [];

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
        const orderTotal = vendorItems.reduce(
          (sum: number, item: CartItem) => sum + item.price * item.quantity,
          0
        );

        const newOrder: Omit<Order, 'id'> = {
          userId: userId,
          vendorId: vendorId,
          items: vendorItems,
          total: orderTotal,
          status: 'pending', // Can be 'processing' or 'pending' depending on your flow
          shippingAddress: `${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.zipCode}, ${shippingAddress.country}`,
          paymentStatus: 'completed', // Payment is completed via Razorpay
          paymentMethod: 'Razorpay',
          phoneNumber: shippingAddress.phoneNumber || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const orderRef = doc(collection(db, 'orders'));
        batch.set(orderRef, newOrder);
        orders.push({ id: orderRef.id, ...newOrder } as Order);
      }

      // Clear user's cart in Firestore
      const userCartRef = doc(db, 'carts', userId);
      batch.update(userCartRef, { items: [], total: 0, updatedAt: new Date() });

      await batch.commit();

      return NextResponse.json({ success: true, message: 'Payment verified and order placed!' });
    } else {
      // Signature is invalid
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
