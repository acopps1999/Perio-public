import React from 'react';
import ReactDOM from 'react-dom/client';
import ClinicalChartMockup from './components/ClinicalChartMockup';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ClinicalChartMockup />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);