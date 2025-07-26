import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Removed direct imports for collection, query, etc. as they are not exported by firebase-admin/firestore
import dotenv from 'dotenv';
import path from 'path';
import { Order } from '@/types';

// Import Firebase Admin SDK types (optional, for type safety)
import type { ServiceAccount } from 'firebase-admin';
import type { Firestore, Transaction, QueryDocumentSnapshot } from 'firebase-admin/firestore'; // Import specific types

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use Firebase Admin SDK for backend scripts
// It's crucial to load the service account key securely.
// For production, consider using Google Cloud environment variables or a secrets manager.
// For local development, place `serviceAccountKey.json` in the root of your project
const serviceAccount = require(path.resolve(process.cwd(), './serviceAccountKey.json')) as ServiceAccount;

const firebaseAdminConfig = {
  credential: require("firebase-admin").credential.cert(serviceAccount),
};

// Initialize Firebase Admin SDK
const admin = require("firebase-admin");
const app = !admin.apps.length ? admin.initializeApp(firebaseAdminConfig) : admin.app();
const db: Firestore = admin.firestore(); // Explicitly type db as Firestore

const COUNTER_COLLECTION = 'counters';
const ORDER_COUNTER_DOC = 'orderCounter';

// getNextOrderNumber now accepts db as an argument
async function getNextOrderNumber(firestoreDb: Firestore): Promise<number> {
  const counterRef = firestoreDb.doc(`${COUNTER_COLLECTION}/${ORDER_COUNTER_DOC}`); // Use db.doc

  try {
    const newOrderNumber = await firestoreDb.runTransaction(async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let currentVal = 0;

      if (counterDoc.exists) {
        currentVal = counterDoc.data()?.current || 0;
      }

      const nextVal = currentVal + 1;
      transaction.set(counterRef, { current: nextVal });
      return nextVal;
    });
    return newOrderNumber;
  } catch (e) {
    console.error("Transaction failed in getNextOrderNumber: ", e);
    throw new Error("Failed to get next order number");
  }
}

async function backfillOrderNumbers() {
  console.log('Starting backfill of order numbers...');

  try {
    // 1. Fetch orders without an orderNumber
    const ordersRef = db.collection('orders'); // Use db.collection
    const q = ordersRef.where('orderNumber', '==', null); // Use ordersRef.where
    const querySnapshot = await q.get(); // Use q.get()

    if (querySnapshot.empty) {
      console.log('No orders found without an orderNumber. Exiting.');
      return;
    }

    console.log(`Found ${querySnapshot.docs.length} orders to backfill.`);

    const updates: Promise<void>[] = [];
    let lastAssignedOrderNumber = 0;

    // Get the initial order number from the counter before processing orders
    const counterRef = db.doc(`${COUNTER_COLLECTION}/${ORDER_COUNTER_DOC}`); // Use db.doc
    await db.runTransaction(async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists) {
        lastAssignedOrderNumber = counterDoc.data()?.current || 0;
        console.log(`Initial counter value: ${lastAssignedOrderNumber}`);
      } else {
        console.log('Order counter document not found. Will initialize.');
        lastAssignedOrderNumber = 0;
      }
    });

    // Sort orders by createdAt to ensure sequential numbering based on creation time
    const ordersToUpdate = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      } as Order;
    }).sort((a: Order, b: Order) => a.createdAt.getTime() - b.createdAt.getTime()); // Explicitly type a and b

    // Assign sequential numbers and prepare updates
    for (const orderDoc of ordersToUpdate) {
      lastAssignedOrderNumber++;
      const orderRef = db.doc(`orders/${orderDoc.id}`); // Use db.doc
      console.log(`Assigning order #${lastAssignedOrderNumber} to order ID: ${orderDoc.id}`);
      updates.push(db.runTransaction(async (transaction: Transaction) => {
        transaction.update(orderRef, { orderNumber: lastAssignedOrderNumber });
      }));
    }

    // Execute all order updates
    await Promise.all(updates);

    // Finally, update the counter with the highest assigned number
    await db.runTransaction(async (transaction: Transaction) => {
      const counterDoc = await transaction.get(counterRef);
      if (counterDoc.exists) {
        transaction.update(counterRef, { current: lastAssignedOrderNumber });
      } else {
        transaction.set(counterRef, { current: lastAssignedOrderNumber });
      }
      console.log(`Order counter updated to: ${lastAssignedOrderNumber}`);
    });

    console.log('Order number backfill completed successfully!');
  } catch (error) {
    console.error('Error during backfill process:', error);
  }
}

backfillOrderNumbers(); 