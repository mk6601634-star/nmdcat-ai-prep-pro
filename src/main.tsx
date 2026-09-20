import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupAuthFetchInterceptor } from './lib/apiClient';

// Initialize transparent Bearer token authentication for all AI requests
setupAuthFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

