// Management → Persistence
// Operational dashboard that proves data is durable: storage status,
// per-table row counts + last-write timestamps, write-proof markers
// that survive redeploys, audit log of every mutation, backup files
// downloadable from /data/backups, optional Postgres ping.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Database, HardDrive, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
  ShieldCheck, Download, Plus, FileArchive, ListChecks, Activity, Clock,
  Server, AlertCircle, Search as SearchIcon, X, Bookmark, History,
} from 'lucide-react'
import { useUser } from '@/contexts/UserContext'

async function api(path, options = {}) {
  const res = await fetch(`/api/persistence${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

const TABS = [
  { key: 'overview',  label: 'Overview',     icon: Database },
  { key: 'tables',    label: 'Tables',       icon: ListChecks },
  { key: 'audit',     label: 'Audit Log',    icon: Activity },
  { key: 'markers',   label: 'Write Proof',  icon: Bookmark },
  { key: 'backups',   label: 'Backups',      icon: FileArchive },
  { key: 'pg',        label: 'PostgreSQL',   icon: Server },
]

export default function Persistence() {
  const [tab, setTab] = useState('overview')
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 border-b border-border bg-surface">
        <h1 className="font-display font-bold text-[20px] flex items-center gap-2">
          <ShieldCheck size={18} className="text-accent" />
          Persistence Center
        </h1>
        <p className="text-[11px] text-text-tertiary mt-0.5">
          Proof that every write lands on disk. Survive redeploys, audit every mutation, restore from backup.
        </p>
      </div>
      <div className="px-6 border-b border-border bg-surface flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'overview' && <Overview />}
        {tab === 'tables'   && <TablesTab />}
        {tab === 'audit'    && <AuditTab />}
        {tab === 'markers'  && <MarkersTab />}
        {tab === 'backups'  && <BackupsTab />}
        {tab === 'pg'       && <PgTab />}
      </div>
    </div>
  )
}

function Overview() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    setBusy(true)
    api('/status').then(setStatus).catch(() => setStatus({ error: true })).finally(() => setBusy(false))
  }, [])
  useEffect(() => { load() }, [load])

  if (!status) return <Loading />
  if (status.error) return <div className="m-6 bg-error/5 border border-error/20 rounded p-4 text-error text-[12px]">Failed to load persistence status.</div>

  const s = status.storage
  const ok = s.persistent && s.fileExists && s.warnings.length === 0
  const fmtTs = (t) => t ? new Date(t).toLocaleString() : '—'

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-5">
      <div className="flex items-center justify-end">
        <button onClick={load} disabled={busy} className="flex items-center gap-1 text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded">
          <RefreshCw size={11} className={busy ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Hero: durability state */}
      <div className={`rounded-xl p-5 border ${ok ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/30'}`}>
        <div className="flex items-start gap-3">
          {ok ? <CheckCircle2 size={22} className="text-success shrink-0 mt-0.5" />
              : <AlertTriangle size={22} className="text-warning shrink-0 mt-0.5" />}
          <div className="flex-1">
            <h2 className="font-display font-bold text-[16px] mb-1">
              {ok ? 'Data is durable.' : 'Persistence is at risk.'}
            </h2>
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {ok
                ? <>Writes are landing on the mounted volume at <code className="bg-elevated px-1.5 py-0.5 rounded">{s.dataDir}</code>. Redeploys, restarts, and crashes will not erase data.</>
                : <>The database is being written to <code className="bg-elevated px-1.5 py-0.5 rounded">{s.dbPath}</code> which is not on a recognised persistent path. <strong>Set <code>DATA_DIR=/data</code> in Railway Variables and mount a Volume at <code>/data</code></strong>.</>}
            </p>
            {s.warnings.length > 0 && (
              <ul className="mt-2 text-[11px] text-warning space-y-1">
                {s.warnings.map((w, i) => <li key={i}>• {w}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Tables"        value={status.tables} sub="schema objects" icon={Database} />
        <Kpi label="Total rows"    value={status.total_rows?.toLocaleString()} sub="across all tables" icon={ListChecks} />
        <Kpi label="Writes · 24h"  value={status.writes_24h?.toLocaleString()} sub={`${status.failed_24h || 0} failed`} icon={Activity} accent={status.failed_24h > 0 ? 'text-warning' : 'text-accent'} />
        <Kpi label="Writes · 7d"   value={status.writes_7d?.toLocaleString()} sub="rolling window" icon={Clock} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Storage" icon={HardDrive}>
          <Row label="DB path"     mono>{s.dbPath}</Row>
          <Row label="Mount point" mono>{s.dataDir}</Row>
          <Row label="File size">{s.fileSizeKb?.toLocaleString()} KB</Row>
          <Row label="File last modified">{fmtTs(s.lastModified)}</Row>
          <Row label="Persistent volume">
            <Pill ok={s.persistent}>{s.persistent ? 'detected' : 'unverified'}</Pill>
          </Row>
          <Row label="Environment">
            <Pill ok>{s.isProduction ? 'production' : 'development'} · {s.isRailway ? 'Railway' : 'local'}</Pill>
          </Row>
        </Card>

        <Card title="Backups" icon={FileArchive}>
          <Row label="Snapshots on disk">{status.snapshots?.count ?? 0}</Row>
          <Row label="Latest snapshot">{fmtTs(status.snapshots?.last?.modified)}</Row>
          <Row label="Latest size">{status.snapshots?.last?.kb ? `${status.snapshots.last.kb.toLocaleString()} KB` : '—'}</Row>
          <Row label="Latest file" mono>{status.snapshots?.last?.file || '—'}</Row>
        </Card>

        <Card title="Audit + activity" icon={Activity}>
          <Row label="Last write">{fmtTs(status.last_write)}</Row>
          <Row label="Failed writes · 24h">{status.failed_24h}</Row>
          <Row label="Write-proof markers">{status.markers?.total}</Row>
          <Row label="Oldest marker">{fmtTs(status.markers?.first)}</Row>
        </Card>

        <Card title="PostgreSQL (future primary)" icon={Server}>
          {status.postgres?.configured
            ? (
              <>
                <Row label="Status"><Pill ok={status.postgres.ok}>{status.postgres.ok ? 'connected' : 'unreachable'}</Pill></Row>
                {status.postgres.ok && <Row label="Latency">{status.postgres.latency_ms} ms</Row>}
                {status.postgres.error && <Row label="Error" mono>{status.postgres.error}</Row>}
              </>
            )
            : (
              <p className="text-[12px] text-text-secondary">
                <code className="bg-elevated px-1.5 py-0.5 rounded">DATABASE_URL</code> is not set. The app currently runs on SQLite on the Railway Volume (durable). When you provision Postgres on Railway, set <code>DATABASE_URL</code> and run <code className="bg-elevated px-1.5 py-0.5 rounded">node scripts/migrate-to-pg.js</code> to copy all existing data over.
              </p>
            )}
        </Card>
      </div>
    </div>
  )
}

function TablesTab() {
  const [tables, setTables] = useState(null)
  const [filter, setFilter] = useState('')
  useEffect(() => { api('/tables').then(d => setTables(d.tables || [])).catch(() => setTables([])) }, [])
  if (!tables) return <Loading />
  const filtered = tables.filter(t => !filter || t.table.toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-[15px]">Per-table state</h2>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter…"
          className="bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] w-56 focus:border-accent focus:outline-none" />
      </div>
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold bg-elevated border-b border-border">
          <div className="col-span-6">Table</div>
          <div className="col-span-2 text-right">Rows</div>
          <div className="col-span-4 text-right">Last write</div>
        </div>
        {filtered.length === 0 && <div className="py-10 text-center text-[12px] text-text-tertiary">No tables match.</div>}
        {filtered.map(t => (
          <div key={t.table} className="grid grid-cols-12 px-4 py-2 text-[12px] border-b border-border last:border-0">
            <div className="col-span-6 font-mono text-text-primary truncate">{t.table}</div>
            <div className="col-span-2 text-right text-text-secondary">{(t.rows || 0).toLocaleString()}</div>
            <div className="col-span-4 text-right text-text-tertiary">{t.last_write ? new Date(t.last_write).toLocaleString() : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AuditTab() {
  const [entries, setEntries] = useState(null)
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState({ entity_type: '', action: '', q: '' })
  const load = useCallback(() => {
    const p = new URLSearchParams()
    if (filter.entity_type) p.set('entity_type', filter.entity_type)
    if (filter.action) p.set('action', filter.action)
    if (filter.q) p.set('q', filter.q)
    api(`/audit?${p}`).then(d => setEntries(d.entries || []))
  }, [filter])
  useEffect(() => { load() }, [load])
  useEffect(() => { api('/audit/stats').then(setStats).catch(() => {}) }, [])

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4">
      {stats && (
        <div className="grid md:grid-cols-3 gap-3">
          <Card title="Last 7 days · by action">
            {stats.per_action.length === 0 ? <Empty>No mutations yet.</Empty>
              : stats.per_action.map(a => <Row key={a.action} label={a.action}>{a.n.toLocaleString()}</Row>)}
          </Card>
          <Card title="Last 7 days · top entities">
            {stats.per_entity.length === 0 ? <Empty>No mutations yet.</Empty>
              : stats.per_entity.slice(0, 8).map(a => <Row key={a.entity_type} label={a.entity_type} mono>{a.n.toLocaleString()}</Row>)}
          </Card>
          <Card title="Recent failures">
            {stats.recent_failures.length === 0 ? <Empty>None — good.</Empty>
              : stats.recent_failures.slice(0, 6).map(f => (
                <div key={f.id} className="py-1 text-[11px]">
                  <span className="text-error font-mono">[{f.status}]</span>{' '}
                  <span className="text-text-secondary">{f.method} {f.route}</span>
                </div>
              ))}
          </Card>
        </div>
      )}

      <div className="bg-surface border border-border rounded-lg">
        <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
          <input value={filter.q} onChange={e => setFilter(f => ({ ...f, q: e.target.value }))} placeholder="Search route or body…"
            className="bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] w-72 focus:border-accent focus:outline-none" />
          <input value={filter.entity_type} onChange={e => setFilter(f => ({ ...f, entity_type: e.target.value }))} placeholder="entity_type"
            className="bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] w-40 focus:border-accent focus:outline-none" />
          <select value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))}
            className="bg-elevated border border-border rounded px-2 py-1.5 text-[12px]">
            <option value="">All actions</option>
            {['create','update','replace','delete'].map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold bg-elevated border-y border-border">
          <div className="col-span-2">When</div>
          <div className="col-span-1">Act</div>
          <div className="col-span-2">Actor</div>
          <div className="col-span-5">Route</div>
          <div className="col-span-1 text-right">Status</div>
          <div className="col-span-1 text-right">ms</div>
        </div>
        {entries === null ? <Loading inset />
          : entries.length === 0 ? <div className="py-10 text-center text-[12px] text-text-tertiary">No audit entries yet. Make any change in the app — it'll show up here.</div>
          : (
          <div className="max-h-[60vh] overflow-y-auto">
            {entries.map(e => (
              <div key={e.id} className="grid grid-cols-12 px-4 py-1.5 text-[11px] border-b border-border last:border-0 hover:bg-elevated">
                <div className="col-span-2 text-text-tertiary font-mono">{new Date(e.ts).toLocaleString()}</div>
                <div className="col-span-1"><ActionPill action={e.action} /></div>
                <div className="col-span-2 text-text-secondary truncate">{e.actor || '—'}</div>
                <div className="col-span-5 font-mono text-text-primary truncate">{e.method} {e.route}</div>
                <div className={`col-span-1 text-right font-mono ${e.status >= 400 ? 'text-error' : 'text-success'}`}>{e.status}</div>
                <div className="col-span-1 text-right text-text-tertiary">{e.duration_ms}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ActionPill({ action }) {
  const color = action === 'create' ? 'bg-success/15 text-success'
              : action === 'delete' ? 'bg-error/15 text-error'
              : 'bg-accent/15 text-accent'
  return <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${color}`}>{action}</span>
}

function MarkersTab() {
  const { user } = useUser()
  const [markers, setMarkers] = useState(null)
  const [payload, setPayload] = useState('')
  const [busy, setBusy] = useState(false)
  const load = () => api('/markers').then(d => setMarkers(d.markers || []))
  useEffect(() => { load() }, [])

  const drop = async () => {
    setBusy(true)
    try {
      await api('/markers', { method: 'POST', body: JSON.stringify({
        payload: payload || `Marker dropped from Persistence Center at ${new Date().toISOString()}`,
        created_by: user?.name || '',
      }) })
      setPayload(''); load()
    } finally { setBusy(false) }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4">
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display font-semibold text-[14px] mb-2 flex items-center gap-1.5">
          <Bookmark size={13} className="text-accent" /> Write-proof markers
        </h2>
        <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
          Drop a marker before pushing a deploy. After Railway finishes redeploying, come back here — if the marker is still listed, persistence is working.
        </p>
        <div className="flex gap-2">
          <input value={payload} onChange={e => setPayload(e.target.value)} placeholder="Optional note (e.g. 'before v2.3 deploy')"
            className="flex-1 bg-elevated border border-border rounded px-3 py-2 text-[12px] focus:border-accent focus:outline-none" />
          <button onClick={drop} disabled={busy}
            className="bg-accent text-white text-[12px] font-semibold px-3 py-2 rounded flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Drop marker
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold border-b border-border">
          Markers ({markers?.length || 0})
        </div>
        {markers === null ? <Loading inset />
          : markers.length === 0 ? <div className="py-10 text-center text-[12px] text-text-tertiary">No markers yet.</div>
          : markers.map(m => (
            <div key={m.id} className="px-4 py-2 border-b border-border last:border-0 text-[12px] flex items-center gap-3">
              <span className="text-text-tertiary font-mono text-[11px]">{new Date(m.created_at).toLocaleString()}</span>
              <span className="text-text-primary flex-1">{m.payload || '(no note)'}</span>
              {m.created_by && <span className="text-[10px] text-text-tertiary">{m.created_by}</span>}
            </div>
          ))}
      </div>
    </div>
  )
}

function BackupsTab() {
  const [snaps, setSnaps] = useState(null)
  const [busy, setBusy] = useState(false)
  const load = () => api('/snapshots').then(d => setSnaps(d.snapshots || []))
  useEffect(() => { load() }, [])
  const takeNow = async () => {
    setBusy(true)
    try { const r = await api('/snapshots', { method: 'POST' });
      alert(`Snapshot ${r.ok ? 'created' : 'failed'} — ${r.tables} tables · ${r.rows} rows · ${Math.round(r.bytes/1024)} KB`)
      load()
    } finally { setBusy(false) }
  }
  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-[15px]">Backups</h2>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            Auto-snapshot daily into <code className="bg-elevated px-1.5 py-0.5 rounded">/data/backups</code>, retained for 14 days. Each file is a full JSON dump of every table.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/api/admin/data/export?download=1" target="_blank" rel="noreferrer"
            className="text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded flex items-center gap-1">
            <Download size={11} /> Live export
          </a>
          <button onClick={takeNow} disabled={busy}
            className="text-[12px] bg-accent text-white font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Snapshot now
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold bg-elevated border-b border-border">
          <div className="col-span-6">File</div>
          <div className="col-span-2 text-right">Size</div>
          <div className="col-span-3">Modified</div>
          <div className="col-span-1 text-right">Get</div>
        </div>
        {snaps === null ? <Loading inset />
          : snaps.length === 0
            ? <div className="py-10 text-center text-[12px] text-text-tertiary">No snapshots yet. Take one now or wait for the daily scheduler.</div>
            : snaps.map(s => (
              <div key={s.file} className="grid grid-cols-12 px-4 py-2 text-[12px] border-b border-border last:border-0">
                <div className="col-span-6 font-mono text-text-primary truncate">{s.file}</div>
                <div className="col-span-2 text-right text-text-secondary">{s.kb.toLocaleString()} KB</div>
                <div className="col-span-3 text-text-tertiary">{new Date(s.modified).toLocaleString()}</div>
                <div className="col-span-1 text-right">
                  <a href={`/api/persistence/snapshots/${encodeURIComponent(s.file)}`} className="text-accent hover:text-accent-hover" target="_blank" rel="noreferrer">
                    <Download size={13} />
                  </a>
                </div>
              </div>
            ))}
      </div>

      <p className="text-[11px] text-text-tertiary">
        To restore a snapshot: download the JSON, then POST it to <code className="bg-elevated px-1.5 py-0.5 rounded">/api/admin/data/import</code>. The import is additive — it never drops tables or deletes rows.
      </p>
    </div>
  )
}

function PgTab() {
  const [pg, setPg] = useState(null)
  const load = () => api('/pg').then(setPg)
  useEffect(() => { load() }, [])
  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-4">
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display font-semibold text-[15px] mb-2 flex items-center gap-2"><Server size={14} className="text-accent" />PostgreSQL — future primary</h2>
        {!pg ? <Loading inset /> : !pg.configured ? (
          <div className="space-y-3 text-[12px] text-text-secondary leading-relaxed">
            <p><strong>Status:</strong> <Pill>not configured</Pill></p>
            <p>The app currently runs on SQLite on the Railway Volume — durable, but single-instance. To cut over to PostgreSQL on Railway:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Provision PostgreSQL on Railway (one-click from the dashboard).</li>
              <li>Set <code className="bg-elevated px-1.5 py-0.5 rounded">DATABASE_URL</code> in the service's Variables.</li>
              <li>Add the <code className="bg-elevated px-1.5 py-0.5 rounded">pg</code> package: <code className="bg-elevated px-1.5 py-0.5 rounded">npm install pg</code>.</li>
              <li>Run the migration script once: <code className="bg-elevated px-1.5 py-0.5 rounded">node scripts/migrate-to-pg.js</code> — it copies every row from SQLite into PG, skipping conflicts.</li>
              <li>Land the route-by-route async refactor (separate project — ~650 call sites across 26 routes).</li>
            </ol>
            <p className="text-text-tertiary">Until step 5, this dashboard will show PG as reachable but the live request path will still use the SQLite file.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Row label="Status"><Pill ok={pg.ok}>{pg.ok ? 'connected' : 'unreachable'}</Pill></Row>
            {pg.ok && <Row label="Latency">{pg.latency_ms} ms</Row>}
            {pg.ok && <Row label="Server time" mono>{pg.server_time}</Row>}
            {pg.error && <Row label="Error" mono>{pg.error}</Row>}
            <button onClick={load} className="mt-2 text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded flex items-center gap-1">
              <RefreshCw size={11} /> Re-ping
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── shared bits ──
function Kpi({ label, value, sub, icon: Icon, accent = 'text-accent' }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1 ${accent}`}>
        <Icon size={11} /> {label}
      </div>
      <div className="font-display font-bold text-[24px] text-text-primary leading-none">{value ?? '—'}</div>
      {sub && <div className="text-[10px] text-text-tertiary mt-1">{sub}</div>}
    </div>
  )
}
function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {title}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function Row({ label, children, mono }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12px]">
      <span className="text-text-tertiary">{label}</span>
      <span className={`text-text-primary text-right ${mono ? 'font-mono text-[11px]' : ''}`}>{children}</span>
    </div>
  )
}
function Pill({ ok, children }) {
  const tone = ok === true ? 'bg-success/15 text-success'
             : ok === false ? 'bg-error/15 text-error'
             : 'bg-elevated text-text-secondary'
  return <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${tone}`}>{children}</span>
}
function Empty({ children }) { return <div className="text-[12px] text-text-tertiary py-1">{children}</div> }
function Loading({ inset }) {
  return <div className={`${inset ? 'py-10' : 'h-full'} flex justify-center items-center`}><Loader2 size={18} className="animate-spin text-accent" /></div>
}
