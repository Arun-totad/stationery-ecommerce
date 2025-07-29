import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  CubeIcon, 
  Squares2X2Icon, 
  ShoppingBagIcon 
} from '@heroicons/react/24/outline';

const vendorNavigation = [
  { name: 'Dashboard', href: '/vendor', icon: HomeIcon },
  { name: 'Products', href: '/vendor/products', icon: CubeIcon },
  { name: 'Categories', href: '/vendor/categories', icon: Squares2X2Icon },
  { name: 'Orders', href: '/vendor/orders', icon: ShoppingBagIcon },
];

export default function VendorDashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 flex w-full items-center justify-center bg-white/90 py-3 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100 p-1">
        {vendorNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              pathname === item.href
                ? 'scale-105 bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-md'
                : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-sm'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
            {pathname === item.href && (
              <span className="absolute bottom-0 left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
