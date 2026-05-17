// routes/localization.js — Translation overrides + AI helpers.
//
// The bundled dictionary lives in src/i18n/dictionary.js. Admin edits are
// stored as overrides in i18n_overrides; the frontend fetches them on boot
// and merges them on top of the bundled values at runtime.

import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../database/init.js'
import { getActiveProvider } from '../providers/index.js'
import { logInfo, logError } from '../services/logger.js'

const router = Router()
const SUPPORTED = ['en', 'bcs']

// ── PUBLIC: GET /api/localization/overrides ─────────────────────
// No auth — needs to load before/during first paint of the public site.
router.get('/overrides', (_req, res) => {
  try {
    const rows = getDb().prepare(`SELECT key, lang, value FROM i18n_overrides`).all()
    res.json({ overrides: rows })
  } catch (e) {
    res.status(500).json({ error: e.message, overrides: [] })
  }
})

// ── ADMIN: PUT /api/localization/overrides ─────────────────────
router.put('/overrides', (req, res) => {
  const { key, lang, value, updated_by } = req.body || {}
  if (!key || !SUPPORTED.includes(lang)) return res.status(400).json({ error: 'key and supported lang required' })
  const db = getDb()
  const existing = db.prepare(`SELECT id FROM i18n_overrides WHERE key = ? AND lang = ?`).get(key, lang)
  if (existing) {
    db.prepare(`UPDATE i18n_overrides SET value = ?, updated_by = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(value || '', updated_by || '', existing.id)
  } else {
    db.prepare(`INSERT INTO i18n_overrides (id, key, lang, value, updated_by) VALUES (?,?,?,?,?)`)
      .run(uuid(), key, lang, value || '', updated_by || '')
  }
  res.json({ success: true })
})

router.delete('/overrides', (req, res) => {
  const { key, lang } = req.query
  if (!key || !SUPPORTED.includes(lang)) return res.status(400).json({ error: 'key and supported lang required' })
  getDb().prepare(`DELETE FROM i18n_overrides WHERE key = ? AND lang = ?`).run(key, lang)
  res.json({ success: true })
})

// Bulk upsert: { entries: [{key, lang, value}, ...] }
router.post('/overrides/bulk', (req, res) => {
  const { entries } = req.body || {}
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries[] required' })
  const db = getDb()
  let n = 0
  for (const e of entries) {
    if (!e?.key || !SUPPORTED.includes(e.lang)) continue
    const existing = db.prepare(`SELECT id FROM i18n_overrides WHERE key = ? AND lang = ?`).get(e.key, e.lang)
    if (existing) {
      db.prepare(`UPDATE i18n_overrides SET value = ?, updated_at = datetime('now') WHERE id = ?`).run(e.value || '', existing.id)
    } else {
      db.prepare(`INSERT INTO i18n_overrides (id, key, lang, value) VALUES (?,?,?,?)`).run(uuid(), e.key, e.lang, e.value || '')
    }
    n++
  }
  res.json({ success: true, count: n })
})

// Export all overrides as JSON
router.get('/export', (_req, res) => {
  const rows = getDb().prepare(`SELECT key, lang, value FROM i18n_overrides ORDER BY key, lang`).all()
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="cloz-i18n-overrides-${new Date().toISOString().slice(0,10)}.json"`)
  res.json({ exported_at: new Date().toISOString(), entries: rows })
})

// ── AI helpers ─────────────────────────────────────────────────
router.post('/ai/translate', async (req, res) => {
  const { text, source = 'en', target = 'bcs', tone = 'premium-warm' } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text required' })
  if (!SUPPORTED.includes(source) || !SUPPORTED.includes(target)) {
    return res.status(400).json({ error: 'unsupported language' })
  }
  const provider = getActiveProvider()
  const targetName = target === 'bcs' ? 'Bosnian/Croatian/Serbian (BCS, Latin alphabet)' : 'English'
  const sourceName = source === 'bcs' ? 'Bosnian/Croatian/Serbian (BCS, Latin alphabet)' : 'English'
  const prompt = `You are a senior copywriter for Cloz Digital, a premium web design agency in Sarajevo. Translate the following ${sourceName} marketing copy into ${targetName}.

Constraints:
- Match the source tone: ${tone}.
- Keep brand terms ("Cloz Digital", "Launch Care", "Growth Care", "Presence Care", "BAM") unchanged.
- Keep punctuation and inline emphasis where it makes sense.
- Output ONLY the translated string. No explanations, no quotes around the result.

Source: ${text}`
  try {
    const r = await provider.generate(prompt, { temperature: 0.3, maxTokens: 600, task: 'i18n-translate' })
    res.json({ translation: (r.text || '').trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/ai/tone-check', async (req, res) => {
  const { en, bcs } = req.body || {}
  if (!en || !bcs) return res.status(400).json({ error: 'en and bcs required' })
  const provider = getActiveProvider()
  const prompt = `Compare these two strings (one English, one BCS) used on a premium web design agency website. Reply with at most 3 short bullet points. Are they consistent in tone, length, and meaning? Flag any drift or awkward phrasing. Be honest, terse, and useful.

EN: ${en}

BCS: ${bcs}`
  try {
    const r = await provider.generate(prompt, { temperature: 0.2, maxTokens: 300, task: 'i18n-tone' })
    res.json({ review: (r.text || '').trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Suggest improvements for a single language
router.post('/ai/suggest', async (req, res) => {
  const { text, lang } = req.body || {}
  if (!text || !SUPPORTED.includes(lang)) return res.status(400).json({ error: 'text + supported lang required' })
  const provider = getActiveProvider()
  const langName = lang === 'bcs' ? 'Bosnian/Croatian/Serbian (Latin)' : 'English'
  const prompt = `You are a senior copywriter for Cloz Digital. Suggest one improved version of this ${langName} string. Keep it on-brand (premium, warm, direct). Reply with ONLY the improved string.

Current: ${text}`
  try {
    const r = await provider.generate(prompt, { temperature: 0.4, maxTokens: 400, task: 'i18n-suggest' })
    res.json({ suggestion: (r.text || '').trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
