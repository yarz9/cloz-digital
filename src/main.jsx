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

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
