import {createRoot} from 'react-dom/client';
import {DemoApp} from './demo-app';
import '../app/globals.css';
createRoot(document.getElementById('demo-root')!).render(<DemoApp/>);
