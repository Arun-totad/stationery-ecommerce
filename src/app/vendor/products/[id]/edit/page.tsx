'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Product } from '@/types';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const validationSchema = Yup.object({
  name: Yup.string()
    .required('Product name is required')
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must not exceed 100 characters'),
  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  price: Yup.number()
    .required('Price is required')
    .min(0, 'Price must be greater than or equal to 0')
    .max(100000, 'Price must not exceed ₹100,000'),
  stock: Yup.number()
    .required('Stock quantity is required')
    .min(0, 'Stock must be greater than or equal to 0')
    .max(10000, 'Stock must not exceed 10,000'),
  category: Yup.string().required('Category is required'),
  brand: Yup.string().required('Brand is required'),
  images: Yup.array()
    .of(Yup.string())
    .min(0, 'At least one image is required')
    .max(5, 'Maximum 5 images allowed'),
});

const categories = [
  'Notebooks',
  'Pens & Pencils',
  'Art Supplies',
  'School Bags',
  'Stationery Sets',
  'Office Supplies',
  'Educational Toys',
  'Other',
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const productId = params?.id as string;

  useEffect(() => {
    const fetchProduct = async () => {
      if (!user) return;

      try {
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
          toast.error('Product not found');
          router.push('/vendor/products');
          return;
        }

        const productData = productSnap.data() as Product;
        
        // Verify that the product belongs to the current vendor
        if (productData.vendorId !== user.uid) {
          toast.error('You do not have permission to edit this product');
          router.push('/vendor/products');
          return;
        }

        setProduct(productData);
        setImageUrls(productData.images);
        formik.setValues({
          name: productData.name,
          description: productData.description,
          price: productData.price.toString(),
          stock: productData.stock.toString(),
          category: productData.category,
          brand: productData.brand,
          images: productData.images,
        });
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, user, router]);

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      brand: '',
      images: [] as string[],
    },
    validationSchema,
    onSubmit: async (values) => {
      if (!user || !product) return;

      try {
        const productRef = doc(db, 'products', productId);
        const productData: Partial<Product> = {
          name: values.name,
          description: values.description,
          price: Number(values.price),
          stock: Number(values.stock),
          category: values.category,
          brand: values.brand,
          images: imageUrls,
          updatedAt: new Date(),
        };

        await updateDoc(productRef, productData);
        toast.success('Product updated successfully!');
        router.push('/vendor/products');
      } catch (error) {
        console.error('Error updating product:', error);
        toast.error('Failed to update product. Please try again.');
      }
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = ref(storage, `products/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    });

    try {
      const urls = await Promise.all(uploadPromises);
      setImageUrls((prev) => [...prev, ...urls].slice(0, 5));
      formik.setFieldValue('images', [...imageUrls, ...urls].slice(0, 5));
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (index: number) => {
    if (!user || !product) return;

    const imageToRemove = imageUrls[index];
    const newUrls = imageUrls.filter((_, i) => i !== index);
    
    try {
      // Delete the image from Firebase Storage if it's not one of the original images
      if (!product.images.includes(imageToRemove)) {
        const imageRef = ref(storage, imageToRemove);
        await deleteObject(imageRef);
      }

      setImageUrls(newUrls);
      formik.setFieldValue('images', newUrls);
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image. Please try again.');
    }
  };

  // Delete product handler (now triggers modal)
  const handleDeleteProduct = async () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    setShowDeleteModal(false);
    try {
      await deleteDoc(doc(db, 'products', productId));
      toast.success('Product deleted successfully!');
      router.push('/vendor/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
        <div className="bg-white/80 p-8 rounded-2xl shadow text-center">
          <p className="text-lg font-semibold text-red-600">Product not found or you do not have permission to edit this product.</p>
          <button onClick={() => router.push('/vendor/products')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <VendorDashboardNav />
      <ProtectedRoute allowedRoles={['vendor']}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-8 px-2 flex items-center justify-center">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-white/40"
            >
              <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Edit Product</h1>
              <form onSubmit={formik.handleSubmit} className="space-y-7">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      className="peer w-full border border-gray-300 rounded-xl px-4 pt-6 pb-2 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm placeholder-transparent"
                      placeholder="Product Name"
                      required
                    />
                    <label className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded pointer-events-none">
                      Name
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="brand"
                      value={formik.values.brand}
                      onChange={formik.handleChange}
                      className="peer w-full border border-gray-300 rounded-xl px-4 pt-6 pb-2 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm placeholder-transparent"
                      placeholder="Brand"
                      required
                    />
                    <label className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded pointer-events-none">
                      Brand
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    className="peer w-full border border-gray-300 rounded-xl px-4 pt-6 pb-2 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm resize-none placeholder-transparent"
                    placeholder="Description"
                    rows={3}
                    required
                  />
                  <label className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded pointer-events-none">
                    Description
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={formik.values.price}
                      onChange={formik.handleChange}
                      className="peer w-full border border-gray-300 rounded-xl px-4 pt-6 pb-2 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm placeholder-transparent"
                      placeholder="Price"
                      min={0}
                      required
                    />
                    <label className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded pointer-events-none">
                      Price (₹)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      name="stock"
                      value={formik.values.stock}
                      onChange={formik.handleChange}
                      className="peer w-full border border-gray-300 rounded-xl px-4 pt-6 pb-2 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm placeholder-transparent"
                      placeholder="Stock"
                      min={0}
                      required
                    />
                    <label className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded pointer-events-none">
                      Stock
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col mb-4">
                    <label htmlFor="category" className="mb-1 font-medium text-gray-700">Category</label>
                    <select
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={formik.handleChange}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none shadow-sm"
                      required
                    >
                      <option value="" disabled hidden>Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="mb-2"
                      disabled={uploading}
                    />
                    <div className="flex gap-2 flex-wrap mt-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img src={url} alt="Product" className="h-20 w-20 object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-0 right-0 bg-white bg-opacity-80 rounded-full p-1 text-red-600 hover:bg-red-100"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => router.push('/vendor/products')}
                    className="w-1/2 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl text-lg font-semibold hover:bg-gray-300 focus:ring-2 focus:ring-blue-200 transition-all duration-200 border border-gray-300 shadow-sm active:scale-95"
                    disabled={formik.isSubmitting || uploading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    className="w-1/2 bg-blue-600 text-white py-3 px-6 rounded-xl text-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 transition-all duration-200 disabled:opacity-50 shadow-sm active:scale-95"
                    disabled={formik.isSubmitting || uploading}
                  >
                    {formik.isSubmitting ? "Saving..." : "Save Changes"}
                  </motion.button>
                </div>
              </form>
              <div className="mt-8 flex justify-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={handleDeleteProduct}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl shadow transition-all text-lg mt-2 focus:ring-2 focus:ring-red-300 active:scale-95"
                  disabled={formik.isSubmitting || uploading}
                >
                  <TrashIcon className="h-5 w-5" />
                  Delete Product
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Custom Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)} className="fixed z-50 inset-0 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8 z-10 w-full max-w-md mx-auto flex flex-col items-center border border-gray-100"
          >
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
            <Dialog.Title className="text-lg font-bold mb-2 text-center">Delete Product?</Dialog.Title>
            <Dialog.Description className="mb-6 text-center text-gray-600">
              Are you sure you want to delete this product? <br /> This action cannot be undone.
            </Dialog.Description>
            <div className="flex gap-4 w-full mt-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold transition-all hover:bg-gray-100 active:scale-95"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={confirmDeleteProduct}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold transition-all hover:bg-red-700 active:scale-95"
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </Dialog>
      </ProtectedRoute>
    </>
  );
} 