import { toPng, toJpeg, toSvg } from 'html-to-image'
import JSZip from 'jszip'

// ══════════════════════════════════════════════════════════════
//  EXPORTER — WYSIWYG export from the SAME DOM node as preview
//  Uses html-to-image at native resolution. No separate render path.
// ══════════════════════════════════════════════════════════════

/**
 * Wait for fonts and images to fully load before capture.
 * This is the key to preventing layout shifts in export.
 */
async function waitForReadiness(node) {
  // 1. Wait for fonts
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready
  }

  // 2. Wait for all images in the node
  const imgs = node.querySelectorAll('img')
  await Promise.all(Array.from(imgs).map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve()
    return new Promise(resolve => {
      img.onload = resolve
      img.onerror = resolve
      // Safety timeout
      setTimeout(resolve, 3000)
    })
  }))

  // 3. Wait one animation frame for layout to stabilize
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  // 4. Small extra delay for any web fonts that report ready but haven't painted
  await new Promise(r => setTimeout(r, 80))
}

/**
 * html-to-image filter — strip any elements marked `data-no-export`
 * (e.g. safe area overlays should never appear in exports)
 */
function exportFilter(el) {
  if (!el || !el.getAttribute) return true
  return el.getAttribute('data-no-export') !== 'true'
}

/**
 * Capture a single canvas node at its NATIVE dimensions.
 * The node is rendered at full resolution; html-to-image captures it as-is.
 */
export async function captureCanvas(node, options = {}) {
  if (!node) throw new Error('No canvas node to export')

  const {
    format = 'png',          // png | jpeg | svg
    quality = 0.95,          // jpeg only
    scale = 1,               // pixel multiplier
    transparent = false,     // png only — strip background
    backgroundColor,         // override background (e.g. white for JPG)
  } = options

  // Get the EXPORT NODE — the one marked data-canvas-export
  const exportNode = node.getAttribute('data-canvas-export') === 'true'
    ? node
    : node.querySelector('[data-canvas-export="true"]') || node

  // Read native dimensions from inline styles
  const w = parseInt(exportNode.style.width) || exportNode.offsetWidth
  const h = parseInt(exportNode.style.height) || exportNode.offsetHeight

  // Pre-capture readiness
  await waitForReadiness(exportNode)

  const baseOpts = {
    width: w,
    height: h,
    pixelRatio: scale,
    cacheBust: true,
    filter: exportFilter,
    style: {
      // Force no transforms during capture so positioning matches preview exactly
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
      // Override any inherited transforms
    },
  }

  if (transparent && format === 'png') {
    baseOpts.backgroundColor = 'transparent'
  } else if (backgroundColor) {
    baseOpts.backgroundColor = backgroundColor
  }

  let dataUrl
  if (format === 'jpeg' || format === 'jpg') {
    dataUrl = await toJpeg(exportNode, { ...baseOpts, quality, backgroundColor: backgroundColor || '#ffffff' })
  } else if (format === 'svg') {
    dataUrl = await toSvg(exportNode, baseOpts)
  } else {
    dataUrl = await toPng(exportNode, baseOpts)
  }

  return dataUrl
}

/**
 * Convert a data URL to a Blob (for ZIP packaging).
 */
export function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)[1]
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/**
 * Trigger a download for a given data URL.
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Export a single canvas with default options.
 */
export async function exportSingle(node, options = {}) {
  const { format = 'png', filename = `cloz-design-${Date.now()}` } = options
  const dataUrl = await captureCanvas(node, options)
  const ext = format === 'jpeg' ? 'jpg' : format
  downloadDataUrl(dataUrl, `${filename}.${ext}`)
  return dataUrl
}

/**
 * Export a sequence of canvas nodes (for carousel) packaged as a ZIP.
 * Renders each slide one at a time to avoid memory issues.
 */
export async function exportCarouselZip(nodes, options = {}) {
  const { format = 'png', filename = `cloz-carousel-${Date.now()}`, onProgress } = options
  const zip = new JSZip()
  const ext = format === 'jpeg' ? 'jpg' : format

  for (let i = 0; i < nodes.length; i++) {
    if (onProgress) onProgress(i + 1, nodes.length)
    const dataUrl = await captureCanvas(nodes[i], options)
    const blob = dataUrlToBlob(dataUrl)
    const slideNum = String(i + 1).padStart(2, '0')
    zip.file(`slide-${slideNum}.${ext}`, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Copy a single canvas to clipboard as PNG.
 */
export async function copyCanvasToClipboard(node) {
  const dataUrl = await captureCanvas(node, { format: 'png' })
  const blob = dataUrlToBlob(dataUrl)
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}
