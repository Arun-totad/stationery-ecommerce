import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { collection, getDocs, query, where, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Vendor, Product } from '@/types';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function syncVendorProducts() {
  console.log('Starting vendor products sync...');

  try {
    // Get all vendors
    const vendorsQuery = query(collection(db, 'users'), where('role', '==', 'vendor'));
    const vendorsSnapshot = await getDocs(vendorsQuery);
    const vendors = vendorsSnapshot.docs.map((doc) => ({
      ...(doc.data() as Vendor),
      uid: doc.id,
    }));

    console.log(`Found ${vendors.length} vendors`);

    // Process each vendor
    for (const vendor of vendors) {
      console.log(`\nProcessing vendor: ${vendor.displayName || vendor.email} (${vendor.uid})`);

      // Get all products for this vendor
      const productsQuery = query(collection(db, 'products'), where('vendorId', '==', vendor.uid));
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];

      console.log(`Found ${products.length} products for vendor`);

      // Get current products array from vendor
      const currentProducts = vendor.products || [];
      const productIds = products.map((p) => p.id);

      // Find products that need to be added or removed
      const productsToAdd = productIds.filter((id) => !currentProducts.includes(id));
      const productsToRemove = currentProducts.filter((id) => !productIds.includes(id));

      if (productsToAdd.length === 0 && productsToRemove.length === 0) {
        console.log('No changes needed for this vendor');
        continue;
      }

      console.log(`Products to add: ${productsToAdd.length}`);
      console.log(`Products to remove: ${productsToRemove.length}`);

      // Update vendor's products array
      const batch = writeBatch(db);
      const vendorRef = doc(db, 'users', vendor.uid);

      // Create new products array by removing products that don't exist and adding new ones
      const updatedProducts = [
        ...currentProducts.filter((id) => !productsToRemove.includes(id)),
        ...productsToAdd,
      ];

      batch.update(vendorRef, { products: updatedProducts });
      await batch.commit();

      console.log('Updated vendor products array successfully');
    }

    console.log('\nVendor products sync completed successfully!');
  } catch (error) {
    console.error('Error syncing vendor products:', error);
    process.exit(1);
  }
}

// Run the sync
syncVendorProducts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
