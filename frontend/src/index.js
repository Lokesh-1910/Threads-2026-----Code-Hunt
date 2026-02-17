// IMPORT THIS FIRST - BEFORE ANYTHING ELSE
import './utils/errorHandler';

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
if (process.env.NODE_ENV === 'development') {
  const original = console.error;
  console.error = (...args) => {
    if (args[0]?.includes?.('ResizeObserver')) return;
    original(...args);
  };
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();