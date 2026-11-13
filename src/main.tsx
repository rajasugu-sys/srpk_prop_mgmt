import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for mobile installability and offline support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('App updated; refresh to see new version.');
  },
  onOfflineReady() {
    console.log('App ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
