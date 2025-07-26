'use client';

import { useState, Fragment, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShoppingCartIcon, UserIcon, Bars3Icon, XMarkIcon, UserGroupIcon, BuildingStorefrontIcon, CubeIcon, ClipboardDocumentListIcon, CurrencyRupeeIcon, LifebuoyIcon, HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { toast } from 'react-hot-toast';
import { Menu, Transition } from '@headlessui/react';
import { useCart } from '@/context/CartContext';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Products', href: '/products', icon: CubeIcon },
  { name: 'About', href: '/about', icon: BuildingStorefrontIcon },
  { name: 'Contact', href: '/contact', icon: LifebuoyIcon },
];

const adminNavigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Users', href: '/admin?view=users', icon: UserGroupIcon },
  { name: 'Products', href: '/admin?view=products', icon: CubeIcon },
  { name: 'Orders', href: '/admin?view=orders', icon: ClipboardDocumentListIcon },
  { name: 'Transactions', href: '/admin?view=transactions', icon: CurrencyRupeeIcon },
  { name: 'Support Tickets', href: '/admin/support', icon: LifebuoyIcon },
];

const vendorNavigation = [
  { name: 'Dashboard', href: '/vendor' },
  { name: 'Products', href: '/vendor/products' },
  { name: 'Orders', href: '/vendor/orders' },
];

const generalNavigation = [
  { name: 'Home', href: '/' },
  { name: 'Products', href: '/products' },
  { name: 'About', href: '/about' },
  { name: 'Support', href: '/account/support' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function getInitials(name: string = ''): string {
  if (!name) return '';
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userRole, logout, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const { cartItems } = useCart();
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user && userRole === 'customer') {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setPendingOrderCount(snapshot.size);
      });
    } else {
      setPendingOrderCount(0);
    }
    return () => unsubscribe && unsubscribe();
  }, [user, userRole]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user && userRole === 'customer') {
      const q = query(
        collection(db, 'supportTickets'),
        where('userId', '==', user.uid),
        where('status', '==', 'open')
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        setOpenSupportCount(snapshot.size);
      });
    } else {
      setOpenSupportCount(0);
    }
    return () => unsubscribe && unsubscribe();
  }, [user, userRole]);

  // Click outside to close profile menu
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Click outside to close mobile menu
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully!');
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
      toast.error('Failed to logout.');
    }
  };

  const isAdminPage = pathname.startsWith('/admin') && (userRole === 'admin' || userRole === 'admin-manager');
  const isVendorPage = pathname.startsWith('/vendor');
  const currentView = searchParams.get('view');

  // Helper function to determine if an admin navigation item is active
  const isNavItemActive = (itemName: string, itemHref: string) => {
    if (itemName === 'Users') {
      return pathname.startsWith('/admin/users') || currentView === 'users';
    }
    if (itemName === 'Products') {
      const userId = pathname.split('/').pop();
      if (pathname.startsWith('/admin/users/') && userRole === 'vendor') {
        return true;
      }
      return currentView === 'products';
    }
    if (itemName === 'Dashboard') {
      return pathname === '/admin' && !currentView;
    }
    if (itemName === 'Support Tickets') {
      return pathname === itemHref;
    }
    const hrefView = new URLSearchParams(itemHref.split('?')[1] || '').get('view');
    return currentView === hrefView;
  };

  return (
    <header className="backdrop-blur-xl bg-white/60 shadow-xl sticky top-0 z-50 border-b border-white/60 border-opacity-40">
      <nav className="container mx-auto px-4 flex flex-wrap items-center h-24 relative" style={{zIndex: 2}}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-md">
            {/* SVG logo */}
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6"/>
              <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24"/>
              <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6"/>
            </svg>
          </span>
          <span className="text-3xl font-extrabold text-gray-900 drop-shadow-lg tracking-tight">Swift Stationery</span>
        </Link>
        {/* Divider after logo */}
        <div className="hidden lg:block h-14 w-px bg-gradient-to-b from-blue-200 via-pink-100 to-yellow-100 mx-6 opacity-70" />
        {/* Menu - use all available space between dividers */}
        <div className="hidden lg:flex flex-grow items-center justify-center gap-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`relative px-6 py-4 rounded-full font-semibold text-lg flex items-center gap-2 transition-all duration-200
                ${pathname === item.href
                  ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl scale-105 ring-2 ring-pink-200 animate-glow-menu'
                  : 'text-gray-900 hover:bg-gray-100 hover:text-blue-700 hover:scale-105 hover:shadow-lg'}
              `}
              style={{ minWidth: '140px' }}
            >
              <item.icon className={`h-6 w-6 ${pathname === item.href ? 'text-white' : 'text-blue-400 group-hover:text-pink-400 transition-colors'}`} />
              <span className="drop-shadow-lg">{item.name}</span>
              {pathname === item.href && (
                <span className="absolute left-1/2 -bottom-1 w-2/3 h-1 bg-gradient-to-r from-blue-200 to-pink-200 rounded-full -translate-x-1/2 animate-underline shadow-lg" />
              )}
            </Link>
          ))}
        </div>
        {/* Divider before actions */}
        <div className="hidden lg:block h-14 w-px bg-gradient-to-b from-blue-200 via-pink-100 to-yellow-100 mx-6 opacity-70" />
        {/* Actions (Login/Sign Up) */}
        <div className="hidden lg:flex items-center gap-4 flex-wrap">
          {user && userRole === 'customer' && (
            <Link href="/cart" className="relative flex items-center group px-4 py-3 rounded-full hover:bg-gray-100 transition-all">
              <ShoppingCartIcon className="h-7 w-7 text-blue-500 group-hover:text-pink-500 transition-colors" />
              <span className="ml-2 font-semibold text-lg text-gray-900 group-hover:text-blue-700">Cart</span>
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-400 to-blue-400 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-white animate-fade-in">
                  {cartItems.length}
                </span>
              )}
            </Link>
          )}
          {user && userRole === 'customer' && cartItems.length > 0 && (
            <Link
              href="/checkout"
              className="relative px-4 py-3 rounded-full font-semibold text-lg transition-all duration-200 bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-lg hover:shadow-xl hover:scale-105"
            >
              Checkout
            </Link>
          )}
          {mounted && user ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 text-base font-medium text-gray-700 hover:text-blue-700 focus:outline-none px-3 py-2 rounded-full hover:bg-white/60 transition-all"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="avatar" className="h-8 w-8 rounded-full border-2 border-blue-400 shadow" />
                ) : (
                  <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-pink-400 text-white text-base font-bold border-2 border-white shadow">{getInitials(user.displayName || user.email)}</span>
                )}
              </button>
              {isProfileMenuOpen && (
                <div
                  key={isProfileMenuOpen ? 'open' : 'closed'}
                  className="absolute right-0 mt-2 w-56 bg-white/90 rounded-2xl shadow-xl py-2 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 max-h-60 overflow-y-auto animate-fade-in"
                >
                  <Link
                    href="/account"
                    className="flex items-center px-4 py-2 text-base text-gray-700 hover:bg-blue-50 rounded-xl"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <UserIcon className="h-5 w-5 mr-2 text-blue-500" /> Account
                  </Link>
                  {userRole === 'customer' && (
                    <Link
                      href="/account/orders"
                      className="flex items-center px-4 py-2 text-base text-gray-700 hover:bg-blue-50 rounded-xl relative"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="h-5 w-5 mr-2 text-blue-500" /> Orders
                      {pendingOrderCount > 0 && (
                        <span className="ml-2 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg border-2 border-white animate-fade-in absolute right-4 top-2 select-none"
                          style={{
                            background: 'linear-gradient(90deg, #3B82F6 60%, #60A5FA 100%)',
                            boxShadow: '0 2px 8px 0 rgba(59,130,246,0.15)',
                            letterSpacing: '1px',
                            fontWeight: 800,
                            transform: 'scale(1.08)',
                          }}
                        >
                          {pendingOrderCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {userRole === 'customer' && (
                    <Link
                      href="/account/support"
                      className="flex items-center px-4 py-2 text-base text-gray-700 hover:bg-blue-50 rounded-xl relative"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <svg className="h-5 w-5 mr-2 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg> Support Tickets
                      {openSupportCount > 0 && (
                        <span className="ml-2 text-white text-xs font-bold px-2.5 py-0.5 rounded-full shadow-lg border-2 border-white animate-fade-in absolute right-4 top-2 select-none"
                          style={{
                            background: 'linear-gradient(90deg, #EC4899 60%, #F472B6 100%)',
                            boxShadow: '0 2px 8px 0 rgba(236,72,153,0.15)',
                            letterSpacing: '1px',
                            fontWeight: 800,
                            transform: 'scale(1.08)',
                          }}
                        >
                          {openSupportCount}
                        </span>
                      )}
                    </Link>
                  )}
                  {userRole === 'vendor' && (
                    <Link
                      href="/vendor"
                      className="flex items-center px-4 py-2 text-base text-gray-700 hover:bg-blue-50 rounded-xl"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="h-5 w-5 mr-2 text-blue-500" /> Vendor Dashboard
                    </Link>
                  )}
                  {(userRole === 'admin' || userRole === 'admin-manager') && (
                    <Link
                      href="/admin"
                      className="flex items-center px-4 py-2 text-base text-gray-700 hover:bg-blue-50 rounded-xl"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="h-5 w-5 mr-2 text-blue-500" /> Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-base rounded-xl text-red-700 hover:bg-blue-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className={`px-7 py-4 min-w-[120px] rounded-full font-semibold text-lg flex items-center justify-center transition-all focus:ring-2 focus:ring-blue-200 focus:outline-none border
                  ${pathname === '/login'
                    ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl hover:from-blue-600 hover:to-pink-500 hover:shadow-2xl hover:scale-105 animate-glow border-transparent'
                    : 'bg-white/20 text-gray-900 border-blue-200 hover:bg-white/30 shadow hover:shadow-lg hover:scale-105'}
                `}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={`px-7 py-4 min-w-[120px] rounded-full font-semibold text-lg flex items-center justify-center transition-all focus:ring-2 focus:ring-pink-200 focus:outline-none border
                  ${pathname === '/signup'
                    ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl hover:from-blue-600 hover:to-pink-500 hover:shadow-2xl hover:scale-105 animate-glow border-transparent'
                    : 'bg-white/20 text-gray-900 border-blue-200 hover:bg-white/30 shadow hover:shadow-lg hover:scale-105'}
                `}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        {/* Hamburger for mobile (right aligned) */}
        <button
          className={`lg:hidden flex items-center justify-center p-2 rounded-full hover:bg-white/20 transition-all ml-2 ${isMenuOpen ? 'rotate-90 scale-110 duration-300' : 'duration-300'}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Open menu"
        >
          {isMenuOpen ? (
            <XMarkIcon className="h-8 w-8 text-gray-900" />
          ) : (
            <Bars3Icon className="h-8 w-8 text-gray-900" />
          )}
        </button>
      </nav>
      {/* Admin Navigation Bar */}
      {isAdminPage && (
        <div className="w-full bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 border-b border-blue-100 shadow-sm">
          <div className="container mx-auto px-4 flex flex-wrap md:flex-nowrap gap-2 md:gap-4 py-2 justify-center md:justify-start">
            {adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative px-5 py-2 rounded-full font-semibold text-base flex items-center gap-2 transition-all duration-200
                  ${isNavItemActive(item.name, item.href)
                    ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg scale-105'
                    : 'text-blue-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-pink-100 hover:text-blue-900 hover:scale-105'}
                `}
                style={{ minWidth: '120px' }}
              >
                <item.icon className={`h-5 w-5 ${isNavItemActive(item.name, item.href) ? 'text-white' : 'text-blue-400 group-hover:text-pink-400 transition-colors'}`} />
                <span>{item.name}</span>
                {isNavItemActive(item.name, item.href) && (
                  <span className="absolute left-1/2 -bottom-1 w-2/3 h-1 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full -translate-x-1/2 animate-fade-in" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
        @keyframes slideInRight { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-underline { animation: underlineGrow 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
        @keyframes underlineGrow { from { width: 0; opacity: 0.5; } to { width: 66%; opacity: 1; } }
        .animate-glow { box-shadow: 0 0 16px 2px #f472b6, 0 0 8px 2px #3b82f6; }
        .animate-glow-menu { box-shadow: 0 0 16px 2px #f472b6, 0 0 8px 2px #3b82f6; }
        [class*='animate-delay-'] { animation-delay: var(--delay, 0ms); }
      `}</style>
    </header>
  );
} 