import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useT } from '@/i18n/I18nProvider'

// ══════════════════════════════════════════════════════════════
//  Public legal page — fetches the live template from /api/legal/public/:slug
// ══════════════════════════════════════════════════════════════

export default function LegalPage({ slug, fallbackTitle }) {
  const t = useT()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `${fallbackTitle || slug} — Cloz Digital`
    fetch(`/api/legal/public/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setDoc(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug, fallbackTitle])

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-[760px] mx-auto">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>
        ) : error ? (
          <div className="bg-error/5 border border-error/20 rounded-md p-4 text-[13px] text-error flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{error} — {t('legal.error')}</span>
          </div>
        ) : doc ? (
          <>
            <div className="mb-8 pb-6 border-b border-border">
              <h1 className="font-display font-bold text-[36px] md:text-[44px] leading-tight tracking-tight">{doc.title}</h1>
              <p className="text-[12px] text-text-tertiary mt-3">
                {t('legal.version')} {doc.version}{doc.effective_date ? ` · ${t('legal.effective')} ${doc.effective_date}` : ''}
              </p>
            </div>

            <article className="prose prose-invert max-w-none">
              <Markdown body={doc.body} />
            </article>
          </>
        ) : null}
      </div>
    </section>
  )
}

// Tiny markdown renderer — handles headings, paragraphs, lists, links, bold
function Markdown({ body }) {
  if (!body) return null
  const lines = body.split('\n')
  const elements = []
  let listBuf = []
  let listKind = null
  let pBuf = []

  const flushList = () => {
    if (listBuf.length === 0) return
    const Tag = listKind === 'ol' ? 'ol' : 'ul'
    elements.push(<Tag key={elements.length} className={`my-4 pl-5 space-y-1.5 ${Tag === 'ul' ? 'list-disc' : 'list-decimal'} text-[14px] text-text-secondary leading-relaxed`}>
      {listBuf.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}
    </Tag>)
    listBuf = []
    listKind = null
  }

  const flushParagraph = () => {
    if (pBuf.length === 0) return
    elements.push(
      <p key={elements.length} className="text-[14px] text-text-secondary leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: inline(pBuf.join(' ')) }} />
    )
    pBuf = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      flushList(); flushParagraph()
      const level = h[1].length
      const Tag = `h${level + 1}`  // h1 -> h2 visually (h1 is the page title)
      const cls = level === 1
        ? 'font-display font-bold text-[24px] mt-8 mb-3'
        : level === 2
          ? 'font-display font-semibold text-[18px] mt-7 mb-2'
          : 'font-display font-semibold text-[15px] mt-5 mb-2'
      elements.push(<Tag key={elements.length} className={cls} dangerouslySetInnerHTML={{ __html: inline(h[2]) }} />)
      continue
    }
    // list items
    const ul = line.match(/^[-*]\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ul) {
      flushParagraph()
      if (listKind && listKind !== 'ul') flushList()
      listKind = 'ul'; listBuf.push(ul[1]); continue
    }
    if (ol) {
      flushParagraph()
      if (listKind && listKind !== 'ol') flushList()
      listKind = 'ol'; listBuf.push(ol[1]); continue
    }
    // horizontal rule
    if (/^---+$/.test(line)) {
      flushList(); flushParagraph()
      elements.push(<hr key={elements.length} className="my-6 border-border" />)
      continue
    }
    // blank line ends paragraph
    if (!line) {
      flushList(); flushParagraph()
      continue
    }
    // accumulate paragraph
    pBuf.push(line)
  }
  flushList()
  flushParagraph()

  return <>{elements}</>
}

function inline(s) {
  if (!s) return ''
  let html = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-medium">$1</strong>')
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:text-accent-hover" target="_blank" rel="noopener noreferrer">$1</a>')
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-elevated px-1.5 py-0.5 rounded text-[12px]">$1</code>')
  return html
}
