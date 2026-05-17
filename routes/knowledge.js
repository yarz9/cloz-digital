// routes/knowledge.js — Knowledge Center
// Articles, Versions, Comments, Favorites, Courses, Lessons, Quizzes,
// Enrollments, Progress, Certificates, Playbooks, Prompts, Copilot (RAG),
// Search, Analytics, Content assets.

import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { getDb } from '../database/init.js'
import { getActiveProvider } from '../providers/index.js'
import { logInfo, logError } from '../services/logger.js'

const router = Router()

// ── Helpers ──────────────────────────────────────────────────────
const parseJSON = (s, fb) => { if (!s) return fb; try { return JSON.parse(s) } catch { return fb } }
const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || `kb-${Date.now()}`
const excerpt = (body, n = 200) => String(body || '').replace(/[#*`>_\-\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, n)

// ══════════════════════════════════════════════════════════════
//  ARTICLES (Knowledge Base)
// ══════════════════════════════════════════════════════════════
router.get('/articles', (req, res) => {
  const db = getDb()
  const { category, status, q, parent_id, limit = 200 } = req.query
  let sql = `SELECT id, slug, title, category, excerpt, tags, status, visibility, author, version, view_count, favorite_count, parent_id, updated_at, published_at FROM kb_articles WHERE 1=1`
  const params = []
  if (category) { sql += ` AND category = ?`; params.push(category) }
  if (status)   { sql += ` AND status = ?`;   params.push(status) }
  if (parent_id !== undefined) { sql += ` AND parent_id = ?`; params.push(parent_id) }
  if (q) { sql += ` AND (LOWER(title) LIKE ? OR LOWER(body) LIKE ?)`; const term = `%${String(q).toLowerCase()}%`; params.push(term, term) }
  sql += ` ORDER BY updated_at DESC LIMIT ?`; params.push(parseInt(limit) || 200)
  const rows = db.prepare(sql).all(...params)
  res.json({ articles: rows.map(r => ({ ...r, tags: parseJSON(r.tags, []) })) })
})

router.get('/articles/:idOrSlug', (req, res) => {
  const db = getDb()
  const r = db.prepare(`SELECT * FROM kb_articles WHERE id = ? OR slug = ?`).get(req.params.idOrSlug, req.params.idOrSlug)
  if (!r) return res.status(404).json({ error: 'Not found' })
  try { db.prepare(`UPDATE kb_articles SET view_count = view_count + 1 WHERE id = ?`).run(r.id) } catch {}
  const comments = db.prepare(`SELECT * FROM kb_comments WHERE article_id = ? ORDER BY created_at ASC`).all(r.id)
  const versions = db.prepare(`SELECT id, version, author, change_note, created_at FROM kb_article_versions WHERE article_id = ? ORDER BY version DESC LIMIT 20`).all(r.id)
  res.json({ article: { ...r, tags: parseJSON(r.tags, []) }, comments, versions })
})

router.post('/articles', (req, res) => {
  const db = getDb()
  const { title, body, category, tags, status, visibility, author, parent_id, reviewer, review_due } = req.body || {}
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' })
  const id = uuid()
  let slug = slugify(title)
  if (db.prepare(`SELECT id FROM kb_articles WHERE slug = ?`).get(slug)) slug = `${slug}-${id.slice(0,6)}`
  const exc = excerpt(body)
  db.prepare(`INSERT INTO kb_articles (id, slug, title, category, body, excerpt, tags, status, visibility, author, parent_id, reviewer, review_due, published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, slug, title.trim().slice(0, 300), (category || 'general').slice(0, 80),
    body || '', exc, JSON.stringify(tags || []),
    status === 'published' ? 'published' : (status || 'draft'),
    visibility || 'internal', author || '', parent_id || '',
    reviewer || '', review_due || '',
    status === 'published' ? new Date().toISOString() : ''
  )
  // Initial version snapshot
  db.prepare(`INSERT INTO kb_article_versions (id, article_id, version, title, body, author, change_note) VALUES (?,?,?,?,?,?,?)`)
    .run(uuid(), id, 1, title, body || '', author || '', 'Initial version')
  reindexArticle(db, id)
  res.json({ id, slug })
})

router.patch('/articles/:id', (req, res) => {
  const db = getDb()
  const cur = db.prepare(`SELECT * FROM kb_articles WHERE id = ?`).get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'Not found' })
  const allowed = ['title','category','body','status','visibility','tags','parent_id','reviewer','review_due','author']
  const sets = [], params = []
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      sets.push(`${k} = ?`)
      params.push(k === 'tags' ? JSON.stringify(req.body[k] || []) : req.body[k])
    }
  }
  let bodyChanged = req.body.body !== undefined && req.body.body !== cur.body
  let nextVersion = cur.version
  if (bodyChanged) {
    nextVersion = cur.version + 1
    sets.push('version = ?'); params.push(nextVersion)
    sets.push('excerpt = ?'); params.push(excerpt(req.body.body))
    db.prepare(`INSERT INTO kb_article_versions (id, article_id, version, title, body, author, change_note) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), cur.id, nextVersion, req.body.title || cur.title, req.body.body, req.body.author || '', req.body.change_note || '')
  }
  if (req.body.status === 'published' && cur.status !== 'published') {
    sets.push("published_at = datetime('now')")
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push("updated_at = datetime('now')")
  params.push(req.params.id)
  db.prepare(`UPDATE kb_articles SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  if (bodyChanged || req.body.title !== undefined) reindexArticle(db, cur.id)
  res.json({ success: true, version: nextVersion })
})

router.delete('/articles/:id', (req, res) => {
  const db = getDb()
  db.prepare(`DELETE FROM kb_comments WHERE article_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_article_versions WHERE article_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_favorites WHERE article_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'article' AND doc_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_articles WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// Comments
router.post('/articles/:id/comments', (req, res) => {
  const { author, body } = req.body || {}
  if (!body) return res.status(400).json({ error: 'Body required' })
  const id = uuid()
  getDb().prepare(`INSERT INTO kb_comments (id, article_id, author, body) VALUES (?,?,?,?)`)
    .run(id, req.params.id, author || '', body.slice(0, 4000))
  res.json({ id })
})

// Favorites
router.post('/articles/:id/favorite', (req, res) => {
  const { user, on } = req.body || {}
  if (!user) return res.status(400).json({ error: 'user required' })
  const db = getDb()
  const existing = db.prepare(`SELECT id FROM kb_favorites WHERE user_name = ? AND article_id = ?`).get(user, req.params.id)
  if (on === false && existing) {
    db.prepare(`DELETE FROM kb_favorites WHERE id = ?`).run(existing.id)
    db.prepare(`UPDATE kb_articles SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?`).run(req.params.id)
    return res.json({ success: true, favorited: false })
  }
  if (on !== false && !existing) {
    db.prepare(`INSERT INTO kb_favorites (id, user_name, article_id) VALUES (?,?,?)`).run(uuid(), user, req.params.id)
    db.prepare(`UPDATE kb_articles SET favorite_count = favorite_count + 1 WHERE id = ?`).run(req.params.id)
    return res.json({ success: true, favorited: true })
  }
  res.json({ success: true, favorited: !!existing })
})

router.get('/favorites', (req, res) => {
  const { user } = req.query
  if (!user) return res.json({ articles: [] })
  const rows = getDb().prepare(`SELECT a.id, a.slug, a.title, a.category, a.excerpt
    FROM kb_favorites f JOIN kb_articles a ON a.id = f.article_id
    WHERE f.user_name = ? ORDER BY f.created_at DESC`).all(user)
  res.json({ articles: rows })
})

// Article version detail
router.get('/articles/:id/versions/:version', (req, res) => {
  const r = getDb().prepare(`SELECT * FROM kb_article_versions WHERE article_id = ? AND version = ?`)
    .get(req.params.id, parseInt(req.params.version))
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json({ version: r })
})

// ══════════════════════════════════════════════════════════════
//  COURSES (Academy)
// ══════════════════════════════════════════════════════════════
router.get('/courses', (req, res) => {
  const db = getDb()
  const { user } = req.query
  const courses = db.prepare(`SELECT * FROM kb_courses ORDER BY created_at DESC`).all()
  const out = courses.map(c => {
    const lessons = db.prepare(`SELECT COUNT(*) as n FROM kb_lessons WHERE course_id = ?`).get(c.id)?.n || 0
    let enrollment = null
    if (user) {
      enrollment = db.prepare(`SELECT * FROM kb_enrollments WHERE user_name = ? AND course_id = ?`).get(user, c.id) || null
    }
    return { ...c, lesson_count: lessons, enrollment }
  })
  res.json({ courses: out })
})

router.get('/courses/:idOrSlug', (req, res) => {
  const db = getDb()
  const course = db.prepare(`SELECT * FROM kb_courses WHERE id = ? OR slug = ?`).get(req.params.idOrSlug, req.params.idOrSlug)
  if (!course) return res.status(404).json({ error: 'Not found' })
  const lessons = db.prepare(`SELECT * FROM kb_lessons WHERE course_id = ? ORDER BY position ASC, created_at ASC`).all(course.id)
  const lessonIds = lessons.map(l => l.id)
  let quizzesByLesson = {}
  if (lessonIds.length) {
    const placeholders = lessonIds.map(() => '?').join(',')
    const quizzes = db.prepare(`SELECT * FROM kb_quizzes WHERE lesson_id IN (${placeholders}) ORDER BY position ASC`).all(...lessonIds)
    for (const q of quizzes) {
      const parsed = { ...q, options: parseJSON(q.options, []) }
      if (!quizzesByLesson[q.lesson_id]) quizzesByLesson[q.lesson_id] = []
      quizzesByLesson[q.lesson_id].push(parsed)
    }
  }
  res.json({ course, lessons: lessons.map(l => ({ ...l, quizzes: quizzesByLesson[l.id] || [] })) })
})

router.post('/courses', (req, res) => {
  const { title, category, description, level, est_minutes, cover_emoji, author } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title required' })
  const db = getDb()
  const id = uuid()
  let slug = slugify(title)
  if (db.prepare(`SELECT id FROM kb_courses WHERE slug = ?`).get(slug)) slug = `${slug}-${id.slice(0,6)}`
  db.prepare(`INSERT INTO kb_courses (id, slug, title, category, description, level, est_minutes, cover_emoji, author) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, slug, title.slice(0, 200), category || 'general', description || '', level || 'beginner', parseInt(est_minutes) || 30, cover_emoji || '📘', author || '')
  res.json({ id, slug })
})

router.patch('/courses/:id', (req, res) => {
  const db = getDb()
  const allowed = ['title','category','description','level','est_minutes','cover_emoji','published']
  const sets = [], params = []
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push("updated_at = datetime('now')"); params.push(req.params.id)
  db.prepare(`UPDATE kb_courses SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ success: true })
})

router.delete('/courses/:id', (req, res) => {
  const db = getDb()
  const lessons = db.prepare(`SELECT id FROM kb_lessons WHERE course_id = ?`).all(req.params.id).map(l => l.id)
  for (const lid of lessons) {
    db.prepare(`DELETE FROM kb_quizzes WHERE lesson_id = ?`).run(lid)
    db.prepare(`DELETE FROM kb_lesson_progress WHERE lesson_id = ?`).run(lid)
    db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'lesson' AND doc_id = ?`).run(lid)
  }
  db.prepare(`DELETE FROM kb_lessons WHERE course_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_enrollments WHERE course_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_courses WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// Lessons
router.post('/courses/:id/lessons', (req, res) => {
  const { title, body, video_url, attachment_url, est_minutes, position } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title required' })
  const db = getDb()
  const id = uuid()
  const maxPos = db.prepare(`SELECT MAX(position) as p FROM kb_lessons WHERE course_id = ?`).get(req.params.id)?.p || 0
  db.prepare(`INSERT INTO kb_lessons (id, course_id, position, title, body, video_url, attachment_url, est_minutes) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, req.params.id, position ?? (maxPos + 1), title.slice(0, 200), body || '', video_url || '', attachment_url || '', parseInt(est_minutes) || 5)
  reindexLesson(db, id)
  res.json({ id })
})

router.patch('/lessons/:id', (req, res) => {
  const db = getDb()
  const allowed = ['title','body','video_url','attachment_url','est_minutes','position']
  const sets = [], params = []
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  params.push(req.params.id)
  db.prepare(`UPDATE kb_lessons SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  if (req.body.body !== undefined || req.body.title !== undefined) reindexLesson(db, req.params.id)
  res.json({ success: true })
})

router.delete('/lessons/:id', (req, res) => {
  const db = getDb()
  db.prepare(`DELETE FROM kb_quizzes WHERE lesson_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_lesson_progress WHERE lesson_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'lesson' AND doc_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_lessons WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// Quizzes
router.post('/lessons/:id/quizzes', (req, res) => {
  const { question, options, answer_index, explanation } = req.body || {}
  if (!question || !Array.isArray(options) || options.length < 2) return res.status(400).json({ error: 'question + options[] required' })
  const id = uuid()
  getDb().prepare(`INSERT INTO kb_quizzes (id, lesson_id, question, options, answer_index, explanation) VALUES (?,?,?,?,?,?)`)
    .run(id, req.params.id, question, JSON.stringify(options), parseInt(answer_index) || 0, explanation || '')
  res.json({ id })
})

router.delete('/quizzes/:id', (req, res) => {
  getDb().prepare(`DELETE FROM kb_quizzes WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// Enroll
router.post('/courses/:id/enroll', (req, res) => {
  const { user } = req.body || {}
  if (!user) return res.status(400).json({ error: 'user required' })
  const db = getDb()
  const existing = db.prepare(`SELECT id FROM kb_enrollments WHERE user_name = ? AND course_id = ?`).get(user, req.params.id)
  if (existing) return res.json({ id: existing.id, already: true })
  const id = uuid()
  db.prepare(`INSERT INTO kb_enrollments (id, user_name, course_id) VALUES (?,?,?)`).run(id, user, req.params.id)
  res.json({ id })
})

// Mark lesson complete + score quizzes; recompute progress
router.post('/lessons/:id/complete', (req, res) => {
  const { user, quiz_score = 0, quiz_total = 0 } = req.body || {}
  if (!user) return res.status(400).json({ error: 'user required' })
  const db = getDb()
  const lesson = db.prepare(`SELECT * FROM kb_lessons WHERE id = ?`).get(req.params.id)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' })

  const existing = db.prepare(`SELECT id FROM kb_lesson_progress WHERE user_name = ? AND lesson_id = ?`).get(user, req.params.id)
  if (existing) {
    db.prepare(`UPDATE kb_lesson_progress SET completed = 1, quiz_score = ?, quiz_total = ?, completed_at = datetime('now') WHERE id = ?`)
      .run(parseInt(quiz_score) || 0, parseInt(quiz_total) || 0, existing.id)
  } else {
    db.prepare(`INSERT INTO kb_lesson_progress (id, user_name, lesson_id, completed, quiz_score, quiz_total) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), user, req.params.id, 1, parseInt(quiz_score) || 0, parseInt(quiz_total) || 0)
  }

  // Recompute course progress
  const allLessons = db.prepare(`SELECT id FROM kb_lessons WHERE course_id = ?`).all(lesson.course_id)
  const ids = allLessons.map(l => l.id)
  let completed = 0
  for (const lid of ids) {
    const p = db.prepare(`SELECT completed FROM kb_lesson_progress WHERE user_name = ? AND lesson_id = ?`).get(user, lid)
    if (p?.completed) completed++
  }
  const pct = ids.length ? Math.round((completed / ids.length) * 100) : 0
  const enr = db.prepare(`SELECT * FROM kb_enrollments WHERE user_name = ? AND course_id = ?`).get(user, lesson.course_id)
  let certId = null
  if (enr) {
    const newStatus = pct >= 100 ? 'completed' : 'in_progress'
    const completedAt = pct >= 100 ? new Date().toISOString() : ''
    db.prepare(`UPDATE kb_enrollments SET status = ?, progress_pct = ?, completed_at = ? WHERE id = ?`)
      .run(newStatus, pct, completedAt, enr.id)
    if (pct >= 100 && !enr.certificate_id) {
      // Issue certificate
      const course = db.prepare(`SELECT title FROM kb_courses WHERE id = ?`).get(lesson.course_id)
      certId = uuid()
      // Average quiz score
      const scores = db.prepare(`SELECT quiz_score, quiz_total FROM kb_lesson_progress lp
        WHERE lp.user_name = ? AND lp.lesson_id IN (${ids.map(() => '?').join(',')})`).all(user, ...ids)
      const totalCorrect = scores.reduce((s, r) => s + (r.quiz_score || 0), 0)
      const totalQ = scores.reduce((s, r) => s + (r.quiz_total || 0), 0)
      const finalScore = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 100
      db.prepare(`INSERT INTO kb_certificates (id, user_name, course_id, course_title, score) VALUES (?,?,?,?,?)`)
        .run(certId, user, lesson.course_id, course?.title || '', finalScore)
      db.prepare(`UPDATE kb_enrollments SET certificate_id = ? WHERE id = ?`).run(certId, enr.id)
    }
  }
  res.json({ success: true, progress_pct: pct, certificate_id: certId })
})

router.get('/enrollments', (req, res) => {
  const { user } = req.query
  if (!user) return res.json({ enrollments: [] })
  const rows = getDb().prepare(`SELECT e.*, c.title, c.category, c.cover_emoji, c.est_minutes
    FROM kb_enrollments e JOIN kb_courses c ON c.id = e.course_id
    WHERE e.user_name = ? ORDER BY e.enrolled_at DESC`).all(user)
  res.json({ enrollments: rows })
})

router.get('/certificates', (req, res) => {
  const { user } = req.query
  const rows = user
    ? getDb().prepare(`SELECT * FROM kb_certificates WHERE user_name = ? ORDER BY issued_at DESC`).all(user)
    : getDb().prepare(`SELECT * FROM kb_certificates ORDER BY issued_at DESC LIMIT 200`).all()
  res.json({ certificates: rows })
})

// ══════════════════════════════════════════════════════════════
//  PLAYBOOKS
// ══════════════════════════════════════════════════════════════
router.get('/playbooks', (req, res) => {
  const { category, q } = req.query
  let sql = `SELECT * FROM kb_playbooks WHERE 1=1`
  const params = []
  if (category) { sql += ` AND category = ?`; params.push(category) }
  if (q) { sql += ` AND (LOWER(title) LIKE ? OR LOWER(body) LIKE ?)`; const t = `%${q.toLowerCase()}%`; params.push(t, t) }
  sql += ` ORDER BY updated_at DESC`
  const rows = getDb().prepare(sql).all(...params)
  res.json({ playbooks: rows.map(p => ({ ...p, steps: parseJSON(p.steps, []), tags: parseJSON(p.tags, []) })) })
})

router.get('/playbooks/:idOrSlug', (req, res) => {
  const r = getDb().prepare(`SELECT * FROM kb_playbooks WHERE id = ? OR slug = ?`).get(req.params.idOrSlug, req.params.idOrSlug)
  if (!r) return res.status(404).json({ error: 'Not found' })
  try { getDb().prepare(`UPDATE kb_playbooks SET use_count = use_count + 1 WHERE id = ?`).run(r.id) } catch {}
  res.json({ playbook: { ...r, steps: parseJSON(r.steps, []), tags: parseJSON(r.tags, []) } })
})

router.post('/playbooks', (req, res) => {
  const { title, category, summary, body, steps, tags, author } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title required' })
  const db = getDb()
  const id = uuid()
  let slug = slugify(title)
  if (db.prepare(`SELECT id FROM kb_playbooks WHERE slug = ?`).get(slug)) slug = `${slug}-${id.slice(0,6)}`
  db.prepare(`INSERT INTO kb_playbooks (id, slug, title, category, summary, body, steps, tags, author) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, slug, title.slice(0, 200), category || 'general', summary || '', body || '', JSON.stringify(steps || []), JSON.stringify(tags || []), author || '')
  reindexPlaybook(db, id)
  res.json({ id, slug })
})

router.patch('/playbooks/:id', (req, res) => {
  const db = getDb()
  const allowed = ['title','category','summary','body']
  const sets = [], params = []
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]) }
  if (req.body.steps !== undefined) { sets.push('steps = ?'); params.push(JSON.stringify(req.body.steps)) }
  if (req.body.tags !== undefined)  { sets.push('tags = ?');  params.push(JSON.stringify(req.body.tags)) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push("updated_at = datetime('now')"); params.push(req.params.id)
  db.prepare(`UPDATE kb_playbooks SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  if (req.body.body !== undefined || req.body.title !== undefined) reindexPlaybook(db, req.params.id)
  res.json({ success: true })
})

router.delete('/playbooks/:id', (req, res) => {
  getDb().prepare(`DELETE FROM kb_chunks WHERE doc_type = 'playbook' AND doc_id = ?`).run(req.params.id)
  getDb().prepare(`DELETE FROM kb_playbooks WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  PROMPTS
// ══════════════════════════════════════════════════════════════
router.get('/prompts', (req, res) => {
  const { category, q } = req.query
  let sql = `SELECT * FROM kb_prompts WHERE 1=1`
  const params = []
  if (category) { sql += ` AND category = ?`; params.push(category) }
  if (q) { sql += ` AND (LOWER(title) LIKE ? OR LOWER(body) LIKE ?)`; const t = `%${q.toLowerCase()}%`; params.push(t, t) }
  sql += ` ORDER BY use_count DESC, updated_at DESC LIMIT 500`
  const rows = getDb().prepare(sql).all(...params)
  res.json({ prompts: rows.map(p => ({ ...p, variables: parseJSON(p.variables, []), tags: parseJSON(p.tags, []) })) })
})

router.post('/prompts', (req, res) => {
  const { title, category, body, variables, tags, author } = req.body || {}
  if (!title || !body) return res.status(400).json({ error: 'Title and body required' })
  const db = getDb()
  const id = uuid()
  let slug = slugify(title)
  if (db.prepare(`SELECT id FROM kb_prompts WHERE slug = ?`).get(slug)) slug = `${slug}-${id.slice(0,6)}`
  db.prepare(`INSERT INTO kb_prompts (id, slug, title, category, body, variables, tags, author) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, slug, title.slice(0, 200), category || 'general', body, JSON.stringify(variables || []), JSON.stringify(tags || []), author || '')
  res.json({ id, slug })
})

router.patch('/prompts/:id', (req, res) => {
  const db = getDb()
  const allowed = ['title','category','body']
  const sets = [], params = []
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]) }
  if (req.body.variables !== undefined) { sets.push('variables = ?'); params.push(JSON.stringify(req.body.variables)) }
  if (req.body.tags !== undefined)      { sets.push('tags = ?');      params.push(JSON.stringify(req.body.tags)) }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' })
  sets.push("updated_at = datetime('now')"); params.push(req.params.id)
  db.prepare(`UPDATE kb_prompts SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  res.json({ success: true })
})

router.post('/prompts/:id/use', (req, res) => {
  getDb().prepare(`UPDATE kb_prompts SET use_count = use_count + 1 WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

router.delete('/prompts/:id', (req, res) => {
  getDb().prepare(`DELETE FROM kb_prompts WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  SEARCH (cross-document)
// ══════════════════════════════════════════════════════════════
router.get('/search', (req, res) => {
  const { q, user, limit = 30 } = req.query
  if (!q || !q.trim()) return res.json({ query: q || '', results: [], count: 0 })
  const db = getDb()
  const term = `%${q.toLowerCase()}%`

  const articles = db.prepare(`SELECT id, slug, title, category, excerpt FROM kb_articles
    WHERE LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(tags) LIKE ? LIMIT ?`).all(term, term, term, parseInt(limit))
  const playbooks = db.prepare(`SELECT id, slug, title, category, summary FROM kb_playbooks
    WHERE LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(tags) LIKE ? LIMIT ?`).all(term, term, term, parseInt(limit))
  const prompts = db.prepare(`SELECT id, slug, title, category FROM kb_prompts
    WHERE LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(tags) LIKE ? LIMIT ?`).all(term, term, term, parseInt(limit))
  const courses = db.prepare(`SELECT id, slug, title, category, description FROM kb_courses
    WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ? LIMIT ?`).all(term, term, parseInt(limit))
  const lessons = db.prepare(`SELECT l.id, l.title, l.course_id, c.title as course_title FROM kb_lessons l
    JOIN kb_courses c ON c.id = l.course_id
    WHERE LOWER(l.title) LIKE ? OR LOWER(l.body) LIKE ? LIMIT ?`).all(term, term, parseInt(limit))

  const results = [
    ...articles.map(a => ({ type: 'article', id: a.id, slug: a.slug, title: a.title, category: a.category, snippet: a.excerpt })),
    ...playbooks.map(p => ({ type: 'playbook', id: p.id, slug: p.slug, title: p.title, category: p.category, snippet: p.summary })),
    ...prompts.map(p => ({ type: 'prompt', id: p.id, slug: p.slug, title: p.title, category: p.category, snippet: '' })),
    ...courses.map(c => ({ type: 'course', id: c.id, slug: c.slug, title: c.title, category: c.category, snippet: c.description })),
    ...lessons.map(l => ({ type: 'lesson', id: l.id, course_id: l.course_id, title: `${l.title} · ${l.course_title}`, category: 'lesson', snippet: '' })),
  ]

  // Log search
  try {
    db.prepare(`INSERT INTO kb_search_log (id, query, user_name, result_count) VALUES (?,?,?,?)`)
      .run(uuid(), q, user || '', results.length)
  } catch {}

  res.json({ query: q, results, count: results.length })
})

// Failed searches → suggested articles to create
router.get('/search/failed', (_req, res) => {
  const db = getDb()
  const rows = db.prepare(`SELECT query, COUNT(*) as n, MAX(created_at) as last_seen
    FROM kb_search_log WHERE result_count = 0
    GROUP BY query ORDER BY n DESC, last_seen DESC LIMIT 50`).all()
  res.json({ failed: rows })
})

// ══════════════════════════════════════════════════════════════
//  AI COPILOT (RAG)
// ══════════════════════════════════════════════════════════════
//  Retrieval: simple token-overlap scoring across kb_chunks.
//  Generation: Cerebras provider with context block.

function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
}

function retrieveChunks(db, query, k = 8) {
  const qTokens = Array.from(new Set(tokenize(query)))
  if (qTokens.length === 0) return []
  const chunks = db.prepare(`SELECT id, doc_type, doc_id, doc_title, chunk_index, content, tokens_lower FROM kb_chunks LIMIT 5000`).all()
  const scored = chunks.map(c => {
    const tokens = new Set((c.tokens_lower || '').split(' '))
    let score = 0
    for (const t of qTokens) if (tokens.has(t)) score++
    // Bonus for exact substring match
    if (c.content && c.content.toLowerCase().includes(query.toLowerCase())) score += 3
    return { ...c, score }
  }).filter(c => c.score > 0)
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}

router.post('/copilot/sessions', (req, res) => {
  const { user, title } = req.body || {}
  const id = uuid()
  getDb().prepare(`INSERT INTO kb_copilot_sessions (id, user_name, title) VALUES (?,?,?)`)
    .run(id, user || '', title || 'New conversation')
  res.json({ id })
})

router.get('/copilot/sessions', (req, res) => {
  const { user } = req.query
  let sql = `SELECT * FROM kb_copilot_sessions`
  const params = []
  if (user) { sql += ` WHERE user_name = ?`; params.push(user) }
  sql += ` ORDER BY updated_at DESC LIMIT 100`
  res.json({ sessions: getDb().prepare(sql).all(...params) })
})

router.get('/copilot/sessions/:id', (req, res) => {
  const db = getDb()
  const session = db.prepare(`SELECT * FROM kb_copilot_sessions WHERE id = ?`).get(req.params.id)
  if (!session) return res.status(404).json({ error: 'Not found' })
  const messages = db.prepare(`SELECT * FROM kb_copilot_messages WHERE session_id = ? ORDER BY created_at ASC`).all(req.params.id)
  res.json({ session, messages: messages.map(m => ({ ...m, sources: parseJSON(m.sources, []) })) })
})

router.post('/copilot/ask', async (req, res) => {
  const { question, session_id, user } = req.body || {}
  if (!question || !question.trim()) return res.status(400).json({ error: 'question required' })
  const db = getDb()

  let sid = session_id
  if (!sid) {
    sid = uuid()
    db.prepare(`INSERT INTO kb_copilot_sessions (id, user_name, title) VALUES (?,?,?)`)
      .run(sid, user || '', question.slice(0, 60))
  }
  // History (last 6 turns)
  const history = db.prepare(`SELECT role, content FROM kb_copilot_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 6`).all(sid).reverse()

  // Retrieve chunks
  const chunks = retrieveChunks(db, question, 6)

  // Save the user message
  db.prepare(`INSERT INTO kb_copilot_messages (id, session_id, role, content) VALUES (?,?,?,?)`)
    .run(uuid(), sid, 'user', question)

  const contextBlock = chunks.length
    ? chunks.map((c, i) => `[#${i + 1}] (${c.doc_type}: ${c.doc_title})\n${c.content}`).join('\n\n---\n\n')
    : '(no internal documentation found that matches this question)'

  const historyBlock = history.map(h => `${h.role === 'user' ? 'USER' : 'COPILOT'}: ${h.content}`).join('\n\n')

  const prompt = `You are the internal AI Copilot for Cloz Digital, a premium web design agency in Sarajevo.

Answer the user's question using ONLY the Cloz Digital internal documentation provided below. If the answer is not in the documentation, say so clearly and suggest what should be added.

Style:
- Direct, useful, concise. No fluff.
- Cite sources inline like [#1], [#2] when you use a snippet.
- If the question asks for a checklist, give a checklist.
- If it asks for an email draft, give a draft.

INTERNAL DOCUMENTATION SNIPPETS:
${contextBlock}

CONVERSATION SO FAR:
${historyBlock || '(new conversation)'}

USER QUESTION:
${question}

ANSWER:`

  try {
    const provider = getActiveProvider()
    const result = await provider.generate(prompt, {
      temperature: 0.3,
      maxTokens: 1200,
      task: 'kb-copilot',
    })
    const answer = (result.text || '').trim()
    const sources = chunks.map((c, i) => ({
      ref: `#${i + 1}`, doc_type: c.doc_type, doc_id: c.doc_id, doc_title: c.doc_title, snippet: c.content.slice(0, 200),
    }))
    db.prepare(`INSERT INTO kb_copilot_messages (id, session_id, role, content, sources) VALUES (?,?,?,?,?)`)
      .run(uuid(), sid, 'assistant', answer, JSON.stringify(sources))
    db.prepare(`UPDATE kb_copilot_sessions SET updated_at = datetime('now') WHERE id = ?`).run(sid)
    res.json({ session_id: sid, answer, sources, latencyMs: result.latencyMs })
  } catch (e) {
    logError(`Copilot failed: ${e.message}`)
    res.status(500).json({ error: e.message })
  }
})

router.delete('/copilot/sessions/:id', (req, res) => {
  const db = getDb()
  db.prepare(`DELETE FROM kb_copilot_messages WHERE session_id = ?`).run(req.params.id)
  db.prepare(`DELETE FROM kb_copilot_sessions WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════════════
router.get('/analytics', (_req, res) => {
  const db = getDb()
  const articles = db.prepare(`SELECT COUNT(*) as n FROM kb_articles`).get()?.n || 0
  const published = db.prepare(`SELECT COUNT(*) as n FROM kb_articles WHERE status = 'published'`).get()?.n || 0
  const drafts = db.prepare(`SELECT COUNT(*) as n FROM kb_articles WHERE status = 'draft'`).get()?.n || 0
  const courses = db.prepare(`SELECT COUNT(*) as n FROM kb_courses`).get()?.n || 0
  const lessons = db.prepare(`SELECT COUNT(*) as n FROM kb_lessons`).get()?.n || 0
  const playbooks = db.prepare(`SELECT COUNT(*) as n FROM kb_playbooks`).get()?.n || 0
  const prompts = db.prepare(`SELECT COUNT(*) as n FROM kb_prompts`).get()?.n || 0
  const certificates = db.prepare(`SELECT COUNT(*) as n FROM kb_certificates`).get()?.n || 0
  const topViewed = db.prepare(`SELECT id, slug, title, view_count FROM kb_articles ORDER BY view_count DESC LIMIT 10`).all()
  const topPlaybooks = db.prepare(`SELECT id, slug, title, use_count FROM kb_playbooks ORDER BY use_count DESC LIMIT 10`).all()
  const topPrompts = db.prepare(`SELECT id, slug, title, use_count FROM kb_prompts ORDER BY use_count DESC LIMIT 10`).all()
  const topSearches = db.prepare(`SELECT query, COUNT(*) as n FROM kb_search_log GROUP BY query ORDER BY n DESC LIMIT 10`).all()
  const failedSearches = db.prepare(`SELECT query, COUNT(*) as n FROM kb_search_log WHERE result_count = 0 GROUP BY query ORDER BY n DESC LIMIT 10`).all()
  const enrollments = db.prepare(`SELECT user_name, COUNT(*) as enrolled,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
    FROM kb_enrollments GROUP BY user_name`).all()
  res.json({
    counts: { articles, published, drafts, courses, lessons, playbooks, prompts, certificates },
    top_viewed: topViewed,
    top_playbooks: topPlaybooks,
    top_prompts: topPrompts,
    top_searches: topSearches,
    failed_searches: failedSearches,
    enrollments,
  })
})

// Knowledge gaps via AI: pick out failed searches + summarize
router.post('/ai/gap-analysis', async (_req, res) => {
  const db = getDb()
  const failed = db.prepare(`SELECT query, COUNT(*) as n FROM kb_search_log WHERE result_count = 0 GROUP BY query ORDER BY n DESC LIMIT 20`).all()
  if (!failed.length) return res.json({ summary: 'No failed searches yet — nothing to analyse.', failed: [] })
  const queries = failed.map(f => `- "${f.query}" (asked ${f.n}×)`).join('\n')
  const prompt = `You are the chief knowledge officer for Cloz Digital. These internal searches returned zero results. For each one, propose what kind of article or playbook should exist. Group similar queries. Be concise — under 250 words total.\n\n${queries}`
  try {
    const provider = getActiveProvider()
    const r = await provider.generate(prompt, { temperature: 0.3, maxTokens: 700, task: 'kb-gap' })
    res.json({ summary: (r.text || '').trim(), failed })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// AI: summarise an article
router.post('/ai/summarize', async (req, res) => {
  const { article_id } = req.body || {}
  const a = getDb().prepare(`SELECT title, body FROM kb_articles WHERE id = ?`).get(article_id)
  if (!a) return res.status(404).json({ error: 'Not found' })
  const prompt = `Summarise the following Cloz Digital internal article in 3 short bullet points and 1 one-line "takeaway".\n\nTITLE: ${a.title}\n\nBODY:\n${a.body}`
  try {
    const r = await getActiveProvider().generate(prompt, { temperature: 0.3, maxTokens: 400, task: 'kb-summary' })
    res.json({ summary: (r.text || '').trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// AI: generate a quiz for a lesson
router.post('/ai/quiz', async (req, res) => {
  const { lesson_id, count = 3 } = req.body || {}
  const l = getDb().prepare(`SELECT title, body FROM kb_lessons WHERE id = ?`).get(lesson_id)
  if (!l) return res.status(404).json({ error: 'Lesson not found' })
  const prompt = `Generate ${count} multiple-choice quiz questions for the following Cloz Digital training lesson. Return STRICT JSON: an array of {question, options:[4 strings], answer_index:0-3, explanation:string}. Make the answer non-obvious but fair.\n\nLESSON TITLE: ${l.title}\n\nLESSON BODY:\n${l.body}`
  try {
    const r = await getActiveProvider().generate(prompt, { temperature: 0.4, maxTokens: 900, task: 'kb-quiz-gen' })
    // Try to extract JSON
    const text = (r.text || '').trim()
    const match = text.match(/\[[\s\S]*\]/)
    let quizzes = []
    if (match) { try { quizzes = JSON.parse(match[0]) } catch {} }
    res.json({ quizzes })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════════════════════════
//  CONTENT ASSETS (slide decks, PDFs, checklists, videos, templates)
// ══════════════════════════════════════════════════════════════
router.get('/assets', (req, res) => {
  const { category, kind } = req.query
  let sql = `SELECT * FROM kb_content_assets WHERE 1=1`
  const params = []
  if (category) { sql += ` AND category = ?`; params.push(category) }
  if (kind) { sql += ` AND kind = ?`; params.push(kind) }
  sql += ` ORDER BY created_at DESC LIMIT 500`
  res.json({ assets: getDb().prepare(sql).all(...params).map(a => ({ ...a, tags: parseJSON(a.tags, []) })) })
})

router.post('/assets', (req, res) => {
  const { title, kind, url, category, description, tags, author } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title required' })
  const id = uuid()
  getDb().prepare(`INSERT INTO kb_content_assets (id, title, kind, url, category, description, tags, author) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, title.slice(0, 200), kind || 'document', url || '', category || 'general', description || '', JSON.stringify(tags || []), author || '')
  res.json({ id })
})

router.delete('/assets/:id', (req, res) => {
  getDb().prepare(`DELETE FROM kb_content_assets WHERE id = ?`).run(req.params.id)
  res.json({ success: true })
})

// ══════════════════════════════════════════════════════════════
//  RAG re-indexing helpers
// ══════════════════════════════════════════════════════════════
function reindexArticle(db, articleId) {
  const a = db.prepare(`SELECT id, title, body FROM kb_articles WHERE id = ?`).get(articleId)
  if (!a) return
  db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'article' AND doc_id = ?`).run(articleId)
  for (const c of chunkText(a.body, 900)) {
    const tokensLower = Array.from(new Set(tokenize(c))).join(' ')
    db.prepare(`INSERT INTO kb_chunks (id, doc_type, doc_id, doc_title, chunk_index, content, tokens_lower) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), 'article', a.id, a.title, c.index, c.text, tokensLower)
  }
}
function reindexPlaybook(db, id) {
  const p = db.prepare(`SELECT id, title, body, summary, steps FROM kb_playbooks WHERE id = ?`).get(id)
  if (!p) return
  db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'playbook' AND doc_id = ?`).run(id)
  const stepsTxt = parseJSON(p.steps, []).map((s, i) => `Step ${i+1}: ${typeof s === 'string' ? s : (s.title || '') + ' ' + (s.detail || '')}`).join('\n')
  const fullBody = `${p.summary}\n\n${p.body}\n\n${stepsTxt}`
  for (const c of chunkText(fullBody, 900)) {
    const tokensLower = Array.from(new Set(tokenize(c.text))).join(' ')
    db.prepare(`INSERT INTO kb_chunks (id, doc_type, doc_id, doc_title, chunk_index, content, tokens_lower) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), 'playbook', p.id, p.title, c.index, c.text, tokensLower)
  }
}
function reindexLesson(db, id) {
  const l = db.prepare(`SELECT id, title, body FROM kb_lessons WHERE id = ?`).get(id)
  if (!l) return
  db.prepare(`DELETE FROM kb_chunks WHERE doc_type = 'lesson' AND doc_id = ?`).run(id)
  for (const c of chunkText(l.body, 900)) {
    const tokensLower = Array.from(new Set(tokenize(c.text))).join(' ')
    db.prepare(`INSERT INTO kb_chunks (id, doc_type, doc_id, doc_title, chunk_index, content, tokens_lower) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), 'lesson', l.id, l.title, c.index, c.text, tokensLower)
  }
}

function chunkText(text, maxLen = 900) {
  if (!text) return []
  const paragraphs = String(text).split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  const out = []
  let cur = ''
  let idx = 0
  for (const p of paragraphs) {
    if ((cur + '\n\n' + p).length > maxLen && cur) {
      out.push({ index: idx++, text: cur.trim() })
      cur = p
    } else {
      cur = cur ? cur + '\n\n' + p : p
    }
  }
  if (cur.trim()) out.push({ index: idx, text: cur.trim() })
  return out
}

router.post('/reindex-all', (_req, res) => {
  const db = getDb()
  db.prepare(`DELETE FROM kb_chunks`).run()
  const articles = db.prepare(`SELECT id FROM kb_articles`).all()
  const playbooks = db.prepare(`SELECT id FROM kb_playbooks`).all()
  const lessons = db.prepare(`SELECT id FROM kb_lessons`).all()
  for (const a of articles) reindexArticle(db, a.id)
  for (const p of playbooks) reindexPlaybook(db, p.id)
  for (const l of lessons)   reindexLesson(db, l.id)
  const n = db.prepare(`SELECT COUNT(*) as n FROM kb_chunks`).get()?.n || 0
  res.json({ success: true, chunks: n })
})

export default router
