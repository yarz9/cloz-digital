import { Component } from 'react'
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react'

// ══════════════════════════════════════════════════════════════
//  ErrorBoundary — Catches React render exceptions and surfaces
//  a recoverable, branded fallback instead of a blank screen.
// ══════════════════════════════════════════════════════════════

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Best-effort: log to server
    try {
      console.error('[Portal] Uncaught render error:', error, errorInfo?.componentStack)
      fetch('/api/activity-logs/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          category: 'ui',
          event_type: 'react_error_boundary',
          action: 'portal_crash',
          message: error?.message || 'Unknown render error',
          details: {
            stack: error?.stack?.slice(0, 4000) || '',
            componentStack: errorInfo?.componentStack?.slice(0, 4000) || '',
            url: typeof window !== 'undefined' ? window.location.href : '',
          },
        }),
      }).catch(() => {})
    } catch {}
  }

  handleReload = () => {
    window.location.reload()
  }

  handleSignOut = () => {
    try {
      localStorage.removeItem('cloz_portal_token_v1')
      localStorage.removeItem('cloz_portal_client_v1')
    } catch {}
    window.location.href = this.props.fallbackHref || '/portal/login'
  }

  render() {
    if (!this.state.error) return this.props.children

    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

    return (
      <div className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-4">
        <div className="w-full max-w-[520px]">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-error/10 border border-error/30 flex items-center justify-center mb-4">
              <AlertTriangle size={26} className="text-error" />
            </div>
            <h1 className="font-display font-bold text-[22px] mb-2">
              Something went wrong loading your portal.
            </h1>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-[420px] mx-auto">
              An unexpected error prevented the page from rendering. Reloading or signing back in usually fixes it.
              If it keeps happening, email{' '}
              <a href="mailto:general@cloz.digital" className="text-accent hover:text-accent-hover">general@cloz.digital</a>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center mb-6">
            <button onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-md text-[13px] font-semibold transition-colors">
              <RefreshCw size={13} />Reload Portal
            </button>
            <button onClick={this.handleSignOut}
              className="inline-flex items-center justify-center gap-1.5 bg-elevated hover:bg-raised text-text-secondary px-5 py-2.5 rounded-md text-[13px] font-medium transition-colors">
              <LogOut size={13} />Sign out & return to login
            </button>
          </div>

          {/* Dev-only diagnostics */}
          {isDev && this.state.error && (
            <details className="bg-surface border border-border rounded-lg p-4 text-[11px]">
              <summary className="cursor-pointer text-text-tertiary font-medium">Technical details (dev only)</summary>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Message</div>
                  <pre className="text-error font-mono text-[11px] whitespace-pre-wrap">{String(this.state.error.message || this.state.error)}</pre>
                </div>
                {this.state.error.stack && (
                  <div>
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Stack</div>
                    <pre className="text-text-tertiary font-mono text-[10px] whitespace-pre-wrap max-h-[200px] overflow-y-auto">{this.state.error.stack}</pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider mb-1">Component stack</div>
                    <pre className="text-text-tertiary font-mono text-[10px] whitespace-pre-wrap max-h-[200px] overflow-y-auto">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    )
  }
}
