'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product, Vendor } from '@/types';
import { toast } from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { 
  FaArrowLeft, 
  FaSave, 
  FaTrash, 
  FaEye,
  FaImage,
  FaTags,
  FaStore,
  FaBox,
  FaDollarSign,
  FaWarehouse
} from 'react-icons/fa';

const validationSchema = Yup.object({
  name: Yup.string().required('Product name is required'),
  description: Yup.string().required('Description is required'),
  price: Yup.number().required('Price is required').min(0, 'Price must be positive'),
  stock: Yup.number().required('Stock is required').min(0, 'Stock must be non-negative'),
  category: Yup.string().required('Category is required'),
  brand: Yup.string().required('Brand is required'),
  condition: Yup.string().oneOf(['new', 'like-new', 'good', 'fair', 'poor'], 'Invalid condition'),
  isSecondHand: Yup.boolean(),
  originalPrice: Yup.number().when('isSecondHand', {
    is: true,
    then: Yup.number().min(0, 'Original price must be positive'),
  }),
});

export default function AdminProductEditPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          toast.error('Product not found.');
          router.push('/admin?view=products');
          return;
        }
        const prod = { id: productSnap.id, ...productSnap.data() } as Product;
        setProduct(prod);
        
        // Fetch vendor
        if (prod.vendorId) {
          const vendorRef = doc(db, 'users', prod.vendorId);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            setVendor({ uid: vendorSnap.id, ...vendorSnap.data() } as Vendor);
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product.');
        router.push('/admin?view=products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, router]);

  const formik = useFormik({
    initialValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      stock: product?.stock || 0,
      category: product?.category || '',
      brand: product?.brand || '',
      condition: product?.condition || 'new',
      isSecondHand: product?.isSecondHand || false,
      originalPrice: product?.originalPrice || 0,
      images: product?.images || [],
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!product) return;
      
      setSaving(true);
      try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, {
          ...values,
          updatedAt: new Date(),
        });
        
        toast.success('Product updated successfully!');
        router.push(`/admin/products/${productId}`);
      } catch (error) {
        console.error('Error updating product:', error);
        toast.error('Failed to update product.');
      } finally {
        setSaving(false);
      }
    },
  });

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Note: In a real application, you might want to implement soft delete
      // or move to a deleted products collection
      toast.error('Delete functionality not implemented in this demo.');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product.');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-yellow-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
        <div className="flex min-h-screen items-center justify-center text-gray-900">
          Product not found.
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'admin-manager']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.back()}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FaArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/admin/products/${productId}`)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <FaEye className="h-4 w-4" />
                  <span>View</span>
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FaTrash className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Product Information</h2>
              <p className="text-sm text-gray-600">Update the product details below</p>
            </div>

            <form onSubmit={formik.handleSubmit} className="p-6 space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaBox className="inline h-4 w-4 mr-2" />
                    Product Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.name}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.name && formik.errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {formik.touched.name && formik.errors.name && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaStore className="inline h-4 w-4 mr-2" />
                    Brand
                  </label>
                  <input
                    id="brand"
                    name="brand"
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.brand}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.brand && formik.errors.brand ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter brand name"
                  />
                  {formik.touched.brand && formik.errors.brand && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.brand}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaTags className="inline h-4 w-4 mr-2" />
                    Category
                  </label>
                  <input
                    id="category"
                    name="category"
                    type="text"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.category}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.category && formik.errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter category"
                  />
                  {formik.touched.category && formik.errors.category && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.category}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
                    Condition
                  </label>
                  <select
                    id="condition"
                    name="condition"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.condition}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.condition && formik.errors.condition ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="new">New</option>
                    <option value="like-new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                  {formik.touched.condition && formik.errors.condition && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.condition}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaDollarSign className="inline h-4 w-4 mr-2" />
                    Price
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.price}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.price && formik.errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formik.touched.price && formik.errors.price && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.price}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                    <FaWarehouse className="inline h-4 w-4 mr-2" />
                    Stock
                  </label>
                  <input
                    id="stock"
                    name="stock"
                    type="number"
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.stock}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                      formik.touched.stock && formik.errors.stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {formik.touched.stock && formik.errors.stock && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.stock}</p>
                  )}
                </div>
              </div>

              {/* Second Hand Options */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center mb-4">
                  <input
                    id="isSecondHand"
                    name="isSecondHand"
                    type="checkbox"
                    onChange={formik.handleChange}
                    checked={formik.values.isSecondHand}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isSecondHand" className="ml-2 block text-sm text-gray-900">
                    This is a second-hand item
                  </label>
                </div>

                {formik.values.isSecondHand && (
                  <div className="ml-6">
                    <label htmlFor="originalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price
                    </label>
                    <input
                      id="originalPrice"
                      name="originalPrice"
                      type="number"
                      step="0.01"
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      value={formik.values.originalPrice}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                        formik.touched.originalPrice && formik.errors.originalPrice ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    {formik.touched.originalPrice && formik.errors.originalPrice && (
                      <p className="mt-1 text-sm text-red-600">{formik.errors.originalPrice}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.description}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                    formik.touched.description && formik.errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter product description"
                />
                {formik.touched.description && formik.errors.description && (
                  <p className="mt-1 text-sm text-red-600">{formik.errors.description}</p>
                )}
              </div>

              {/* Vendor Information */}
              {vendor && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Vendor Name</label>
                        <p className="text-sm font-semibold text-gray-900">{vendor.displayName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm font-semibold text-gray-900">{vendor.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Shop Address</label>
                        <p className="text-sm font-semibold text-gray-900">{vendor.shopAddress || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Verification Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.isVerified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {vendor.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formik.isValid}
                  className="flex items-center space-x-2 px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaSave className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 