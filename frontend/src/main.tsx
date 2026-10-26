import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {ModuleProvider} from "./contexts/ModuleContext";
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>

    <ModuleProvider>

      <App />

    </ModuleProvider>

  </StrictMode>,
)
