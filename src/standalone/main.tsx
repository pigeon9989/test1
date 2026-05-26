import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../expose/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1>Notes — standalone preview</h1>
      <App />
    </div>
  </StrictMode>,
);
