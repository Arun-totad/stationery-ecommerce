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
    <nav className="animate-fade-in sticky top-0 z-30 flex w-full items-center justify-center bg-white/90 py-3 shadow-lg backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl rounded-full border border-gray-200 bg-white/80 px-1 py-1 shadow-lg">
        {vendorNavigation.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative mx-0 min-w-0 flex-1 overflow-hidden rounded-full px-2 py-2 text-center text-base font-semibold transition-all duration-300 sm:mx-1 sm:px-6 ${
                isActive
                  ? 'animate-tab-pop scale-105 bg-gradient-to-r from-blue-500 to-pink-400 text-white shadow-md'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
              } `}
              style={{ zIndex: isActive ? 10 : 1, animationDelay: `${idx * 60}ms` }}
            >
              <span className="relative z-10 truncate">{item.name}</span>
              {isActive && (
                <span className="animate-underline absolute bottom-0 left-1/2 h-1 w-2/3 -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
              )}
            </Link>
          );
        })}
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-tab-pop {
          animation: tabPop 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes tabPop {
          0% {
            transform: scale(0.95);
          }
          60% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1.05);
          }
        }
        .animate-underline {
          animation: underlineGrow 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        @keyframes underlineGrow {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 66%;
            opacity: 1;
          }
        }
      `}</style>
    </nav>
  );
}
