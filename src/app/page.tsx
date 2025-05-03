'use client';

import React, { useState } from 'react';
import DashboardComponent from '@/components/DashboardComponent';
import DriversComponent from '@/components/DriversComponent';
import StatisticsComponent from '@/components/StatisticsComponent';
export default function Home() {
  const [activeComponent, setActiveComponent] = useState('dashboard');

  // Render component based on active state
  const renderComponent = () => {
    switch (activeComponent) {
      case 'dashboard':
        return <DashboardComponent />;
      case 'drivers':
        return <DriversComponent />;
      case 'statistics':
        return <StatisticsComponent />;
      default:
        return <DashboardComponent />;
    }
  };

  return (
    <main className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation Bar */}
        <nav className="mb-6 px-4 py-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-gray-100">SummerDuck Racing Analytics</div>
            <div className="flex space-x-4">
              <button
                className={`px-3 py-1 focus:outline-none ${activeComponent === 'dashboard' ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
                onClick={() => setActiveComponent('dashboard')}
              >
                Dashboard
              </button>
              <button
                className={`px-3 py-1 focus:outline-none ${activeComponent === 'statistics' ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
                onClick={() => setActiveComponent('statistics')}
              >
                Statistics
              </button>
              <button
                className={`px-3 py-1 focus:outline-none ${activeComponent === 'drivers' ? 'text-purple-400' : 'text-gray-400 hover:text-purple-400'}`}
                onClick={() => setActiveComponent('drivers')}
              >
                Drivers
              </button>
            </div>
          </div>
        </nav>

        {/* Render Active Component */}
        {renderComponent()}

        {/* Footer */}
        <footer className="mt-8 px-4 py-3 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} SummerDuck Racing | All rights reserved
        </footer>
      </div>
    </main>
  );
}
