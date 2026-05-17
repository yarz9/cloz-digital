import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { UserProvider } from './contexts/UserContext'
import { I18nProvider } from './i18n/I18nProvider'
import { ToastProvider } from './components/ui/Toast'
import { CommandPaletteProvider } from './components/ui/CommandPalette'
import { ShortcutsHelpProvider } from './components/ui/ShortcutsHelp'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <UserProvider>
            <ToastProvider>
              <CommandPaletteProvider>
                <ShortcutsHelpProvider>
                  <App />
                </ShortcutsHelpProvider>
              </CommandPaletteProvider>
            </ToastProvider>
          </UserProvider>
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
