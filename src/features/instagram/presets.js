// ══════════════════════════════════════════════════════════════
//  CONTENT STUDIO — Format Presets
// ══════════════════════════════════════════════════════════════

export const FORMATS = [
  // Instagram
  { key: 'ig_story',     label: 'Instagram Story',    group: 'Instagram', w: 1080, h: 1920, safeArea: { top: 220, bottom: 240, left: 60, right: 60 } },
  { key: 'ig_square',    label: 'Instagram Square',   group: 'Instagram', w: 1080, h: 1080, safeArea: { top: 80, bottom: 80, left: 80, right: 80 } },
  { key: 'ig_portrait',  label: 'Instagram Portrait', group: 'Instagram', w: 1080, h: 1350, safeArea: { top: 100, bottom: 100, left: 80, right: 80 } },
  { key: 'ig_landscape', label: 'Instagram Landscape',group: 'Instagram', w: 1080, h: 566,  safeArea: { top: 60,  bottom: 60,  left: 80, right: 80 } },
  // Social
  { key: 'fb_post',      label: 'Facebook Post',      group: 'Social',    w: 1200, h: 630,  safeArea: { top: 60,  bottom: 60,  left: 80, right: 80 } },
  { key: 'linkedin_post',label: 'LinkedIn Post',      group: 'Social',    w: 1200, h: 627,  safeArea: { top: 60,  bottom: 60,  left: 80, right: 80 } },
  { key: 'x_post',       label: 'X / Twitter',        group: 'Social',    w: 1600, h: 900,  safeArea: { top: 80,  bottom: 80,  left: 100, right: 100 } },
  { key: 'pinterest_pin',label: 'Pinterest Pin',      group: 'Social',    w: 1000, h: 1500, safeArea: { top: 80,  bottom: 80,  left: 80, right: 80 } },
  // Marketing
  { key: 'website_hero', label: 'Website Hero',       group: 'Marketing', w: 1920, h: 1080, safeArea: { top: 120, bottom: 120, left: 160, right: 160 } },
  { key: 'a4_portrait',  label: 'A4 Portrait',        group: 'Marketing', w: 2480, h: 3508, safeArea: { top: 240, bottom: 240, left: 200, right: 200 } },
]

export const FORMAT_GROUPS = ['Instagram', 'Social', 'Marketing']

export function getFormat(key) {
  return FORMATS.find(f => f.key === key) || FORMATS[1]
}

// ══════════════════════════════════════════════════════════════
//  PALETTES
// ══════════════════════════════════════════════════════════════

export const PALETTES = [
  { key: 'cloz',        name: 'Cloz Brand',    bg: '#0B0B0D', primary: '#F5F5F7', accent: '#5E8DB5', muted: '#A1A1AA', secondary: '#18181C', border: 'rgba(255,255,255,0.08)' },
  { key: 'light_clean', name: 'Light Clean',   bg: '#FAFAFA', primary: '#0B0B0D', accent: '#3B82F6', muted: '#71717A', secondary: '#E5E5E5', border: 'rgba(0,0,0,0.1)' },
  { key: 'warm',        name: 'Warm Premium',  bg: '#1A1410', primary: '#FFF8F0', accent: '#D97706', muted: '#A8A29E', secondary: '#292524', border: 'rgba(255,200,150,0.15)' },
  { key: 'ocean',       name: 'Ocean Blue',    bg: '#0C1E2E', primary: '#F0F9FF', accent: '#06B6D4', muted: '#94A3B8', secondary: '#1E293B', border: 'rgba(100,200,255,0.15)' },
  { key: 'forest',      name: 'Forest',        bg: '#0F1A14', primary: '#F0FDF4', accent: '#10B981', muted: '#9CA3AF', secondary: '#1A2E22', border: 'rgba(100,255,180,0.12)' },
  { key: 'purple',      name: 'Purple Night',  bg: '#1A0F2E', primary: '#FAF5FF', accent: '#A78BFA', muted: '#A5A5C0', secondary: '#2A1A4A', border: 'rgba(180,130,255,0.15)' },
  { key: 'coral',       name: 'Coral Energy',  bg: '#FFF5F0', primary: '#1F1410', accent: '#F97316', muted: '#78716C', secondary: '#FED7AA', border: 'rgba(0,0,0,0.08)' },
  { key: 'white',       name: 'Pure White',    bg: '#FFFFFF', primary: '#0B0B0D', accent: '#000000', muted: '#525252', secondary: '#F5F5F5', border: 'rgba(0,0,0,0.12)' },
]

// ══════════════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════════════

export const TEMPLATES = [
  { key: 'minimal',    label: 'Minimal' },
  { key: 'bold',       label: 'Bold' },
  { key: 'editorial',  label: 'Editorial' },
  { key: 'gradient',   label: 'Gradient' },
  { key: 'split',      label: 'Split' },
  { key: 'card',       label: 'Card' },
]

// ══════════════════════════════════════════════════════════════
//  FONTS
// ══════════════════════════════════════════════════════════════

export const FONTS = [
  { key: 'system',     label: 'System',          family: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' },
  { key: 'jakarta',    label: 'Plus Jakarta',    family: '"Plus Jakarta Sans", system-ui, sans-serif' },
  { key: 'inter',      label: 'Inter',           family: '"Inter", system-ui, sans-serif' },
  { key: 'mono',       label: 'JetBrains Mono',  family: '"JetBrains Mono", monospace' },
  { key: 'serif',      label: 'Georgia',         family: 'Georgia, "Times New Roman", serif' },
  { key: 'display',    label: 'Display',         family: '"Plus Jakarta Sans", system-ui, sans-serif' },
]

export function getFont(key) {
  return FONTS.find(f => f.key === key) || FONTS[0]
}

// ══════════════════════════════════════════════════════════════
//  QUICK PRESETS — Pre-filled content briefs
// ══════════════════════════════════════════════════════════════

export const QUICK_PRESETS = [
  { key: 'launch',       label: 'Launch Care Promo',     brief: 'Promote Launch Care: 800 EUR website builds for small businesses. Highlight speed, design quality, and value.' },
  { key: 'maintenance',  label: 'Why Maintenance Matters', brief: 'Explain why ongoing website maintenance is critical for security, speed, and conversion.' },
  { key: 'redesign',     label: 'Before/After Redesign', brief: 'Showcase a website redesign success story with measurable conversion improvements.' },
  { key: 'testimonial',  label: 'Client Testimonial',    brief: 'Share a glowing client testimonial that builds trust and social proof.' },
  { key: 'audit',        label: 'Free Audit Offer',      brief: 'Offer a free website audit to capture leads. Emphasize the unique value of the audit.' },
  { key: 'growth',       label: 'Growth Care Benefits',  brief: 'Pitch Growth Care: 600 EUR + 350/mo for website + ongoing optimization. Show ROI.' },
  { key: 'mistakes',     label: '5 Website Mistakes',    brief: 'Educational post on the top 5 mistakes small business websites make. Drive consultation bookings.' },
  { key: 'limited',      label: 'Limited Redesign Offer',brief: 'Limited-time redesign offer with urgency. Premium positioning, scarcity-driven.' },
]
