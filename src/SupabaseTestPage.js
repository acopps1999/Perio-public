import React from 'react';
import SupabaseTest from './components/SupabaseTest';

function SupabaseTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-10">Supabase Connection Diagnostics</h1>
        <SupabaseTest />
      </div>
    </div>
  );
}

export default SupabaseTestPage; 