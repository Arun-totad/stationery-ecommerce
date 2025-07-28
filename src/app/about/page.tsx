import React from 'react';

export default function AboutPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 via-blue-50 to-pink-50 px-4 py-16">
      <div className="animate-fade-in relative flex w-full max-w-3xl flex-col items-center rounded-3xl border border-blue-100 bg-white/90 p-12 shadow-2xl">
        {/* Decorative Gradient Icon */}
        <span className="absolute -top-10 left-1/2 inline-flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-blue-500 via-yellow-300 to-pink-400 shadow-lg">
          <svg width="40" height="40" viewBox="0 0 64 64" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="12" fill="#3B82F6" />
            <rect x="20" y="20" width="24" height="24" rx="6" fill="#FBBF24" />
            <rect x="28" y="28" width="8" height="16" rx="4" fill="#F472B6" />
          </svg>
        </span>
        {/* Gradient Accent Bar */}
        <div className="mt-8 mb-6 h-2 w-24 rounded-full bg-gradient-to-r from-blue-400 to-pink-400" />
        <h1 className="mb-2 text-center text-4xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm md:text-5xl">
          About{' '}
          <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
            Swift Stationery
          </span>
        </h1>
        <p className="mb-8 text-center text-lg font-medium text-gray-600 md:text-xl">
          Your one-stop shop for all your stationery needs.
        </p>
        <div className="space-y-6 text-center text-lg leading-relaxed text-gray-700 md:text-xl">
          <p>
            Welcome to <span className="font-semibold text-blue-600">Swift Stationery</span>, where
            quality meets creativity! We are passionate about providing the best stationery products
            to inspire your work, studies, and artistic endeavors. Our mission is to offer a wide
            range of high-quality, eco-friendly, and innovative stationery items that cater to
            students, professionals, and artists alike.
          </p>
          <p>
            Founded in <span className="font-semibold text-pink-500">[Year]</span>, Swift Stationery
            started with a simple idea: to make premium stationery accessible to everyone. We
            believe that the right tools can make a significant difference in productivity and
            expression. That's why we meticulously select our products, ensuring they meet the
            highest standards of durability, functionality, and design.
          </p>
          <p>
            From elegant pens and notebooks to vibrant art supplies and office essentials, we have
            everything you need to bring your ideas to life. Thank you for choosing{' '}
            <span className="font-semibold text-blue-600">Swift Stationery</span>. We look forward
            to being a part of your creative journey!
          </p>
        </div>
      </div>
    </div>
  );
}
