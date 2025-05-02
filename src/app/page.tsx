'use client';

import React from 'react';
import DashboardComponent from '@/components/DashboardComponent';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <DashboardComponent />
      </div>
    </main>
  );
}