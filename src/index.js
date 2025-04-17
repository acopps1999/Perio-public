import React from 'react';
import ReactDOM from 'react-dom/client';
import ClinicalChartMockup from './components/ClinicalChartMockup';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ClinicalChartMockup />
  </React.StrictMode>
);