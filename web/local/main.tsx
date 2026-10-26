import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LocalApp from './LocalApp.tsx'
import { ThemeProvider } from '@/components/theme-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="onsp-local-theme">
      <LocalApp />
    </ThemeProvider>
  </StrictMode>,
)
