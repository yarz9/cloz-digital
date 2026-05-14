import { useState, useEffect } from 'react'
import { ScrollText, RefreshCw, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'

export default function AILogs() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('all')

  const load = () => {
    const url = filter === 'all' ? '/api/logs' : `/api/logs?type=${filter}`
    fetch(url).then(r => r.json()).then(d => setLogs(d.logs || d || [])).catch(() => {})
  }
  useEffect(load, [filter])

  const icon = (type) => {
    if (type === 'error') return <XCircle size={12} className="text-error shrink-0" />
    if (type === 'warning') return <AlertTriangle size={12} className="text-warning shrink-0" />
    if (type === 'success') return <CheckCircle size={12} className="text-success shrink-0" />
    return <Info size={12} className="text-info shrink-0" />
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">AI Logs</h1>
          <p className="text-[13px] text-text-secondary mt-1">{logs.length} log entries</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border px-3 py-1.5 rounded-md text-[12px] text-text-secondary transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex gap-1">
        {['all', 'info', 'error', 'warning', 'success'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${filter === f ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {logs.slice(0, 100).map((log, i) => (
          <div key={log.id || i} className="px-4 py-3 flex items-start gap-3">
            {icon(log.type)}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-text-secondary truncate">{log.message}</p>
            </div>
            <span className="text-[10px] text-text-tertiary shrink-0 font-mono">{log.created_at || '—'}</span>
          </div>
        ))}
        {logs.length === 0 && <div className="p-8 text-center text-text-tertiary text-[13px]">No logs found.</div>}
      </div>
    </div>
  )
}
