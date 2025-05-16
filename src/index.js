import React from 'react';
import ReactDOM from 'react-dom/client';
import ClinicalChartMockup from './components/ClinicalChartMockup';
import { ToastProvider } from './components/ToastContext';
import SupabaseTestPage from './SupabaseTestPage';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      {/* Switch back to the main app */}
      <ClinicalChartMockup />
      {/* <SupabaseTestPage /> */}
    </ToastProvider>
  </React.StrictMode>
);