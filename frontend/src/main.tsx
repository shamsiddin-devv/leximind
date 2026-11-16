import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/plus-jakarta-sans';
import { App } from './app/App';
import './styles/base.css';
import './styles/dashboard.css';
import './styles/catalog.css';
import './styles/practice.css';
import './styles/forms.css';
import './styles/games.css';
import './styles/profile.css';
import './styles/public.css';
import './styles/responsive.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
