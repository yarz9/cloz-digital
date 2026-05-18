// routes/finance.js — Management-scope CRM finance.
//
// Backs the Revenue / Billing / Payments dashboards. Distinct from
// portal_invoices (which is per-client billing surfaced in the
// Client Portal — those stay in routes/portal.js + portalAdmin.js).
//
// Endpoints
//   GET    /invoices                       List with filters
//   GET    /invoices/:id                   Detail (with payments)
//   POST   /invoices                       Create
//   PATCH  /invoices/:id                   Update
//   DELETE /invoices/:id                   Delete (cascades payments)
//
//   GET    /payments                       List with filters
//   POST   /payments                       Record payment
//                                          (auto-marks invoice paid
//                                          if cumulative ≥ amount)
//   DELETE /payments/:id                   Delete a recorded payment
//
//   GET    /retainers                      List with filters
//   POST   /retainers                      Create
//   PATCH  /retainers/:id                  Update
//   DELETE /retainers/:id                  Delete
//
//   GET    /overview                       Top-level KPIs (paid, outstanding,
//                                          mrr, arr, ytd, monthly series,
//                                          counts by status, top clients)
//   GET    /aging                          Aging buckets (current, 1–30, 31–60,
//                                          61–90, 90+)
//   GET    /forecast?horizon=6             Deterministic forecast from
//                                          retainers + average historical
//   GET    /forecast/snapshots             List AI snapshots
//   POST   /forecast/ai                    Generate AI forecast snapshot
//
//   POST   /import-local                   One-time lift: accepts the
//                                          legacy localStorage payload from
//                                          Revenue/Billing/Payments and
//                                          inserts what's missing. Idempotent
//                                          on (id, invoice_number).

import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../database/init.js'
import { getActiveProvider } from '../providers/index.js'
import { logInfo, logError } from '../services/logger.js'

const router = Router()

const VALID_INVOICE_STATUS = ['draft','sent','pending','overdue','paid','cancelled']
const VALID_PAYMENT_METHOD = ['bank_transfer','card','cash','viber','crypto','other']
const VALID_RETAINER_STATUS = ['active','paused','cancelled']

const parseJSON = (s, fb) => { if (!s) return fb; try { return JSON.parse(s) } catch { return fb } }

function buildQs(obj) {
  const out = []
  for (const k of Object.keys(obj || {})) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== '' && v !== false) out.push([k, v])
  }
  return out
}

// ══════════════════════════════════════════════════════════════
//  INVOICES
// ══════════════════════════════════════════════════════════════

router.get('/invoices', (req, res) => {
  const db = getDb()
  const { status, client_id, q, limit = 500 } = req.query
  let sql = `SELECT * FROM crm_invoices WHERE 1=1`
  const params = []
  if (status)    { sql += ` AND status = ?`;    params.push(status) }
  if (client_id) { sql += ` AND client_id = ?`; params.push(client_id) }
  if (q) {
    sql += ` AND (LOWER(invoice_number) LIKE ? OR LOWER(client_name) LIKE ? OR LOWER(description) LIKE ?)`
    const t = `%${String(q).toLowerCase()}%`
    params.push(t, t, t)
  }
  sql += ` ORDER BY COALESCE(issued_date, created_at) DESC LIMIT ?`
  params.push(Math.min(parseInt(limit) || 500, 2000))
  const rows = db.prepare(sql).all(...params).map(r => ({ ...r, line_items: parseJSON(r.line_items, []) }))
  res.json({ invoices: rows })
})

router.get('/invoices/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM crm_invoices WHERE id = ?`).get(req.params.id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  const payments = db.prepare(`SELECT * FROM crm_payments WHERE invoice_id = ? ORDER BY received_date DESC, created_at DESC`).all(req.params.id)
  const paid_total = payments.reduce((s, p) => s + (p.amount || 0), 0)
  res.json({
    invoice: { ...row, line_items: parseJSON(row.line_items, []) },
    payments,
    paid_total,
    balance: Math.max(0, (row.amount || 0) - paid_total),
  })
})

router.post('/invoices', (req, res) => {
  const db = getDb()
  const b = req.body || {}
  const id = b.id || uuid()
  const status = VALID_INVOICE_STATUS.includes(b.status) ? b.status : 'draft'
  db.prepare(`INSERT INTO crm_invoices
    (id, invoice_number, client_id, client_name, amount, currency, status,
     description, line_items, tax_amount, issued_date, due_date, paid_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    String(b.invoice_number || '').slice(0, 80),
    String(b.client_id || '').slice(0, 80),
    String(b.client_name || '').slice(0, 200),
    parseFloat(b.amount) || 0,
    String(b.currency || 'BAM').slice(0, 8),
    status,
    String(b.description || '').slice(0, 2000),
    JSON.stringify(Array.isArray(b.line_items) ? b.line_items : []),
    parseFloat(b.tax_amount) || 0,
    String(b.issued_date || '').slice(0, 32),
    String(b.due_date || '').slice(0, 32),
    String(b.paid_date || '').slice(0, 32),
    String(b.notes || '').slice(0, 2000),
  )
  res.json({ id })
})

router.patch('/invoices/:id', (req, res) => {
  const db = getDb()
  const cur = db.prepare(`SELECT id FROM crm_invoices WHERE id = ?`).get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Not found' })
  const allowed = ['invoice_number','client_id','client_name','amount','currency','status',
                   'description','tax_amount','issued_date','due_date','paid_date','notes']
  const sets = [], params = []
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      if (k === 'status' && !VALID_INVOICE_STATUS.includes(req.body[k])) continue
      sets.push(`${k} = ?`)
      params.push(req.body[k])
    }
  }
  if (req.body.line_items !== undefined) {
    sets.push('line_items = ?')
    params.push(JSON.stringify(Array.isArray(req.body.line_items) ? req.body.line_items : []))
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push(`updated_at = datetime('now')`)
  params.push(req.params.id)
  db.prepare(`UPDATE crm_invoices SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ success: true })
})

router.delete('/invoices/:id', (req, res) => {
  const db = getDb()
  db.prepare(`DELETE FROM crm_payments WHERE invoice_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM crm_invoices WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  PAYMENTS
// ══════════════════════════════════════════════════════════════

router.get('/payments', (req, res) => {
  const db = getDb()
  const { invoice_id, client_id, limit = 500 } = req.query
  let sql = `SELECT * FROM crm_payments WHERE 1=1`
  const params = []
  if (invoice_id) { sql += ` AND invoice_id = ?`; params.push(invoice_id) }
  if (client_id)  { sql += ` AND client_id = ?`;  params.push(client_id) }
  sql += ` ORDER BY received_date DESC, created_at DESC LIMIT ?`
  params.push(Math.min(parseInt(limit) || 500, 2000))
  res.json({ payments: db.prepare(sql).all(...params) })
})

router.post('/payments', (req, res) => {
  const db = getDb()
  const b = req.body || {}
  const id = b.id || uuid()
  const method = VALID_PAYMENT_METHOD.includes(b.method) ? b.method : 'bank_transfer'

  // Snapshot client context from the invoice if we can
  let client_id = b.client_id || ''
  let client_name = b.client_name || ''
  let currency = b.currency || 'BAM'
  let inv = null
  if (b.invoice_id) {
    inv = db.prepare(`SELECT id, client_id, client_name, currency, amount FROM crm_invoices WHERE id = ?`).get(b.invoice_id)
    if (inv) {
      client_id = client_id || inv.client_id
      client_name = client_name || inv.client_name
      currency = currency || inv.currency
    }
  }

  db.prepare(`INSERT INTO crm_payments
    (id, invoice_id, client_id, client_name, amount, currency, method, reference, received_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    String(b.invoice_id || '').slice(0, 80),
    String(client_id).slice(0, 80),
    String(client_name).slice(0, 200),
    parseFloat(b.amount) || 0,
    String(currency).slice(0, 8),
    method,
    String(b.reference || '').slice(0, 200),
    String(b.received_date || new Date().toISOString().slice(0, 10)).slice(0, 32),
    String(b.notes || '').slice(0, 2000),
  )

  // If the cumulative payments now meet/exceed the invoice amount, mark paid.
  let invoice_status = null
  if (inv) {
    const sum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as s FROM crm_payments WHERE invoice_id = ?`).get(inv.id)?.s || 0
    if (sum >= (inv.amount || 0) && inv.amount > 0) {
      db.prepare(`UPDATE crm_invoices SET status = 'paid', paid_date = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(String(b.received_date || new Date().toISOString().slice(0, 10)).slice(0, 32), inv.id)
      invoice_status = 'paid'
    }
  }

  res.json({ id, invoice_status })
})

router.delete('/payments/:id', (req, res) => {
  const db = getDb()
  const p = db.prepare(`SELECT invoice_id FROM crm_payments WHERE id = ?`).get(req.params.id)
  db.prepare(`DELETE FROM crm_payments WHERE id = ?`).run(req.params.id)
  // If deleting drops the invoice below paid threshold, flip it back to pending.
  if (p?.invoice_id) {
    const inv = db.prepare(`SELECT id, amount, status FROM crm_invoices WHERE id = ?`).get(p.invoice_id)
    if (inv && inv.status === 'paid') {
      const sum = db.prepare(`SELECT COALESCE(SUM(amount), 0) as s FROM crm_payments WHERE invoice_id = ?`).get(inv.id)?.s || 0
      if (sum < (inv.amount || 0)) {
        db.prepare(`UPDATE crm_invoices SET status = 'pending', paid_date = '', updated_at = datetime('now') WHERE id = ?`).run(inv.id)
      }
    }
  }
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  RETAINERS
// ══════════════════════════════════════════════════════════════

router.get('/retainers', (req, res) => {
  const db = getDb()
  const { status, client_id, limit = 500 } = req.query
  let sql = `SELECT * FROM crm_retainers WHERE 1=1`
  const params = []
  if (status)    { sql += ` AND status = ?`;    params.push(status) }
  if (client_id) { sql += ` AND client_id = ?`; params.push(client_id) }
  sql += ` ORDER BY created_at DESC LIMIT ?`
  params.push(Math.min(parseInt(limit) || 500, 2000))
  res.json({ retainers: db.prepare(sql).all(...params) })
})

router.post('/retainers', (req, res) => {
  const db = getDb()
  const b = req.body || {}
  const id = b.id || uuid()
  const status = VALID_RETAINER_STATUS.includes(b.status) ? b.status : 'active'
  db.prepare(`INSERT INTO crm_retainers
    (id, client_id, client_name, package, monthly_amount, currency, status,
     start_date, end_date, billing_day, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    id,
    String(b.client_id || '').slice(0, 80),
    String(b.client_name || '').slice(0, 200),
    String(b.package || '').slice(0, 80),
    parseFloat(b.monthly_amount) || 0,
    String(b.currency || 'BAM').slice(0, 8),
    status,
    String(b.start_date || '').slice(0, 32),
    String(b.end_date || '').slice(0, 32),
    Math.max(1, Math.min(28, parseInt(b.billing_day) || 1)),
    String(b.notes || '').slice(0, 2000),
  )
  res.json({ id })
})

router.patch('/retainers/:id', (req, res) => {
  const db = getDb()
  const cur = db.prepare(`SELECT id FROM crm_retainers WHERE id = ?`).get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Not found' })
  const allowed = ['client_id','client_name','package','monthly_amount','currency','status',
                   'start_date','end_date','billing_day','notes']
  const sets = [], params = []
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      if (k === 'status' && !VALID_RETAINER_STATUS.includes(req.body[k])) continue
      sets.push(`${k} = ?`)
      params.push(req.body[k])
    }
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push(`updated_at = datetime('now')`)
  params.push(req.params.id)
  db.prepare(`UPDATE crm_retainers SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ success: true })
})

router.delete('/retainers/:id', (req, res) => {
  getDb().prepare(`DELETE FROM crm_retainers WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  OVERVIEW / AGING / FORECAST
// ══════════════════════════════════════════════════════════════

router.get('/overview', (_req, res) => {
  const db = getDb()
  const invoices = db.prepare(`SELECT * FROM crm_invoices`).all()
  const payments = db.prepare(`SELECT * FROM crm_payments`).all()
  const retainers = db.prepare(`SELECT * FROM crm_retainers WHERE status = 'active'`).all()

  const sum = (arr, sel) => arr.reduce((s, x) => s + (sel(x) || 0), 0)
  const paid       = invoices.filter(i => i.status === 'paid')
  const outstanding= invoices.filter(i => ['sent','pending','overdue'].includes(i.status))

  const paid_total       = sum(paid, i => i.amount)
  const outstanding_total= sum(outstanding, i => i.amount)
  const overdue_total    = sum(invoices.filter(i => i.status === 'overdue'), i => i.amount)
  const mrr = sum(retainers, r => r.monthly_amount)
  const arr = mrr * 12

  // YTD + monthly series this year
  const now = new Date()
  const yr = now.getFullYear()
  const monthly = Array.from({ length: 12 }).map((_, idx) => {
    const monthPaid = paid.filter(i => {
      if (!i.paid_date) return false
      const d = new Date(i.paid_date)
      return d.getFullYear() === yr && d.getMonth() === idx
    })
    const monthIssued = invoices.filter(i => {
      if (!i.issued_date) return false
      const d = new Date(i.issued_date)
      return d.getFullYear() === yr && d.getMonth() === idx
    })
    return {
      month_index: idx,
      revenue:    sum(monthPaid,   i => i.amount),
      issued:     sum(monthIssued, i => i.amount),
      paid_count: monthPaid.length,
    }
  })
  const ytd_revenue = sum(monthly, m => m.revenue)

  // Counts by status
  const by_status = {}
  for (const i of invoices) by_status[i.status] = (by_status[i.status] || 0) + 1

  // Top clients by paid revenue
  const byClient = new Map()
  for (const i of paid) {
    const key = i.client_id || `name:${i.client_name}`
    const cur = byClient.get(key) || { client_id: i.client_id, client_name: i.client_name, revenue: 0, invoices: 0 }
    cur.revenue += i.amount || 0
    cur.invoices += 1
    byClient.set(key, cur)
  }
  const top_clients = Array.from(byClient.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8)

  res.json({
    counts: {
      invoices: invoices.length,
      payments: payments.length,
      retainers_active: retainers.length,
    },
    by_status,
    paid_total,
    outstanding_total,
    overdue_total,
    mrr,
    arr,
    ytd_revenue,
    monthly,
    top_clients,
  })
})

router.get('/aging', (_req, res) => {
  const db = getDb()
  const open = db.prepare(`SELECT * FROM crm_invoices WHERE status IN ('sent','pending','overdue')`).all()
  const today = new Date()
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 }
  const detail = { current: [], d1_30: [], d31_60: [], d61_90: [], d90_plus: [] }
  for (const inv of open) {
    const due = inv.due_date ? new Date(inv.due_date) : (inv.issued_date ? new Date(inv.issued_date) : null)
    let bucket = 'current'
    if (due) {
      const days = Math.floor((today - due) / 86_400_000)
      if      (days <= 0)  bucket = 'current'
      else if (days <= 30) bucket = 'd1_30'
      else if (days <= 60) bucket = 'd31_60'
      else if (days <= 90) bucket = 'd61_90'
      else                 bucket = 'd90_plus'
    }
    buckets[bucket] += inv.amount || 0
    detail[bucket].push({ id: inv.id, invoice_number: inv.invoice_number, client_name: inv.client_name, amount: inv.amount, due_date: inv.due_date })
  }
  res.json({ buckets, detail })
})

// Deterministic forecast: retainer MRR carried forward + average monthly
// non-retainer revenue from the last 6 months. Provides a baseline that the
// AI snapshot can refine.
function computeBaselineForecast(db, horizon) {
  horizon = Math.max(1, Math.min(24, parseInt(horizon) || 6))
  const retainers = db.prepare(`SELECT * FROM crm_retainers WHERE status = 'active'`).all()
  const mrr = retainers.reduce((s, r) => s + (r.monthly_amount || 0), 0)

  const paid = db.prepare(`SELECT amount, paid_date FROM crm_invoices WHERE status = 'paid' AND paid_date != ''`).all()
  const now = new Date()
  let total = 0, months = 0
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear(), m = d.getMonth()
    const month = paid.filter(p => {
      const pd = new Date(p.paid_date)
      return pd.getFullYear() === y && pd.getMonth() === m
    })
    total += month.reduce((s, x) => s + (x.amount || 0), 0)
    months++
  }
  const baseline_oneoff = months ? Math.round((total / months) * 100) / 100 : 0

  const series = []
  for (let i = 1; i <= horizon; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    series.push({
      month_index: i,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      recurring: mrr,
      oneoff_estimate: baseline_oneoff,
      total: mrr + baseline_oneoff,
    })
  }
  return { horizon, mrr, baseline_oneoff, series }
}

router.get('/forecast', (req, res) => {
  res.json(computeBaselineForecast(getDb(), req.query.horizon))
})

router.get('/forecast/snapshots', (_req, res) => {
  const rows = getDb().prepare(`SELECT * FROM crm_forecast_snapshots ORDER BY generated_at DESC LIMIT 50`).all()
  res.json({
    snapshots: rows.map(r => ({ ...r, breakdown: parseJSON(r.breakdown, []) })),
  })
})

router.post('/forecast/ai', async (req, res) => {
  const { horizon = 6, notes = '', generated_by = '' } = req.body || {}
  const db = getDb()
  const baseline = computeBaselineForecast(db, horizon)
  const retainers = db.prepare(`SELECT * FROM crm_retainers WHERE status = 'active'`).all()
  const paidSeries = db.prepare(`SELECT amount, paid_date FROM crm_invoices WHERE status = 'paid' AND paid_date != '' ORDER BY paid_date DESC LIMIT 60`).all()

  const provider = getActiveProvider()
  const prompt = `You are the CFO of Cloz Digital, a premium web design agency in Sarajevo (currency BAM). Generate a ${horizon}-month forward revenue forecast.

CURRENT STATE
- Active retainers (MRR): ${baseline.mrr} BAM/mo (${retainers.length} clients)
- Average historical non-retainer revenue (last 6 mo): ${baseline.baseline_oneoff} BAM/mo
- Recent paid invoices (last 60, amount + date):
${paidSeries.slice(0, 20).map(p => `  ${p.paid_date} — ${p.amount}`).join('\n')}

${notes ? `OPERATOR NOTES: ${notes}\n\n` : ''}

Produce a forecast in this STRICT JSON shape — no prose outside the JSON, no markdown fences:
{
  "summary": "2-3 sentences explaining the headline number and biggest assumption",
  "assumptions": "1-2 lines on what could break this",
  "breakdown": [
    { "month_label": "Jun 26", "recurring": 800, "oneoff": 1200, "total": 2000, "confidence": "high|medium|low", "note": "..." },
    ... ${horizon} entries
  ]
}`

  try {
    const result = await provider.generate(prompt, { temperature: 0.3, maxTokens: 1200, task: 'finance-forecast' })
    const text = (result.text || '').trim()
    const match = text.match(/\{[\s\S]*\}/)
    let parsed = { summary: text, assumptions: '', breakdown: [] }
    if (match) { try { parsed = JSON.parse(match[0]) } catch {} }

    const id = uuid()
    db.prepare(`INSERT INTO crm_forecast_snapshots
      (id, generated_by, horizon_months, summary, breakdown, assumptions, model)
      VALUES (?,?,?,?,?,?,?)`).run(
      id, String(generated_by).slice(0, 200), horizon,
      String(parsed.summary || '').slice(0, 4000),
      JSON.stringify(parsed.breakdown || []),
      String(parsed.assumptions || '').slice(0, 4000),
      String(result.model || ''),
    )
    res.json({
      id,
      horizon_months: horizon,
      summary: parsed.summary,
      assumptions: parsed.assumptions,
      breakdown: parsed.breakdown,
      baseline,
    })
  } catch (e) {
    logError(`AI forecast failed: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

// ══════════════════════════════════════════════════════════════
//  ONE-TIME LIFT FROM LOCALSTORAGE
//
//  Phase 2's UI will call this once with the legacy localStorage
//  payload from Revenue/Billing/Payments. We insert what's missing
//  using deterministic IDs so the call is idempotent across retries.
// ══════════════════════════════════════════════════════════════
router.post('/import-local', (req, res) => {
  const { invoices = [], payments = [], retainers = [], importer = '' } = req.body || {}
  const db = getDb()
  const out = { invoices: { inserted: 0, skipped: 0 }, payments: { inserted: 0, skipped: 0 }, retainers: { inserted: 0, skipped: 0 } }

  for (const i of invoices) {
    if (!i || typeof i !== 'object') { out.invoices.skipped++; continue }
    const id = i.id || uuid()
    const exists = db.prepare(`SELECT id FROM crm_invoices WHERE id = ? OR (invoice_number != '' AND invoice_number = ?)`).get(id, i.invoice_number || '~~none~~')
    if (exists) { out.invoices.skipped++; continue }
    try {
      const status = VALID_INVOICE_STATUS.includes(i.status) ? i.status : 'draft'
      db.prepare(`INSERT INTO crm_invoices
        (id, invoice_number, client_id, client_name, amount, currency, status,
         description, line_items, tax_amount, issued_date, due_date, paid_date, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id,
        String(i.invoice_number || '').slice(0, 80),
        String(i.client_id || '').slice(0, 80),
        String(i.client || i.client_name || '').slice(0, 200),
        parseFloat(i.amount) || 0,
        String(i.currency || 'BAM').slice(0, 8),
        status,
        String(i.description || '').slice(0, 2000),
        JSON.stringify(Array.isArray(i.line_items) ? i.line_items : []),
        parseFloat(i.tax_amount) || 0,
        String(i.issued || i.issued_date || '').slice(0, 32),
        String(i.due || i.due_date || '').slice(0, 32),
        String(i.paid || i.paid_date || '').slice(0, 32),
        String(i.notes || '').slice(0, 2000),
      )
      out.invoices.inserted++
    } catch { out.invoices.skipped++ }
  }

  for (const p of payments) {
    if (!p || typeof p !== 'object') { out.payments.skipped++; continue }
    const id = p.id || uuid()
    if (db.prepare(`SELECT id FROM crm_payments WHERE id = ?`).get(id)) { out.payments.skipped++; continue }
    try {
      db.prepare(`INSERT INTO crm_payments
        (id, invoice_id, client_id, client_name, amount, currency, method, reference, received_date, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
        id,
        String(p.invoice_id || '').slice(0, 80),
        String(p.client_id || '').slice(0, 80),
        String(p.client || p.client_name || '').slice(0, 200),
        parseFloat(p.amount) || 0,
        String(p.currency || 'BAM').slice(0, 8),
        VALID_PAYMENT_METHOD.includes(p.method) ? p.method : 'bank_transfer',
        String(p.reference || '').slice(0, 200),
        String(p.received_date || p.received || '').slice(0, 32),
        String(p.notes || '').slice(0, 2000),
      )
      out.payments.inserted++
    } catch { out.payments.skipped++ }
  }

  for (const r of retainers) {
    if (!r || typeof r !== 'object') { out.retainers.skipped++; continue }
    const id = r.id || uuid()
    if (db.prepare(`SELECT id FROM crm_retainers WHERE id = ?`).get(id)) { out.retainers.skipped++; continue }
    try {
      db.prepare(`INSERT INTO crm_retainers
        (id, client_id, client_name, package, monthly_amount, currency, status,
         start_date, end_date, billing_day, notes)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        id,
        String(r.client_id || '').slice(0, 80),
        String(r.client || r.client_name || '').slice(0, 200),
        String(r.package || '').slice(0, 80),
        parseFloat(r.monthly_amount || r.mrr) || 0,
        String(r.currency || 'BAM').slice(0, 8),
        VALID_RETAINER_STATUS.includes(r.status) ? r.status : 'active',
        String(r.start_date || '').slice(0, 32),
        String(r.end_date || '').slice(0, 32),
        Math.max(1, Math.min(28, parseInt(r.billing_day) || 1)),
        String(r.notes || '').slice(0, 2000),
      )
      out.retainers.inserted++
    } catch { out.retainers.skipped++ }
  }

  logInfo(`Finance import-local by ${importer || 'unknown'}: ` +
    `inv ${out.invoices.inserted}/${out.invoices.skipped}, ` +
    `pay ${out.payments.inserted}/${out.payments.skipped}, ` +
    `ret ${out.retainers.inserted}/${out.retainers.skipped}`,
    { category: 'audit', event_type: 'finance_import' })

  res.json({ ok: true, ...out })
})

export default router
