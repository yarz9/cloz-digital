import { useState, useEffect } from 'react'
import { Server, CheckCircle, XCircle, Loader2, RefreshCw, Zap } from 'lucide-react'

export default function AIProvider() {
  const [providers, setProviders] = useState([])
  const [config, setConfig] = useState({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const load = () => {
    fetch('/api/health').then(r => r.json()).then(d => {
      setConfig({ provider: d.provider, model: d.model })
    }).catch(() => {})
    fetch('/api/config/providers').then(r => r.json()).then(d => setProviders(d || [])).catch(() => {})
  }

  useEffect(load, [])

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch('/api/test/connection', { method: 'POST' })
      const d = await r.json()
      setTestResult(d)
    } catch (e) { setTestResult({ error: e.message }) }
    setTesting(false)
  }

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">Provider Settings</h1>
        <p className="text-[13px] text-text-secondary mt-1">Configure AI provider and model selection</p>
      </div>

      {/* Current provider */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-[14px] font-semibold flex items-center gap-2"><Server size={15} className="text-accent" /> Active Provider</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Provider</span>
            <span className="text-[16px] font-medium capitalize">{config.provider || '—'}</span>
          </div>
          <div>
            <span className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-1">Model</span>
            <span className="text-[16px] font-medium font-mono">{config.model || '—'}</span>
          </div>
        </div>
      </div>

      {/* Available providers */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-[14px] font-semibold">Available Providers</h2>
        <div className="space-y-3">
          {providers.length > 0 ? providers.map(p => (
            <div key={p.key} className="flex items-center justify-between p-3 bg-elevated rounded-md">
              <div>
                <span className="text-[13px] font-medium capitalize">{p.key}</span>
                <div className="text-[11px] text-text-tertiary mt-0.5">
                  Key: {p.maskedKey} &middot; Source: {p.keySource}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.hasKey ? (
                  <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded">Configured</span>
                ) : (
                  <span className="text-[10px] font-medium text-error bg-error/10 px-2 py-0.5 rounded">No Key</span>
                )}
              </div>
            </div>
          )) : (
            <p className="text-[12px] text-text-tertiary">Loading providers...</p>
          )}
        </div>
      </div>

      {/* Connection test */}
      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        <h2 className="text-[14px] font-semibold flex items-center gap-2"><Zap size={15} className="text-accent" /> Connection Test</h2>
        <button
          onClick={testConnection}
          disabled={testing}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[13px] font-medium transition-colors"
        >
          {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {testing ? 'Testing...' : 'Test Connection'}
        </button>
        {testResult && (
          <div className={`p-3 rounded-md text-[12px] ${testResult.error ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
            {testResult.error ? `Error: ${testResult.error}` : `OK — "${testResult.text}" (${testResult.latencyMs}ms)`}
          </div>
        )}
      </div>
    </div>
  )
}
