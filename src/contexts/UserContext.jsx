import { createContext, useContext, useState, useEffect } from 'react'

// ══════════════════════════════════════════════════════════════
//  USER CONTEXT — Personalized operator profiles (Anes / Denis)
//  The selected user does not restrict access; it personalizes
//  greetings, AI summaries, recommended tasks, KPI emphasis.
// ══════════════════════════════════════════════════════════════

export const OPERATORS = {
  anes: {
    id: 'anes',
    name: 'Anes',
    fullName: 'Anes D.',
    title: 'Founder & Web Developer',
    email: 'anes@cloz.digital',
    color: '#5E8DB5',
    avatar: 'A',
    responsibilities: [
      'Backend development',
      'System architecture',
      'UI/UX design',
      'Automation',
      'Product management',
      'Social media strategy',
      'Technical oversight',
    ],
    kpiEmphasis: ['shipped_features', 'system_health', 'automation_uptime', 'product_velocity'],
    focusAreas: ['product', 'engineering', 'design', 'automation'],
    aiPersona: 'Address Anes as the technical co-founder. Emphasize engineering velocity, product decisions, system reliability, automation opportunities, and design quality. Surface technical debt and shipping bottlenecks. Be direct.',
  },
  denis: {
    id: 'denis',
    name: 'Denis',
    fullName: 'Denis G.',
    title: 'Client Success & Marketing Lead',
    email: 'denis@cloz.digital',
    color: '#4ADE80',
    avatar: 'D',
    responsibilities: [
      'SEO',
      'Keyword research',
      'Blog and content creation',
      'Outreach follow-ups',
      'Email responses',
      'Campaign management',
      'Marketing execution',
    ],
    kpiEmphasis: ['organic_traffic', 'leads_generated', 'replies_sent', 'content_published', 'campaign_roi'],
    focusAreas: ['seo', 'content', 'outreach', 'campaigns'],
    aiPersona: 'Address Denis as the marketing and client-success lead. Emphasize SEO opportunities, content output, outreach response rates, campaign performance, and lead quality. Surface follow-ups due and content pipeline gaps. Be practical.',
  },
}

const STORAGE_KEY = 'cloz_active_operator_v1'

const UserContext = createContext({ user: null, setUser: () => {}, clearUser: () => {} })

export function UserProvider({ children }) {
  const [user, setUserState] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && OPERATORS[saved]) {
        setUserState(OPERATORS[saved])
      }
    } catch {}
  }, [])

  const setUser = (id) => {
    if (!OPERATORS[id]) return
    setUserState(OPERATORS[id])
    try { localStorage.setItem(STORAGE_KEY, id) } catch {}
  }

  const clearUser = () => {
    setUserState(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <UserContext.Provider value={{ user, setUser, clearUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}

export function greetingForHour() {
  const h = new Date().getHours()
  if (h < 5) return 'Working late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
