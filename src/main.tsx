import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { selectAdapter } from './ai';
import './index.css';

// Mock by default; `?llm=live` uses the server endpoint; fault injection is dev-only.
const adapter = selectAdapter(window.location.search, import.meta.env.DEV);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App explainAdapter={adapter} />
  </StrictMode>
);
