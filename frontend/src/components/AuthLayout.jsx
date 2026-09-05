import React from 'react';
import logoYnov from '../assets/ynov-logo.png';
import './AuthLayout.css';

export default function AuthLayout({ children }) {
  return (
    <div className="ynov-login-container">
      <div className="ynov-branding-panel">
        <div className="ynov-branding-content">
          <div className="ynov-logo-badge">
            <img src={logoYnov} alt="Ynov Campus" className="ynov-logo-img" />
          </div>
          <p className="ynov-slogan">Apprendre à réussir !</p>
        </div>
      </div>

      <div className="ynov-form-panel">
        <div className="ynov-form-card">
          {children}
        </div>
      </div>
    </div>
  );
}