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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
        <div className="rounded-2xl bg-white/80 p-8 text-center shadow">
          <p className="text-lg font-semibold text-red-600">
            Product not found or you do not have permission to edit this product.
          </p>
          <button
            onClick={() => router.push('/vendor/products')}
            className="mt-4 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <VendorDashboardNav />
      <ProtectedRoute allowedRoles={['vendor']}>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 px-2 py-8">
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-2xl rounded-3xl border border-white/40 bg-white/80 p-8 shadow-2xl backdrop-blur-lg"
            >
              <h1 className="mb-8 text-center text-3xl font-extrabold text-gray-900">
                Edit Product
              </h1>
              <form onSubmit={formik.handleSubmit} className="space-y-7">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      className="peer w-full rounded-xl border border-gray-300 px-4 pt-6 pb-2 text-gray-900 placeholder-transparent shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="Product Name"
                      required
                    />
                    <label className="pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm">
                      Name
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="brand"
                      value={formik.values.brand}
                      onChange={formik.handleChange}
                      className="peer w-full rounded-xl border border-gray-300 px-4 pt-6 pb-2 text-gray-900 placeholder-transparent shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="Brand"
                      required
                    />
                    <label className="pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm">
                      Brand
                    </label>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    name="description"
                    value={formik.values.description}
                    onChange={formik.handleChange}
                    className="peer w-full resize-none rounded-xl border border-gray-300 px-4 pt-6 pb-2 text-gray-900 placeholder-transparent shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                    placeholder="Description"
                    rows={3}
                    required
                  />
                  <label className="pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm">
                    Description
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="relative">
                    <input
                      type="number"
                      name="price"
                      value={formik.values.price}
                      onChange={formik.handleChange}
                      className="peer w-full rounded-xl border border-gray-300 px-4 pt-6 pb-2 text-gray-900 placeholder-transparent shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="Price"
                      min={0}
                      required
                    />
                    <label className="pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm">
                      Price (₹)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      name="stock"
                      value={formik.values.stock}
                      onChange={formik.handleChange}
                      className="peer w-full rounded-xl border border-gray-300 px-4 pt-6 pb-2 text-gray-900 placeholder-transparent shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      placeholder="Stock"
                      min={0}
                      required
                    />
                    <label className="pointer-events-none absolute top-2 left-4 rounded bg-white/80 px-1 text-sm text-gray-500 transition-all duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm">
                      Stock
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="mb-4 flex flex-col">
                    <label htmlFor="category" className="mb-1 font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={formik.values.category}
                      onChange={formik.handleChange}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 shadow-sm transition-all duration-200 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
                      required
                    >
                      <option value="" disabled hidden>
                        Select Category
                      </option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="mb-2"
                      disabled={uploading}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="group relative">
                          <img
                            src={url}
                            alt="Product"
                            className="h-20 w-20 rounded border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="bg-opacity-80 absolute top-0 right-0 rounded-full bg-white p-1 text-red-600 hover:bg-red-100"
                            title="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => router.push('/vendor/products')}
                    className="w-1/2 rounded-xl border border-gray-300 bg-gray-200 px-6 py-3 text-lg font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-300 focus:ring-2 focus:ring-blue-200 active:scale-95"
                    disabled={formik.isSubmitting || uploading}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.03 }}
                    className="w-1/2 rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-200 active:scale-95 disabled:opacity-50"
                    disabled={formik.isSubmitting || uploading}
                  >
                    {formik.isSubmitting ? 'Saving...' : 'Save Changes'}
                  </motion.button>
                </div>
              </form>
              <div className="mt-8 flex justify-center">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={handleDeleteProduct}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-lg font-semibold text-white shadow transition-all hover:bg-red-700 focus:ring-2 focus:ring-red-300 active:scale-95"
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
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="z-10 mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-gray-100 bg-white p-8 shadow-xl"
          >
            <ExclamationTriangleIcon className="mb-4 h-12 w-12 text-red-500" />
            <Dialog.Title className="mb-2 text-center text-lg font-bold">
              Delete Product?
            </Dialog.Title>
            <Dialog.Description className="mb-6 text-center text-gray-600">
              Are you sure you want to delete this product? <br /> This action cannot be undone.
            </Dialog.Description>
            <div className="mt-2 flex w-full gap-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-gray-300 bg-white py-2 font-semibold text-gray-700 transition-all hover:bg-gray-100 active:scale-95"
              >
                Cancel
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={confirmDeleteProduct}
                className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white transition-all hover:bg-red-700 active:scale-95"
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
