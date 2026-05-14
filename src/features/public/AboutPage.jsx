import { ArrowRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="pt-24 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[680px] mb-16">
          <span className="text-[11px] font-medium uppercase tracking-widest text-accent">About</span>
          <h1 className="mt-3 font-display font-bold text-[40px] leading-tight">A digital studio that stays after launch.</h1>
          <p className="mt-6 text-[16px] text-text-secondary leading-relaxed">
            Cloz Digital is a premium web design studio based in Bosnia and Herzegovina. We design, build, host, and maintain websites for businesses that take their online presence seriously.
          </p>
          <p className="mt-4 text-[16px] text-text-secondary leading-relaxed">
            Most agencies disappear after the invoice clears. We don't. We believe a website is a living thing that needs ongoing care, and we built our entire business around that principle.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mb-16">
          <div className="bg-surface border border-border rounded-lg p-6">
            <span className="text-[28px] font-display font-bold text-accent">01</span>
            <h3 className="font-display font-semibold text-[16px] mt-3 mb-2">Design with purpose</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">Every design decision serves a business goal. We don't add things for decoration. If it doesn't help your visitors take action, it doesn't belong.</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-6">
            <span className="text-[28px] font-display font-bold text-accent">02</span>
            <h3 className="font-display font-semibold text-[16px] mt-3 mb-2">Build for reality</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">Fast loading, mobile-first, properly hosted, correctly secured. We handle the technical reality so your business looks professional everywhere.</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-6">
            <span className="text-[28px] font-display font-bold text-accent">03</span>
            <h3 className="font-display font-semibold text-[16px] mt-3 mb-2">Stay and maintain</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">We offer monthly care plans because websites need ongoing attention. Updates, security, content changes, performance — we handle it all.</p>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8 max-w-[680px]">
          <h2 className="font-display font-bold text-[22px] mb-4">Our approach</h2>
          <div className="space-y-4 text-[14px] text-text-secondary leading-relaxed">
            <p>We work with a small number of clients at a time. This is intentional. We'd rather do excellent work for fewer businesses than rush through a queue of projects.</p>
            <p>Every client gets direct communication, honest timelines, and work that reflects the quality of their actual business. No templates. No outsourcing to random contractors. No disappearing after delivery.</p>
            <p>We are particularly focused on businesses in Bosnia and Herzegovina and the wider Balkan region, though we work with clients internationally when the fit is right.</p>
          </div>
          <a href="/contact" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-medium px-5 py-2.5 rounded-md transition-colors text-[13px] mt-6">
            Work with us <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
