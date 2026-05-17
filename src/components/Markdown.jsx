// Lightweight markdown renderer used across the app (legal pages, KB articles, etc.)
// Handles: headings (#, ##, ###), paragraphs, ul/ol, links, bold, inline code,
// fenced code blocks (```), horizontal rules. No external deps.

export default function Markdown({ body, compact = false }) {
  if (!body) return null
  const lines = body.split('\n')
  const elements = []
  let listBuf = []
  let listKind = null
  let pBuf = []
  let codeBuf = null  // when non-null, collecting a fenced code block
  let codeLang = ''

  const flushList = () => {
    if (listBuf.length === 0) return
    const Tag = listKind === 'ol' ? 'ol' : 'ul'
    elements.push(<Tag key={`l${elements.length}`} className={`${compact ? 'my-2 pl-4 space-y-1' : 'my-4 pl-5 space-y-1.5'} ${Tag === 'ul' ? 'list-disc' : 'list-decimal'} text-[14px] text-text-secondary leading-relaxed`}>
      {listBuf.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(item) }} />)}
    </Tag>)
    listBuf = []; listKind = null
  }
  const flushParagraph = () => {
    if (pBuf.length === 0) return
    elements.push(
      <p key={`p${elements.length}`} className={`text-[14px] text-text-secondary leading-relaxed ${compact ? 'mb-2' : 'mb-4'}`}
        dangerouslySetInnerHTML={{ __html: inline(pBuf.join(' ')) }} />
    )
    pBuf = []
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Fenced code block toggle
    if (line.startsWith('```')) {
      if (codeBuf === null) {
        flushList(); flushParagraph()
        codeBuf = []
        codeLang = line.slice(3).trim()
      } else {
        elements.push(
          <pre key={`c${elements.length}`} className="my-4 bg-elevated border border-border rounded-md p-3 overflow-x-auto text-[12px] font-mono text-text-primary">
            {codeLang && <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-2">{codeLang}</div>}
            <code>{codeBuf.join('\n')}</code>
          </pre>
        )
        codeBuf = null; codeLang = ''
      }
      continue
    }
    if (codeBuf !== null) { codeBuf.push(raw); continue }

    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      flushList(); flushParagraph()
      const level = h[1].length
      const Tag = `h${level + 1}`
      const cls = level === 1
        ? `font-display font-bold ${compact ? 'text-[18px] mt-5 mb-2' : 'text-[24px] mt-8 mb-3'}`
        : level === 2
          ? `font-display font-semibold ${compact ? 'text-[15px] mt-4 mb-1.5' : 'text-[18px] mt-7 mb-2'}`
          : `font-display font-semibold ${compact ? 'text-[13px] mt-3 mb-1' : 'text-[15px] mt-5 mb-2'}`
      elements.push(<Tag key={`h${elements.length}`} className={cls} dangerouslySetInnerHTML={{ __html: inline(h[2]) }} />)
      continue
    }

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

    if (/^---+$/.test(line)) {
      flushList(); flushParagraph()
      elements.push(<hr key={`hr${elements.length}`} className="my-6 border-border" />)
      continue
    }
    if (!line) { flushList(); flushParagraph(); continue }
    pBuf.push(line)
  }
  flushList(); flushParagraph()
  return <>{elements}</>
}

function inline(s) {
  if (!s) return ''
  let html = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-medium">$1</strong>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:text-accent-hover" target="_blank" rel="noopener noreferrer">$1</a>')
  html = html.replace(/`([^`]+)`/g, '<code class="bg-elevated px-1.5 py-0.5 rounded text-[12px] font-mono">$1</code>')
  return html
}
