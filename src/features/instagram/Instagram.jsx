import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Sparkles, Download, Copy, Loader2, Image as ImageIcon, Layout, Type, Palette,
  AlignLeft, AlignCenter, AlignRight, Lock, Unlock, Eye, EyeOff, RefreshCw,
  Plus, Trash2, ChevronDown, ChevronRight, ChevronLeft, X, Check, FileText,
  Layers as LayersIcon, Smartphone, Monitor, Moon, Grid, Save, History,
  Wand2, MessageSquare, Hash, ArrowRight, ArrowLeft, FileImage, FileJson,
  Star, Zap, Settings, Maximize2, Minimize2, AlertTriangle, CheckCircle,
  Briefcase, BookOpen, Repeat, Square as SquareIcon, MoreHorizontal,
} from 'lucide-react'
import { ai } from '@/lib/api'
import StudioCanvas from './StudioCanvas'
import { FORMATS, FORMAT_GROUPS, PALETTES, TEMPLATES, FONTS, QUICK_PRESETS, getFormat } from './presets'
import { brandKits } from './brandKits'
import { autosave, snapshots } from './snapshots'
import { exportSingle, exportCarouselZip, copyCanvasToClipboard } from './exporter'

// ══════════════════════════════════════════════════════════════
//  CLOZ CONTENT STUDIO — Premium AI Design Platform
//  Pixel-perfect WYSIWYG with the same DOM used for preview & export.
// ══════════════════════════════════════════════════════════════

const CONTENT_TYPES = [
  { key: 'promo',         label: 'Promotion' },
  { key: 'educational',   label: 'Educational' },
  { key: 'testimonial',   label: 'Testimonial' },
  { key: 'case_study',    label: 'Case Study' },
  { key: 'offer',         label: 'Offer' },
  { key: 'quote',         label: 'Quote' },
  { key: 'announcement',  label: 'Announcement' },
  { key: 'carousel',      label: 'Carousel' },
]

const LAYER_KEYS = ['badge', 'eyebrow', 'headline', 'divider', 'subline', 'body', 'cta', 'footer']

const emptyContent = {
  badge: '', eyebrow: '', headline: '', subline: '', body: '', cta: '',
  footer: 'CLOZ DIGITAL', caption: '', hashtags: '',
}

const defaultDesign = {
  template: 'minimal',
  paletteKey: 'cloz',
  headingFont: 'jakarta',
  bodyFont: 'inter',
  textAlign: 'left',
  verticalAlign: 'center',
  fontSize: 100,
  spacing: 'normal',
  borderRadius: 0,
  shadow: true,
  showBadge: true,
  showDivider: false,
  showBranding: true,
  showCta: true,
  hideWatermark: false,
}

const defaultLayers = LAYER_KEYS.reduce((acc, k) => { acc[k] = { visible: true, locked: false }; return acc }, {})

// ══════════════════════════════════════════════════════════════

export default function Instagram() {
  // ── Core state ──
  const [contentType, setContentType] = useState('promo')
  const [formatKey, setFormatKey] = useState('ig_square')
  const [paletteKey, setPaletteKey] = useState('cloz')
  const [design, setDesign] = useState(defaultDesign)
  const [content, setContent] = useState(emptyContent)
  const [layers, setLayers] = useState(defaultLayers)
  const [brief, setBrief] = useState('')
  const [fieldLocks, setFieldLocks] = useState({})

  // ── UI state ──
  const [tab, setTab] = useState('content')
  const [previewMode, setPreviewMode] = useState('desktop')
  const [showSafeArea, setShowSafeArea] = useState(false)
  const [zoom, setZoom] = useState('fit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasGenerated, setHasGenerated] = useState(false)
  const [busyOp, setBusyOp] = useState('')

  // ── AI panels ──
  const [variants, setVariants] = useState(null)
  const [critique, setCritique] = useState(null)
  const [headlines, setHeadlines] = useState(null)

  // ── Brand Kit ──
  const [activeKitId, setActiveKitId] = useState(brandKits.getActiveId())
  const [kitsList, setKitsList] = useState(brandKits.list())

  // ── Carousel ──
  const [carouselSlides, setCarouselSlides] = useState([])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isCarousel, setIsCarousel] = useState(false)

  // ── Snapshots ──
  const [snapshotsList, setSnapshotsList] = useState(snapshots.list())

  // ── Refs for export ──
  const canvasRef = useRef(null)
  const previewWrapperRef = useRef(null)

  // ── Derived values ──
  const format = useMemo(() => getFormat(formatKey), [formatKey])
  const palette = useMemo(() => PALETTES.find(p => p.key === paletteKey) || PALETTES[0], [paletteKey])
  const activeContent = isCarousel ? (carouselSlides[activeSlide] || emptyContent) : content
  const activeKit = useMemo(() => kitsList.find(k => k.id === activeKitId) || kitsList[0], [activeKitId, kitsList])

  // ── Autosave: load on mount ──
  useEffect(() => {
    const saved = autosave.load()
    if (saved && saved.content) {
      setContent(saved.content || emptyContent)
      setDesign(saved.design || defaultDesign)
      setFormatKey(saved.formatKey || 'ig_square')
      setPaletteKey(saved.paletteKey || 'cloz')
      setContentType(saved.contentType || 'promo')
      setBrief(saved.brief || '')
      setLayers(saved.layers || defaultLayers)
      if (saved.content.headline || saved.content.body) setHasGenerated(true)
      if (saved.carouselSlides?.length) {
        setCarouselSlides(saved.carouselSlides)
        setIsCarousel(saved.isCarousel || false)
      }
    }
  }, [])

  // ── Autosave: debounced save ──
  useEffect(() => {
    const handle = setTimeout(() => {
      autosave.save({ content, design, formatKey, paletteKey, contentType, brief, layers, carouselSlides, isCarousel })
    }, 1200)
    return () => clearTimeout(handle)
  }, [content, design, formatKey, paletteKey, contentType, brief, layers, carouselSlides, isCarousel])

  // ── Preview scale: fit to viewport ──
  const [previewScale, setPreviewScale] = useState(0.4)

  useEffect(() => {
    const calc = () => {
      const container = previewWrapperRef.current
      if (!container) return
      const availW = container.clientWidth - 80
      const availH = container.clientHeight - 80
      if (zoom === 'fit') {
        const scale = Math.min(availW / format.w, availH / format.h, 1)
        setPreviewScale(Math.max(0.1, scale))
      } else if (typeof zoom === 'number') {
        setPreviewScale(zoom)
      }
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [format, zoom])

  // ── Content updaters ──
  const updateContent = useCallback((patch) => {
    if (isCarousel) {
      setCarouselSlides(prev => prev.map((s, i) => i === activeSlide ? { ...s, ...patch } : s))
    } else {
      setContent(prev => ({ ...prev, ...patch }))
    }
  }, [isCarousel, activeSlide])

  const updateDesign = useCallback((patch) => setDesign(prev => ({ ...prev, ...patch })), [])

  const toggleLayer = (key, prop) => {
    setLayers(prev => ({ ...prev, [key]: { ...prev[key], [prop]: !prev[key]?.[prop] } }))
  }

  const toggleFieldLock = (field) => {
    setFieldLocks(prev => ({ ...prev, [field]: !prev[field] }))
  }

  // ══ AI OPERATIONS ══
  const handleGenerate = async () => {
    setError('')
    setLoading(true)
    setBusyOp('generate')
    try {
      const result = await ai.contentGenerate({
        contentType: CONTENT_TYPES.find(c => c.key === contentType)?.label || contentType,
        format: `${format.label} (${format.w}x${format.h})`,
        template: TEMPLATES.find(t => t.key === design.template)?.label || design.template,
        brief: brief || activeKit?.voice || `Create ${contentType} content for a premium web design agency.`,
      })

      const data = result.data || result
      if (data) {
        const patch = {}
        Object.entries(data).forEach(([k, v]) => {
          if (!fieldLocks[k] && typeof v === 'string') patch[k] = v
        })
        if (isCarousel) {
          setCarouselSlides(prev => prev.map((s, i) => i === activeSlide ? { ...s, ...patch } : s))
        } else {
          setContent(prev => ({ ...prev, ...patch }))
        }
        setHasGenerated(true)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setBusyOp('')
    }
  }

  const handleRewrite = async (tone) => {
    setError('')
    setBusyOp('rewrite')
    try {
      const c = activeContent
      const fullText = [c.headline, c.subline, c.body].filter(Boolean).join('\n\n')
      if (!fullText) return
      const result = await ai.contentRewrite({ text: fullText, tone, context: `${contentType} content for web design agency` })
      const text = result.text || result.content || ''
      const parts = text.split('\n\n').filter(Boolean)
      updateContent({
        headline: parts[0] || c.headline,
        subline: parts[1] || c.subline,
        body: parts.slice(2).join('\n\n') || c.body,
      })
    } catch (e) { setError(e.message) } finally { setBusyOp('') }
  }

  const handleHeadlines = async () => {
    setError('')
    setBusyOp('headlines')
    try {
      const result = await ai.contentHeadlines({ topic: brief || activeContent.headline || contentType, count: 6 })
      const data = result.data || result
      setHeadlines(data?.headlines || [])
      setTab('ai')
    } catch (e) { setError(e.message) } finally { setBusyOp('') }
  }

  const handleVariants = async () => {
    setError('')
    setBusyOp('variants')
    try {
      const result = await ai.contentVariants({ content: activeContent, count: 3 })
      const data = result.data || result
      setVariants(data?.variants || [])
      setTab('ai')
    } catch (e) { setError(e.message) } finally { setBusyOp('') }
  }

  const handleCritique = async () => {
    setError('')
    setBusyOp('critique')
    try {
      const result = await ai.contentCritique({ content: activeContent, format: format.label })
      const data = result.data || result
      setCritique(data)
      setTab('ai')
    } catch (e) { setError(e.message) } finally { setBusyOp('') }
  }

  const handleCarousel = async () => {
    setError('')
    setBusyOp('carousel')
    try {
      const result = await ai.contentCarousel({ topic: brief || activeContent.headline || contentType, slides: 5, brief })
      const data = result.data || result
      if (data?.slides?.length) {
        setCarouselSlides(data.slides.map(s => ({ ...emptyContent, ...s })))
        setActiveSlide(0)
        setIsCarousel(true)
        setHasGenerated(true)
        if (data.caption) setContent(prev => ({ ...prev, caption: data.caption, hashtags: data.hashtags || prev.hashtags }))
      }
    } catch (e) { setError(e.message) } finally { setBusyOp('') }
  }

  // ══ EXPORT ══
  const [exportOpts, setExportOpts] = useState({ format: 'png', quality: 0.95, scale: 1, transparent: false })

  const handleExport = async () => {
    setError('')
    setBusyOp('export')
    try {
      if (isCarousel && carouselSlides.length > 1) {
        await exportCarouselFromOffscreen()
      } else {
        if (!canvasRef.current) throw new Error('Canvas not ready')
        await exportSingle(canvasRef.current, {
          ...exportOpts,
          filename: `cloz-${format.key}-${Date.now()}`,
        })
      }
    } catch (e) {
      setError('Export failed: ' + e.message)
    } finally {
      setBusyOp('')
    }
  }

  const exportCarouselFromOffscreen = async () => {
    const slides = carouselSlides
    const originalIdx = activeSlide
    const captures = []

    for (let i = 0; i < slides.length; i++) {
      setActiveSlide(i)
      setBusyOp(`export ${i + 1}/${slides.length}`)
      // wait for DOM to update
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => setTimeout(r, 150))
      if (canvasRef.current) {
        captures.push(canvasRef.current)
        // capture happens inside exportCarouselZip
      }
    }

    setActiveSlide(originalIdx)
    await new Promise(r => setTimeout(r, 100))

    // Re-capture all slides in sequence (each from current DOM)
    // Simpler approach: do them inline
    await exportCarouselSequentially(slides)
  }

  const exportCarouselSequentially = async (slides) => {
    const { exportSingle: _ } = await import('./exporter')
    const JSZip = (await import('jszip')).default
    const { captureCanvas, dataUrlToBlob } = await import('./exporter')
    const zip = new JSZip()
    const ext = exportOpts.format === 'jpeg' ? 'jpg' : exportOpts.format

    for (let i = 0; i < slides.length; i++) {
      setActiveSlide(i)
      setBusyOp(`export ${i + 1}/${slides.length}`)
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise(r => setTimeout(r, 150))
      if (!canvasRef.current) continue
      const dataUrl = await captureCanvas(canvasRef.current, exportOpts)
      const blob = dataUrlToBlob(dataUrl)
      const slideNum = String(i + 1).padStart(2, '0')
      zip.file(`slide-${slideNum}.${ext}`, blob)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cloz-carousel-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleCopy = async () => {
    setError('')
    setBusyOp('copy')
    try {
      if (!canvasRef.current) throw new Error('Canvas not ready')
      await copyCanvasToClipboard(canvasRef.current)
    } catch (e) {
      setError('Copy failed: ' + e.message)
    } finally {
      setBusyOp('')
    }
  }

  // ══ CAROUSEL OPS ══
  const addSlide = () => {
    setCarouselSlides(prev => [...prev, { ...emptyContent, headline: 'New slide' }])
    setActiveSlide(carouselSlides.length)
  }

  const duplicateSlide = (idx) => {
    const slide = carouselSlides[idx]
    setCarouselSlides(prev => [...prev.slice(0, idx + 1), { ...slide }, ...prev.slice(idx + 1)])
  }

  const removeSlide = (idx) => {
    if (carouselSlides.length <= 1) return
    setCarouselSlides(prev => prev.filter((_, i) => i !== idx))
    setActiveSlide(Math.max(0, Math.min(activeSlide, carouselSlides.length - 2)))
  }

  const startCarousel = () => {
    setIsCarousel(true)
    if (carouselSlides.length === 0) {
      setCarouselSlides([{ ...content }])
      setActiveSlide(0)
    }
  }

  const exitCarousel = () => {
    if (carouselSlides[0]) setContent(carouselSlides[0])
    setIsCarousel(false)
  }

  // ══ BRAND KIT ══
  const applyKit = (kit) => {
    if (!kit) return
    const newPalette = PALETTES.find(p =>
      p.bg.toLowerCase() === (kit.colors?.bg || '').toLowerCase()
    )
    setDesign(prev => ({
      ...prev,
      headingFont: kit.fonts?.heading || prev.headingFont,
      bodyFont: kit.fonts?.body || prev.bodyFont,
    }))
    if (newPalette) setPaletteKey(newPalette.key)
    if (kit.footer) updateContent({ footer: kit.footer })
    setActiveKitId(kit.id)
    brandKits.setActiveId(kit.id)
  }

  // ══ SNAPSHOTS ══
  const takeSnapshot = () => {
    const state = { content, design, formatKey, paletteKey, contentType, brief, layers, carouselSlides, isCarousel }
    const snap = snapshots.add(state, `${format.label} - ${new Date().toLocaleString()}`)
    if (snap) setSnapshotsList(snapshots.list())
  }

  const restoreSnapshot = (snap) => {
    const s = snap.state
    setContent(s.content || emptyContent)
    setDesign(s.design || defaultDesign)
    setFormatKey(s.formatKey || 'ig_square')
    setPaletteKey(s.paletteKey || 'cloz')
    setContentType(s.contentType || 'promo')
    setBrief(s.brief || '')
    setLayers(s.layers || defaultLayers)
    setCarouselSlides(s.carouselSlides || [])
    setIsCarousel(s.isCarousel || false)
    setHasGenerated(true)
  }

  const deleteSnapshot = (id) => {
    snapshots.remove(id)
    setSnapshotsList(snapshots.list())
  }

  const applyQuickPreset = (preset) => {
    setBrief(preset.brief)
  }

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      {/* ══ LEFT SIDEBAR ══ */}
      <div className="w-[300px] shrink-0 border-r border-border bg-surface overflow-y-auto">
        <LeftSidebar
          contentType={contentType} setContentType={setContentType}
          formatKey={formatKey} setFormatKey={setFormatKey}
          paletteKey={paletteKey} setPaletteKey={setPaletteKey}
          design={design} setDesign={setDesign} updateDesign={updateDesign}
          brief={brief} setBrief={setBrief}
          onGenerate={handleGenerate} loading={loading} busyOp={busyOp}
          activeKit={activeKit} kitsList={kitsList} onApplyKit={applyKit}
          onPreset={applyQuickPreset}
          onCarousel={handleCarousel}
        />
      </div>

      {/* ══ CENTER: PREVIEW ══ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 border-b border-border bg-surface flex items-center px-4 gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-elevated rounded-md p-0.5">
            <PreviewModeBtn icon={Monitor} active={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')} label="Desktop" />
            <PreviewModeBtn icon={Smartphone} active={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')} label="Mobile" />
            <PreviewModeBtn icon={Moon} active={previewMode === 'dark'} onClick={() => setPreviewMode('dark')} label="Dark" />
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <ToolBtn icon={Grid} active={showSafeArea} onClick={() => setShowSafeArea(!showSafeArea)} title="Toggle safe area overlay" />

          <div className="w-px h-6 bg-border mx-1" />

          <select value={zoom} onChange={e => setZoom(e.target.value === 'fit' ? 'fit' : parseFloat(e.target.value))}
            className="bg-elevated border border-border rounded-md px-2 py-1 text-[11px] focus:outline-none focus:border-accent">
            <option value="fit">Fit</option>
            <option value={0.25}>25%</option>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
          </select>

          <div className="ml-auto flex items-center gap-1.5">
            {!isCarousel ? (
              <button onClick={startCarousel}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated hover:bg-raised rounded-md text-[11px] text-text-secondary">
                <Repeat size={12} /> Carousel
              </button>
            ) : (
              <button onClick={exitCarousel}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-accent-muted text-accent rounded-md text-[11px]">
                <X size={12} /> Exit Carousel
              </button>
            )}

            <button onClick={takeSnapshot} title="Save snapshot"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated hover:bg-raised rounded-md text-[11px] text-text-secondary">
              <Save size={12} /> Snapshot
            </button>

            <button onClick={handleCopy} disabled={!hasGenerated || busyOp === 'copy'}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-elevated hover:bg-raised disabled:opacity-40 rounded-md text-[11px] text-text-secondary">
              {busyOp === 'copy' ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
              Copy
            </button>

            <button onClick={handleExport} disabled={!hasGenerated || busyOp === 'export' || busyOp.startsWith('export')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md text-[12px] font-semibold">
              {busyOp === 'export' || busyOp?.startsWith('export') ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {busyOp?.startsWith('export ') ? busyOp.replace('export ', '') : (isCarousel && carouselSlides.length > 1 ? 'Export ZIP' : 'Export')}
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div
          ref={previewWrapperRef}
          className={`flex-1 overflow-auto relative ${
            previewMode === 'dark' ? 'bg-black' : previewMode === 'mobile' ? 'bg-elevated' : 'bg-bg'
          }`}
        >
          {!hasGenerated ? (
            <EmptyState onGenerate={handleGenerate} loading={loading} hasBrief={!!brief} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-10">
              {previewMode === 'mobile' ? (
                <div className="bg-raised rounded-[40px] p-3 shadow-2xl border-4 border-elevated"
                  style={{ width: Math.min(380, format.w * previewScale + 40) }}>
                  <div className="bg-bg rounded-[28px] overflow-hidden" style={{ aspectRatio: `${format.w} / ${format.h}` }}>
                    <StudioCanvas
                      ref={canvasRef}
                      format={format} palette={palette} design={design}
                      content={activeContent} layers={layers}
                      showSafeArea={false}
                      previewScale={(380 - 40) / format.w}
                    />
                  </div>
                </div>
              ) : (
                <div style={{
                  width: format.w * previewScale,
                  height: format.h * previewScale,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}>
                  <StudioCanvas
                    ref={canvasRef}
                    format={format} palette={palette} design={design}
                    content={activeContent} layers={layers}
                    showSafeArea={showSafeArea}
                    previewScale={previewScale}
                    previewMode={previewMode}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-md px-4 py-2.5 bg-error/10 border border-error/20 rounded-lg text-[12px] text-error flex items-center gap-2 shadow-lg">
              <AlertTriangle size={13} /><span className="flex-1">{error}</span>
              <button onClick={() => setError('')}><X size={13} /></button>
            </div>
          )}
        </div>

        {/* Carousel strip */}
        {isCarousel && (
          <CarouselStrip
            slides={carouselSlides}
            active={activeSlide}
            onSelect={setActiveSlide}
            onAdd={addSlide}
            onDuplicate={duplicateSlide}
            onRemove={removeSlide}
            format={format} palette={palette} design={design} layers={layers}
          />
        )}
      </div>

      {/* ══ RIGHT SIDEBAR ══ */}
      <div className="w-[360px] shrink-0 border-l border-border bg-surface overflow-y-auto">
        <RightSidebar
          tab={tab} setTab={setTab}
          content={activeContent} updateContent={updateContent}
          fieldLocks={fieldLocks} toggleFieldLock={toggleFieldLock}
          layers={layers} toggleLayer={toggleLayer}
          hasGenerated={hasGenerated}
          design={design} updateDesign={updateDesign}
          onRewrite={handleRewrite} onHeadlines={handleHeadlines}
          onVariants={handleVariants} onCritique={handleCritique}
          busyOp={busyOp}
          variants={variants} setVariants={setVariants}
          critique={critique} setCritique={setCritique}
          headlines={headlines} setHeadlines={setHeadlines}
          exportOpts={exportOpts} setExportOpts={setExportOpts}
          snapshotsList={snapshotsList}
          onRestoreSnap={restoreSnapshot} onDeleteSnap={deleteSnapshot}
          kitsList={kitsList} setKitsList={setKitsList}
          activeKitId={activeKitId} onApplyKit={applyKit}
        />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  LEFT SIDEBAR
// ══════════════════════════════════════════════════════════════

function LeftSidebar({
  contentType, setContentType, formatKey, setFormatKey, paletteKey, setPaletteKey,
  design, setDesign, updateDesign, brief, setBrief, onGenerate, loading, busyOp,
  activeKit, kitsList, onApplyKit, onPreset, onCarousel,
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Wand2 size={18} className="text-accent" />
        <h1 className="font-display font-bold text-[16px]">Content Studio</h1>
      </div>

      <Section title="Brief" icon={FileText} defaultOpen>
        <textarea
          value={brief} onChange={e => setBrief(e.target.value)}
          placeholder="Describe what you want to create..."
          rows={3}
          className="w-full bg-elevated border border-border rounded-md p-2 text-[12px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
        />
        <button onClick={onGenerate} disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2 rounded-md text-[12px] font-semibold">
          {loading && busyOp === 'generate' ? <><Loader2 size={12} className="animate-spin" />Generating...</> : <><Sparkles size={12} />Generate</>}
        </button>
        <button onClick={onCarousel} disabled={loading}
          className="w-full mt-1.5 flex items-center justify-center gap-1.5 bg-elevated hover:bg-raised disabled:opacity-50 text-text-secondary py-1.5 rounded-md text-[11px]">
          {busyOp === 'carousel' ? <Loader2 size={11} className="animate-spin" /> : <Repeat size={11} />} Generate 5-slide carousel
        </button>
      </Section>

      <Section title="Quick Presets" icon={Zap}>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PRESETS.map(p => (
            <button key={p.key} onClick={() => onPreset(p)}
              className="text-left px-2 py-1.5 bg-elevated hover:bg-raised rounded-md text-[10px] text-text-secondary leading-tight">
              {p.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Content Type" icon={BookOpen}>
        <div className="grid grid-cols-2 gap-1">
          {CONTENT_TYPES.map(c => (
            <button key={c.key} onClick={() => setContentType(c.key)}
              className={`px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                contentType === c.key ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-secondary hover:bg-raised'
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Format" icon={Layout} defaultOpen>
        {FORMAT_GROUPS.map(group => (
          <div key={group} className="mb-2 last:mb-0">
            <div className="text-[9px] text-text-tertiary uppercase tracking-wider mb-1">{group}</div>
            <div className="space-y-0.5">
              {FORMATS.filter(f => f.group === group).map(f => (
                <button key={f.key} onClick={() => setFormatKey(f.key)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-[11px] transition-colors ${
                    formatKey === f.key ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-secondary hover:bg-raised'
                  }`}>
                  <span>{f.label}</span>
                  <span className="text-[9px] font-mono text-text-tertiary">{f.w}×{f.h}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Brand Kit" icon={Briefcase}>
        <select value={activeKit?.id || ''} onChange={e => onApplyKit(kitsList.find(k => k.id === e.target.value))}
          className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:border-accent">
          {kitsList.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        {activeKit?.voice && (
          <p className="text-[10px] text-text-tertiary mt-1.5 leading-relaxed line-clamp-2">{activeKit.voice}</p>
        )}
      </Section>

      <Section title="Template Style" icon={SquareIcon}>
        <div className="grid grid-cols-3 gap-1">
          {TEMPLATES.map(t => (
            <button key={t.key} onClick={() => updateDesign({ template: t.key })}
              className={`px-2 py-1.5 rounded-md text-[10px] transition-colors ${
                design.template === t.key ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-secondary hover:bg-raised'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Color Palette" icon={Palette}>
        <div className="grid grid-cols-4 gap-1.5">
          {PALETTES.map(p => (
            <button key={p.key} onClick={() => setPaletteKey(p.key)} title={p.name}
              className={`relative aspect-square rounded-md border-2 overflow-hidden ${paletteKey === p.key ? 'border-accent' : 'border-border'}`}
              style={{ background: p.bg }}>
              <div className="absolute inset-1 grid grid-cols-2 gap-0.5">
                <div style={{ background: p.primary }} className="rounded-sm" />
                <div style={{ background: p.accent }} className="rounded-sm" />
              </div>
            </button>
          ))}
        </div>
        <div className="text-[10px] text-text-tertiary mt-1.5">{PALETTES.find(p => p.key === paletteKey)?.name}</div>
      </Section>

      <Section title="Typography" icon={Type}>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Heading</label>
        <select value={design.headingFont} onChange={e => updateDesign({ headingFont: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[11px] mb-2 focus:outline-none focus:border-accent">
          {FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Body</label>
        <select value={design.bodyFont} onChange={e => updateDesign({ bodyFont: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[11px] mb-2 focus:outline-none focus:border-accent">
          {FONTS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Size: {design.fontSize}%</label>
        <input type="range" min="70" max="140" value={design.fontSize}
          onChange={e => updateDesign({ fontSize: parseInt(e.target.value) })}
          className="w-full" />
      </Section>

      <Section title="Layout" icon={Layout}>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Alignment</label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[{ k: 'left', i: AlignLeft }, { k: 'center', i: AlignCenter }, { k: 'right', i: AlignRight }].map(({ k, i: Icon }) => (
            <button key={k} onClick={() => updateDesign({ textAlign: k })}
              className={`py-1.5 rounded-md flex items-center justify-center ${
                design.textAlign === k ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
              }`}>
              <Icon size={12} />
            </button>
          ))}
        </div>

        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Vertical</label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {['top', 'center', 'bottom'].map(v => (
            <button key={v} onClick={() => updateDesign({ verticalAlign: v })}
              className={`py-1.5 rounded-md text-[10px] capitalize ${
                design.verticalAlign === v ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
              }`}>
              {v}
            </button>
          ))}
        </div>

        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Spacing</label>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {['compact', 'normal', 'relaxed'].map(s => (
            <button key={s} onClick={() => updateDesign({ spacing: s })}
              className={`py-1.5 rounded-md text-[10px] capitalize ${
                design.spacing === s ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary hover:text-text-secondary'
              }`}>
              {s}
            </button>
          ))}
        </div>

        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Border Radius: {design.borderRadius}px</label>
        <input type="range" min="0" max="120" value={design.borderRadius}
          onChange={e => updateDesign({ borderRadius: parseInt(e.target.value) })}
          className="w-full mb-2" />

        <ToggleRow label="Show Badge" checked={design.showBadge} onChange={v => updateDesign({ showBadge: v })} />
        <ToggleRow label="Show Divider" checked={design.showDivider} onChange={v => updateDesign({ showDivider: v })} />
        <ToggleRow label="Show Branding" checked={design.showBranding} onChange={v => updateDesign({ showBranding: v })} />
        <ToggleRow label="Show CTA" checked={design.showCta} onChange={v => updateDesign({ showCta: v })} />
        <ToggleRow label="CTA Shadow" checked={design.shadow} onChange={v => updateDesign({ shadow: v })} />
        <ToggleRow label="Hide Watermark" checked={design.hideWatermark} onChange={v => updateDesign({ hideWatermark: v })} />
      </Section>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  RIGHT SIDEBAR
// ══════════════════════════════════════════════════════════════

function RightSidebar({
  tab, setTab, content, updateContent, fieldLocks, toggleFieldLock,
  layers, toggleLayer, hasGenerated, design, updateDesign,
  onRewrite, onHeadlines, onVariants, onCritique, busyOp,
  variants, setVariants, critique, setCritique, headlines, setHeadlines,
  exportOpts, setExportOpts,
  snapshotsList, onRestoreSnap, onDeleteSnap,
}) {
  const tabs = [
    { key: 'content',  label: 'Content', icon: FileText },
    { key: 'layers',   label: 'Layers',  icon: LayersIcon },
    { key: 'ai',       label: 'AI',      icon: Sparkles },
    { key: 'caption',  label: 'Caption', icon: MessageSquare },
    { key: 'export',   label: 'Export',  icon: Download },
    { key: 'history',  label: 'History', icon: History },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1 px-2.5 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'text-accent border-accent' : 'text-text-tertiary border-transparent hover:text-text-secondary'
            }`}>
            <t.icon size={11} />{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'content' && (
          !hasGenerated ? (
            <div className="text-center py-8">
              <Sparkles size={28} className="mx-auto text-text-tertiary opacity-40 mb-3" />
              <p className="text-[12px] text-text-tertiary">Generate content to start editing</p>
            </div>
          ) : (
            <div className="space-y-3">
              {['badge', 'eyebrow', 'headline', 'subline', 'body', 'cta', 'footer'].map(field => (
                <FieldEditor key={field}
                  label={field}
                  value={content[field] || ''}
                  onChange={v => updateContent({ [field]: v })}
                  locked={fieldLocks[field]}
                  onToggleLock={() => toggleFieldLock(field)}
                  multiline={field === 'body' || field === 'subline'}
                />
              ))}
            </div>
          )
        )}

        {tab === 'layers' && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-text-tertiary mb-2">Show, hide, or lock individual layers</p>
            {LAYER_KEYS.map(key => (
              <div key={key} className="flex items-center gap-2 px-2 py-1.5 bg-elevated rounded-md">
                <button onClick={() => toggleLayer(key, 'visible')} title={layers[key]?.visible !== false ? 'Hide' : 'Show'}
                  className="text-text-tertiary hover:text-accent">
                  {layers[key]?.visible !== false ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => toggleLayer(key, 'locked')} title={layers[key]?.locked ? 'Unlock' : 'Lock'}
                  className="text-text-tertiary hover:text-accent">
                  {layers[key]?.locked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
                <span className="text-[11px] text-text-secondary capitalize flex-1">{key}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">AI Tools</h3>
              <div className="grid grid-cols-2 gap-1.5">
                <AIToolBtn icon={Hash} label="Headlines" onClick={onHeadlines} busy={busyOp === 'headlines'} />
                <AIToolBtn icon={Layout} label="Variants" onClick={onVariants} busy={busyOp === 'variants'} />
                <AIToolBtn icon={CheckCircle} label="Critique" onClick={onCritique} busy={busyOp === 'critique'} />
              </div>

              <h3 className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium mt-3">Rewrite Tone</h3>
              <div className="grid grid-cols-2 gap-1.5">
                {['Shorter', 'More premium', 'More casual', 'More direct', 'More educational', 'Conversion-focused'].map(t => (
                  <button key={t} onClick={() => onRewrite(t)} disabled={busyOp === 'rewrite'}
                    className="px-2 py-1.5 bg-elevated hover:bg-raised disabled:opacity-50 rounded-md text-[10px] text-text-secondary">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {headlines?.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold">Headline suggestions</h3>
                  <button onClick={() => setHeadlines(null)}><X size={12} className="text-text-tertiary" /></button>
                </div>
                <div className="space-y-1.5">
                  {headlines.map((h, i) => (
                    <button key={i} onClick={() => updateContent({ headline: h })}
                      className="w-full text-left px-2.5 py-1.5 bg-elevated hover:bg-accent-muted hover:text-accent rounded-md text-[12px] text-text-secondary transition-colors">
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {variants?.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold">Content variants</h3>
                  <button onClick={() => setVariants(null)}><X size={12} className="text-text-tertiary" /></button>
                </div>
                <div className="space-y-2">
                  {variants.map((v, i) => (
                    <button key={i} onClick={() => updateContent(v)}
                      className="w-full text-left p-2 bg-elevated hover:bg-raised rounded-md transition-colors">
                      <div className="text-[11px] font-semibold mb-1">{v.headline}</div>
                      {v.subline && <div className="text-[10px] text-text-tertiary mb-1 line-clamp-2">{v.subline}</div>}
                      <div className="text-[10px] text-accent">{v.cta} →</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {critique && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold">Design Critique</h3>
                  <button onClick={() => setCritique(null)}><X size={12} className="text-text-tertiary" /></button>
                </div>
                {critique.overallScore != null && (
                  <div className="text-center mb-3">
                    <div className={`text-[24px] font-bold font-display ${
                      critique.overallScore >= 80 ? 'text-success' : critique.overallScore >= 60 ? 'text-warning' : 'text-error'
                    }`}>
                      {critique.overallScore}/100
                    </div>
                    <div className="text-[10px] text-text-tertiary">{critique.verdict}</div>
                  </div>
                )}
                {critique.strengths?.length > 0 && <CritiqueList label="Strengths" items={critique.strengths} color="text-success" />}
                {critique.weaknesses?.length > 0 && <CritiqueList label="Weaknesses" items={critique.weaknesses} color="text-warning" />}
                {critique.suggestions?.length > 0 && <CritiqueList label="Suggestions" items={critique.suggestions} color="text-accent" />}
              </div>
            )}
          </div>
        )}

        {tab === 'caption' && (
          <div className="space-y-3">
            <FieldEditor label="Caption" value={content.caption || ''} onChange={v => updateContent({ caption: v })} multiline rows={8} />
            <FieldEditor label="Hashtags" value={content.hashtags || ''} onChange={v => updateContent({ hashtags: v })} multiline rows={3} />
            <button onClick={() => navigator.clipboard.writeText(`${content.caption || ''}\n\n${content.hashtags || ''}`.trim())}
              className="w-full flex items-center justify-center gap-1.5 bg-elevated hover:bg-raised text-text-secondary py-2 rounded-md text-[11px]">
              <Copy size={11} /> Copy Caption + Tags
            </button>
          </div>
        )}

        {tab === 'export' && (
          <ExportPanel exportOpts={exportOpts} setExportOpts={setExportOpts} design={design} updateDesign={updateDesign} />
        )}

        {tab === 'history' && (
          <div className="space-y-2">
            <p className="text-[10px] text-text-tertiary mb-2">Saved snapshots (auto-saved up to 20)</p>
            {snapshotsList.length === 0 ? (
              <div className="text-center py-6 text-[11px] text-text-tertiary">No snapshots yet</div>
            ) : snapshotsList.map(s => (
              <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 bg-elevated rounded-md group">
                <button onClick={() => onRestoreSnap(s)} className="flex-1 text-left">
                  <div className="text-[11px] text-text-secondary truncate">{s.label}</div>
                  <div className="text-[9px] text-text-tertiary">{new Date(s.createdAt).toLocaleString()}</div>
                </button>
                <button onClick={() => onDeleteSnap(s.id)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-error">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  EXPORT PANEL
// ══════════════════════════════════════════════════════════════

function ExportPanel({ exportOpts, setExportOpts, design, updateDesign }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Format</label>
        <div className="grid grid-cols-3 gap-1">
          {['png', 'jpeg', 'svg'].map(f => (
            <button key={f} onClick={() => setExportOpts(o => ({ ...o, format: f }))}
              className={`px-2 py-1.5 rounded-md text-[11px] uppercase ${
                exportOpts.format === f ? 'bg-accent text-white' : 'bg-elevated text-text-secondary hover:bg-raised'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider">
          Scale: {exportOpts.scale}× {exportOpts.scale === 1 ? '(native)' : '(sharper)'}
        </label>
        <div className="grid grid-cols-3 gap-1">
          {[1, 2, 3].map(s => (
            <button key={s} onClick={() => setExportOpts(o => ({ ...o, scale: s }))}
              className={`px-2 py-1.5 rounded-md text-[11px] ${
                exportOpts.scale === s ? 'bg-accent text-white' : 'bg-elevated text-text-secondary hover:bg-raised'
              }`}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      {exportOpts.format === 'jpeg' && (
        <div>
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider">
            Quality: {Math.round(exportOpts.quality * 100)}%
          </label>
          <input type="range" min="0.5" max="1" step="0.05" value={exportOpts.quality}
            onChange={e => setExportOpts(o => ({ ...o, quality: parseFloat(e.target.value) }))}
            className="w-full" />
        </div>
      )}

      {exportOpts.format === 'png' && (
        <ToggleRow label="Transparent Background" checked={exportOpts.transparent}
          onChange={v => setExportOpts(o => ({ ...o, transparent: v }))} />
      )}

      <ToggleRow label="Hide Watermark" checked={design.hideWatermark} onChange={v => updateDesign({ hideWatermark: v })} />

      <div className="border-t border-border pt-2 mt-2">
        <p className="text-[10px] text-text-tertiary leading-relaxed">
          Exports use the exact same DOM you see in the preview. Pixel-perfect WYSIWYG.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  CAROUSEL STRIP
// ══════════════════════════════════════════════════════════════

function CarouselStrip({ slides, active, onSelect, onAdd, onDuplicate, onRemove, format, palette, design, layers }) {
  const thumbW = 60
  const thumbH = thumbW * (format.h / format.w)
  return (
    <div className="h-28 border-t border-border bg-surface flex items-center gap-2 px-3 overflow-x-auto shrink-0">
      {slides.map((slide, i) => (
        <div key={i} className="relative shrink-0 group">
          <button onClick={() => onSelect(i)}
            className={`relative overflow-hidden rounded-md border-2 transition-all ${active === i ? 'border-accent' : 'border-border hover:border-text-tertiary'}`}
            style={{ width: thumbW, height: thumbH }}>
            <StudioCanvas format={format} palette={palette} design={design} content={slide} layers={layers} previewScale={thumbW / format.w} />
          </button>
          <span className="absolute top-0 left-0 bg-accent text-white text-[9px] font-bold px-1 rounded-br-md">{i + 1}</span>
          <button onClick={() => onRemove(i)} disabled={slides.length <= 1}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-error text-white opacity-0 group-hover:opacity-100 disabled:opacity-0 flex items-center justify-center">
            <X size={9} />
          </button>
        </div>
      ))}
      <button onClick={onAdd}
        className="shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-border hover:border-accent text-text-tertiary hover:text-accent flex items-center justify-center">
        <Plus size={16} />
      </button>
      <div className="ml-auto text-[10px] text-text-tertiary">
        {slides.length} slide{slides.length !== 1 ? 's' : ''} &middot; Slide {active + 1}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  EMPTY STATE
// ══════════════════════════════════════════════════════════════

function EmptyState({ onGenerate, loading, hasBrief }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-muted flex items-center justify-center">
          <Wand2 size={28} className="text-accent" />
        </div>
        <h2 className="font-display font-bold text-[20px] mb-2">Cloz Content Studio</h2>
        <p className="text-[13px] text-text-tertiary mb-5 leading-relaxed">
          AI-powered design platform with pixel-perfect WYSIWYG export.
          Write a brief on the left and generate professional content in seconds.
        </p>
        <button onClick={onGenerate} disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-[13px] font-semibold">
          {loading ? <><Loader2 size={14} className="animate-spin" />Generating...</> : <><Sparkles size={14} />{hasBrief ? 'Generate Content' : 'Generate Sample'}</>}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

function Section({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left mb-2 group">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-primary uppercase tracking-wider">
          {Icon && <Icon size={11} className="text-text-tertiary" />}
          {title}
        </div>
        <ChevronDown size={12} className={`text-text-tertiary transition-transform ${open ? 'rotate-0' : '-rotate-90'}`} />
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-text-secondary">{label}</span>
      <button onClick={() => onChange(!checked)}
        className={`w-7 h-4 rounded-full transition-colors relative ${checked ? 'bg-accent' : 'bg-elevated'}`}>
        <span className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} w-3 h-3 rounded-full bg-white transition-all`} />
      </button>
    </div>
  )
}

function FieldEditor({ label, value, onChange, locked, onToggleLock, multiline, rows = 3 }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-text-tertiary uppercase tracking-wider capitalize">{label}</label>
        {onToggleLock && (
          <button onClick={onToggleLock} className={locked ? 'text-warning' : 'text-text-tertiary hover:text-accent'}>
            {locked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        )}
      </div>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
          className="w-full bg-elevated border border-border rounded-md p-2 text-[12px] text-text-primary focus:outline-none focus:border-accent resize-none" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-elevated border border-border rounded-md px-2 py-1.5 text-[12px] text-text-primary focus:outline-none focus:border-accent" />
      )}
    </div>
  )
}

function ToolBtn({ icon: Icon, active, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-md transition-colors ${active ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'}`}>
      <Icon size={13} />
    </button>
  )
}

function PreviewModeBtn({ icon: Icon, active, onClick, label }) {
  return (
    <button onClick={onClick} title={label}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
        active ? 'bg-bg text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary'
      }`}>
      <Icon size={11} />
    </button>
  )
}

function AIToolBtn({ icon: Icon, label, onClick, busy }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-muted hover:bg-accent/20 disabled:opacity-50 text-accent rounded-md text-[11px] font-medium">
      {busy ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}{label}
    </button>
  )
}

function CritiqueList({ label, items, color }) {
  return (
    <div className="mb-2">
      <div className={`text-[10px] uppercase tracking-wider font-medium mb-1 ${color}`}>{label}</div>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5">
            <span className={color}>•</span><span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
