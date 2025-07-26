import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-blue-50 to-pink-50 flex items-center justify-center py-16 px-4">
      <div className="relative max-w-3xl w-full bg-white/90 p-12 rounded-3xl shadow-2xl border border-blue-100 flex flex-col items-center animate-fade-in">
        {/* Decorative Gradient Icon */}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg border-4 border-white">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6"/>
            <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24"/>
            <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6"/>
          </svg>
        </span>
        {/* Gradient Accent Bar */}
        <div className="w-24 h-2 bg-gradient-to-r from-blue-400 to-pink-400 rounded-full mb-6 mt-8" />
        <h1 className="text-center text-4xl md:text-5xl font-extrabold text-gray-900 mb-2 tracking-tight drop-shadow-sm">
          About <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">Swift Stationery</span>
        </h1>
        <p className="text-center text-lg md:text-xl text-gray-600 mb-8 font-medium">
          Your one-stop shop for all your stationery needs.
        </p>
        <div className="text-lg md:text-xl text-gray-700 leading-relaxed space-y-6 text-center">
          <p>
            Welcome to <span className="font-semibold text-blue-600">Swift Stationery</span>, where quality meets creativity! We are passionate about providing the best stationery products to inspire your work, studies, and artistic endeavors. Our mission is to offer a wide range of high-quality, eco-friendly, and innovative stationery items that cater to students, professionals, and artists alike.
          </p>
          <p>
            Founded in <span className="font-semibold text-pink-500">[Year]</span>, Swift Stationery started with a simple idea: to make premium stationery accessible to everyone. We believe that the right tools can make a significant difference in productivity and expression. That's why we meticulously select our products, ensuring they meet the highest standards of durability, functionality, and design.
          </p>
          <p>
            From elegant pens and notebooks to vibrant art supplies and office essentials, we have everything you need to bring your ideas to life. Thank you for choosing <span className="font-semibold text-blue-600">Swift Stationery</span>. We look forward to being a part of your creative journey!
          </p>
        </div>
      </div>
    </div>
  );
} 