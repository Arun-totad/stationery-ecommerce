'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types';
import { toast } from 'react-hot-toast';
import VendorDashboardNav from '@/components/vendor/VendorDashboardNav';
import { FaPlus, FaEdit, FaTrash, FaGlobe, FaStore } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';

const defaultCategories = [
  { name: 'Electronics', description: 'Electronic devices and accessories', icon: 'laptop', color: '#3B82F6' },
  { name: 'Furniture', description: 'Home and office furniture', icon: 'couch', color: '#8B5CF6' },
  { name: 'Clothing', description: 'Apparel and fashion items', icon: 'tshirt', color: '#EC4899' },
  { name: 'Books', description: 'Books and educational materials', icon: 'book', color: '#10B981' },
  { name: 'Sports & Outdoors', description: 'Sports equipment and outdoor gear', icon: 'basketball-ball', color: '#F59E0B' },
  { name: 'Home & Garden', description: 'Home improvement and garden items', icon: 'home', color: '#EF4444' },
  { name: 'Toys & Games', description: 'Toys, games, and entertainment', icon: 'gamepad', color: '#06B6D4' },
  { name: 'Automotive', description: 'Car parts and accessories', icon: 'car', color: '#84CC16' },
];

export default function VendorCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'tag',
    color: '#3B82F6',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon,
        color: formData.color,
        createdBy: user.uid,
        isGlobal: false, // Vendor-created categories are not global by default
        createdAt: new Date(),
        updatedAt: new Date(),
        productCount: 0,
      };

      if (editingCategory) {
        // Update existing category
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          ...categoryData,
          updatedAt: new Date(),
        });
        toast.success('Category updated successfully!');
      } else {
        // Create new category
        await addDoc(collection(db, 'categories'), categoryData);
        toast.success('Category created successfully!');
      }

      setShowCreateModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', icon: 'tag', color: '#3B82F6' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    if (category.isGlobal) {
      toast.error('Global categories cannot be edited');
      return;
    }
    
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      icon: category.icon,
      color: category.color,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (category: Category) => {
    if (category.isGlobal) {
      toast.error('Global categories cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"? This will affect all products in this category.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'categories', category.id));
      toast.success('Category deleted successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const createDefaultCategories = async () => {
    if (!user) return;

    try {
      const promises = defaultCategories.map(async (cat) => {
        const categoryData = {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          color: cat.color,
          createdBy: user.uid,
          isGlobal: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          productCount: 0,
        };
        return addDoc(collection(db, 'categories'), categoryData);
      });

      await Promise.all(promises);
      toast.success('Default categories created successfully!');
      fetchCategories();
    } catch (error) {
      console.error('Error creating default categories:', error);
      toast.error('Failed to create default categories');
    }
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
      
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
            <p className="mt-2 text-gray-600">Manage your product categories</p>
          </div>
          <div className="mt-4 flex gap-3 sm:mt-0">
            <button
              onClick={createDefaultCategories}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FaGlobe className="mr-2 h-4 w-4" />
              Create Default Categories
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2 h-4 w-4" />
              Create Category
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading categories...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      {getIconComponent(category.icon)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                      <div className="mt-1 flex items-center space-x-2">
                        {category.isGlobal ? (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            <FaGlobe className="mr-1 h-3 w-3" />
                            Global
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            <FaStore className="mr-1 h-3 w-3" />
                            Custom
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {category.productCount} products
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!category.isGlobal && (
                    <div className="flex space-x-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleEdit(category)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {categories.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No categories found</div>
            <button
              onClick={createDefaultCategories}
              className="inline-flex items-center rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <FaGlobe className="mr-2 h-4 w-4" />
              Create Default Categories
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Dialog
            as="div"
            open={showCreateModal}
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={() => {
              setShowCreateModal(false);
              setEditingCategory(null);
              setFormData({ name: '', description: '', icon: 'tag', color: '#3B82F6' });
            }}
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black opacity-30" />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
              >
                <Dialog.Title className="text-lg font-semibold text-gray-900 mb-4">
                  {editingCategory ? 'Edit Category' : 'Create New Category'}
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter category name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter category description"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="tag">🏷️ Tag</option>
                      <option value="laptop">💻 Laptop</option>
                      <option value="couch">🛋️ Couch</option>
                      <option value="tshirt">👕 T-Shirt</option>
                      <option value="book">📚 Book</option>
                      <option value="basketball-ball">🏀 Basketball</option>
                      <option value="home">🏠 Home</option>
                      <option value="gamepad">🎮 Gamepad</option>
                      <option value="car">🚗 Car</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="h-10 w-full rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingCategory(null);
                        setFormData({ name: '', description: '', icon: 'tag', color: '#3B82F6' });
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-pink-500 px-4 py-2 text-sm font-medium text-white hover:from-blue-600 hover:to-pink-600"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}