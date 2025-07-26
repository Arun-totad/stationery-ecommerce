import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swift Stationery - Your One-Stop Stationery Shop",
  description: "Your ultimate destination for all your stationery needs. Shop for pens, notebooks, art supplies, and more!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
