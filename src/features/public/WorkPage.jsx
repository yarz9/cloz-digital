import { Link } from 'react-router-dom'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

// ══════════════════════════════════════════════════════════════
//  WORK PAGE — Tasteful placeholder until real client work exists
//  No fabricated portfolio items.
// ══════════════════════════════════════════════════════════════

export default function WorkPage() {
  useEffect(() => { document.title = 'Client Work — Cloz Digital' }, [])

  return (
    <section className="pt-32 pb-28 px-6 min-h-[70vh] flex items-center">
      <div className="max-w-[720px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full bg-accent-muted border border-accent/20">
          <Sparkles size={11} className="text-accent" />
          <span className="text-[11px] font-medium text-accent uppercase tracking-wider">In Progress</span>
        </div>

        <h1 className="font-display font-bold text-[36px] md:text-[52px] leading-[1.1] tracking-tight">
          Client success stories<br />
          <span className="text-accent">coming soon.</span>
        </h1>

        <p className="mt-6 text-[15px] md:text-[16px] text-text-secondary leading-relaxed max-w-[560px] mx-auto">
          We are a focused young agency delivering exceptional work for our first clients.
          We will publish full case studies — design process, results, and lessons — as projects ship and clients agree to share their stories.
        </p>

        <p className="mt-4 text-[13px] text-text-tertiary max-w-[520px] mx-auto leading-relaxed">
          Want to be one of our showcase projects? Premium attention from day one.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/contact"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-md text-[13px] font-semibold transition-colors">
            Book a Consultation
            <ArrowUpRight size={13} />
          </Link>
          <Link to="/packages"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary px-4 py-3 text-[13px] font-medium transition-colors">
            View Packages →
          </Link>
        </div>
      </div>
    </section>
  )
}
