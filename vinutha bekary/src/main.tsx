import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BakeryProvider } from './context/BakeryContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BakeryProvider>
      <App />
    </BakeryProvider>
  </StrictMode>,
)
