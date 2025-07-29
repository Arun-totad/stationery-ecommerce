'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Product, Category } from '@/types';
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
    .max(100000, 'Price must not exceed $100,000'),
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
  isSecondHand: Yup.boolean(),
  condition: Yup.string().when('isSecondHand', {
    is: true,
    then: (schema) => schema.required('Condition is required for second-hand items'),
    otherwise: (schema) => schema.optional(),
  }),
  originalPrice: Yup.number().when('isSecondHand', {
    is: true,
    then: (schema) => schema.min(0, 'Original price must be positive'),
    otherwise: (schema) => schema.optional(),
  }),
});

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (!user) return;
    
    try {
      setLoadingCategories(true);
      // Fetch global categories
      const globalQuery = query(collection(db, 'categories'), where('isGlobal', '==', true));
      const globalSnapshot = await getDocs(globalQuery);
      
      // Fetch vendor-specific categories
      const vendorQuery = query(collection(db, 'categories'), where('createdBy', '==', user.uid));
      const vendorSnapshot = await getDocs(vendorQuery);
      
      const allCategories: Category[] = [];
      
      globalSnapshot.forEach((doc) => {
        allCategories.push({ id: doc.id, ...doc.data() } as Category);
      });
      
      vendorSnapshot.forEach((doc) => {
        allCategories.push({ id: doc.id, ...doc.data() } as Category);
      });
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      name: '',
      description: '',
      price: '',
      stock: '',
      category: '',
      brand: '',
      images: [] as string[],
      isSecondHand: false,
      condition: '',
      originalPrice: '',
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
          isSecondHand: values.isSecondHand,
          condition: values.isSecondHand ? values.condition : undefined,
          originalPrice: values.isSecondHand && values.originalPrice ? Number(values.originalPrice) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add product to products collection
        const docRef = await addDoc(collection(db, 'products'), productData);

        // Update vendor's products array in users collection
        const vendorRef = doc(db, 'users', user.uid);
        await updateDoc(vendorRef, {
          products: arrayUnion(docRef.id),
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

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: string } = {
      'tag': '🏷️',
      'laptop': '💻',
      'couch': '🛋️',
      'tshirt': '👕',
      'book': '📚',
      'basketball-ball': '🏀',
      'home': '🏠',
      'gamepad': '🎮',
      'car': '🚗',
    };
    return iconMap[iconName] || '🏷️';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
      <VendorDashboardNav />
      
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
          <p className="mt-2 text-gray-600">Add a new product to your inventory</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/80 p-8 shadow-xl backdrop-blur-sm"
        >
          <form onSubmit={formik.handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    {...formik.getFieldProps('name')}
                    className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.name && formik.errors.name ? 'animate-shake border-red-400' : ''}`}
                    placeholder=" "
                  />
                  <label
                    htmlFor="name"
                    className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.name ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                  >
                    Product Name
                  </label>
                  {formik.touched.name && formik.errors.name && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs text-red-600"
                    >
                      {formik.errors.name}
                    </motion.p>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="brand"
                    type="text"
                    {...formik.getFieldProps('brand')}
                    className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.brand && formik.errors.brand ? 'animate-shake border-red-400' : ''}`}
                    placeholder=" "
                  />
                  <label
                    htmlFor="brand"
                    className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.brand ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                  >
                    Brand
                  </label>
                  {formik.touched.brand && formik.errors.brand && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs text-red-600"
                    >
                      {formik.errors.brand}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="description"
                  {...formik.getFieldProps('description')}
                  rows={4}
                  className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.description && formik.errors.description ? 'animate-shake border-red-400' : ''}`}
                  placeholder=" "
                />
                <label
                  htmlFor="description"
                  className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.description ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                >
                  Description
                </label>
                {formik.touched.description && formik.errors.description && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-1 text-xs text-red-600"
                  >
                    {formik.errors.description}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Category and Pricing */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Category & Pricing</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="relative">
                  <select
                    id="category"
                    {...formik.getFieldProps('category')}
                    className={`peer block w-full appearance-none rounded-xl border border-gray-300 bg-white/80 px-4 py-4 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.category && formik.errors.category ? 'animate-shake border-red-400' : ''}`}
                    disabled={loadingCategories}
                    onChange={(e) => {
                      if (e.target.value === 'add-new') {
                        router.push('/vendor/categories');
                        return;
                      }
                      formik.setFieldValue('category', e.target.value);
                    }}
                  >
                    <option value="" disabled>
                      {loadingCategories ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {getIconComponent(category.icon)} {category.name}
                      </option>
                    ))}
                    <option value="add-new" className="text-blue-600 font-medium">
                      ➕ Add New Category
                    </option>
                  </select>
                  <label
                    htmlFor="category"
                    className="pointer-events-none absolute -top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200"
                  >
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/vendor/categories')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    Add
                  </button>
                  {formik.touched.category && formik.errors.category && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs text-red-600"
                    >
                      {formik.errors.category}
                    </motion.p>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    {...formik.getFieldProps('price')}
                    className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.price && formik.errors.price ? 'animate-shake border-red-400' : ''}`}
                    placeholder=" "
                  />
                  <label
                    htmlFor="price"
                    className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.price ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                  >
                    Price ($)
                  </label>
                  {formik.touched.price && formik.errors.price && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs text-red-600"
                    >
                      {formik.errors.price}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="relative">
                  <input
                    id="stock"
                    type="number"
                    {...formik.getFieldProps('stock')}
                    className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.stock && formik.errors.stock ? 'animate-shake border-red-400' : ''}`}
                    placeholder=" "
                  />
                  <label
                    htmlFor="stock"
                    className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.stock ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                  >
                    Stock Quantity
                  </label>
                  {formik.touched.stock && formik.errors.stock && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-1 text-xs text-red-600"
                    >
                      {formik.errors.stock}
                    </motion.p>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formik.values.isSecondHand}
                      onChange={(e) => {
                        formik.setFieldValue('isSecondHand', e.target.checked);
                        if (!e.target.checked) {
                          formik.setFieldValue('condition', '');
                          formik.setFieldValue('originalPrice', '');
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Second-hand Item</span>
                  </label>
                </div>
              </div>

              {/* Second-hand specific fields */}
              {formik.values.isSecondHand && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2"
                >
                  <div className="relative">
                    <select
                      id="condition"
                      {...formik.getFieldProps('condition')}
                      className={`peer block w-full appearance-none rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.condition && formik.errors.condition ? 'animate-shake border-red-400' : ''}`}
                    >
                      <option value="" disabled hidden>
                        Select condition
                      </option>
                      <option value="like-new">Like New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                    <label
                      htmlFor="condition"
                      className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.condition ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                    >
                      Condition
                    </label>
                    {formik.touched.condition && formik.errors.condition && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 text-xs text-red-600"
                      >
                        {formik.errors.condition}
                      </motion.p>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="originalPrice"
                      type="number"
                      step="0.01"
                      {...formik.getFieldProps('originalPrice')}
                      className={`peer block w-full rounded-xl border border-gray-300 bg-white/80 px-4 pt-6 pb-2 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 ${formik.touched.originalPrice && formik.errors.originalPrice ? 'animate-shake border-red-400' : ''}`}
                      placeholder=" "
                    />
                    <label
                      htmlFor="originalPrice"
                      className={`pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 ${!formik.values.originalPrice ? 'top-5 text-base' : 'top-2 text-sm'} peer-focus:top-2 peer-focus:text-sm`}
                    >
                      Original Price ($)
                    </label>
                    {formik.touched.originalPrice && formik.errors.originalPrice && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 text-xs text-red-600"
                      >
                        {formik.errors.originalPrice}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Images */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Product Images</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Upload Images (Max 5)
                  </label>
                  <span className="text-sm text-gray-500">
                    {imageUrls.length}/5 images
                  </span>
                </div>
                
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading || imageUrls.length >= 5}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                
                {uploading && (
                  <div className="text-sm text-blue-600">Uploading images...</div>
                )}
                
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Product ${index + 1}`}
                          className="h-24 w-full rounded-lg object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formik.touched.images && formik.errors.images && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-600"
                  >
                    {formik.errors.images}
                  </motion.p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/vendor/products')}
                className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-pink-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:from-blue-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {uploading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
