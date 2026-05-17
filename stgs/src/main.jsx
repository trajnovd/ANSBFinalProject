import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './lib/i18n.js'
import App from './App.jsx'
import { AuthProvider } from './lib/auth.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { bootstrap } from './lib/store.js'

const root = createRoot(document.getElementById('root'))

// Brief loading screen so the user sees something while we pull from Supabase.
root.render(
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100vh', fontFamily: 'system-ui,-apple-system,sans-serif',
    color: '#6b7280', fontSize: 14,
  }}>
    Поврзување со Supabase…
  </div>
)

bootstrap().finally(() => {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </StrictMode>,
  )
})
