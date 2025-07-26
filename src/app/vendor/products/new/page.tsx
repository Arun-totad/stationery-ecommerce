'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Product } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

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
      if (!user) return;

      try {
        const productData: Omit<Product, 'id'> = {
          name: values.name,
          description: values.description,
          price: Number(values.price),
          stock: Number(values.stock),
          category: values.category,
          brand: values.brand,
          images: imageUrls,
          vendorId: user.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add product to products collection
        const docRef = await addDoc(collection(db, 'products'), productData);
        
        // Update vendor's products array in users collection
        const vendorRef = doc(db, 'users', user.uid);
        await updateDoc(vendorRef, {
          products: arrayUnion(docRef.id)
        });

        toast.success('Product created successfully!');
        router.push('/vendor');
      } catch (error) {
        console.error('Error creating product:', error);
        toast.error('Failed to create product. Please try again.');
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

  const removeImage = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls);
    formik.setFieldValue('images', newUrls);
  };

  return (
    <>
      <VendorDashboardNav />
      <ProtectedRoute allowedRoles={['vendor']}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 py-10 flex items-center justify-center">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-3xl mx-auto px-4 sm:px-8 bg-white/70 backdrop-blur-lg p-8 rounded-3xl shadow-2xl text-gray-900 border border-white/40"
            >
              <div className="flex items-center mb-8 gap-3">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-md">
                  <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6"/>
                    <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24"/>
                    <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6"/>
                  </svg>
                </span>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Add New Product</h1>
              </div>
              <form onSubmit={formik.handleSubmit} className="space-y-7">
                {/* Product Name */}
                <div className="relative">
                  <input
                    type="text"
                    id="name"
                    {...formik.getFieldProps('name')}
                    className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm ${formik.touched.name && formik.errors.name ? 'border-red-400 animate-shake' : ''}`}
                    placeholder=" "
                  />
                  <label htmlFor="name" className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded">
                    Product Name
                  </label>
                  {formik.touched.name && formik.errors.name && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.name}</motion.p>
                  )}
                </div>
                {/* Description */}
                <div className="relative">
                  <textarea
                    id="description"
                    rows={4}
                    {...formik.getFieldProps('description')}
                    className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm resize-none ${formik.touched.description && formik.errors.description ? 'border-red-400 animate-shake' : ''}`}
                    placeholder=" "
                  />
                  <label htmlFor="description" className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded">
                    Description
                  </label>
                  {formik.touched.description && formik.errors.description && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.description}</motion.p>
                  )}
                </div>
                {/* Price and Stock */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <input
                      type="number"
                      id="price"
                      step="0.01"
                      {...formik.getFieldProps('price')}
                      className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm ${formik.touched.price && formik.errors.price ? 'border-red-400 animate-shake' : ''}`}
                      placeholder=" "
                    />
                    <label htmlFor="price" className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded">
                      Price (₹)
                    </label>
                    {formik.touched.price && formik.errors.price && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.price}</motion.p>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      id="stock"
                      {...formik.getFieldProps('stock')}
                      className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm ${formik.touched.stock && formik.errors.stock ? 'border-red-400 animate-shake' : ''}`}
                      placeholder=" "
                    />
                    <label htmlFor="stock" className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded">
                      Stock Quantity
                    </label>
                    {formik.touched.stock && formik.errors.stock && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.stock}</motion.p>
                    )}
                  </div>
                </div>
                {/* Category and Brand */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="relative">
                    <select
                      id="category"
                      {...formik.getFieldProps('category')}
                      className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm appearance-none ${formik.touched.category && formik.errors.category ? 'border-red-400 animate-shake' : ''}`}
                    >
                      <option value="" disabled hidden>Select a category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="category" className={`absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 bg-white/80 px-1 rounded pointer-events-none
                      ${!formik.values.category ? 'peer-placeholder-shown:top-5 peer-placeholder-shown:text-base' : 'top-2 text-sm'}
                      peer-focus:top-2 peer-focus:text-sm`}
                    >
                      Category
                    </label>
                    {formik.touched.category && formik.errors.category && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.category}</motion.p>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      id="brand"
                      {...formik.getFieldProps('brand')}
                      className={`peer block w-full rounded-xl border bg-white/80 border-gray-300 px-4 pt-6 pb-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white transition-all duration-200 outline-none shadow-sm ${formik.touched.brand && formik.errors.brand ? 'border-red-400 animate-shake' : ''}`}
                      placeholder=" "
                    />
                    <label htmlFor="brand" className="absolute left-4 top-2 text-gray-500 text-sm transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm bg-white/80 px-1 rounded">
                      Brand
                    </label>
                    {formik.touched.brand && formik.errors.brand && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.brand}</motion.p>
                    )}
                  </div>
                </div>
                {/* Product Images */}
                <div>
                  <label htmlFor="images" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Images
                  </label>
                  <motion.div
                    whileHover={{ scale: 1.02, borderColor: '#3B82F6' }}
                    className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-white/60 transition-all duration-200"
                  >
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L40 32"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-900 justify-center items-center gap-2">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2 py-1 transition-all"
                        >
                          <span>Upload images</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={handleImageUpload}
                            accept="image/png, image/jpeg, image/gif"
                          />
                        </label>
                        <span className="pl-1 text-gray-900">or drag and drop</span>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5 images</p>
                    </div>
                  </motion.div>
                  {formik.touched.images && formik.errors.images && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs text-red-600">{formik.errors.images}</motion.p>
                  )}
                  <AnimatePresence>
                    {imageUrls.length > 0 && (
                      <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
                      >
                        {imageUrls.map((url, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="relative group"
                          >
                            <img src={url} alt={`Product Image ${index + 1}`} className="h-24 w-full object-cover rounded-lg border border-gray-200 shadow" />
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Action Buttons */}
                <div className="pt-5">
                  <div className="flex justify-end space-x-3">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.back()}
                      className="rounded-xl border border-gray-300 bg-white py-2 px-5 text-sm font-medium text-gray-700 shadow hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 transition-all"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.97 }}
                      disabled={formik.isSubmitting || uploading}
                      className="ml-3 inline-flex justify-center rounded-xl border border-transparent bg-blue-600 py-2 px-6 text-sm font-semibold text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
                    >
                      {(formik.isSubmitting || uploading) && (
                        <motion.span
                          className="absolute left-4 top-1/2 -translate-y-1/2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                        >
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                          </svg>
                        </motion.span>
                      )}
                      <span className="pl-6 pr-2 text-white">{formik.isSubmitting ? 'Creating...' : uploading ? 'Uploading...' : 'Create Product'}</span>
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </ProtectedRoute>
    </>
  );
} 