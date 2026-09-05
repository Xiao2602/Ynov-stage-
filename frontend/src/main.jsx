import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './auth/AuthContext';

// Appliquer le thème initial sauvegardé
localStorage.removeItem('ynov-theme-preference');
document.documentElement.removeAttribute('data-theme');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
