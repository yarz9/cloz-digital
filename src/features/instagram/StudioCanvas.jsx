import { forwardRef, useMemo } from 'react'
import { getFont } from './presets'

// ══════════════════════════════════════════════════════════════
//  STUDIO CANVAS — Unified render component
//  Renders at NATIVE format dimensions. Scaled for preview via CSS transform.
//  EXPORT uses the SAME DOM node — pixel-perfect WYSIWYG.
// ══════════════════════════════════════════════════════════════

const StudioCanvas = forwardRef(function StudioCanvas({
  format, palette, design, content, layers, showSafeArea = false, previewScale = 1, previewMode = 'desktop',
}, ref) {
  const pal = palette
  const fmt = format
  const align = design.textAlign || 'left'
  const padMul = design.spacing === 'compact' ? 0.7 : design.spacing === 'relaxed' ? 1.35 : 1.0
  const headingFont = getFont(design.headingFont).family
  const bodyFont = getFont(design.bodyFont).family
  const fontScale = (design.fontSize || 100) / 100
  const radius = design.borderRadius ?? 0

  // Visibility helpers
  const visible = (key) => !layers || layers[key]?.visible !== false

  // ── Native font sizes (in actual pixels at full resolution) ──
  // These scale proportionally to format width to maintain visual balance
  const baseScale = fmt.w / 1080  // 1080 is our reference width
  const px = (n) => Math.round(n * baseScale * fontScale)

  const sizes = {
    badge:    px(28),
    eyebrow:  px(28),
    headline: fmt.h > fmt.w ? px(96) : px(80),
    subline:  px(44),
    body:     px(34),
    cta:      px(32),
    footer:   px(24),
  }

  const lineHeights = {
    badge:    1.2,
    eyebrow:  1.3,
    headline: 1.1,
    subline:  1.35,
    body:     1.5,
    cta:      1.3,
    footer:   1.4,
  }

  // ── Template variations ──
  const templateStyles = useMemo(() => {
    const t = design.template
    let bg = pal.bg
    let accentBar = null

    if (t === 'gradient') {
      bg = `linear-gradient(135deg, ${pal.bg} 0%, ${pal.secondary} 100%)`
    } else if (t === 'split') {
      bg = `linear-gradient(to bottom, ${pal.bg} 50%, ${pal.secondary} 50%)`
    } else if (t === 'card') {
      bg = pal.secondary
    } else if (t === 'editorial') {
      accentBar = true
    }

    return { bg, accentBar }
  }, [design.template, pal])

  // Safe area dimensions
  const sa = fmt.safeArea || { top: 80, bottom: 80, left: 80, right: 80 }

  // ── Layout direction based on alignment ──
  const flexAlign = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'

  // ── Preview mode wrapper styles ──
  const wrapperStyle = {
    width: fmt.w,
    height: fmt.h,
    transform: `scale(${previewScale})`,
    transformOrigin: 'top left',
    flexShrink: 0,
  }

  return (
    <div style={wrapperStyle}>
      <div
        ref={ref}
        data-canvas-export="true"
        style={{
          width: `${fmt.w}px`,
          height: `${fmt.h}px`,
          background: templateStyles.bg,
          color: pal.primary,
          fontFamily: bodyFont,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: `${radius}px`,
          boxSizing: 'border-box',
          // CRITICAL: NO transforms on this node. Preview scaling happens on parent wrapper only.
        }}
      >
        {/* Editorial accent bar */}
        {templateStyles.accentBar && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '12px',
            height: '100%',
            background: pal.accent,
          }} />
        )}

        {/* Inner content with padding (safe area) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          paddingTop:    `${sa.top * padMul}px`,
          paddingBottom: `${sa.bottom * padMul}px`,
          paddingLeft:   `${sa.left * padMul}px`,
          paddingRight:  `${sa.right * padMul}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: design.verticalAlign === 'top' ? 'flex-start' : design.verticalAlign === 'bottom' ? 'flex-end' : 'center',
          alignItems: flexAlign,
          textAlign: align,
          boxSizing: 'border-box',
        }}>

          {/* Badge */}
          {visible('badge') && content.badge && design.showBadge !== false && (
            <div style={{
              display: 'inline-block',
              padding: `${px(10)}px ${px(22)}px`,
              borderRadius: `${px(50)}px`,
              background: pal.accent,
              color: pal.bg,
              fontSize: `${sizes.badge}px`,
              fontWeight: 700,
              fontFamily: headingFont,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: `${px(40 * padMul)}px`,
              lineHeight: lineHeights.badge,
            }}>
              {content.badge}
            </div>
          )}

          {/* Eyebrow */}
          {visible('eyebrow') && content.eyebrow && (
            <div style={{
              color: pal.accent,
              fontSize: `${sizes.eyebrow}px`,
              fontWeight: 600,
              fontFamily: headingFont,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: `${px(28 * padMul)}px`,
              lineHeight: lineHeights.eyebrow,
            }}>
              {content.eyebrow}
            </div>
          )}

          {/* Headline */}
          {visible('headline') && content.headline && (
            <div style={{
              color: pal.primary,
              fontSize: `${sizes.headline}px`,
              fontWeight: 800,
              fontFamily: headingFont,
              lineHeight: lineHeights.headline,
              marginBottom: `${px(32 * padMul)}px`,
              letterSpacing: '-0.02em',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}>
              {content.headline}
            </div>
          )}

          {/* Divider */}
          {visible('divider') && design.showDivider && (
            <div style={{
              width: align === 'center' ? `${px(120)}px` : `${px(80)}px`,
              height: `${px(4)}px`,
              background: pal.accent,
              marginBottom: `${px(32 * padMul)}px`,
            }} />
          )}

          {/* Subline */}
          {visible('subline') && content.subline && (
            <div style={{
              color: pal.muted,
              fontSize: `${sizes.subline}px`,
              fontWeight: 500,
              fontFamily: bodyFont,
              lineHeight: lineHeights.subline,
              marginBottom: `${px(40 * padMul)}px`,
              maxWidth: '100%',
            }}>
              {content.subline}
            </div>
          )}

          {/* Body */}
          {visible('body') && content.body && (
            <div style={{
              color: pal.primary,
              fontSize: `${sizes.body}px`,
              fontWeight: 400,
              fontFamily: bodyFont,
              lineHeight: lineHeights.body,
              marginBottom: `${px(48 * padMul)}px`,
              maxWidth: '100%',
              whiteSpace: 'pre-wrap',
              opacity: 0.92,
            }}>
              {content.body}
            </div>
          )}

          {/* CTA */}
          {visible('cta') && content.cta && design.showCta !== false && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: `${px(14)}px`,
              padding: `${px(20)}px ${px(40)}px`,
              borderRadius: `${px(8)}px`,
              background: pal.accent,
              color: pal.bg,
              fontSize: `${sizes.cta}px`,
              fontWeight: 700,
              fontFamily: headingFont,
              letterSpacing: '0.02em',
              boxShadow: design.shadow ? `0 ${px(12)}px ${px(40)}px ${pal.accent}33` : 'none',
            }}>
              <span>{content.cta}</span>
              <span style={{ fontSize: `${px(28)}px`, lineHeight: 1 }}>→</span>
            </div>
          )}
        </div>

        {/* Footer / Branding — always at bottom, never gets pushed */}
        {visible('footer') && design.showBranding !== false && (
          <div style={{
            position: 'absolute',
            bottom: `${px(48)}px`,
            left: `${sa.left * padMul}px`,
            right: `${sa.right * padMul}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'space-between',
            gap: `${px(20)}px`,
          }}>
            <div style={{
              color: pal.muted,
              fontSize: `${sizes.footer}px`,
              fontWeight: 600,
              fontFamily: headingFont,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.75,
            }}>
              {content.footer || 'CLOZ DIGITAL'}
            </div>
            {!design.hideWatermark && (
              <div style={{
                color: pal.muted,
                fontSize: `${px(20)}px`,
                fontFamily: bodyFont,
                opacity: 0.55,
              }}>
                cloz.digital
              </div>
            )}
          </div>
        )}

        {/* Safe area overlay (preview only — NEVER exported) */}
        {showSafeArea && (
          <div
            data-no-export="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <div style={{
              position: 'absolute',
              top: `${sa.top}px`, bottom: `${sa.bottom}px`,
              left: `${sa.left}px`, right: `${sa.right}px`,
              border: `${px(3)}px dashed ${pal.accent}`,
              opacity: 0.4,
            }} />
            <div style={{
              position: 'absolute', top: `${px(12)}px`, left: `${px(12)}px`,
              background: pal.accent, color: pal.bg,
              padding: `${px(6)}px ${px(12)}px`,
              borderRadius: `${px(4)}px`,
              fontSize: `${px(20)}px`, fontWeight: 700,
              fontFamily: headingFont,
            }}>
              SAFE AREA
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

export default StudioCanvas
