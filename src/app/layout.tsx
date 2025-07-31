import type { Metadata } from 'next';
import './globals.css';
import Layout from '@/components/layout/Layout';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'International Swift Marketplace - Your One-Stop Global Marketplace',
  description:
    'Your ultimate destination for a diverse range of products from around the world. Shop for stationery, art supplies, office essentials, and unique global finds!'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AuthProvider>
          <CartProvider>
            <Layout>{children}</Layout>
          </CartProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
