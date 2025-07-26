'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc, arrayRemove } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Product } from '@/types';

interface BulkProductOperationsProps {
  selectedProducts: string[];
  onOperationComplete: () => void;
}

type OperationType = 'delete' | 'updateStatus' | 'updatePrice' | 'updateStock';

export default function BulkProductOperations({
  selectedProducts,
  onOperationComplete,
}: BulkProductOperationsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>('updateStatus');
  const [priceUpdate, setPriceUpdate] = useState({
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
  });
  const [stockUpdate, setStockUpdate] = useState({
    type: 'add' as 'add' | 'subtract' | 'set',
    value: '',
  });

  const handleBulkOperation = async () => {
    if (!user || selectedProducts.length === 0) return;

    setLoading(true);
    const batch = writeBatch(db);

    try {
      switch (operationType) {
        case 'delete':
          // Delete selected products and update vendor's products array
          const vendorRef = doc(db, 'users', user.uid);
          batch.update(vendorRef, {
            products: arrayRemove(...selectedProducts)
          });
          
          for (const productId of selectedProducts) {
            const productRef = doc(db, 'products', productId);
            batch.delete(productRef);
          }
          break;

        case 'updatePrice':
          if (!priceUpdate.value) {
            toast.error('Please enter a price update value');
            return;
          }

          const priceValue = parseFloat(priceUpdate.value);
          if (isNaN(priceValue) || priceValue <= 0) {
            toast.error('Please enter a valid price value');
            return;
          }

          // Update prices for selected products
          for (const productId of selectedProducts) {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDocs(query(collection(db, 'products'), where('id', '==', productId)));
            const currentPrice = productDoc.docs[0]?.data().price || 0;

            let newPrice = currentPrice;
            if (priceUpdate.type === 'percentage') {
              newPrice = currentPrice * (1 + priceValue / 100);
            } else {
              newPrice = currentPrice + priceValue;
            }

            batch.update(productRef, {
              price: Math.max(0, newPrice),
              updatedAt: new Date(),
            });
          }
          break;

        case 'updateStock':
          if (!stockUpdate.value) {
            toast.error('Please enter a stock update value');
            return;
          }

          const stockValue = parseInt(stockUpdate.value);
          if (isNaN(stockValue) || stockValue < 0) {
            toast.error('Please enter a valid stock value');
            return;
          }

          // Update stock for selected products
          for (const productId of selectedProducts) {
            const productRef = doc(db, 'products', productId);
            const productDoc = await getDocs(query(collection(db, 'products'), where('id', '==', productId)));
            const currentStock = productDoc.docs[0]?.data().stock || 0;

            let newStock = currentStock;
            switch (stockUpdate.type) {
              case 'add':
                newStock = currentStock + stockValue;
                break;
              case 'subtract':
                newStock = Math.max(0, currentStock - stockValue);
                break;
              case 'set':
                newStock = stockValue;
                break;
            }

            batch.update(productRef, {
              stock: newStock,
              updatedAt: new Date(),
            });
          }
          break;
      }

      await batch.commit();
      toast.success('Bulk operation completed successfully');
      onOperationComplete();
      router.refresh();
    } catch (error) {
      console.error('Error performing bulk operation:', error);
      toast.error('Failed to perform bulk operation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Bulk Operations ({selectedProducts.length} products selected)
        </h3>
        <div className="mt-4 space-y-4">
          {/* Operation Type Selection */}
          <div>
            <label htmlFor="operationType" className="block text-sm font-medium text-gray-700">
              Operation Type
            </label>
            <select
              id="operationType"
              value={operationType}
              onChange={(e) => setOperationType(e.target.value as OperationType)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="delete">Delete Products</option>
              <option value="updatePrice">Update Prices</option>
              <option value="updateStock">Update Stock</option>
            </select>
          </div>

          {/* Price Update Options */}
          {operationType === 'updatePrice' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Update Type</label>
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="percentage"
                      checked={priceUpdate.type === 'percentage'}
                      onChange={(e) => setPriceUpdate({ ...priceUpdate, type: 'percentage' })}
                      className="form-radio"
                    />
                    <span className="ml-2">Percentage</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="fixed"
                      checked={priceUpdate.type === 'fixed'}
                      onChange={(e) => setPriceUpdate({ ...priceUpdate, type: 'fixed' })}
                      className="form-radio"
                    />
                    <span className="ml-2">Fixed Amount</span>
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="priceValue" className="block text-sm font-medium text-gray-700">
                  {priceUpdate.type === 'percentage' ? 'Percentage Change' : 'Amount Change'}
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="priceValue"
                    value={priceUpdate.value}
                    onChange={(e) => setPriceUpdate({ ...priceUpdate, value: e.target.value })}
                    className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={priceUpdate.type === 'percentage' ? 'Enter percentage' : 'Enter amount'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">
                      {priceUpdate.type === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stock Update Options */}
          {operationType === 'updateStock' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Update Type</label>
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="add"
                      checked={stockUpdate.type === 'add'}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, type: 'add' })}
                      className="form-radio"
                    />
                    <span className="ml-2">Add</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="subtract"
                      checked={stockUpdate.type === 'subtract'}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, type: 'subtract' })}
                      className="form-radio"
                    />
                    <span className="ml-2">Subtract</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="set"
                      checked={stockUpdate.type === 'set'}
                      onChange={(e) => setStockUpdate({ ...stockUpdate, type: 'set' })}
                      className="form-radio"
                    />
                    <span className="ml-2">Set to</span>
                  </label>
                </div>
              </div>
              <div>
                <label htmlFor="stockValue" className="block text-sm font-medium text-gray-700">
                  Stock Value
                </label>
                <input
                  type="number"
                  id="stockValue"
                  value={stockUpdate.value}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, value: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter stock value"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setPriceUpdate({ type: 'percentage', value: '' });
                setStockUpdate({ type: 'add', value: '' });
                setOperationType('updateStatus');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleBulkOperation}
              disabled={loading || selectedProducts.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 