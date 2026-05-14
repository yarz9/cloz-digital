import { useState, useRef, useCallback } from 'react'
import {
  Palette, Sparkles, Image, Layout, Type, Download, Copy, RefreshCw,
  Hash, MessageSquare, Loader2, ChevronDown, ChevronRight, Check,
  AlignLeft, AlignCenter, AlignRight, Bold, Minus, Plus, RotateCcw, Lock, Unlock, Star
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

// ═══════════════════════════════════════════════════════════════
// DATA: Content Types, Formats, Templates, Styles, Palettes
// ═══════════════════════════════════════════════════════════════

const contentTypes = [
  'Package Promo', 'Educational', 'Authority/Trust', 'Before/After',
  'Maintenance Awareness', 'CTA/Contact', 'Redesign Showcase', 'Testimonial',
  'Service Explanation', 'Business Tips', 'Client Wins', 'Local Spotlight',
  'Audit Offer', 'Website Roast', 'FAQ', 'Checklist',
  'Myth vs Fact', 'Announcement', 'Limited Offer', 'Quote/Insight',
]

const formats = [
  { key: 'square', label: 'Square', w: 1080, h: 1080 },
  { key: 'portrait', label: 'Portrait', w: 1080, h: 1350 },
  { key: 'story', label: 'Story', w: 1080, h: 1920 },
  { key: 'carousel_cover', label: 'Carousel Cover', w: 1080, h: 1080 },
  { key: 'carousel_slide', label: 'Carousel Slide', w: 1080, h: 1080 },
  { key: 'quote_card', label: 'Quote Card', w: 1080, h: 1080 },
  { key: 'stat_card', label: 'Stat Card', w: 1080, h: 1080 },
  { key: 'checklist_card', label: 'Checklist Card', w: 1080, h: 1350 },
  { key: 'testimonial_card', label: 'Testimonial Card', w: 1080, h: 1080 },
  { key: 'offer_card', label: 'Offer Card', w: 1080, h: 1080 },
  { key: 'cta_card', label: 'CTA Card', w: 1080, h: 1080 },
  { key: 'comparison_card', label: 'Comparison Card', w: 1080, h: 1350 },
]

const templateList = [
  'Minimal Dark', 'Centered Hero', 'Bold Statement', 'Split Layout',
  'Left Editorial', 'Gradient Accent', 'Typography Focus', 'Clean Card',
  'Framed Card', 'Hard Contrast', 'Soft Gradient', 'Outline Style',
  'Modern Grid', 'Premium Dark', 'Corporate Clean', 'Luxury Serif',
]

const styleVariations = [
  'Minimal', 'Premium Dark', 'Bold Promo', 'Editorial', 'Luxury',
  'Playful', 'Corporate', 'Modern Grid', 'Centered Hero', 'Left Aligned',
  'Framed Card', 'Soft Gradient', 'Hard Contrast', 'Outline', 'Typography-Led',
]

const palettes = {
  'Cloz Brand':    { bg: '#0B0B0D', primary: '#F5F5F7', accent: '#5E8DB5', muted: '#9CA3AF', secondary: '#18181C', border: '#2A2A30' },
  'Light Clean':   { bg: '#FAFAFA', primary: '#111111', accent: '#2563EB', muted: '#6B7280', secondary: '#F3F4F6', border: '#E5E7EB' },
  'Warm Premium':  { bg: '#1A1614', primary: '#F5F0EB', accent: '#C9956B', muted: '#A89888', secondary: '#2A2420', border: '#3A3430' },
  'Ocean Blue':    { bg: '#0A1628', primary: '#E8F0FE', accent: '#38BDF8', muted: '#7DB4D8', secondary: '#132238', border: '#1E3A5F' },
  'Forest':        { bg: '#0D1A0D', primary: '#E8F5E8', accent: '#4ADE80', muted: '#86CEAA', secondary: '#152815', border: '#1F3F1F' },
  'Purple Night':  { bg: '#110B1E', primary: '#F0E8FF', accent: '#A78BFA', muted: '#9B8AC0', secondary: '#1A1030', border: '#2D1F4E' },
  'Coral Energy':  { bg: '#1A0A0A', primary: '#FFF0F0', accent: '#FB7185', muted: '#D8A0A8', secondary: '#2A1515', border: '#3F1F1F' },
  'Pure White':    { bg: '#FFFFFF', primary: '#0F172A', accent: '#5E8DB5', muted: '#94A3B8', secondary: '#F8FAFC', border: '#E2E8F0' },
}

const fontOptions = [
  { key: 'system', label: 'System', family: 'system-ui, -apple-system, sans-serif' },
  { key: 'display', label: 'Plus Jakarta', family: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { key: 'inter', label: 'Inter', family: '"Inter", system-ui, sans-serif' },
  { key: 'mono', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace' },
  { key: 'serif', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
]

const presets = [
  { name: 'Launch Care Promo', type: 'Package Promo', brief: 'Promote Launch Care package — custom website for small businesses starting from 800 BAM' },
  { name: 'Why Maintenance Matters', type: 'Educational', brief: 'Explain why ongoing website maintenance prevents costly problems' },
  { name: 'Before/After Redesign', type: 'Before/After', brief: 'Show transformation from outdated website to modern premium design' },
  { name: 'Client Testimonial', type: 'Testimonial', brief: 'Feature a real client quote about working with Cloz Digital' },
  { name: 'Free Audit Offer', type: 'Audit Offer', brief: 'Offer a free website audit — identify problems, recommend solutions' },
  { name: 'Growth Care Benefits', type: 'Service Explanation', brief: 'Explain Growth Care monthly plan and what clients get for 325 BAM/mo' },
  { name: '5 Website Mistakes', type: 'Checklist', brief: '5 common website mistakes local businesses make that cost them customers' },
  { name: 'Limited Redesign Offer', type: 'Limited Offer', brief: 'Limited-time offer: full website redesign at a special rate this month' },
]

// ═══════════════════════════════════════════════════════════════
// DEFAULT CONTENT STATE — the single source of truth
// ═══════════════════════════════════════════════════════════════

const emptyContent = {
  eyebrow: '',
  headline: '',
  subline: '',
  body: '',
  cta: '',
  footer: 'Cloz Digital',
  badge: '',
  caption: '',
  hashtags: '',
}

const defaultDesign = {
  palette: 'Cloz Brand',
  template: 'Centered Hero',
  style: 'Premium Dark',
  headingFont: 'display',
  bodyFont: 'system',
  textAlign: 'center',
  fontSize: 100,     // percentage scale
  spacing: 'normal', // compact | normal | relaxed
  showBranding: true,
  showDivider: true,
  showBadge: false,
  showCta: true,
  borderRadius: 0,
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE RENDER — reads from content + design state
// ═══════════════════════════════════════════════════════════════

function TemplatePreview({ content, design, format }) {
  const pal = palettes[design.palette] || palettes['Cloz Brand']
  const hFont = fontOptions.find(f => f.key === design.headingFont)?.family || fontOptions[0].family
  const bFont = fontOptions.find(f => f.key === design.bodyFont)?.family || fontOptions[0].family
  const scale = design.fontSize / 100
  const align = design.textAlign
  const padMul = design.spacing === 'compact' ? 0.6 : design.spacing === 'relaxed' ? 1.4 : 1

  const aspect = format.h / format.w
  const previewW = Math.min(440, 440)
  const previewH = Math.min(previewW * aspect, 680)

  const c = content

  return (
    <div
      id="studio-preview"
      className="rounded-lg overflow-hidden shadow-xl relative"
      style={{
        width: previewW,
        height: previewH,
        background: pal.bg,
        border: `1px solid ${pal.border}`,
        borderRadius: design.borderRadius,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: `${32 * padMul}px`,
        textAlign: align,
        fontFamily: bFont,
      }}
    >
      {/* Badge */}
      {design.showBadge && c.badge && (
        <div style={{
          position: 'absolute', top: 20 * padMul, ...(align === 'left' ? { left: 32 * padMul } : align === 'right' ? { right: 32 * padMul } : { left: '50%', transform: 'translateX(-50%)' }),
          background: pal.accent, color: pal.bg,
          fontSize: 9 * scale, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 3,
        }}>
          {c.badge}
        </div>
      )}

      {/* Divider top */}
      {design.showDivider && (
        <div style={{
          width: 40, height: 3, background: pal.accent, marginBottom: 16 * padMul, borderRadius: 2,
          ...(align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : align === 'right' ? { marginLeft: 'auto' } : {}),
        }} />
      )}

      {/* Eyebrow */}
      {c.eyebrow && (
        <div style={{ fontSize: 10 * scale, fontWeight: 600, color: pal.accent, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 * padMul }}>
          {c.eyebrow}
        </div>
      )}

      {/* Headline */}
      {c.headline && (
        <h2 style={{ fontFamily: hFont, fontSize: 20 * scale, fontWeight: 700, lineHeight: 1.25, color: pal.primary, marginBottom: 8 * padMul, whiteSpace: 'pre-line' }}>
          {c.headline}
        </h2>
      )}

      {/* Subline */}
      {c.subline && (
        <p style={{ fontSize: 12 * scale, fontWeight: 500, color: pal.accent, marginBottom: 10 * padMul }}>
          {c.subline}
        </p>
      )}

      {/* Body */}
      {c.body && (
        <p style={{ fontSize: 11 * scale, color: pal.muted, lineHeight: 1.6, maxWidth: 280, marginBottom: 14 * padMul, ...(align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : {}) }}>
          {c.body}
        </p>
      )}

      {/* CTA */}
      {design.showCta && c.cta && (
        <div style={{
          display: 'inline-block', background: pal.accent, color: pal.bg,
          fontSize: 10 * scale, fontWeight: 600, padding: '6px 18px', borderRadius: 4,
          ...(align === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : align === 'right' ? { marginLeft: 'auto' } : {}),
        }}>
          {c.cta}
        </div>
      )}

      {/* Footer branding */}
      {design.showBranding && (
        <div style={{
          position: 'absolute', bottom: 16 * padMul,
          ...(align === 'left' ? { left: 32 * padMul } : align === 'right' ? { right: 32 * padMul } : { left: '50%', transform: 'translateX(-50%)' }),
          fontSize: 9 * scale, fontWeight: 500, color: pal.muted, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6,
        }}>
          {c.footer || 'Cloz Digital'}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-border">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-elevated/50 transition-colors">
        <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown size={10} className="text-text-tertiary" /> : <ChevronRight size={10} className="text-text-tertiary" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function Instagram() {
  // ─── Central content state (single source of truth) ───
  const [content, setContent] = useState({ ...emptyContent })
  const [design, setDesign] = useState({ ...defaultDesign })
  const [hasGenerated, setHasGenerated] = useState(false)

  // ─── Generation controls ───
  const [selectedType, setSelectedType] = useState('Package Promo')
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [brief, setBrief] = useState('')
  const [locked, setLocked] = useState({}) // field lock map

  // ─── UI state ───
  const [variations, setVariations] = useState(null)
  const [carouselSlides, setCarouselSlides] = useState(null)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [rightTab, setRightTab] = useState('content') // content | caption | export
  const [copied, setCopied] = useState(null)

  const contentAI = useAI(ai.contentGenerate)
  const fmt = formats.find(f => f.key === selectedFormat) || formats[0]

  // ─── Helpers ───
  const updateContent = (field, value) => setContent(prev => ({ ...prev, [field]: value }))
  const updateDesign = (field, value) => setDesign(prev => ({ ...prev, [field]: value }))

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 1500)
  }

  function tryParseJSON(text) {
    try {
      const match = text.match(/\{[\s\S]*\}/)
      return match ? JSON.parse(match[0]) : null
    } catch { return null }
  }

  // ─── AI Generation → writes into content state ───
  const handleGenerate = async () => {
    const result = await contentAI.run({
      contentType: selectedType,
      format: `${selectedFormat} (${fmt.w}x${fmt.h})`,
      template: design.template,
      brief: brief || `Create ${selectedType.toLowerCase()} content for Cloz Digital, a premium web design agency in Bosnia`,
    })
    if (result) {
      const data = result.data || (result.text ? tryParseJSON(result.text) : null)
      if (data) {
        // Write AI output into the central content state, respecting locked fields
        setContent(prev => ({
          ...prev,
          ...(!locked.eyebrow && data.eyebrow ? { eyebrow: data.eyebrow } : {}),
          ...(!locked.headline ? { headline: data.headline || '' } : {}),
          ...(!locked.subline ? { subline: data.subline || data.subtitle || '' } : {}),
          ...(!locked.body ? { body: data.body || '' } : {}),
          ...(!locked.cta ? { cta: data.cta || '' } : {}),
          ...(!locked.caption ? { caption: data.caption || '' } : {}),
          ...(!locked.hashtags ? { hashtags: data.hashtags || '' } : {}),
          ...(!locked.badge && data.badge ? { badge: data.badge } : {}),
        }))
        setHasGenerated(true)
      }
    }
  }

  // ─── Regenerate single field ───
  const regenerateField = async (field) => {
    const result = await contentAI.run({
      contentType: selectedType,
      format: `${selectedFormat}`,
      template: design.template,
      brief: `Regenerate ONLY the ${field} for this ${selectedType.toLowerCase()} post. Current headline: "${content.headline}". Current body: "${content.body}". Give me a fresh ${field} with a different angle. Return JSON with a "${field}" key.`,
    })
    if (result) {
      const data = result.data || (result.text ? tryParseJSON(result.text) : null)
      if (data && data[field]) {
        updateContent(field, data[field])
      }
    }
  }

  // ─── Rewrite with tone ───
  const handleRewrite = async (tone) => {
    const result = await contentAI.run({
      contentType: selectedType,
      format: `${selectedFormat} (${fmt.w}x${fmt.h})`,
      template: design.template,
      brief: `${brief || selectedType}. Tone: ${tone}. Rewrite this content differently. Original: headline="${content.headline}", body="${content.body}". Return JSON with headline, subline, body, cta, caption, hashtags.`,
    })
    if (result) {
      const data = result.data || (result.text ? tryParseJSON(result.text) : null)
      if (data) {
        setContent(prev => ({
          ...prev,
          ...(!locked.headline && data.headline ? { headline: data.headline } : {}),
          ...(!locked.subline && (data.subline || data.subtitle) ? { subline: data.subline || data.subtitle } : {}),
          ...(!locked.body && data.body ? { body: data.body } : {}),
          ...(!locked.cta && data.cta ? { cta: data.cta } : {}),
          ...(!locked.caption && data.caption ? { caption: data.caption } : {}),
          ...(!locked.hashtags && data.hashtags ? { hashtags: data.hashtags } : {}),
        }))
      }
    }
  }

  // ─── Variations ───
  const handleVariations = async () => {
    const result = await contentAI.run({
      contentType: selectedType,
      format: `${selectedFormat} (${fmt.w}x${fmt.h})`,
      template: design.template,
      brief: `Generate 3 completely different variations of: "${brief || selectedType}". Original headline: "${content.headline}". Each variation must have a different angle. Return JSON: { "variation_1": { "headline", "subline", "body", "cta", "caption", "hashtags" }, "variation_2": {...}, "variation_3": {...} }`,
    })
    if (result) {
      const data = result.data || (result.text ? tryParseJSON(result.text) : null)
      if (data) setVariations(data)
    }
  }

  const applyVariation = (v) => {
    if (!v) return
    setContent(prev => ({
      ...prev,
      headline: v.headline || prev.headline,
      subline: v.subline || v.subtitle || prev.subline,
      body: v.body || prev.body,
      cta: v.cta || prev.cta,
      caption: v.caption || prev.caption,
      hashtags: v.hashtags || prev.hashtags,
    }))
    setVariations(null)
  }

  // ─── Carousel ───
  const handleCarousel = async () => {
    const result = await contentAI.run({
      contentType: selectedType,
      format: 'carousel (1080x1080, 5 slides)',
      template: design.template,
      brief: `Convert into a 5-slide carousel. Source: headline="${content.headline}", body="${content.body}". Return JSON: { "slide_1": {"headline","body"}, ... "slide_5": {"headline","body"} }. Slide 1=hook, 2-4=value, 5=CTA.`,
    })
    if (result) {
      const data = result.data || (result.text ? tryParseJSON(result.text) : null)
      if (data) setCarouselSlides(data)
    }
  }

  // ─── Export PNG — uses the same content+design state as preview ───
  const handleExport = () => {
    if (!hasGenerated) return
    const pal = palettes[design.palette] || palettes['Cloz Brand']
    const hFont = fontOptions.find(f => f.key === design.headingFont)?.family || 'system-ui, sans-serif'
    const scale = design.fontSize / 100

    const canvas = document.createElement('canvas')
    canvas.width = fmt.w
    canvas.height = fmt.h
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = pal.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const cx = canvas.width / 2
    const align = design.textAlign
    ctx.textAlign = align

    const xPos = align === 'center' ? cx : align === 'right' ? canvas.width - 80 : 80

    // Badge
    if (design.showBadge && content.badge) {
      ctx.fillStyle = pal.accent
      const bw = ctx.measureText(content.badge.toUpperCase()).width + 24
      const bx = align === 'center' ? cx - bw / 2 : align === 'right' ? canvas.width - 80 - bw : 80
      roundRect(ctx, bx, 50, bw, 32, 4)
      ctx.fill()
      ctx.fillStyle = pal.bg
      ctx.font = `bold ${18 * scale}px ${hFont}`
      ctx.textAlign = 'center'
      ctx.fillText(content.badge.toUpperCase(), bx + bw / 2, 72)
      ctx.textAlign = align
    }

    // Divider
    if (design.showDivider) {
      ctx.fillStyle = pal.accent
      const dw = 80
      const dx = align === 'center' ? cx - dw / 2 : align === 'right' ? canvas.width - 80 - dw : 80
      ctx.fillRect(dx, canvas.height * 0.23, dw, 5)
    }

    // Eyebrow
    let y = canvas.height * 0.28
    if (content.eyebrow) {
      ctx.fillStyle = pal.accent
      ctx.font = `600 ${20 * scale}px ${hFont}`
      ctx.fillText(content.eyebrow.toUpperCase(), xPos, y)
      y += 36
    }

    // Headline
    if (content.headline) {
      ctx.fillStyle = pal.primary
      ctx.font = `bold ${48 * scale}px ${hFont}`
      const lines = wrapText(ctx, content.headline, canvas.width - 160)
      lines.forEach(line => { ctx.fillText(line, xPos, y); y += 58 * scale })
      y += 8
    }

    // Subline
    if (content.subline) {
      ctx.fillStyle = pal.accent
      ctx.font = `500 ${28 * scale}px system-ui, sans-serif`
      ctx.fillText(content.subline, xPos, y + 10)
      y += 44
    }

    // Body
    if (content.body) {
      ctx.fillStyle = pal.muted
      ctx.font = `${24 * scale}px system-ui, sans-serif`
      const bodyLines = wrapText(ctx, content.body, canvas.width - 200)
      bodyLines.slice(0, 5).forEach(line => { ctx.fillText(line, xPos, y); y += 34 })
      y += 16
    }

    // CTA
    if (design.showCta && content.cta) {
      ctx.fillStyle = pal.accent
      const ctaW = ctx.measureText(content.cta).width + 48
      const ctaX = align === 'center' ? cx - ctaW / 2 : align === 'right' ? canvas.width - 80 - ctaW : 80
      roundRect(ctx, ctaX, y, ctaW, 48, 6)
      ctx.fill()
      ctx.fillStyle = pal.bg
      ctx.font = `600 ${20 * scale}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(content.cta, ctaX + ctaW / 2, y + 32)
      ctx.textAlign = align
    }

    // Branding
    if (design.showBranding) {
      ctx.fillStyle = pal.muted
      ctx.globalAlpha = 0.5
      ctx.font = `500 ${18 * scale}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText((content.footer || 'CLOZ DIGITAL').toUpperCase(), cx, canvas.height - 50)
      ctx.globalAlpha = 1
    }

    const link = document.createElement('a')
    link.download = `cloz-${selectedType.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 2000)
  }

  function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ')
    const lines = []
    let cur = ''
    for (const word of words) {
      const test = cur ? `${cur} ${word}` : word
      if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = word }
      else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  // ─── Editable field component ───
  const EditField = ({ label, field, multiline, small }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{label}</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => regenerateField(field)}
            disabled={contentAI.loading || !hasGenerated}
            className="text-[9px] text-accent hover:text-accent-hover disabled:opacity-30"
            title="Regenerate this field"
          >
            <RefreshCw size={9} />
          </button>
          <button
            onClick={() => setLocked(prev => ({ ...prev, [field]: !prev[field] }))}
            className={`text-[9px] ${locked[field] ? 'text-warning' : 'text-text-tertiary hover:text-text-secondary'}`}
            title={locked[field] ? 'Unlock field' : 'Lock field from regeneration'}
          >
            {locked[field] ? <Lock size={9} /> : <Unlock size={9} />}
          </button>
        </div>
      </div>
      {multiline ? (
        <textarea
          value={content[field]}
          onChange={e => updateContent(field, e.target.value)}
          rows={small ? 2 : 3}
          className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none"
        />
      ) : (
        <input
          value={content[field]}
          onChange={e => updateContent(field, e.target.value)}
          className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
        />
      )}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex h-full overflow-hidden">
      {/* ═══ LEFT PANEL — Controls ═══ */}
      <div className="w-[280px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <h1 className="font-display font-bold text-[16px] flex items-center gap-2">
            <Palette size={16} className="text-accent" /> Content Studio
          </h1>
          <p className="text-[10px] text-text-tertiary mt-0.5">Branded content generator</p>
        </div>

        {/* Content type */}
        <Section title="Content Type">
          <div className="grid grid-cols-2 gap-1">
            {contentTypes.map(t => (
              <button key={t} onClick={() => setSelectedType(t)}
                className={`text-[10px] px-2 py-1.5 rounded text-left transition-colors ${selectedType === t ? 'bg-accent-muted text-accent font-medium' : 'bg-elevated hover:bg-raised text-text-secondary'}`}
              >{t}</button>
            ))}
          </div>
        </Section>

        {/* Format */}
        <Section title="Format">
          <div className="grid grid-cols-2 gap-1">
            {formats.map(f => (
              <button key={f.key} onClick={() => setSelectedFormat(f.key)}
                className={`text-[10px] py-1.5 rounded text-center transition-colors ${selectedFormat === f.key ? 'bg-accent-muted text-accent font-medium' : 'bg-elevated hover:bg-raised text-text-secondary'}`}
              >
                {f.label}
                <span className="block text-[8px] text-text-tertiary">{f.w}×{f.h}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Template + Style */}
        <Section title="Template & Style">
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Template</label>
            <select value={design.template} onChange={e => updateDesign('template', e.target.value)}
              className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none">
              {templateList.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Style Variation</label>
            <select value={design.style} onChange={e => updateDesign('style', e.target.value)}
              className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none">
              {styleVariations.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </Section>

        {/* Palette */}
        <Section title="Color Palette" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(palettes).map(([name, pal]) => (
              <button key={name} onClick={() => updateDesign('palette', name)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-colors ${design.palette === name ? 'bg-accent-muted text-accent font-medium ring-1 ring-accent' : 'bg-elevated hover:bg-raised text-text-secondary'}`}
              >
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: pal.bg, border: '1px solid rgba(128,128,128,0.3)' }} />
                  <div className="w-3 h-3 rounded-sm" style={{ background: pal.accent }} />
                  <div className="w-3 h-3 rounded-sm" style={{ background: pal.primary }} />
                </div>
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography" defaultOpen={false}>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Heading Font</label>
            <select value={design.headingFont} onChange={e => updateDesign('headingFont', e.target.value)}
              className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none">
              {fontOptions.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Body Font</label>
            <select value={design.bodyFont} onChange={e => updateDesign('bodyFont', e.target.value)}
              className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[11px] focus:border-accent focus:outline-none">
              {fontOptions.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Font Scale: {design.fontSize}%</label>
            <input type="range" min={70} max={140} value={design.fontSize} onChange={e => updateDesign('fontSize', parseInt(e.target.value))}
              className="w-full accent-accent h-1" />
          </div>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Text Alignment</label>
            <div className="flex gap-1">
              {[['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]].map(([val, Icon]) => (
                <button key={val} onClick={() => updateDesign('textAlign', val)}
                  className={`p-1.5 rounded transition-colors ${design.textAlign === val ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'}`}>
                  <Icon size={12} />
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Layout toggles */}
        <Section title="Layout" defaultOpen={false}>
          <div>
            <label className="text-[10px] text-text-tertiary block mb-1">Spacing</label>
            <div className="flex gap-1">
              {['compact', 'normal', 'relaxed'].map(s => (
                <button key={s} onClick={() => updateDesign('spacing', s)}
                  className={`flex-1 text-[10px] py-1 rounded capitalize transition-colors ${design.spacing === s ? 'bg-accent-muted text-accent font-medium' : 'bg-elevated text-text-tertiary hover:text-text-secondary'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          {[
            ['showBranding', 'Show Branding'],
            ['showDivider', 'Show Divider'],
            ['showCta', 'Show CTA'],
            ['showBadge', 'Show Badge'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={design[key]} onChange={e => updateDesign(key, e.target.checked)}
                className="rounded accent-accent w-3.5 h-3.5" />
              <span className="text-[11px] text-text-secondary">{label}</span>
            </label>
          ))}
        </Section>

        {/* Presets */}
        <Section title="Quick Presets" defaultOpen={false}>
          <div className="space-y-1">
            {presets.map(p => (
              <button key={p.name} onClick={() => { setSelectedType(p.type); setBrief(p.brief) }}
                className="w-full text-left text-[10px] px-2.5 py-2 bg-elevated hover:bg-raised rounded transition-colors">
                <span className="font-medium text-text-primary block">{p.name}</span>
                <span className="text-text-tertiary">{p.type}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Brief + Generate */}
        <div className="p-4 border-t border-border space-y-3">
          <div>
            <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1">Brief / Prompt</label>
            <textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe what to create..." rows={3}
              className="w-full bg-elevated border border-border rounded px-2.5 py-2 text-[11px] placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none" />
          </div>
          <button onClick={handleGenerate} disabled={contentAI.loading}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-md text-[12px] font-medium transition-colors">
            {contentAI.loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {contentAI.loading ? 'Generating...' : 'Generate Content'}
          </button>
          {contentAI.error && <p className="text-[10px] text-error text-center">{contentAI.error}</p>}
        </div>
      </div>

      {/* ═══ CENTER — Live Preview ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 bg-bg overflow-auto">
        {hasGenerated ? (
          <TemplatePreview content={content} design={design} format={fmt} />
        ) : (
          <div className="text-center">
            <Image size={44} className="text-text-tertiary mx-auto mb-3" strokeWidth={1} />
            <p className="text-[13px] text-text-secondary">Select a type and generate</p>
            <p className="text-[11px] text-text-tertiary mt-1">Preview renders live from your content</p>
          </div>
        )}
      </div>

      {/* ═══ RIGHT PANEL — Content Editor + Caption + Export ═══ */}
      {hasGenerated && (
        <div className="w-[300px] shrink-0 border-l border-border bg-surface overflow-y-auto">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {[
              { key: 'content', label: 'Content', icon: Type },
              { key: 'caption', label: 'Caption', icon: MessageSquare },
              { key: 'export', label: 'Export', icon: Download },
            ].map(tab => (
              <button key={tab.key} onClick={() => setRightTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  rightTab === tab.key ? 'text-accent border-b-2 border-accent' : 'text-text-tertiary hover:text-text-secondary'
                }`}>
                <tab.icon size={11} /> {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Tab: Content Editor ─── */}
          {rightTab === 'content' && (
            <div className="p-4 space-y-3">
              <p className="text-[9px] text-text-tertiary">Edit fields below — preview updates instantly. Lock fields to protect them during regeneration.</p>
              <EditField label="Eyebrow / Kicker" field="eyebrow" />
              <EditField label="Headline" field="headline" />
              <EditField label="Subline" field="subline" />
              <EditField label="Body" field="body" multiline />
              <EditField label="CTA Button" field="cta" />
              <EditField label="Badge Label" field="badge" />
              <EditField label="Footer" field="footer" />

              {/* Tone rewrites */}
              <div className="pt-2 border-t border-border">
                <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">Rewrite Tone</label>
                <div className="flex flex-wrap gap-1">
                  {['Shorter', 'More formal', 'More casual', 'More premium', 'More aggressive', 'More educational', 'Conversion-focused'].map(tone => (
                    <button key={tone} onClick={() => handleRewrite(tone.toLowerCase())} disabled={contentAI.loading}
                      className="text-[9px] text-text-tertiary hover:text-text-secondary px-2 py-1 bg-elevated hover:bg-raised rounded transition-colors disabled:opacity-30">
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab: Caption + Hashtags ─── */}
          {rightTab === 'caption' && (
            <div className="p-4 space-y-3">
              <EditField label="Caption" field="caption" multiline />
              <EditField label="Hashtags" field="hashtags" multiline small />
              <div className="flex gap-1.5 pt-1">
                <button onClick={() => copyText(content.caption, 'cap')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${copied === 'cap' ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-raised text-text-secondary border border-border'}`}>
                  {copied === 'cap' ? <Check size={10} /> : <Copy size={10} />} {copied === 'cap' ? 'Copied' : 'Copy Caption'}
                </button>
                <button onClick={() => copyText(content.hashtags, 'hash')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${copied === 'hash' ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-raised text-text-secondary border border-border'}`}>
                  {copied === 'hash' ? <Check size={10} /> : <Hash size={10} />} {copied === 'hash' ? 'Copied' : 'Copy Tags'}
                </button>
              </div>
              <button onClick={() => copyText(`${content.caption}\n\n${content.hashtags}`, 'all')}
                className={`w-full flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${copied === 'all' ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-raised text-text-secondary border border-border'}`}>
                {copied === 'all' ? <Check size={10} /> : <Copy size={10} />} {copied === 'all' ? 'Copied!' : 'Copy Caption + Hashtags'}
              </button>
            </div>
          )}

          {/* ─── Tab: Export + Variations ─── */}
          {rightTab === 'export' && (
            <div className="p-4 space-y-3">
              {/* Export */}
              <button onClick={handleExport}
                className={`w-full flex items-center justify-center gap-2 ${exportSuccess ? 'bg-success' : 'bg-accent hover:bg-accent-hover'} text-white py-2.5 rounded-md text-[12px] font-medium transition-colors`}>
                {exportSuccess ? <><Check size={13} /> Exported!</> : <><Download size={13} /> Export PNG</>}
              </button>
              <p className="text-[9px] text-text-tertiary text-center">Exports at {fmt.w}×{fmt.h}px using your current content and design settings</p>

              {/* Variations */}
              <div className="pt-3 border-t border-border">
                <button onClick={handleVariations} disabled={contentAI.loading}
                  className="w-full flex items-center justify-center gap-2 bg-elevated hover:bg-raised border border-border text-text-secondary py-2 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50">
                  {contentAI.loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Generate 3 Variations
                </button>
                {variations && (
                  <div className="space-y-1.5 mt-2">
                    {[variations.variation_1, variations.variation_2, variations.variation_3].filter(Boolean).map((v, i) => (
                      <button key={i} onClick={() => applyVariation(v)}
                        className="w-full text-left bg-elevated hover:bg-raised rounded p-2.5 border border-border transition-colors">
                        <span className="text-[9px] font-semibold text-accent">Variation {i + 1}</span>
                        <span className="text-[10px] font-medium text-text-primary block mt-0.5 truncate">{v?.headline}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Carousel */}
              <div className="pt-3 border-t border-border">
                <button onClick={handleCarousel} disabled={contentAI.loading}
                  className="w-full flex items-center justify-center gap-2 bg-elevated hover:bg-raised border border-border text-text-secondary py-2 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50">
                  {contentAI.loading ? <Loader2 size={12} className="animate-spin" /> : <Layout size={12} />}
                  Convert to Carousel
                </button>
                {carouselSlides && (
                  <div className="space-y-1.5 mt-2">
                    {[carouselSlides.slide_1, carouselSlides.slide_2, carouselSlides.slide_3, carouselSlides.slide_4, carouselSlides.slide_5].filter(Boolean).map((s, i) => (
                      <div key={i} className="bg-elevated rounded p-2.5 border border-border">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[8px] font-bold text-accent bg-accent-muted w-4 h-4 rounded flex items-center justify-center">{i + 1}</span>
                          <span className="text-[10px] font-medium">{s?.headline}</span>
                        </div>
                        <p className="text-[9px] text-text-tertiary leading-relaxed">{s?.body}</p>
                      </div>
                    ))}
                    <button onClick={() => copyText(
                      [carouselSlides.slide_1, carouselSlides.slide_2, carouselSlides.slide_3, carouselSlides.slide_4, carouselSlides.slide_5]
                        .filter(Boolean).map((s, i) => `Slide ${i + 1}: ${s.headline}\n${s.body}`).join('\n\n'), 'slides'
                    )}
                      className={`w-full flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium transition-colors ${copied === 'slides' ? 'bg-success/10 text-success' : 'bg-elevated hover:bg-raised text-text-secondary border border-border'}`}>
                      {copied === 'slides' ? <Check size={10} /> : <Copy size={10} />} {copied === 'slides' ? 'Copied!' : 'Copy All Slides'}
                    </button>
                  </div>
                )}
              </div>

              {/* Reset */}
              <div className="pt-3 border-t border-border">
                <button onClick={() => { setContent({ ...emptyContent }); setHasGenerated(false); setVariations(null); setCarouselSlides(null); setLocked({}) }}
                  className="w-full flex items-center justify-center gap-1.5 text-text-tertiary hover:text-error py-1.5 text-[10px] transition-colors">
                  <RotateCcw size={10} /> Reset All
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
