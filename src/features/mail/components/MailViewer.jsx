import { useState, useMemo } from 'react'
import { Code, Eye, FileText, FileCode, Monitor, Smartphone, Moon } from 'lucide-react'
import DOMPurify from 'dompurify'

// ══════════════════════════════════════════════════════════════
//  MAIL VIEWER — Properly renders HTML emails
// ══════════════════════════════════════════════════════════════

/**
 * Parse multipart MIME email body and extract the best renderable part.
 * Priority: HTML > Plain Text > Raw
 */
function parseEmailBody(bodyText, bodyHtml) {
  // If we have explicit HTML, use it
  if (bodyHtml && bodyHtml.trim() && !isMimeArtifact(bodyHtml)) {
    return { html: bodyHtml, plain: bodyText || stripHtml(bodyHtml), type: 'html' }
  }

  // Check if bodyText is actually HTML
  if (bodyText && isHtmlContent(bodyText)) {
    return { html: bodyText, plain: stripHtml(bodyText), type: 'html' }
  }

  // Check if bodyText contains MIME boundaries
  if (bodyText && isMimeContent(bodyText)) {
    const extracted = extractFromMime(bodyText)
    if (extracted.html) {
      return { html: extracted.html, plain: extracted.plain || stripHtml(extracted.html), type: 'html' }
    }
    if (extracted.plain) {
      return { html: null, plain: extracted.plain, type: 'plain' }
    }
  }

  // Plain text fallback
  return { html: null, plain: bodyText || '', type: 'plain' }
}

function isMimeArtifact(text) {
  return /^--[a-zA-Z0-9_-]+\r?\n/m.test(text) || /^Content-Type:/im.test(text)
}

function isMimeContent(text) {
  return /--[a-zA-Z0-9_=-]+/m.test(text) && /Content-Type:/im.test(text)
}

function isHtmlContent(text) {
  return /<(html|body|div|p|table|h[1-6]|br|span|a)\b/i.test(text)
}

/**
 * Extract HTML and plain text parts from a multipart MIME message.
 */
function extractFromMime(raw) {
  const result = { html: null, plain: null }

  // Find boundary
  const boundaryMatch = raw.match(/boundary="?([^"\s;]+)"?/i) || raw.match(/^--([a-zA-Z0-9_=-]+)/m)
  if (!boundaryMatch) {
    // No boundary found — check if it's just raw text with headers
    const headerEnd = raw.indexOf('\r\n\r\n') || raw.indexOf('\n\n')
    if (headerEnd > -1) {
      const body = raw.slice(headerEnd + (raw[headerEnd + 1] === '\n' ? 2 : 4))
      if (isHtmlContent(body)) return { html: body, plain: null }
      return { html: null, plain: body }
    }
    return result
  }

  const boundary = boundaryMatch[1]
  const parts = raw.split(new RegExp(`--${escapeRegex(boundary)}`))

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n') !== -1 ? part.indexOf('\r\n\r\n') : part.indexOf('\n\n')
    if (headerEnd === -1) continue

    const headers = part.slice(0, headerEnd).toLowerCase()
    const body = part.slice(headerEnd + (part[headerEnd + 1] === '\n' ? 2 : 4)).trim()

    if (!body || body === '--') continue

    if (headers.includes('text/html')) {
      result.html = decodeContent(body, headers)
    } else if (headers.includes('text/plain')) {
      result.plain = decodeContent(body, headers)
    }
  }

  return result
}

function decodeContent(body, headers) {
  if (headers.includes('base64')) {
    try { return atob(body.replace(/\s/g, '')) } catch { return body }
  }
  if (headers.includes('quoted-printable')) {
    return body.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  }
  return body
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Sanitize HTML for safe rendering.
 */
function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'div', 'span', 'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'a', 'img', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code', 'sup', 'sub', 'small',
      'center', 'font', 'big',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class',
      'target', 'rel', 'cellpadding', 'cellspacing', 'border', 'align', 'valign',
      'bgcolor', 'color', 'face', 'size', 'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  })
}

// ══════════════════════════════════════════════════════════════
//  VIEWER COMPONENT
// ══════════════════════════════════════════════════════════════

export default function MailViewer({ bodyText, bodyHtml, className = '' }) {
  const [viewMode, setViewMode] = useState('rendered') // rendered | plain | html | raw

  const parsed = useMemo(() => parseEmailBody(bodyText, bodyHtml), [bodyText, bodyHtml])
  const sanitized = useMemo(() => parsed.html ? sanitizeHtml(parsed.html) : null, [parsed.html])

  return (
    <div className={`flex flex-col ${className}`}>
      {/* View mode tabs */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-elevated/50">
        <ViewTab active={viewMode === 'rendered'} onClick={() => setViewMode('rendered')} icon={Eye} label="Rendered" />
        <ViewTab active={viewMode === 'plain'} onClick={() => setViewMode('plain')} icon={FileText} label="Plain Text" />
        {parsed.html && <ViewTab active={viewMode === 'html'} onClick={() => setViewMode('html')} icon={Code} label="HTML Source" />}
        <ViewTab active={viewMode === 'raw'} onClick={() => setViewMode('raw')} icon={FileCode} label="Raw" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {viewMode === 'rendered' && sanitized && (
          <div
            className="email-rendered-view max-w-[680px]"
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        )}

        {viewMode === 'rendered' && !sanitized && (
          <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            {parsed.plain}
          </div>
        )}

        {viewMode === 'plain' && (
          <pre className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap font-mono">
            {parsed.plain}
          </pre>
        )}

        {viewMode === 'html' && parsed.html && (
          <pre className="text-[11px] text-text-tertiary leading-relaxed whitespace-pre-wrap font-mono bg-elevated p-3 rounded-lg overflow-x-auto">
            {parsed.html}
          </pre>
        )}

        {viewMode === 'raw' && (
          <pre className="text-[11px] text-text-tertiary leading-relaxed whitespace-pre-wrap font-mono bg-elevated p-3 rounded-lg overflow-x-auto">
            {bodyText || bodyHtml || '(empty)'}
          </pre>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  EMAIL PREVIEW COMPONENT
// ══════════════════════════════════════════════════════════════

export function EmailPreview({ html, plain, subject, senderName }) {
  const [previewMode, setPreviewMode] = useState('desktop') // desktop | mobile | dark | plain

  const sanitized = useMemo(() => html ? sanitizeHtml(html) : null, [html])

  const wrapperStyles = {
    desktop: 'max-w-[680px] w-full bg-white rounded-lg shadow-sm',
    mobile: 'max-w-[375px] w-full bg-white rounded-2xl shadow-lg mx-auto',
    dark: 'max-w-[680px] w-full bg-[#1a1a1a] rounded-lg shadow-sm text-[#e5e5e5]',
  }

  return (
    <div className="flex flex-col h-full">
      {/* Preview mode tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-surface">
        <PreviewTab active={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')} icon={Monitor} label="Desktop" />
        <PreviewTab active={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')} icon={Smartphone} label="Mobile" />
        <PreviewTab active={previewMode === 'dark'} onClick={() => setPreviewMode('dark')} icon={Moon} label="Dark" />
        <PreviewTab active={previewMode === 'plain'} onClick={() => setPreviewMode('plain')} icon={FileText} label="Plain" />
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-y-auto p-4 bg-elevated/30">
        {previewMode === 'plain' ? (
          <pre className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap font-mono max-w-[680px]">
            {plain || stripHtml(html || '')}
          </pre>
        ) : (
          <div className={wrapperStyles[previewMode] || wrapperStyles.desktop}>
            {/* Gmail-like header */}
            <div className={`p-4 border-b ${previewMode === 'dark' ? 'border-[#333]' : 'border-gray-200'}`}>
              <div className={`text-[14px] font-semibold ${previewMode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {subject || '(No Subject)'}
              </div>
              <div className={`text-[12px] mt-1 ${previewMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {senderName || 'Cloz Digital'}
              </div>
            </div>

            {/* Email body */}
            <div
              className={`p-4 text-[13px] leading-relaxed email-rendered-view ${previewMode === 'dark' ? 'dark-email-preview' : ''}`}
              style={previewMode === 'mobile' ? { fontSize: '14px' } : undefined}
              dangerouslySetInnerHTML={{ __html: sanitized || `<p>${plain || ''}</p>` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ViewTab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
      active ? 'bg-accent/10 text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
    }`}>
      <Icon size={11} />
      {label}
    </button>
  )
}

function PreviewTab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
      active ? 'bg-accent/10 text-accent border border-accent/20' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
    }`}>
      <Icon size={12} />
      {label}
    </button>
  )
}
