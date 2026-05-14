import { useState } from 'react'
import { TestTube, Play, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function AITests() {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(null)

  const runTest = async (name, endpoint, body = {}) => {
    setRunning(name)
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      setResults(prev => ({ ...prev, [name]: { ok: !d.error, data: d, error: d.error } }))
    } catch (e) {
      setResults(prev => ({ ...prev, [name]: { ok: false, error: e.message } }))
    }
    setRunning(null)
  }

  const tests = [
    { name: 'Connection', desc: 'Test provider connection', fn: () => runTest('Connection', '/api/test/connection') },
    { name: 'Basic Generation', desc: 'Test text generation', fn: () => runTest('Basic Generation', '/api/test/basic') },
    { name: 'Structured Output', desc: 'Test JSON structured response', fn: () => runTest('Structured Output', '/api/test/structured') },
    { name: 'Dashboard Briefing', desc: 'Test AI dashboard briefing', fn: () => runTest('Dashboard Briefing', '/api/ai/dashboard-briefing', { date: new Date().toLocaleDateString(), activeClients: '12', overdueInvoices: 'Test: 1 overdue', expiringDomains: 'None', newLeads: '2 new leads', pendingTasks: '3 tasks', recentActivity: 'Test activity' }) },
    { name: 'Lead Analysis', desc: 'Test lead scoring', fn: () => runTest('Lead Analysis', '/api/ai/lead-analysis', { businessName: 'Test Business', location: 'Sarajevo', niche: 'Restaurant', rating: '4.5', reviewCount: '100' }) },
    { name: 'Outreach', desc: 'Test outreach generation', fn: () => runTest('Outreach', '/api/ai/outreach', { businessName: 'Test Business', niche: 'Restaurant', location: 'Sarajevo', hasWebsite: false, style: 'professional', channel: 'email' }) },
  ]

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">Test Center</h1>
        <p className="text-[13px] text-text-secondary mt-1">Run AI endpoint tests and inspect responses</p>
      </div>

      <div className="space-y-3">
        {tests.map(t => (
          <div key={t.name} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[14px] font-medium">{t.name}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">{t.desc}</p>
              </div>
              <button
                onClick={t.fn}
                disabled={running === t.name}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
              >
                {running === t.name ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Run
              </button>
            </div>
            {results[t.name] && (
              <div className={`mt-3 p-3 rounded-md text-[11px] ${results[t.name].ok ? 'bg-success/5 border border-success/20' : 'bg-error/5 border border-error/20'}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  {results[t.name].ok ? <CheckCircle size={12} className="text-success" /> : <XCircle size={12} className="text-error" />}
                  <span className={results[t.name].ok ? 'text-success font-medium' : 'text-error font-medium'}>
                    {results[t.name].ok ? 'Passed' : 'Failed'}
                  </span>
                  {results[t.name].data?.latencyMs && <span className="text-text-tertiary ml-2">{results[t.name].data.latencyMs}ms</span>}
                </div>
                <pre className="font-mono text-text-secondary whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {results[t.name].error || (results[t.name].data?.text?.slice(0, 500)) || JSON.stringify(results[t.name].data?.data, null, 2)?.slice(0, 500) || 'OK'}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
