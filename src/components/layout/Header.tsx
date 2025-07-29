'use client';

import { useState, Fragment, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingCartIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  LifebuoyIcon,
  HomeIcon,
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UserRole, Notification } from '@/types';
import { toast } from 'react-hot-toast';
import { Menu, Transition } from '@headlessui/react';
import { useCart } from '@/context/CartContext';
import { collection, query, where, getDocs, onSnapshot, updateDoc, doc } from 'firebase/firestore';
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
  { name: 'Transactions', href: '/admin?view=transactions', icon: CurrencyDollarIcon },
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
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (user) {
      const q = query(collection(db, 'notifications'), where('userId', '==', user.uid));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            userId: data.userId,
            type: data.type,
            message: data.message,
            createdAt: data.createdAt,
            read: data.read,
            data: data.data,
            link: data.link,
            linkLabel: data.linkLabel,
          } as Notification;
        });
        notifs.sort((a, b) =>
          a.createdAt && b.createdAt && a.createdAt instanceof Date && b.createdAt instanceof Date
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : 0
        );
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.read).length);
      });
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    return () => unsubscribe && unsubscribe();
  }, [user]);

  // Click outside to close profile menu
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
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

  // Close notification dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        notifDropdownRef.current &&
        !notifDropdownRef.current.contains(event.target as Node) &&
        (event.target as HTMLElement).closest('button[data-bell]') === null
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

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

  const handleNotifOpen = async () => {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    setNotifOpen(true);
    // Mark all as read
    const unread = notifications.filter((n) => !n.read);
    for (const notif of unread) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_placed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'order_status_update':
        return <ExclamationTriangleIcon className="h-5 w-5 text-blue-500" />;
      case 'account_created':
        return <UserPlusIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order_placed':
        return 'border-l-green-500 bg-green-50';
      case 'order_status_update':
        return 'border-l-blue-500 bg-blue-50';
      case 'account_created':
        return 'border-l-purple-500 bg-purple-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const isAdminPage =
    pathname.startsWith('/admin') && (userRole === 'admin' || userRole === 'admin-manager');
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
    <header className="border-opacity-40 sticky top-0 z-50 border-b border-white/60 bg-white/60 shadow-xl backdrop-blur-xl">
      <nav
        className="relative container mx-auto flex h-24 flex-wrap items-center px-4 justify-between"
        style={{ zIndex: 2 }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-md">
            {/* SVG logo */}
            <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6" />
              <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24" />
              <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6" />
            </svg>
          </span>
          <span className="text-3xl font-extrabold tracking-tight text-gray-900 drop-shadow-lg">
            Swift Stationery
          </span>
        </Link>
        {/* Divider after logo */}
        <div className="mx-6 hidden h-14 w-px bg-gradient-to-b from-blue-200 via-pink-100 to-yellow-100 opacity-70 lg:block" />
        {/* Menu - use all available space between dividers */}
        <div className="hidden flex-grow items-center justify-center gap-4 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center gap-2 rounded-full px-6 py-4 text-lg font-semibold transition-all duration-200 ${
                pathname === item.href
                  ? 'animate-glow-menu scale-105 bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl ring-2 ring-pink-200'
                  : 'text-gray-900 hover:scale-105 hover:bg-gray-100 hover:text-blue-700 hover:shadow-lg'
              } `}
              style={{ minWidth: '140px' }}
            >
              <item.icon
                className={`h-6 w-6 ${pathname === item.href ? 'text-white' : 'text-blue-400 transition-colors group-hover:text-pink-400'}`}
              />
              <span className="drop-shadow-lg">{item.name}</span>
              {pathname === item.href && (
                <span className="animate-underline absolute -bottom-1 left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-200 to-pink-200 shadow-lg" />
              )}
            </Link>
          ))}
        </div>
        {/* Divider before actions */}
        <div className="mx-6 hidden h-14 w-px bg-gradient-to-b from-blue-200 via-pink-100 to-yellow-100 opacity-70 lg:block" />
        {/* Actions (Login/Sign Up) */}
        <div className="hidden flex-wrap items-center gap-4 lg:flex">
          {user && userRole === 'customer' && (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  className="relative rounded-full p-2 hover:bg-gray-100 focus:outline-none"
                  onClick={handleNotifOpen}
                  data-bell
                >
                  <BellIcon className="h-6 w-6 text-gray-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs leading-none font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {/* Notification Dropdown */}
                {notifOpen && (
                  <div
                    ref={notifDropdownRef}
                    className="absolute right-0 z-50 mt-2 w-96 max-h-[500px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
                  >
                    {/* Header */}
                    <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                          <BellIcon className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                          <p className="text-xs text-gray-400 mt-1">We'll notify you about your orders and updates</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`group relative border-b border-gray-100 px-4 py-3 transition-all duration-200 hover:bg-gray-50 ${
                              !notif.read ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            {/* Unread indicator */}
                            {!notif.read && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                            )}
                            
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notif.type)}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {notif.link ? (
                                  <Link 
                                    href={notif.link} 
                                    className="block group-hover:bg-gray-100 rounded-lg p-2 -m-2 transition-colors duration-200"
                                    onClick={() => setNotifOpen(false)}
                                  >
                                    <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                      {notif.message}
                                    </p>
                                    {notif.linkLabel && (
                                      <div className="flex items-center gap-1 mt-1">
                                        <span className="text-xs text-blue-600 font-medium">
                                          {notif.linkLabel}
                                        </span>
                                        <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    )}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                    {notif.message}
                                  </p>
                                )}
                                
                                {/* Timestamp */}
                                <p className="text-xs text-gray-500 mt-1">
                                  {notif.createdAt instanceof Date
                                    ? notif.createdAt.toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true
                                      })
                                    : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                      <button
                        className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={() => setNotifOpen(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Cart Button */}
              <Link
                href="/cart"
                className="group relative flex items-center rounded-full px-4 py-3 transition-all hover:bg-gray-100"
              >
                <ShoppingCartIcon className="h-7 w-7 text-blue-500 transition-colors group-hover:text-pink-500" />
                <span className="ml-2 text-lg font-semibold text-gray-900 group-hover:text-blue-700">
                  Cart
                </span>
                {cartItems.length > 0 && (
                  <span className="animate-fade-in absolute -top-2 -right-2 rounded-full border-2 border-white bg-gradient-to-r from-pink-400 to-blue-400 px-2 py-0.5 text-xs font-bold text-white shadow-lg">
                    {cartItems.length}
                  </span>
                )}
              </Link>
            </>
          )}
          {user && userRole === 'customer' && cartItems.length > 0 && (
            <Link
              href="/checkout"
              className="relative rounded-full bg-gradient-to-r from-green-400 to-blue-400 px-4 py-3 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              Checkout
            </Link>
          )}
          {mounted && user ? (
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-base font-medium text-gray-700 transition-all hover:bg-white/60 hover:text-blue-700 focus:outline-none"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="h-8 w-8 rounded-full border-2 border-blue-400 shadow"
                  />
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-pink-400 text-base font-bold text-white shadow">
                    {getInitials(user.displayName || user.email)}
                  </span>
                )}
              </button>
              {isProfileMenuOpen && (
                <div
                  key={isProfileMenuOpen ? 'open' : 'closed'}
                  className="ring-opacity-5 animate-fade-in absolute right-0 z-50 mt-2 max-h-60 w-56 overflow-y-auto rounded-2xl bg-white/90 py-2 shadow-xl ring-1 ring-black focus:outline-none"
                >
                  <Link
                    href="/account"
                    className="flex items-center rounded-xl px-4 py-2 text-base text-gray-700 hover:bg-blue-50"
                    onClick={() => setIsProfileMenuOpen(false)}
                  >
                    <UserIcon className="mr-2 h-5 w-5 text-blue-500" /> Account
                  </Link>
                  {userRole === 'customer' && (
                    <Link
                      href="/account/orders"
                      className="relative flex items-center rounded-xl px-4 py-2 text-base text-gray-700 hover:bg-blue-50"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="mr-2 h-5 w-5 text-blue-500" /> Orders
                      {pendingOrderCount > 0 && (
                        <span
                          className="animate-fade-in absolute top-2 right-4 ml-2 rounded-full border-2 border-white px-2.5 py-0.5 text-xs font-bold text-white shadow-lg select-none"
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
                      className="relative flex items-center rounded-xl px-4 py-2 text-base text-gray-700 hover:bg-blue-50"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <svg
                        className="mr-2 h-5 w-5 text-pink-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 4v16m8-8H4" />
                      </svg>{' '}
                      Support Tickets
                      {openSupportCount > 0 && (
                        <span
                          className="animate-fade-in absolute top-2 right-4 ml-2 rounded-full border-2 border-white px-2.5 py-0.5 text-xs font-bold text-white shadow-lg select-none"
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
                      className="flex items-center rounded-xl px-4 py-2 text-base text-gray-700 hover:bg-blue-50"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="mr-2 h-5 w-5 text-blue-500" /> Vendor Dashboard
                    </Link>
                  )}
                  {(userRole === 'admin' || userRole === 'admin-manager') && (
                    <Link
                      href="/admin"
                      className="flex items-center rounded-xl px-4 py-2 text-base text-gray-700 hover:bg-blue-50"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserIcon className="mr-2 h-5 w-5 text-blue-500" /> Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-xl px-4 py-2 text-left text-base text-red-700 hover:bg-blue-50"
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
                className={`flex min-w-[120px] items-center justify-center rounded-full border px-7 py-4 text-lg font-semibold transition-all focus:ring-2 focus:ring-blue-200 focus:outline-none ${
                  pathname === '/login'
                    ? 'animate-glow border-transparent bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl hover:scale-105 hover:from-blue-600 hover:to-pink-500 hover:shadow-2xl'
                    : 'border-blue-200 bg-white/20 text-gray-900 shadow hover:scale-105 hover:bg-white/30 hover:shadow-lg'
                } `}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className={`flex min-w-[120px] items-center justify-center rounded-full border px-7 py-4 text-lg font-semibold transition-all focus:ring-2 focus:ring-pink-200 focus:outline-none ${
                  pathname === '/signup'
                    ? 'animate-glow border-transparent bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-xl hover:scale-105 hover:from-blue-600 hover:to-pink-500 hover:shadow-2xl'
                    : 'border-blue-200 bg-white/20 text-gray-900 shadow hover:scale-105 hover:bg-white/30 hover:shadow-lg'
                } `}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        {/* Hamburger for mobile (right aligned) */}
        <button
          className={`ml-auto flex items-center justify-center rounded-full p-2 transition-all hover:bg-white/20 lg:hidden ${isMenuOpen ? 'scale-110 rotate-90 duration-300' : 'duration-300'}`}
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
        <div className="w-full border-b border-blue-100 bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 shadow-sm">
          <div className="container mx-auto flex flex-wrap justify-center gap-2 px-4 py-2 md:flex-nowrap md:justify-start md:gap-4">
            {adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-base font-semibold transition-all duration-200 ${
                  isNavItemActive(item.name, item.href)
                    ? 'scale-105 bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-lg'
                    : 'text-blue-700 hover:scale-105 hover:bg-gradient-to-r hover:from-blue-100 hover:to-pink-100 hover:text-blue-900'
                } `}
                style={{ minWidth: '120px' }}
              >
                <item.icon
                  className={`h-5 w-5 ${isNavItemActive(item.name, item.href) ? 'text-white' : 'text-blue-400 transition-colors group-hover:text-pink-400'}`}
                />
                <span>{item.name}</span>
                {isNavItemActive(item.name, item.href) && (
                  <span className="animate-fade-in absolute -bottom-1 left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
      {/* Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Drawer */}
          <div
            ref={mobileMenuRef}
            className="relative ml-auto flex h-full min-h-screen w-4/5 max-w-xs flex-col bg-black shadow-2xl p-6 animate-slide-in-right"
          >
            <button
              className="self-end mb-6 rounded-full p-2 hover:bg-gray-800"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              <XMarkIcon className="h-8 w-8 text-white" />
            </button>
            <nav className="flex flex-col gap-3 mb-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-lg font-semibold ${
                    pathname === item.href
                      ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow'
                      : 'text-white hover:bg-gray-800'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-6 w-6 text-white" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="border-t border-gray-800 my-4" />
            {/* User Actions */}
            <div className="flex flex-col gap-3">
              {/* Notifications */}
              <Link
                href="/account/notifications"
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-gray-800 relative"
                onClick={() => setIsMenuOpen(false)}
              >
                <BellIcon className="h-6 w-6 text-white" />
                Notifications
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-4 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs leading-none font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              {/* Cart */}
              <Link
                href="/cart"
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-gray-800 relative"
                onClick={() => setIsMenuOpen(false)}
              >
                <ShoppingCartIcon className="h-6 w-6 text-white" />
                Cart
                {cartItems.length > 0 && (
                  <span className="absolute top-2 right-4 rounded-full bg-gradient-to-r from-pink-400 to-blue-400 px-2 py-0.5 text-xs font-bold text-white">
                    {cartItems.length}
                  </span>
                )}
              </Link>
              {/* Orders */}
              {mounted && user && userRole === 'customer' && (
                <Link
                  href="/account/orders"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  Orders
                </Link>
              )}
              {/* Support Tickets */}
              {mounted && user && userRole === 'customer' && (
                <Link
                  href="/account/support"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A9 9 0 105.636 18.364l1.414-1.414" />
                  </svg>
                  Support Tickets
                </Link>
              )}
              {/* Account */}
              {mounted && user && (
                <Link
                  href="/account"
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-gray-800"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt="avatar"
                      className="h-7 w-7 rounded-full border-2 border-blue-400 shadow"
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-pink-400 text-base font-bold text-white shadow">
                      {getInitials(user.displayName || user.email)}
                    </span>
                  )}
                  Account
                </Link>
              )}
              {/* Log out */}
              {mounted && user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium text-red-400 hover:bg-gray-800"
                >
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1" />
                  </svg>
                  Log out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-underline {
          animation: underlineGrow 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes underlineGrow {
          from {
            width: 0;
            opacity: 0.5;
          }
          to {
            width: 66%;
            opacity: 1;
          }
        }
        .animate-glow {
          box-shadow:
            0 0 16px 2px #f472b6,
            0 0 8px 2px #3b82f6;
        }
        .animate-glow-menu {
          box-shadow:
            0 0 16px 2px #f472b6,
            0 0 8px 2px #3b82f6;
        }
        [class*='animate-delay-'] {
          animation-delay: var(--delay, 0ms);
        }
      `}</style>
    </header>
  );
}
