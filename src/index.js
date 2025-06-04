import React from 'react';
import ReactDOM from 'react-dom/client';
import ClinicalChartMockup from './components/ClinicalChartMockup';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
    <ClinicalChartMockup />
    </AuthProvider>
  </React.StrictMode>
);