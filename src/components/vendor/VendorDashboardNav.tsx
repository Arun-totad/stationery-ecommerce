import Link from 'next/link';
import { usePathname } from 'next/navigation';

const vendorNavigation = [
  { name: 'Dashboard', href: '/vendor' },
  { name: 'Products', href: '/vendor/products' },
  { name: 'Orders', href: '/vendor/orders' },
];

export default function VendorDashboardNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-30 w-full flex justify-center items-center py-3 bg-white/90 shadow-lg backdrop-blur-md animate-fade-in">
      <div className="flex w-full max-w-xl mx-auto bg-white/80 rounded-full shadow-lg px-1 py-1 border border-gray-200">
        {vendorNavigation.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex-1 min-w-0 text-center relative px-2 sm:px-6 py-2 mx-0 sm:mx-1 rounded-full font-semibold text-base transition-all duration-300 overflow-hidden
                ${isActive
                  ? 'bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-md scale-105 animate-tab-pop'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
              `}
              style={{ zIndex: isActive ? 10 : 1, animationDelay: `${idx * 60}ms` }}
            >
              <span className="relative z-10 truncate">{item.name}</span>
              {isActive && (
                <span className="absolute left-1/2 bottom-0 w-2/3 h-1 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full -translate-x-1/2 animate-underline" />
              )}
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-16px);} to { opacity: 1; transform: translateY(0);} }
        .animate-tab-pop { animation: tabPop 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
        @keyframes tabPop { 0% { transform: scale(0.95); } 60% { transform: scale(1.08); } 100% { transform: scale(1.05); } }
        .animate-underline { animation: underlineGrow 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
        @keyframes underlineGrow { from { width: 0; opacity: 0; } to { width: 66%; opacity: 1; } }
      `}</style>
    </nav>
  );
} 