'use client';

import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';

interface Variant {
  id: string;
  name: string;
  options: string[];
}

interface ProductVariant {
  id: string;
  variantId: string;
  optionId: string;
  sku: string;
  price: number;
  stock: number;
  images: string[];
  combinations: Record<string, string>;
}

interface ProductVariantsProps {
  initialVariants?: Variant[];
  initialProductVariants?: ProductVariant[];
  onSave: (variants: Variant[], productVariants: ProductVariant[]) => void;
  onCancel: () => void;
}

const validationSchema = Yup.object({
  variants: Yup.array().of(
    Yup.object({
      name: Yup.string().required('Variant name is required'),
      options: Yup.array().of(Yup.string().required('Option is required')).min(1, 'At least one option is required'),
    })
  ),
  productVariants: Yup.array().of(
    Yup.object({
      variantId: Yup.string().required('Variant is required'),
      optionId: Yup.string().required('Option is required'),
      sku: Yup.string().required('SKU is required'),
      price: Yup.number().required('Price is required').min(0, 'Price must be positive'),
      stock: Yup.number().required('Stock is required').min(0, 'Stock must be positive'),
    })
  ),
});

export default function ProductVariants({
  initialVariants = [],
  initialProductVariants = [],
  onSave,
  onCancel,
}: ProductVariantsProps) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>(initialProductVariants);

  const formik = useFormik({
    initialValues: {
      variants,
      productVariants,
    },
    validationSchema,
    onSubmit: (values) => {
      onSave(values.variants, values.productVariants);
    },
  });

  const addVariant = () => {
    const newVariant: Variant = {
      id: Date.now().toString(),
      name: '',
      options: [''],
    };
    setVariants([...variants, newVariant]);
  };

  const removeVariant = (variantId: string) => {
    setVariants(variants.filter((v) => v.id !== variantId));
    setProductVariants(productVariants.filter((pv) => pv.variantId !== variantId));
  };

  const updateVariant = (variantId: string, field: keyof Variant, value: any) => {
    setVariants(
      variants.map((v) =>
        v.id === variantId
          ? {
              ...v,
              [field]: field === 'options' ? value.split(',').map((opt: string) => opt.trim()) : value,
            }
          : v
      )
    );
  };

  const addOption = (variantId: string) => {
    setVariants(
      variants.map((v) =>
        v.id === variantId ? { ...v, options: [...v.options, ''] } : v
      )
    );
  };

  const removeOption = (variantId: string, optionIndex: number) => {
    setVariants(
      variants.map((v) =>
        v.id === variantId
          ? { ...v, options: v.options.filter((_, i) => i !== optionIndex) }
          : v
      )
    );
  };

  const generateProductVariants = () => {
    if (variants.length === 0) {
      toast.error('Add at least one variant first');
      return;
    }

    // Generate all possible combinations of variant options
    const combinations = variants.reduce(
      (acc, variant) => {
        if (acc.length === 0) {
          return variant.options.map((option) => ({
            [variant.id]: option,
          }));
        }
        return acc.flatMap((combo) =>
          variant.options.map((option) => ({
            ...combo,
            [variant.id]: option,
          }))
        );
      },
      [] as Record<string, string>[]
    );

    // Create product variants from combinations
    const newProductVariants = combinations.map((combo) => {
      const variantIds = Object.keys(combo);
      const optionIds = Object.values(combo);
      const sku = `SKU-${variantIds.map((id) => combo[id].substring(0, 3).toUpperCase()).join('-')}`;

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        variantId: variantIds[0], // For simplicity, using the first variant as primary
        optionId: optionIds[0],
        sku,
        price: 0,
        stock: 0,
        images: [],
        combinations: combo,
      };
    });

    setProductVariants(newProductVariants);
  };

  const updateProductVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setProductVariants(
      productVariants.map((pv) =>
        pv.id === id ? { ...pv, [field]: value } : pv
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Variants Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Product Variants</h3>
          <button
            type="button"
            onClick={addVariant}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Add Variant
          </button>
        </div>

        {variants.map((variant) => (
          <div key={variant.id} className="mb-6 p-4 border rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 mr-4">
                <label className="block text-sm font-medium text-gray-700">
                  Variant Name (e.g., Size, Color)
                </label>
                <input
                  type="text"
                  value={variant.name}
                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter variant name"
                />
              </div>
              <button
                type="button"
                onClick={() => removeVariant(variant.id)}
                className="text-red-600 hover:text-red-900"
              >
                Remove
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {variant.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...variant.options];
                      newOptions[index] = e.target.value;
                      updateVariant(variant.id, 'options', newOptions);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(variant.id, index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(variant.id)}
                className="text-sm text-blue-600 hover:text-blue-900"
              >
                + Add Option
              </button>
            </div>
          </div>
        ))}

        {variants.length > 0 && (
          <button
            type="button"
            onClick={generateProductVariants}
            className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Generate Product Variants
          </button>
        )}
      </div>

      {/* Product Variants Section */}
      {productVariants.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Product Variants</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {productVariants.map((pv) => (
              <div key={pv.id} className="p-4 border rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={pv.sku}
                      onChange={(e) => updateProductVariant(pv.id, 'sku', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      value={pv.price}
                      onChange={(e) => updateProductVariant(pv.id, 'price', parseFloat(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock</label>
                    <input
                      type="number"
                      value={pv.stock}
                      onChange={(e) => updateProductVariant(pv.id, 'stock', parseInt(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Combination</label>
                    <div className="mt-1 text-sm text-gray-500">
                      {Object.entries(pv.combinations).map(([variantId, option]) => {
                        const variant = variants.find((v) => v.id === variantId);
                        return (
                          <div key={variantId}>
                            {variant?.name}: {option as string}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => formik.handleSubmit()}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Save Variants
        </button>
      </div>
    </div>
  );
} 