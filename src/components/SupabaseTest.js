import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...');
  const [envVars, setEnvVars] = useState({
    url: process.env.REACT_APP_SUPABASE_URL || 'Not set',
    keyExists: process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  });

  useEffect(() => {
    async function testConnection() {
      try {
        // Try to get just one row from any table to verify connection
        const { data, error } = await supabase
          .from('procedures')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Supabase connection test error:', error);
          setConnectionStatus(`Error: ${error.message}`);
        } else {
          console.log('Supabase connection test result:', data);
          setConnectionStatus('Connected successfully');
        }
      } catch (err) {
        console.error('Supabase connection exception:', err);
        setConnectionStatus(`Exception: ${err.message}`);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto my-8">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Connection Status:</h3>
        <div className={`p-3 rounded ${
          connectionStatus.includes('Error') || connectionStatus.includes('Exception')
            ? 'bg-red-100 text-red-800'
            : connectionStatus === 'Connected successfully'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
        }`}>
          {connectionStatus}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Environment Variables:</h3>
        <div className="bg-gray-100 p-3 rounded">
          <div className="mb-2">
            <span className="font-medium">REACT_APP_SUPABASE_URL:</span> 
            <span className={envVars.url === 'Not set' ? 'text-red-600' : 'text-green-600'}>
              {envVars.url === 'Not set' ? ' Not set' : ' Set'}
            </span>
            {envVars.url !== 'Not set' && (
              <div className="mt-1 text-xs text-gray-600 break-all">{envVars.url}</div>
            )}
          </div>
          <div>
            <span className="font-medium">REACT_APP_SUPABASE_ANON_KEY:</span>
            <span className={envVars.keyExists === 'Not set' ? 'text-red-600' : 'text-green-600'}>
              {` ${envVars.keyExists}`}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-gray-600">
        <p className="mb-2">
          <strong>Note:</strong> For environment variables to be accessible in your React app:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>They must start with <code className="bg-gray-200 px-1 rounded">REACT_APP_</code></li>
          <li>The .env file must be in the project root (not in src/)</li>
          <li>You must restart the development server after changing .env</li>
        </ol>
      </div>
    </div>
  );
}

export default SupabaseTest; 