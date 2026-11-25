import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './components/Toast.jsx';
import registerSW from './registerSW.js';
import './styles/app.css';
import './styles/feed.css';
import './styles/help.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);

// En desarrollo (npm run dev) no se usa el service worker para no cachear código a medio hacer.
if (import.meta.env.PROD) registerSW();
