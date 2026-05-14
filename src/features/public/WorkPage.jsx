import { ArrowUpRight } from 'lucide-react'

const projects = [
  { name: 'Brava Interiors', type: 'Interior Design Studio', scope: 'Full website + monthly care plan', color: '#8B6F47', desc: 'A complete online presence for a high-end interior design studio. Custom portfolio layout, project galleries, and ongoing content management.', services: ['Custom Design', 'Presence Care'] },
  { name: 'Peak Athletics', type: 'Fitness & Training Center', scope: 'Website redesign + hosting', color: '#47788B', desc: 'Modern redesign of an outdated fitness website. Mobile-first approach, class scheduling integration, and performance optimization.', services: ['Redesign', 'Growth Care'] },
  { name: 'Zenith Consulting', type: 'Business Consulting Firm', scope: 'Website + Growth Care plan', color: '#6B478B', desc: 'Professional website for a consulting firm with case study layouts, team profiles, and SEO-focused content structure.', services: ['Custom Design', 'Growth Care'] },
  { name: 'Mira Wellness', type: 'Health & Wellness Center', scope: 'Launch Care package', color: '#478B6B', desc: 'Clean, calming website for a wellness practice. Booking integration, service pages, and practitioner profiles.', services: ['Launch Care'] },
  { name: 'Harmony Yoga', type: 'Yoga & Mindfulness Studio', scope: 'Migration from Wix + redesign', color: '#8B7847', desc: 'Moved from a free Wix site to a proper custom website. Class schedules, instructor pages, and online booking.', services: ['Redesign', 'Hosting'] },
  { name: 'Stari Grad Restaurant', type: 'Traditional Restaurant', scope: 'Website + monthly maintenance', color: '#478B8B', desc: 'Elegant restaurant website with seasonal menu updates, reservation system, and photo gallery.', services: ['Custom Design', 'Presence Care'] },
]

export default function WorkPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[600px] mb-16">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">Work</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">Businesses we've helped look and perform better.</h1>
          <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">Every project is different. Every business gets the attention it deserves.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {projects.map(p => (
            <div key={p.name} className="group bg-surface border border-border rounded-lg overflow-hidden hover:border-border-strong transition-colors">
              <div className="h-52 w-full" style={{ background: `linear-gradient(135deg, ${p.color}22, ${p.color}08)` }} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-display font-semibold text-[17px]">{p.name}</h3>
                    <p className="text-[12px] text-text-tertiary mt-0.5">{p.type}</p>
                  </div>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mt-3">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.services.map(s => (
                    <span key={s} className="text-[10px] font-medium text-accent bg-accent-muted px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
