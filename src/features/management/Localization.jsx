// Management → Localization
// Inline editor over the bundled dictionary + DB overrides.
// AI helpers: translate (EN↔BCS), tone-check, suggest.

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Globe, Search, Loader2, AlertCircle, CheckCircle2, Sparkles,
  Download, Upload, RefreshCw, Filter, Languages, Brain, Save, X,
} from 'lucide-react'
import { dictionary, SUPPORTED, LANGUAGE_LABELS } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/I18nProvider'
import { useUser } from '@/contexts/UserContext'

async function api(path, options = {}) {
  const res = await fetch(`/api/localization${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

export default function Localization() {
  const { overrides, reloadOverrides } = useI18n()
  const { user } = useUser()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | missing | overridden
  const [namespace, setNamespace] = useState('all')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [editing, setEditing] = useState(null) // { key, lang, value }

  // Build flat row list from bundled dictionary
  const allKeys = useMemo(() => Object.keys(dictionary), [])
  const namespaces = useMemo(() => {
    const set = new Set(['all'])
    for (const k of allKeys) set.add(k.split('.')[0])
    return Array.from(set)
  }, [allKeys])

  const rows = useMemo(() => {
    const term = search.toLowerCase().trim()
    return allKeys
      .filter(k => namespace === 'all' || k.startsWith(namespace + '.'))
      .filter(k => {
        if (!term) return true
        const entry = dictionary[k]
        return k.toLowerCase().includes(term) ||
               (entry?.en || '').toLowerCase().includes(term) ||
               (entry?.bcs || '').toLowerCase().includes(term) ||
               (overrides[k]?.en || '').toLowerCase().includes(term) ||
               (overrides[k]?.bcs || '').toLowerCase().includes(term)
      })
      .filter(k => {
        if (filter === 'all') return true
        const entry = dictionary[k]
        if (filter === 'missing') {
          // Missing BCS or missing both
          return !entry?.bcs || !entry?.en
        }
        if (filter === 'overridden') return !!overrides[k]
        return true
      })
  }, [allKeys, namespace, search, filter, overrides])

  const counts = useMemo(() => ({
    total: allKeys.length,
    missing: allKeys.filter(k => !dictionary[k]?.bcs || !dictionary[k]?.en).length,
    overridden: allKeys.filter(k => !!overrides[k]).length,
  }), [allKeys, overrides])

  const save = useCallback(async (key, lang, value) => {
    setBusy(true)
    try {
      await api('/overrides', { method: 'PUT', body: JSON.stringify({ key, lang, value, updated_by: user?.name || '' }) })
      await reloadOverrides()
      setToast({ kind: 'success', msg: `Saved ${key} · ${lang}` })
    } catch (e) { setToast({ kind: 'error', msg: e.message }) }
    finally { setBusy(false) }
  }, [user, reloadOverrides])

  const revert = useCallback(async (key, lang) => {
    setBusy(true)
    try {
      await api(`/overrides?key=${encodeURIComponent(key)}&lang=${lang}`, { method: 'DELETE' })
      await reloadOverrides()
      setToast({ kind: 'success', msg: `Reverted ${key} · ${lang}` })
    } catch (e) { setToast({ kind: 'error', msg: e.message }) }
    finally { setBusy(false) }
  }, [reloadOverrides])

  const exportFile = async () => {
    window.open('/api/localization/export', '_blank')
  }

  const importFile = async (file) => {
    const text = await file.text()
    try {
      const json = JSON.parse(text)
      const entries = json.entries || json.overrides || json
      if (!Array.isArray(entries)) throw new Error('Expected an array')
      await api('/overrides/bulk', { method: 'POST', body: JSON.stringify({ entries }) })
      await reloadOverrides()
      setToast({ kind: 'success', msg: `Imported ${entries.length} entries.` })
    } catch (e) { setToast({ kind: 'error', msg: e.message }) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border bg-surface">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-[20px] flex items-center gap-2">
              <Globe size={18} className="text-accent" />
              Localization
            </h1>
            <p className="text-[11px] text-text-tertiary mt-0.5">Edit English & BCS translations. Changes save instantly and override the bundled dictionary.</p>
          </div>
          <div className="flex items-center gap-2">
            <Stat label="Keys" value={counts.total} />
            <Stat label="Missing" value={counts.missing} accent={counts.missing ? 'text-error' : 'text-text-secondary'} />
            <Stat label="Overridden" value={counts.overridden} accent="text-accent" />
            <button onClick={reloadOverrides} className="p-1.5 text-text-tertiary hover:text-accent"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /></button>
            <button onClick={exportFile} className="flex items-center gap-1 text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded">
              <Download size={11} /> Export
            </button>
            <label className="flex items-center gap-1 text-[11px] bg-elevated hover:bg-accent-muted text-text-secondary hover:text-accent px-2.5 py-1.5 rounded cursor-pointer">
              <Upload size={11} /> Import
              <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search key or value…"
              className="bg-elevated border border-border rounded-md pl-7 pr-3 py-1.5 text-[12px] w-72 focus:border-accent focus:outline-none" />
          </div>
          <select value={namespace} onChange={e => setNamespace(e.target.value)}
            className="bg-elevated border border-border rounded-md px-2 py-1.5 text-[11px]">
            {namespaces.map(n => <option key={n} value={n}>{n === 'all' ? 'All namespaces' : n}</option>)}
          </select>
          <div className="inline-flex bg-elevated border border-border rounded-md overflow-hidden text-[11px]">
            {[
              { v: 'all', l: 'All' },
              { v: 'missing', l: 'Missing' },
              { v: 'overridden', l: 'Overridden' },
            ].map(o => (
              <button key={o.v} onClick={() => setFilter(o.v)}
                className={`px-2.5 py-1.5 ${filter === o.v ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}>
                {o.l}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-text-tertiary">{rows.length} keys</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mx-6 mt-3 px-3 py-2 rounded text-[12px] flex items-center gap-2 ${
          toast.kind === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          {toast.kind === 'success' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)}><X size={12} /></button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-text-tertiary font-semibold bg-elevated border-b border-border">
            <div className="col-span-3">Key</div>
            <div className="col-span-4 flex items-center gap-1">{LANGUAGE_LABELS.en.flag} English</div>
            <div className="col-span-4 flex items-center gap-1">{LANGUAGE_LABELS.bcs.flag} Bosanski / Hrvatski / Srpski</div>
            <div className="col-span-1 text-right">Tools</div>
          </div>
          {rows.length === 0 ? (
            <div className="py-12 text-center text-[12px] text-text-tertiary">No keys match your filters.</div>
          ) : (
            rows.map(key => (
              <Row
                key={key}
                tkey={key}
                entry={dictionary[key]}
                overrideEn={overrides[key]?.en}
                overrideBcs={overrides[key]?.bcs}
                onSave={save}
                onRevert={revert}
                onAI={(payload) => setEditing({ ...payload, key })}
              />
            ))
          )}
        </div>
      </div>

      {editing && (
        <AIPanel
          state={editing}
          onClose={() => setEditing(null)}
          onApply={(lang, value) => { save(editing.key, lang, value); setEditing(null) }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'text-text-primary' }) {
  return (
    <div className="bg-elevated border border-border rounded px-2.5 py-1">
      <div className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</div>
      <div className={`text-[14px] font-display font-bold leading-none ${accent}`}>{value}</div>
    </div>
  )
}

function Row({ tkey, entry, overrideEn, overrideBcs, onSave, onRevert, onAI }) {
  const en  = overrideEn  !== undefined ? overrideEn  : (entry?.en  || '')
  const bcs = overrideBcs !== undefined ? overrideBcs : (entry?.bcs || '')
  const missing = !entry?.bcs || !entry?.en

  return (
    <div className={`grid grid-cols-12 px-4 py-3 border-b border-border text-[12px] gap-2 ${missing ? 'bg-error/[0.02]' : ''}`}>
      <div className="col-span-3 min-w-0">
        <div className="font-mono text-[11px] text-text-secondary break-all">{tkey}</div>
        {missing && <span className="text-[9px] uppercase tracking-wider text-error">missing</span>}
        {overrideEn !== undefined && <span className="text-[9px] uppercase tracking-wider text-accent ml-1">EN override</span>}
        {overrideBcs !== undefined && <span className="text-[9px] uppercase tracking-wider text-accent ml-1">BCS override</span>}
      </div>
      <Cell value={en} onSave={(v) => onSave(tkey, 'en', v)} onAI={() => onAI({ source: 'en', text: en })} placeholder={!entry?.en ? '(missing)' : ''} />
      <Cell value={bcs} onSave={(v) => onSave(tkey, 'bcs', v)} onAI={() => onAI({ source: 'bcs', text: bcs })} placeholder={!entry?.bcs ? '(missing)' : ''} />
      <div className="col-span-1 flex justify-end items-start gap-1">
        {(overrideEn !== undefined || overrideBcs !== undefined) && (
          <button title="Revert all overrides" onClick={() => { if (overrideEn !== undefined) onRevert(tkey, 'en'); if (overrideBcs !== undefined) onRevert(tkey, 'bcs') }}
            className="p-1 text-text-tertiary hover:text-error" >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function Cell({ value, onSave, onAI, placeholder }) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  useEffect(() => { setDraft(value) }, [value])
  const dirty = draft !== value
  return (
    <div className="col-span-4 min-w-0">
      <textarea value={draft} onChange={e => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={Math.min(4, Math.max(1, Math.ceil((value?.length || 0) / 60)))}
        className={`w-full bg-bg border rounded px-2 py-1.5 text-[12px] resize-y focus:outline-none ${
          dirty ? 'border-accent' : 'border-border'
        }`} />
      {(dirty || focused) && (
        <div className="mt-1 flex items-center justify-end gap-2">
          <button onClick={onAI} className="text-[10px] text-accent hover:underline flex items-center gap-1">
            <Sparkles size={9} /> AI
          </button>
          <button onClick={() => onSave(draft)} disabled={!dirty}
            className="text-[10px] bg-accent text-white px-2 py-0.5 rounded disabled:opacity-50 flex items-center gap-1">
            <Save size={9} /> Save
          </button>
        </div>
      )}
    </div>
  )
}

function AIPanel({ state, onClose, onApply }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [tone, setTone] = useState('')

  const sourceLang = state.source
  const target = sourceLang === 'en' ? 'bcs' : 'en'

  const translate = async () => {
    setBusy(true); setResult('')
    try {
      const r = await api('/ai/translate', { method: 'POST', body: JSON.stringify({ text: state.text, source: sourceLang, target }) })
      setResult(r.translation || '')
    } catch (e) { setResult(`Error: ${e.message}`) }
    finally { setBusy(false) }
  }
  const suggest = async () => {
    setBusy(true); setResult('')
    try {
      const r = await api('/ai/suggest', { method: 'POST', body: JSON.stringify({ text: state.text, lang: sourceLang }) })
      setResult(r.suggestion || '')
    } catch (e) { setResult(`Error: ${e.message}`) }
    finally { setBusy(false) }
  }
  const toneCheck = async () => {
    setBusy(true); setTone('')
    try {
      const r = await api('/ai/tone-check', { method: 'POST', body: JSON.stringify({ en: state.source === 'en' ? state.text : '', bcs: state.source === 'bcs' ? state.text : '' }) })
      setTone(r.review || '')
    } catch (e) { setTone(`Error: ${e.message}`) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={onClose}>
      <div className="w-[480px] h-full bg-surface border-l border-border overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <Brain size={15} className="text-accent" />
            <h3 className="font-display font-semibold text-[14px]">AI Localization</h3>
          </div>
          <button onClick={onClose}><X size={15} className="text-text-tertiary hover:text-text-primary" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Key</div>
            <div className="font-mono text-[11px] text-text-primary break-all">{state.key}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">{LANGUAGE_LABELS[sourceLang].flag} Source ({sourceLang.toUpperCase()})</div>
            <div className="bg-bg border border-border rounded p-2.5 text-[12px] text-text-primary whitespace-pre-wrap">{state.text || '(empty)'}</div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={translate} disabled={busy || !state.text}
              className="flex items-center justify-center gap-1 bg-accent text-white py-2 rounded text-[11px] font-semibold disabled:opacity-50">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Languages size={11} />} Translate → {target.toUpperCase()}
            </button>
            <button onClick={suggest} disabled={busy || !state.text}
              className="flex items-center justify-center gap-1 bg-elevated text-text-primary py-2 rounded text-[11px] font-semibold disabled:opacity-50">
              <Sparkles size={11} /> Improve
            </button>
            <button onClick={toneCheck} disabled={busy || !state.text}
              className="flex items-center justify-center gap-1 bg-elevated text-text-primary py-2 rounded text-[11px] font-semibold disabled:opacity-50">
              <Filter size={11} /> Tone
            </button>
          </div>

          {result && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">Result</div>
              <textarea value={result} onChange={e => setResult(e.target.value)} rows={4}
                className="w-full bg-bg border border-accent/30 rounded p-2.5 text-[12px] text-text-primary focus:outline-none focus:border-accent" />
              <div className="mt-2 flex items-center justify-end gap-2">
                <button onClick={() => onApply(sourceLang, result)} className="bg-accent-muted text-accent text-[11px] font-semibold px-3 py-1.5 rounded">
                  Apply to {sourceLang.toUpperCase()}
                </button>
                <button onClick={() => onApply(target, result)} className="bg-accent text-white text-[11px] font-semibold px-3 py-1.5 rounded">
                  Apply to {target.toUpperCase()}
                </button>
              </div>
            </div>
          )}

          {tone && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-1">Tone review</div>
              <div className="bg-warning/5 border border-warning/20 rounded p-2.5 text-[12px] whitespace-pre-wrap">{tone}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
