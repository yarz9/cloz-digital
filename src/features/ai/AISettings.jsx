import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw } from 'lucide-react'

export default function AISettings() {
  const [config, setConfig] = useState({})

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(d => {
      const c = {}
      ;(d || []).forEach(r => { c[r.key] = r.value })
      setConfig(c)
    }).catch(() => {})
  }, [])

  const fields = [
    { key: 'provider', label: 'Active Provider', type: 'select', options: ['groq', 'xai'] },
    { key: 'model', label: 'Default Model', type: 'text' },
    { key: 'temperature', label: 'Temperature', type: 'number', step: '0.1', min: '0', max: '2' },
    { key: 'maxTokens', label: 'Max Tokens', type: 'number' },
    { key: 'timeout', label: 'Timeout (ms)', type: 'number' },
    { key: 'retries', label: 'Retries', type: 'number' },
  ]

  return (
    <div className="p-6 max-w-[800px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">AI Settings</h1>
        <p className="text-[13px] text-text-secondary mt-1">Configure AI behavior and defaults</p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-5 space-y-4">
        {fields.map(f => (
          <div key={f.key} className="flex items-center justify-between">
            <label className="text-[13px] font-medium w-40">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={config[f.key] || ''}
                onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                className="flex-1 max-w-xs bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none"
              >
                {f.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type}
                value={config[f.key] || ''}
                onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
                step={f.step}
                min={f.min}
                max={f.max}
                className="flex-1 max-w-xs bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold mb-3">Environment</h2>
        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div><span className="text-text-tertiary">GROQ_API_KEY:</span> <span className="text-text-secondary">{config.groqKey ? 'configured' : 'check .env'}</span></div>
          <div><span className="text-text-tertiary">XAI_API_KEY:</span> <span className="text-text-secondary">{config.xaiKey ? 'configured' : 'check .env'}</span></div>
          <div><span className="text-text-tertiary">NODE_ENV:</span> <span className="text-text-secondary">{config.env || 'development'}</span></div>
        </div>
      </div>
    </div>
  )
}
