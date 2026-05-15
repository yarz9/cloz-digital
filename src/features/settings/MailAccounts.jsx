import { useState, useEffect, useCallback } from 'react'
import {
  Mail, Plus, Settings, Shield, Server, RefreshCw, Loader2, CheckCircle, XCircle,
  AlertCircle, X, Eye, EyeOff, Trash2, Star, Send, Download, Clock, ChevronDown,
  ChevronRight, Globe, Zap, ArrowRight, Copy, Edit3, ToggleLeft, ToggleRight,
  FolderOpen, Lock, Wifi, WifiOff
} from 'lucide-react'

const API = '/api/mail/accounts'

async function api(endpoint, opts = {}) {
  const timeout = opts.timeout || 30000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
    return data
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`Request timed out after ${timeout / 1000}s`)
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ══════════════════════════════════════════════════════════════
//  PRESETS
// ══════════════════════════════════════════════════════════════
const PRESET_META = {
  zoho:        { label: 'Zoho Mail',               icon: '📧', color: 'text-red-400' },
  namecheap:   { label: 'Namecheap Private Email',  icon: '🌐', color: 'text-orange-400' },
  microsoft365:{ label: 'Microsoft 365',            icon: '🏢', color: 'text-blue-400' },
  google:      { label: 'Google Workspace',         icon: '🔍', color: 'text-emerald-400' },
  custom:      { label: 'Custom Server',            icon: '⚙️', color: 'text-text-secondary' },
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function MailAccounts() {
  const [accounts, setAccounts] = useState([])
  const [presets, setPresets] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | account id
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api('')
      setAccounts(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadAccounts()
    api('/presets').then(setPresets).catch(() => {})
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-text-tertiary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px] flex items-center gap-2">
            <Mail size={18} className="text-accent" />Mail Accounts
          </h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            Configure IMAP and SMTP credentials for your business email accounts
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors"
        >
          <Plus size={14} />Add Account
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 bg-error/5 border border-error/20 rounded-lg text-[12px] text-error flex items-center gap-2">
          <AlertCircle size={14} />{error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-[12px] font-medium flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' ? 'bg-success/10 border border-success/30 text-success' : 'bg-error/10 border border-error/30 text-error'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Account List */}
      {accounts.length === 0 && !editing ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Mail size={32} className="text-text-tertiary mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-medium text-text-secondary">No email accounts configured</p>
          <p className="text-[12px] text-text-tertiary mt-1 mb-4">Add your business email accounts to send and receive real emails</p>
          <button onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-[12px] font-semibold">
            <Plus size={14} />Add Your First Account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(acct => (
            <AccountCard
              key={acct.id}
              account={acct}
              isEditing={editing === acct.id}
              onEdit={() => setEditing(editing === acct.id ? null : acct.id)}
              onUpdate={() => { loadAccounts(); setEditing(null); }}
              onToast={showToast}
              presets={presets}
            />
          ))}
        </div>
      )}

      {/* New Account Form */}
      {editing === 'new' && (
        <AccountForm
          presets={presets}
          onClose={() => setEditing(null)}
          onSaved={() => { loadAccounts(); setEditing(null); showToast('Account created'); }}
          onToast={showToast}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  ACCOUNT CARD — collapsed view with actions
// ══════════════════════════════════════════════════════════════
function AccountCard({ account, isEditing, onEdit, onUpdate, onToast, presets }) {
  const [testing, setTesting] = useState(null) // 'imap' | 'smtp' | 'send' | 'sync'
  const [testResult, setTestResult] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const runAction = async (action, label) => {
    setTesting(action)
    setTestResult(null)
    try {
      const result = await api(`/${account.id}/${action}`, { method: 'POST' })
      setTestResult({ ...result, action })
      onToast(result.message, result.success ? 'success' : 'error')
      if (action === 'sync') onUpdate()
    } catch (e) {
      const msg = e.message || `${label} failed`
      setTestResult({ success: false, message: msg, action })
      onToast(msg, 'error')
    } finally {
      setTesting(null)
    }
  }

  const deleteAccount = async () => {
    try {
      await api(`/${account.id}`, { method: 'DELETE' })
      onToast(`${account.email} deleted`)
      onUpdate()
    } catch (e) {
      onToast(e.message, 'error')
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Status indicator */}
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[18px] ${
          account.imap_configured && account.smtp_configured
            ? 'bg-success/10'
            : account.imap_configured || account.smtp_configured
            ? 'bg-warning/10'
            : 'bg-elevated'
        }`}>
          <Mail size={18} className={
            account.imap_configured && account.smtp_configured
              ? 'text-success'
              : account.imap_configured || account.smtp_configured
              ? 'text-warning'
              : 'text-text-tertiary'
          } />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold truncate">{account.display_name}</span>
            {account.is_default ? <span className="text-[9px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded">DEFAULT</span> : null}
            {!account.is_active ? <span className="text-[9px] font-bold bg-elevated text-text-tertiary px-1.5 py-0.5 rounded">DISABLED</span> : null}
          </div>
          <div className="text-[12px] text-text-secondary truncate">{account.email}</div>
        </div>

        {/* Connection badges */}
        <div className="flex items-center gap-2 shrink-0">
          <ConnectionBadge label="IMAP" configured={account.imap_configured} lastTest={account.last_imap_test_at} />
          <ConnectionBadge label="SMTP" configured={account.smtp_configured} lastTest={account.last_smtp_test_at} />
          {account.sync_enabled ? (
            <span className="text-[9px] font-bold bg-success/10 text-success px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <RefreshCw size={8} />SYNC
            </span>
          ) : null}
        </div>

        {/* Expand toggle */}
        <button onClick={onEdit} className="p-1.5 hover:bg-elevated rounded-md text-text-tertiary shrink-0">
          {isEditing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Action bar */}
      {!isEditing && (
        <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
          <ActionBtn icon={Wifi} label="Test IMAP" loading={testing === 'test-imap'} disabled={!account.imap_configured}
            onClick={() => runAction('test-imap', 'IMAP')} />
          <ActionBtn icon={Send} label="Test SMTP" loading={testing === 'test-smtp'} disabled={!account.smtp_configured}
            onClick={() => runAction('test-smtp', 'SMTP')} />
          <ActionBtn icon={Mail} label="Send Test" loading={testing === 'send-test'} disabled={!account.smtp_configured}
            onClick={() => runAction('send-test', 'Send')} />
          <ActionBtn icon={Download} label="Sync Now" loading={testing === 'sync'} disabled={!account.imap_configured}
            onClick={() => runAction('sync', 'Sync')} />
          {account.last_sync_at && (
            <span className="text-[10px] text-text-tertiary ml-auto flex items-center gap-1">
              <Clock size={10} />Last sync: {new Date(account.last_sync_at).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Test result */}
      {testResult && !isEditing && (
        <div className={`mx-5 mb-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2 ${
          testResult.success ? 'bg-success/5 border border-success/20 text-success' : 'bg-error/5 border border-error/20 text-error'
        }`}>
          {testResult.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
          <span className="flex-1">{testResult.message}</span>
          <button onClick={() => setTestResult(null)}><X size={12} /></button>
        </div>
      )}

      {/* Expanded: full edit form */}
      {isEditing && (
        <div className="border-t border-border">
          <AccountForm
            account={account}
            presets={presets}
            onClose={onEdit}
            onSaved={onUpdate}
            onToast={onToast}
            onDelete={() => setDeleting(true)}
          />
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="px-5 py-3 bg-error/5 border-t border-error/20 flex items-center gap-3">
          <AlertCircle size={14} className="text-error shrink-0" />
          <span className="text-[12px] text-error flex-1">Delete <strong>{account.email}</strong>? This cannot be undone.</span>
          <button onClick={() => setDeleting(false)} className="text-[11px] text-text-secondary px-2 py-1 hover:bg-elevated rounded">Cancel</button>
          <button onClick={deleteAccount} className="text-[11px] text-white bg-error hover:bg-error/80 px-3 py-1 rounded font-medium">Delete</button>
        </div>
      )}
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
//  ACCOUNT FORM — create or edit
// ══════════════════════════════════════════════════════════════
function AccountForm({ account, presets, onClose, onSaved, onToast, onDelete }) {
  const isNew = !account

  const [form, setForm] = useState({
    account_name: account?.account_name || '',
    display_name: account?.display_name || '',
    email: account?.email || '',
    description: account?.description || '',
    title: account?.title || '',
    signature: account?.signature || '',
    imap_host: account?.imap_host || '',
    imap_port: account?.imap_port || 993,
    imap_username: account?.imap_username || account?.email || '',
    imap_password: '',
    imap_encryption: account?.imap_encryption || 'ssl_tls',
    smtp_host: account?.smtp_host || '',
    smtp_port: account?.smtp_port || 587,
    smtp_username: account?.smtp_username || account?.email || '',
    smtp_password: '',
    smtp_encryption: account?.smtp_encryption || 'ssl_tls',
    sync_enabled: account?.sync_enabled || false,
    sync_interval_minutes: account?.sync_interval_minutes || 15,
    sync_sent: account?.sync_sent || false,
    download_attachments: account?.download_attachments || false,
    is_default: account?.is_default || false,
    is_active: account?.is_active !== undefined ? account.is_active : true,
    inbox_folder: account?.inbox_folder || 'INBOX',
    sent_folder: account?.sent_folder || 'Sent',
    drafts_folder: account?.drafts_folder || 'Drafts',
    trash_folder: account?.trash_folder || 'Trash',
    spam_folder: account?.spam_folder || 'Spam',
  })

  const [saving, setSaving] = useState(false)
  const [showImapPass, setShowImapPass] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const applyPreset = (presetKey) => {
    const preset = presets[presetKey]
    if (!preset) return
    setSelectedPreset(presetKey)
    setForm(prev => ({
      ...prev,
      imap_host: preset.imap_host,
      imap_port: preset.imap_port,
      imap_encryption: preset.imap_encryption,
      smtp_host: preset.smtp_host,
      smtp_port: preset.smtp_port,
      smtp_encryption: preset.smtp_encryption,
    }))
  }

  const save = async () => {
    if (!form.email) return onToast('Email address is required', 'error')
    setSaving(true)
    try {
      const body = { ...form }
      // Don't send empty passwords (preserve existing)
      if (!body.imap_password) delete body.imap_password
      if (!body.smtp_password) delete body.smtp_password

      if (isNew) {
        await api('', { method: 'POST', body })
      } else {
        await api(`/${account.id}`, { method: 'PUT', body })
      }
      onSaved()
      onToast(isNew ? 'Account created successfully' : 'Account updated successfully')
    } catch (e) {
      onToast(e.message, 'error')
    }
    setSaving(false)
  }

  return (
    <div className={`${isNew ? 'bg-surface border border-border rounded-xl' : ''} p-5 space-y-5`}>
      {/* Form header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold flex items-center gap-2">
          {isNew ? <><Plus size={14} className="text-accent" />New Mail Account</> : <><Edit3 size={14} className="text-accent" />Edit Account</>}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-elevated rounded-md"><X size={14} className="text-text-tertiary" /></button>
      </div>

      {/* Provider Presets */}
      {isNew && (
        <div>
          <label className="text-[11px] text-text-tertiary uppercase tracking-wider block mb-2">Mail Provider</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(PRESET_META).map(([key, meta]) => (
              <button key={key} onClick={() => applyPreset(key)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedPreset === key
                    ? 'border-accent bg-accent/5'
                    : 'border-border bg-elevated hover:bg-raised'
                }`}>
                <span className="text-[16px] block mb-1">{meta.icon}</span>
                <span className="text-[10px] font-medium block leading-tight">{meta.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* General */}
      <Section title="General" icon={Settings}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Name" value={form.account_name} onChange={v => set('account_name', v)} placeholder="e.g. Anes" />
          <Field label="Display Name" value={form.display_name} onChange={v => set('display_name', v)} placeholder="e.g. Anes D." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email Address" value={form.email} onChange={v => set('email', v)} placeholder="anes@cloz.digital" type="email" required />
          <Field label="Description" value={form.description} onChange={v => set('description', v)} placeholder="Optional description" />
        </div>
        <div className="flex items-center gap-6 mt-1">
          <Toggle label="Active" checked={form.is_active} onChange={v => set('is_active', v)} />
          <Toggle label="Default Sender" checked={form.is_default} onChange={v => set('is_default', v)} />
        </div>
      </Section>

      {/* IMAP */}
      <Section title="IMAP Settings (Incoming)" icon={Download}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="IMAP Host" value={form.imap_host} onChange={v => set('imap_host', v)} placeholder="imap.zoho.com" className="col-span-1" />
          <Field label="Port" value={form.imap_port} onChange={v => set('imap_port', parseInt(v) || 993)} type="number" />
          <div>
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1.5">Encryption</label>
            <select value={form.imap_encryption} onChange={e => set('imap_encryption', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none">
              <option value="ssl_tls">SSL/TLS</option>
              <option value="starttls">STARTTLS</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" value={form.imap_username} onChange={v => set('imap_username', v)} placeholder={form.email || 'email@domain.com'} />
          <PasswordField
            label="Password"
            value={form.imap_password}
            onChange={v => set('imap_password', v)}
            show={showImapPass}
            onToggle={() => setShowImapPass(!showImapPass)}
            masked={account?.imap_password_masked}
            isSet={account?.imap_password_set}
          />
        </div>
      </Section>

      {/* SMTP */}
      <Section title="SMTP Settings (Outgoing)" icon={Send}>
        <div className="grid grid-cols-3 gap-3">
          <Field label="SMTP Host" value={form.smtp_host} onChange={v => set('smtp_host', v)} placeholder="smtp.zoho.com" />
          <Field label="Port" value={form.smtp_port} onChange={v => set('smtp_port', parseInt(v) || 587)} type="number" />
          <div>
            <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1.5">Encryption</label>
            <select value={form.smtp_encryption} onChange={e => set('smtp_encryption', e.target.value)}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none">
              <option value="ssl_tls">SSL/TLS</option>
              <option value="starttls">STARTTLS</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Username" value={form.smtp_username} onChange={v => set('smtp_username', v)} placeholder={form.email || 'email@domain.com'} />
          <PasswordField
            label="Password"
            value={form.smtp_password}
            onChange={v => set('smtp_password', v)}
            show={showSmtpPass}
            onToggle={() => setShowSmtpPass(!showSmtpPass)}
            masked={account?.smtp_password_masked}
            isSet={account?.smtp_password_set}
          />
        </div>
      </Section>

      {/* Sync */}
      <Section title="Sync Settings" icon={RefreshCw}>
        <div className="flex items-center gap-6 flex-wrap">
          <Toggle label="Sync Enabled" checked={form.sync_enabled} onChange={v => set('sync_enabled', v)} />
          <Toggle label="Sync Sent Folder" checked={form.sync_sent} onChange={v => set('sync_sent', v)} />
          <Toggle label="Download Attachments" checked={form.download_attachments} onChange={v => set('download_attachments', v)} />
        </div>
        {form.sync_enabled && (
          <div className="w-48">
            <Field label="Sync Interval (minutes)" value={form.sync_interval_minutes} onChange={v => set('sync_interval_minutes', parseInt(v) || 15)} type="number" />
          </div>
        )}
      </Section>

      {/* Advanced */}
      <button onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors">
        {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <FolderOpen size={13} />Advanced Folder Settings
      </button>

      {showAdvanced && (
        <Section title="Folder Mapping" icon={FolderOpen}>
          <div className="grid grid-cols-5 gap-3">
            <Field label="Inbox" value={form.inbox_folder} onChange={v => set('inbox_folder', v)} />
            <Field label="Sent" value={form.sent_folder} onChange={v => set('sent_folder', v)} />
            <Field label="Drafts" value={form.drafts_folder} onChange={v => set('drafts_folder', v)} />
            <Field label="Trash" value={form.trash_folder} onChange={v => set('trash_folder', v)} />
            <Field label="Spam" value={form.spam_folder} onChange={v => set('spam_folder', v)} />
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          {isNew ? 'Create Account' : 'Save Changes'}
        </button>
        <button onClick={onClose} className="px-3 py-2 text-[12px] text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition-colors">
          Cancel
        </button>
        {!isNew && onDelete && (
          <button onClick={onDelete} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-[11px] text-error hover:bg-error/5 rounded-lg transition-colors">
            <Trash2 size={12} />Delete Account
          </button>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════
//  REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════

function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <h4 className="text-[12px] font-semibold flex items-center gap-2 text-text-secondary">
        <Icon size={13} className="text-accent" />{title}
      </h4>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', required, className = '' }) {
  return (
    <div className={className}>
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
      />
    </div>
  )
}

function PasswordField({ label, value, onChange, show, onToggle, masked, isSet }) {
  return (
    <div>
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1.5">
        {label}
        {isSet && !value && <span className="ml-1.5 text-success font-normal">({masked || 'set'})</span>}
      </label>
      <div className="relative">
        <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={isSet ? 'Leave blank to keep current' : 'Enter password'}
          autoComplete="new-password"
          className="w-full bg-elevated border border-border rounded-md pl-8 pr-9 py-2 text-[12px] placeholder:text-text-tertiary focus:border-accent focus:outline-none transition-colors"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary">
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button onClick={() => onChange(!checked)}
        className={`w-8 h-[18px] rounded-full transition-colors relative ${checked ? 'bg-accent' : 'bg-elevated border border-border'}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-transform ${
          checked ? 'left-[16px] bg-white' : 'left-[2px] bg-text-tertiary'
        }`} />
      </button>
      <span className="text-[11px] text-text-secondary">{label}</span>
    </label>
  )
}

function ConnectionBadge({ label, configured, lastTest }) {
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
      configured
        ? lastTest ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        : 'bg-elevated text-text-tertiary'
    }`}>
      {configured ? <Wifi size={8} /> : <WifiOff size={8} />}
      {label}
    </span>
  )
}

function ActionBtn({ icon: Icon, label, onClick, loading, disabled }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-elevated hover:bg-raised border border-border rounded-md disabled:opacity-40 transition-colors">
      {loading ? <Loader2 size={10} className="animate-spin" /> : <Icon size={10} />}
      {label}
    </button>
  )
}
