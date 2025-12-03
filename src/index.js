import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './components/AppRouter';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  </React.StrictMode>
);