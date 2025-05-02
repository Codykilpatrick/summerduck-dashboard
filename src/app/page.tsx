'use client';

import React from 'react';
import DashboardComponent from '@/components/DashboardComponent';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Optional Navbar */}
        <nav className="mb-6 px-4 py-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-gray-100">Drag Racing Analytics</div>
            <div className="flex space-x-4">
              <button className="px-3 py-1 text-gray-200 hover:text-purple-400 focus:outline-none">
                Dashboard
              </button>
              <button className="px-3 py-1 text-gray-400 hover:text-purple-400 focus:outline-none">
                Statistics
              </button>
              <button className="px-3 py-1 text-gray-400 hover:text-purple-400 focus:outline-none">
                Drivers
              </button>
            </div>
          </div>
        </nav>
        
        {/* Dashboard Component */}
        <DashboardComponent />
        
        {/* Optional Footer */}
        <footer className="mt-8 px-4 py-3 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} SummerDuck Racing | All rights reserved
        </footer>
      </div>
    </main>
  );
}